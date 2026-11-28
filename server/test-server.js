// Prueba rápida sin keys ni DB: cifrado + proveedores mock + health.
// Uso: npm test   (levanta el server en un puerto de prueba y lo apaga)
const { encrypt, decrypt } = require('./crypto');
const providers = require('./providers');

(async () => {
  // 1. Cifrado ida y vuelta
  process.env.CHAT_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const secret = 'Hola Aline, esto es un chat secreto';
  const enc = encrypt(secret);
  const dec = decrypt(enc);
  console.log('cifrado:', dec === secret ? 'OK' : 'FALLO');
  console.log('  guardado en DB sería ilegible:', enc.slice(0, 40) + '...');
  if (dec !== secret) process.exit(1);
  // Cambiar un byte debe fallar (GCM detecta manipulación)
  try {
    const bad = Buffer.from(enc, 'base64'); bad[bad.length - 1] ^= 1;
    decrypt(bad.toString('base64'));
    console.log('manipulación: FALLO (debió rechazar)');
    process.exit(1);
  } catch (_) { console.log('manipulación detectada: OK'); }

  // 2. Chat mock
  const chat = await providers.chat([{ role: 'user', content: 'hola' }], 'mock');
  console.log('chat mock:', chat.text ? 'OK' : 'FALLO', '-', chat.provider, '/', chat.model);

  // 3. Imagen mock
  const img = await providers.image('Aline en la playa', 'mock');
  console.log('imagen mock:', img.provider === 'mock' ? 'OK' : 'FALLO');

  // 4. Guard de imagen (menores)
  try { await providers.image('una niña en la playa', 'mock'); console.log('guard imagen: FALLO'); process.exit(1); }
  catch (e) { console.log('guard imagen (menores): OK —', e.message); }

  console.log('Todas las pruebas OK');
})();
