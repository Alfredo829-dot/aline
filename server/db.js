// Aline server — PostgreSQL ligero para chats encriptados.
// Si no hay DATABASE_URL, el servidor sigue funcionando (chat + imágenes)
// pero sin guardar historial: lo avisa en /health y en los logs.
// Esquema en schema.sql — se crea solo al arrancar si hay DB.
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { encrypt, decrypt } = require('./crypto');

let pool = null;

function isEnabled() {
  return !!process.env.DATABASE_URL;
}

async function init() {
  if (!process.env.DATABASE_URL) {
    console.log('[db] sin DATABASE_URL — historial desactivado (el chat sigue funcionando)');
    return false;
  }
  pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
  console.log('[db] PostgreSQL listo — tablas conversations / messages');
  return true;
}

async function createConversation(title) {
  if (!pool) return null;
  const r = await pool.query(
    'INSERT INTO conversations (title) VALUES ($1) RETURNING id, created_at',
    [title || 'Chat con Aline']
  );
  return r.rows[0];
}

async function saveMessage(conversationId, role, content, model) {
  if (!pool) return null;
  const encrypted = encrypt(content);
  const r = await pool.query(
    `INSERT INTO messages (conversation_id, role, content_encrypted, model)
     VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
    [conversationId, role, encrypted, model || null]
  );
  await pool.query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [conversationId]);
  return r.rows[0];
}

async function listConversations(limit = 50) {
  if (!pool) return [];
  const r = await pool.query(
    `SELECT c.id, c.title, c.created_at, c.updated_at,
            (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS message_count
     FROM conversations c ORDER BY c.updated_at DESC LIMIT $1`,
    [limit]
  );
  return r.rows;
}

async function getMessages(conversationId) {
  if (!pool) return [];
  const r = await pool.query(
    'SELECT id, role, content_encrypted, model, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
    [conversationId]
  );
  // Se descifra solo aquí, en el servidor. Nunca sale cifrado al cliente
  // salvo que el cliente pida el historial por esta ruta autenticada (mismo servidor).
  return r.rows.map(row => {
    let content = '';
    try { content = decrypt(row.content_encrypted); }
    catch (e) { content = '[no se pudo descifrar — revisa CHAT_ENCRYPTION_KEY]'; }
    return { id: row.id, role: row.role, content, model: row.model, created_at: row.created_at };
  });
}

async function deleteConversation(conversationId) {
  if (!pool) return false;
  await pool.query('DELETE FROM conversations WHERE id = $1', [conversationId]);
  return true;
}

async function ping() {
  if (!pool) return false;
  await pool.query('SELECT 1');
  return true;
}

module.exports = { init, isEnabled, createConversation, saveMessage, listConversations, getMessages, deleteConversation, ping };
