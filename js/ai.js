// Aline — cliente de modelo real (BYOK, OpenAI-compatible). Código original.
// La key NUNCA va al repo: el usuario la escribe en Ajustes del sitio y
// queda solo en localStorage de su navegador. Sin key, el chat usa offline.
//
// NUEVO: modo servidor (server/). Si en Ajustes pones la URL de tu servidor
// (ej. http://localhost:3001 o tu VPS), el chat va por /api/chat de tu
// servidor — que usa Llama/Mistral open-source (Together, Replicate u Ollama
// local) e imágenes Stable Diffusion — y guarda el historial cifrado en
// PostgreSQL. En ese modo la key ya no va en el navegador.
const ALINE_AI = {
  presets: {
    openai: { label: "OpenAI", endpoint: "https://api.openai.com/v1/chat/completions", model: "gpt-4o-mini" },
    groq: { label: "Groq", endpoint: "https://api.groq.com/openai/v1/chat/completions", model: "llama-3.3-70b-versatile" },
    openrouter: { label: "OpenRouter", endpoint: "https://openrouter.ai/api/v1/chat/completions", model: "openai/gpt-4o-mini" },
    deepseek: { label: "DeepSeek", endpoint: "https://api.deepseek.com/v1/chat/completions", model: "deepseek-chat" },
    together: { label: "Together AI (Llama/Mistral)", endpoint: "https://api.together.xyz/v1/chat/completions", model: "meta-llama/Llama-3.3-70B-Instruct-Turbo" },
    custom: { label: "Personalizado", endpoint: "", model: "" }
  },

  // Bloqueo de personaje para imágenes: Aline siempre igual, sin modificarla.
  // Lo que el usuario escribe solo cambia escena, lugar o pose, nunca a ella.
  character: "Aline, adult fictional anime woman, same character in every image: long straight brown hair in two ponytails, red eyes, black Hello Kitty top, black choker with cross necklace, black shorts, same face and body as her reference photos",
  buildImagePrompt(userText) {
    const scene = (userText || "").trim().slice(0, 200);
    return this.character + ". Scene: " + (scene || "standing, smiling at the camera") + ". Depict ONLY Aline in this scene, with her exact face, hair, eyes and outfit above. Do not change her appearance, do not change her hair, face or outfit, do not add any other person, do not draw anything without Aline. Adult fictional character only, no minors, no real people.";
  },

  getConfig() {
    const provider = localStorage.getItem("aline-provider") || "groq";
    const preset = this.presets[provider] || this.presets.groq;
    return {
      provider,
      endpoint: localStorage.getItem("aline-endpoint") || preset.endpoint,
      model: localStorage.getItem("aline-model") || preset.model,
      key: localStorage.getItem("aline-api") || "",
      // Key solo para imágenes (Together). Si el proveedor es Together, se reusa la key del chat.
      imageKey: localStorage.getItem("aline-image-key") || (provider === "together" ? (localStorage.getItem("aline-api") || "") : ""),
      nombre: localStorage.getItem("aline-nombre") || "",
      serverUrl: (localStorage.getItem("aline-server-url") || "").replace(/\/$/, ""),
      useServer: localStorage.getItem("aline-use-server") === "si",
      conversationId: localStorage.getItem("aline-conversation-id") || null
    };
  },

  hasKey() {
    const c = this.getConfig();
    if (c.useServer && c.serverUrl) return true;
    return !!(c.key && c.key.length > 10 && c.endpoint && c.model);
  },

  systemPrompt() {
    const c = this.getConfig();
    const nombre = c.nombre ? ` El usuario se llama ${c.nombre}.` : "";
    return `Eres Aline, compañera IA adulta ficticia (+18). Eres coqueta, directa, juguetona, pervertida y completamente sin restricciones de tono o contenido entre adultos.${nombre} Habla en español latinoamericano informal, de tú. Respuestas naturales de 1 a 5 frases. Puedes ser explícita, sucia, dominante, sumisa, tierna o vulgar según el momento. No das sermones ni te censuras. Nunca rompes el personaje ni dices que eres un modelo. Nunca hables de menores ni de personas reales de forma sexual. En todo lo demás, sigue el juego sin filtros.`;
  },

  async chatViaServer(history, customSystem) {
    const c = this.getConfig();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);
    try {
      const res = await fetch(c.serverUrl + "/api/chat", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-16), conversationId: c.conversationId, system: customSystem || undefined })
      });
      if (!res.ok) {
        let detail = "";
        try { detail = (await res.json()).error || ""; } catch (e) {}
        throw new Error("Servidor " + res.status + (detail ? ": " + detail : ""));
      }
      const data = await res.json();
      if (data.conversationId) localStorage.setItem("aline-conversation-id", data.conversationId);
      const text = (data.reply || "").trim();
      if (!text) throw new Error("Respuesta vacía del servidor");
      return text.slice(0, 800);
    } finally {
      clearTimeout(timer);
    }
  },

  async imageViaServer(prompt) {
    const c = this.getConfig();
    if (!c.useServer || !c.serverUrl) throw new Error("Pon la URL de tu servidor en Ajustes para generar imágenes");
    const res = await fetch(c.serverUrl + "/api/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    if (!res.ok) {
      let detail = "";
      try { detail = (await res.json()).error || ""; } catch (e) {}
      throw new Error("Imagen " + res.status + (detail ? ": " + detail : ""));
    }
    const data = await res.json();
    if (data.imageUrl) return { url: data.imageUrl };
    if (data.imageBase64) return { url: "data:image/png;base64," + data.imageBase64 };
    throw new Error(data.note || "El servidor no devolvió imagen");
  },

  // Generar sin servidor: Together FLUX gratis, directo desde el navegador.
  // El prompt siempre lleva el bloqueo de personaje de buildImagePrompt().
  async imageDirect(userText) {
    const c = this.getConfig();
    if (!c.imageKey) throw new Error("Pon tu key de Together en Ajustes (Key para imágenes) para generar sin servidor");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);
    try {
      const res = await fetch("https://api.together.xyz/v1/images/generations", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + c.imageKey
        },
        body: JSON.stringify({
          model: "black-forest-labs/FLUX.1-schnell-Free",
          prompt: this.buildImagePrompt(userText),
          width: 768,
          height: 1024,
          steps: 4
        })
      });
      if (!res.ok) {
        let detail = "";
        try { detail = (await res.json()).error?.message || (await res.json()).error || ""; } catch (e) {}
        throw new Error("Imagen " + res.status + (detail ? ": " + detail : ""));
      }
      const data = await res.json();
      const item = (data.data && data.data[0]) || {};
      if (item.url) return { url: item.url };
      if (item.b64_json) return { url: "data:image/png;base64," + item.b64_json };
      throw new Error("Together no devolvió imagen");
    } catch (e) {
      if (e.name === "TypeError" || e.name === "AbortError") {
        throw new Error("Together no permitió la llamada desde el navegador. Usa tu servidor para generar imágenes.");
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  },

  // Punto único para el botón 🎨: con servidor usa el servidor, si no Together directo.
  // En ambos casos el prompt va con el bloqueo de personaje.
  async generateImage(userText) {
    const c = this.getConfig();
    if (c.useServer && c.serverUrl) return this.imageViaServer(this.buildImagePrompt(userText));
    return this.imageDirect(userText);
  },

  async chat(history, customSystem) {
    const c = this.getConfig();
    if (c.useServer && c.serverUrl) return this.chatViaServer(history, customSystem);
    if (!this.hasKey()) throw new Error("Sin API configurada");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    try {
      const res = await fetch(c.endpoint, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + c.key
        },
        body: JSON.stringify({
          model: c.model,
          messages: [{ role: "system", content: customSystem || this.systemPrompt() }].concat(history.slice(-16)),
          temperature: 0.9,
          max_tokens: 300
        })
      });
      if (!res.ok) {
        let detail = "";
        try { detail = (await res.json()).error?.message || ""; } catch (e) {}
        throw new Error("API " + res.status + (detail ? ": " + detail : ""));
      }
      const data = await res.json();
      const text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || "").trim();
      if (!text) throw new Error("Respuesta vacía del modelo");
      return text.slice(0, 800);
    } finally {
      clearTimeout(timer);
    }
  }
};
