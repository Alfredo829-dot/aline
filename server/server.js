// Aline server — Express.
// Chat con Llama/Mistral open-source + imágenes Stable Diffusion + Postgres encriptado.
// Uso: cp .env.example .env  (pon tus keys) -> npm install -> npm start
// Sin keys ni DB también arranca: /health lo dice y el chat mock sirve para probar.
require('dotenv').config();
const express = require('express');
const db = require('./db');
const { encrypt, hasKey } = require('./crypto');
const providers = require('./providers');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '1mb' }));
// El frontend es estático (GitHub Pages). En producción pon aquí tu dominio.
// En dev se permite todo origen para probar desde el teléfono / localhost.
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/health', async (req, res) => {
  res.json({
    ok: true,
    service: 'aline-server',
    chatProvider: process.env.CHAT_PROVIDER || 'together',
    imageProvider: process.env.IMAGE_PROVIDER || 'together',
    db: db.isEnabled() ? (await db.ping().then(() => 'connected').catch(() => 'error')) : 'disabled (sin DATABASE_URL)',
    encryption: hasKey() ? 'on (AES-256-GCM)' : 'off — pon CHAT_ENCRYPTION_KEY para guardar chats',
    providers: providers.availableProviders().configured,
  });
});

app.get('/api/providers', (req, res) => res.json(providers.availableProviders()));

// --- Chat ---
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, conversationId, provider, model } = req.body || {};
    if (!Array.isArray(messages) || !messages.length) {
      return res.status(400).json({ error: 'messages[] requerido' });
    }
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUser || !String(lastUser.content || '').trim()) {
      return res.status(400).json({ error: 'falta mensaje del usuario' });
    }
    const clean = messages.slice(-16).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '').slice(0, 1000) }));

    const result = await providers.chat(clean, provider, model);

    // Guardar encriptado si hay DB + clave. Si no hay, el chat igual responde.
    let convId = conversationId || null;
    try {
      if (db.isEnabled() && hasKey()) {
        if (!convId) {
          const conv = await db.createConversation(String(lastUser.content).slice(0, 60));
          convId = conv.id;
        }
        await db.saveMessage(convId, 'user', String(lastUser.content), result.model);
        await db.saveMessage(convId, 'assistant', result.text, result.model);
      }
    } catch (e) {
      console.warn('[db] no se pudo guardar el chat:', e.message);
    }

    res.json({ reply: result.text, conversationId: convId, provider: result.provider, model: result.model, saved: !!convId });
  } catch (e) {
    console.error('[chat]', e.message);
    res.status(502).json({ error: e.message });
  }
});

// --- Historial (descifrado solo en el servidor) ---
app.get('/api/conversations', async (req, res) => {
  try { res.json({ conversations: await db.listConversations() }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/conversations/:id/messages', async (req, res) => {
  try { res.json({ messages: await db.getMessages(req.params.id) }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/conversations/:id', async (req, res) => {
  try { await db.deleteConversation(req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Imagen ---
app.post('/api/image', async (req, res) => {
  try {
    const { prompt, provider } = req.body || {};
    if (!prompt || !String(prompt).trim()) return res.status(400).json({ error: 'prompt requerido' });
    const result = await providers.image(String(prompt).slice(0, 500), provider);
    res.json(result);
  } catch (e) {
    console.error('[image]', e.message);
    res.status(502).json({ error: e.message });
  }
});

(async () => {
  try { await db.init(); } catch (e) { console.warn('[db] no arrancó:', e.message); }
  if (!hasKey() && db.isEnabled()) {
    console.warn('[crypto] CHAT_ENCRYPTION_KEY no configurada — los chats NO se guardarán hasta ponerla.');
  }
  app.listen(PORT, () => {
    console.log(`Aline server en http://localhost:${PORT} — /health`);
    console.log(`Chat: ${process.env.CHAT_PROVIDER || 'together'} · Imagen: ${process.env.IMAGE_PROVIDER || 'together'} · DB: ${db.isEnabled() ? 'PostgreSQL' : 'off'}`);
  });
})();

module.exports = app;
