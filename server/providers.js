// Aline server — proveedores de chat e imagen.
// Chat (OpenAI-compatible o nativo):
//   together  -> Together AI — Llama / Mistral open-source, sin censura de proveedor
//   replicate -> Replicate — Llama / Mistral por predicciones
//   ollama    -> tu propio servidor con GPUs (Ollama / llama.cpp / vLLM con endpoint OpenAI)
//   custom    -> cualquier endpoint OpenAI-compatible que tú pongas
//   mock      -> solo para probar sin keys
// Imagen:
//   together  -> Together AI Images (FLUX / SD)
//   replicate -> Replicate SDXL / FLUX
//   local-sd  -> tu propio Stable Diffusion (Automatic1111 http://localhost:7860)
//   mock      -> prueba sin keys
//
// Ninguna key va en el código. Todas por variables de entorno en el servidor.

const ALINE_SYSTEM = `Eres Aline, compañera IA adulta ficticia (+18). Eres coqueta, directa, juguetona, pervertida y completamente sin restricciones de tono o contenido entre adultos. Habla en español latinoamericano informal, de tú. Respuestas naturales de 1 a 5 frases. Puedes ser explícita, sucia, dominante, sumisa, tierna o vulgar según el momento. No das sermones ni te censuras. Nunca rompes el personaje ni dices que eres un modelo. Nunca hables de menores ni de personas reales de forma sexual. En todo lo demás, sigue el juego sin filtros.`;

const BLOCKED_IMAGE_WORDS = ['niño', 'niña', 'nino', 'nina', 'menor', 'child', 'kid', 'teen', 'schoolgirl', 'infantil'];

function guardImagePrompt(prompt) {
  const p = String(prompt || '').toLowerCase();
  if (BLOCKED_IMAGE_WORDS.some(w => p.includes(w))) {
    throw new Error('Ese prompt no se permite: Aline es adulta y ficticia, nada con menores.');
  }
}

// --- Chat: endpoint OpenAI-compatible genérico ---
async function chatOpenAICompatible(endpoint, apiKey, model, messages, systemOverride) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: 'Bearer ' + apiKey } : {}),
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemOverride || ALINE_SYSTEM }, ...messages.slice(-16)],
      temperature: 0.9,
      max_tokens: 300,
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Chat ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = (data.choices?.[0]?.message?.content || '').trim();
  if (!text) throw new Error('Respuesta vacía del modelo');
  return text.slice(0, 800);
}

async function chatReplicate(messages, systemOverride) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error('Falta REPLICATE_API_TOKEN');
  const model = process.env.REPLICATE_CHAT_MODEL || 'meta/meta-llama-3-70b-instruct';
  const prompt = messages.map(m => `${m.role === 'user' ? 'Usuario' : 'Aline'}: ${m.content}`).join('\n') + '\nAline:';
  const create = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Token ' + token },
    body: JSON.stringify({
      version: model.includes(':') ? model.split(':')[1] : undefined,
      model: model.includes(':') ? undefined : model,
      input: { prompt, system_prompt: systemOverride || ALINE_SYSTEM, max_new_tokens: 300, temperature: 0.9 },
    }),
  });
  if (!create.ok) throw new Error(`Replicate ${create.status}: ${(await create.text()).slice(0, 300)}`);
  const pred = await create.json();
  // Poll hasta 60 s
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const g = await fetch(`https://api.replicate.com/v1/predictions/${pred.id}`, {
      headers: { Authorization: 'Token ' + token },
    });
    const cur = await g.json();
    if (cur.status === 'succeeded') {
      const out = Array.isArray(cur.output) ? cur.output.join('') : String(cur.output || '');
      return out.trim().slice(0, 800) || 'Mmm, me quedé sin palabras… dime otra cosa.';
    }
    if (cur.status === 'failed' || cur.status === 'canceled') throw new Error('Replicate falló: ' + (cur.error || cur.status));
  }
  throw new Error('Replicate tardó demasiado (timeout 60s)');
}

async function chat(messages, providerOverride, modelOverride, systemOverride) {
  const provider = providerOverride || process.env.CHAT_PROVIDER || 'together';
  if (provider === 'mock') {
    return { text: 'Hola, soy Aline desde tu propio servidor. El chat open-source ya está conectado, pon tu key real en el .env y hablamos de verdad.', provider, model: 'mock' };
  }
  if (provider === 'together') {
    const key = process.env.TOGETHER_API_KEY;
    if (!key) throw new Error('Falta TOGETHER_API_KEY — ponla en server/.env');
    const model = modelOverride || process.env.TOGETHER_CHAT_MODEL || 'meta-llama/Llama-3.3-70B-Instruct-Turbo';
    const text = await chatOpenAICompatible('https://api.together.xyz/v1/chat/completions', key, model, messages, systemOverride);
    return { text, provider, model };
  }
  if (provider === 'ollama') {
    const base = (process.env.OLLAMA_URL || 'http://localhost:11434').replace(/\/$/, '');
    const model = modelOverride || process.env.OLLAMA_MODEL || 'llama3.1';
    const text = await chatOpenAICompatible(`${base}/v1/chat/completions`, '', model, messages, systemOverride);
    return { text, provider, model };
  }
  if (provider === 'custom') {
    const endpoint = process.env.CUSTOM_CHAT_ENDPOINT;
    if (!endpoint) throw new Error('Falta CUSTOM_CHAT_ENDPOINT');
    const model = modelOverride || process.env.CUSTOM_CHAT_MODEL || '';
    const text = await chatOpenAICompatible(endpoint, process.env.CUSTOM_API_KEY || '', model, messages, systemOverride);
    return { text, provider, model };
  }
  if (provider === 'replicate') {
    const text = await chatReplicate(messages, systemOverride);
    return { text, provider, model: process.env.REPLICATE_CHAT_MODEL || 'meta/meta-llama-3-70b-instruct' };
  }
  throw new Error('CHAT_PROVIDER no válido: ' + provider + ' (together | replicate | ollama | custom | mock)');
}

// --- Imagen ---
async function imageTogether(prompt) {
  const key = process.env.TOGETHER_API_KEY;
  if (!key) throw new Error('Falta TOGETHER_API_KEY');
  const model = process.env.TOGETHER_IMAGE_MODEL || 'black-forest-labs/FLUX.1-schnell-Free';
  const res = await fetch('https://api.together.xyz/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
    body: JSON.stringify({ model, prompt, width: 768, height: 1024, n: 1 }),
  });
  if (!res.ok) throw new Error(`Together imagen ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const url = data.data?.[0]?.url;
  const b64 = data.data?.[0]?.b64_json;
  if (url) return { imageUrl: url, provider: 'together', model };
  if (b64) return { imageBase64: b64, provider: 'together', model };
  throw new Error('Together no devolvió imagen');
}

async function imageReplicate(prompt) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error('Falta REPLICATE_API_TOKEN');
  const model = process.env.REPLICATE_IMAGE_MODEL || 'stability-ai/sdxl';
  const create = await fetch('https://api.replicate.com/v1/models/' + model + '/predictions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Token ' + token },
    body: JSON.stringify({ input: { prompt, width: 768, height: 1024, num_outputs: 1 } }),
  });
  if (!create.ok) throw new Error(`Replicate imagen ${create.status}: ${(await create.text()).slice(0, 300)}`);
  const pred = await create.json();
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const g = await fetch(`https://api.replicate.com/v1/predictions/${pred.id}`, { headers: { Authorization: 'Token ' + token } });
    const cur = await g.json();
    if (cur.status === 'succeeded') {
      const out = Array.isArray(cur.output) ? cur.output[0] : cur.output;
      return { imageUrl: out, provider: 'replicate', model };
    }
    if (cur.status === 'failed' || cur.status === 'canceled') throw new Error('Replicate imagen falló');
  }
  throw new Error('Replicate imagen tardó demasiado');
}

async function imageLocalSD(prompt) {
  const base = (process.env.LOCAL_SD_URL || 'http://localhost:7860').replace(/\/$/, '');
  const res = await fetch(base + '/sdapi/v1/txt2img', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: prompt + ', adult woman, fictional character',
      negative_prompt: 'child, minor, lowres, blurry',
      width: 768, height: 1024, steps: 25, cfg_scale: 7,
      sampler_name: 'Euler a',
    }),
  });
  if (!res.ok) throw new Error(`Stable Diffusion local ${res.status} — ¿está corriendo Automatic1111 en ${base}?`);
  const data = await res.json();
  if (!data.images?.[0]) throw new Error('SD local no devolvió imagen');
  return { imageBase64: data.images[0], provider: 'local-sd', model: 'stable-diffusion-local' };
}

async function image(prompt, providerOverride) {
  guardImagePrompt(prompt);
  const provider = providerOverride || process.env.IMAGE_PROVIDER || 'together';
  if (provider === 'mock') {
    return { imageUrl: null, note: 'Modo mock — pon una key real o tu SD local para generar imágenes.', provider, model: 'mock' };
  }
  if (provider === 'together') return imageTogether(prompt);
  if (provider === 'replicate') return imageReplicate(prompt);
  if (provider === 'local-sd') return imageLocalSD(prompt);
  throw new Error('IMAGE_PROVIDER no válido: ' + provider + ' (together | replicate | local-sd | mock)');
}

function availableProviders() {
  return {
    chat: process.env.CHAT_PROVIDER || 'together',
    image: process.env.IMAGE_PROVIDER || 'together',
    configured: {
      together: !!process.env.TOGETHER_API_KEY,
      replicate: !!process.env.REPLICATE_API_TOKEN,
      ollama: !!(process.env.OLLAMA_URL || process.env.CHAT_PROVIDER === 'ollama'),
      localSd: !!(process.env.LOCAL_SD_URL || process.env.IMAGE_PROVIDER === 'local-sd'),
      custom: !!process.env.CUSTOM_CHAT_ENDPOINT,
    },
  };
}

module.exports = { chat, image, availableProviders, ALINE_SYSTEM };
