// Aline server — cifrado de chats (AES-256-GCM).
// La clave NUNCA va al repo. Se pasa por env CHAT_ENCRYPTION_KEY.
// Formatos aceptados:
//  - 64 caracteres hex (32 bytes) — recomendado: `openssl rand -hex 32`
//  - base64 de 32 bytes
//  - cualquier frase: se deriva con scrypt (sal fija en env o "aline-salt")
const crypto = require('crypto');

function getKey() {
  const raw = (process.env.CHAT_ENCRYPTION_KEY || '').trim();
  if (!raw) return null;
  // hex 64
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
  // base64 de 32 bytes
  try {
    const b = Buffer.from(raw, 'base64');
    if (b.length === 32) return b;
  } catch (_) {}
  // frase -> scrypt
  const salt = process.env.CHAT_ENCRYPTION_SALT || 'aline-salt-v1';
  return crypto.scryptSync(raw, salt, 32);
}

// Formato guardado: base64( iv(12) + authTag(16) + ciphertext )
// Todo en un solo campo de texto, así el esquema de Postgres es simple.
function encrypt(plainText) {
  const key = getKey();
  if (!key) throw new Error('CHAT_ENCRYPTION_KEY no configurada');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(String(plainText ?? ''), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

function decrypt(blob) {
  const key = getKey();
  if (!key) throw new Error('CHAT_ENCRYPTION_KEY no configurada');
  const buf = Buffer.from(String(blob), 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

function hasKey() { return !!getKey(); }

module.exports = { encrypt, decrypt, hasKey, getKey };
