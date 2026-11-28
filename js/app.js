// Aline — lógica del simulador. Código original, sin copiar de otros repos.
(function () {
  const $ = (s) => document.querySelector(s);
  const video = $("#stageVideo");
  const chatLog = $("#chatLog");
  const input = $("#chatInput");
  const sendBtn = $("#sendBtn");
  const animButtons = $("#animButtons");
  const animName = $("#animName");
  const animDesc = $("#animDesc");
  const gate = $("#gate");
  const app = $("#app");
  const ageCheck = $("#ageCheck");
  const enterBtn = $("#enterBtn");

  let current = "idle-guino";
  let idleTimer = null;
  let lastIdle = -1;

  // --- Puerta +18 ---
  const saved = localStorage.getItem("aline-18");
  if (saved === "si") { showApp(); } else { gate.classList.remove("hidden"); }
  ageCheck.addEventListener("change", () => { enterBtn.disabled = !ageCheck.checked; });
  enterBtn.addEventListener("click", () => {
    if (!ageCheck.checked) return;
    localStorage.setItem("aline-18", "si");
    showApp();
  });
  function showApp() {
    gate.classList.add("hidden");
    app.classList.remove("hidden");
    buildAnimButtons();
    playAnimation("idle-guino");
    refreshStatus();
    addMsg("aline", "Hola, soy Aline. ¿Qué quieres hacer hoy? Pídeme un beso, una mirada, o simplemente platica conmigo.");
    scheduleIdleRotation();
  }

  // --- Botones de animación ---
  function buildAnimButtons() {
    animButtons.innerHTML = "";
    Object.entries(ALINE.animaciones).forEach(([id, a]) => {
      const b = document.createElement("button");
      b.className = "chip";
      b.textContent = a.titulo;
      b.dataset.anim = id;
      b.addEventListener("click", () => playAnimation(id, true));
      animButtons.appendChild(b);
    });
  }
  function markActive(id) {
    document.querySelectorAll(".chip").forEach(c => c.classList.toggle("active", c.dataset.anim === id));
    const a = ALINE.animaciones[id];
    animName.textContent = "Aline — " + a.titulo;
    animDesc.textContent = a.descripcion + " · " + a.escenario;
  }

  // --- Reproductor de vídeo ---
  function playAnimation(id, manual) {
    const a = ALINE.animaciones[id];
    if (!a) return;
    current = id;
    markActive(id);
    video.loop = !!a.loop;
    if (video.getAttribute("src") !== a.archivo) {
      video.src = a.archivo;
    }
    video.play().catch(() => {});
    clearTimeout(idleTimer);
    if (!a.loop && a.vuelveA) {
      video.onended = () => playAnimation(a.vuelveA);
    } else {
      video.onended = null;
    }
    if (manual) scheduleIdleRotation();
  }
  video.addEventListener("error", () => {
    animDesc.textContent = "No se pudo cargar el vídeo " + (ALINE.animaciones[current] || {}).archivo + ". Revisa la carpeta clips/.";
  });

  // Rota el idle cada 22 s si el usuario no interactúa, sin repetir el mismo
  function scheduleIdleRotation() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      const pool = ALINE.idlePool.filter(id => id !== current);
      const next = pool[Math.floor(Math.random() * pool.length)];
      playAnimation(next);
      scheduleIdleRotation();
    }, 22000);
  }

  // --- Chat: modelo real si hay API, offline si no ---
  const history = [];
  const aiStatus = $("#aiStatus");
  function setStatus(txt, online) {
    if (!aiStatus) return;
    aiStatus.textContent = txt;
    aiStatus.classList.toggle("online", !!online);
  }
  function refreshStatus() {
    if (typeof ALINE_AI !== "undefined" && ALINE_AI.hasKey()) {
      const c = ALINE_AI.getConfig();
      if (c.useServer && c.serverUrl) {
        setStatus("IA: Mi servidor · Llama/Mistral + SD", true);
      } else {
        setStatus("IA: " + (ALINE_AI.presets[c.provider] || {}).label + " · " + c.model, true);
      }
    } else {
      setStatus("Offline · respuestas guardadas", false);
    }
  }
  function addMsg(who, text) {
    const div = document.createElement("div");
    div.className = "msg " + who;
    div.textContent = text;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
    return div;
  }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function findAnimFor(text) {
    const t = " " + text.toLowerCase() + " ";
    for (const [id, a] of Object.entries(ALINE.animaciones)) {
      if (a.triggers.some(k => t.includes(k))) return id;
    }
    return null;
  }
  function replyOffline(text) {
    const t = text.toLowerCase();
    for (const item of ALINE.respuestas) {
      if (item.k.some(k => t.includes(k))) return pick(item.r);
    }
    return pick(ALINE.fallback);
  }
  async function send() {
    const mensajeUsuario = input.value.trim();
    if (!mensajeUsuario) return;
    addMsg("tu", mensajeUsuario);
    input.value = "";

    // 1. Animaciones: ALINE_ANIMA.procesar (tu snippet)
    let animaTriggered = false;
    if (typeof ALINE_ANIMA !== "undefined") {
      const res = ALINE_ANIMA.procesar(mensajeUsuario);
      if (res.local) {
        addMsg("aline", res.local);
      }
      if (res.anima) {
        playAnimation(res.anima, true);
        animaTriggered = true;
      }
      // Comandos de animación resueltos en local (/lista, /anima, /pose, /idle):
      // no van al modelo.
      if (res.local && mensajeUsuario.startsWith("/")) {
        history.push({ role: "assistant", content: res.local });
        return;
      }
    }
    if (!animaTriggered) {
      const anim = findAnimFor(mensajeUsuario);
      if (anim) playAnimation(anim, true);
    }

    // 2. Skills: ALINE_SKILLS.procesar (tu snippet)
    let textoParaModelo = mensajeUsuario;
    let system = null;
    if (typeof ALINE_SKILLS !== "undefined") {
      const procesado = ALINE_SKILLS.procesar(mensajeUsuario);
      if (procesado.respuestaLocal) {
        // muestra esto directo en el chat (no va al modelo)
        addMsg("aline", procesado.respuestaLocal);
        history.push({ role: "assistant", content: procesado.respuestaLocal });
        return;
      }
      if (procesado.mensaje) textoParaModelo = procesado.mensaje;
      else if (procesado.mensaje === null) return;
      // Si sigue, manda al modelo usando el system con skills:
      if (typeof getSystemConSkills === "function") {
        system = getSystemConSkills();
      }
    }

    history.push({ role: "user", content: textoParaModelo });
    // Con API: modelo real. Sin API o si falla: offline, sin dejar tirado al usuario.
    if (typeof ALINE_AI !== "undefined" && ALINE_AI.hasKey()) {
      const typing = addMsg("aline typing", "Aline está escribiendo…");
      try {
        const answer = await ALINE_AI.chat(history, system);
        typing.remove();
        addMsg("aline", answer);
        history.push({ role: "assistant", content: answer });
        refreshStatus();
        return;
      } catch (e) {
        typing.remove();
        setStatus("Offline · falló la API, revisa tu key", false);
        const fallback = replyOffline(textoParaModelo);
        addMsg("aline", fallback);
        history.push({ role: "assistant", content: fallback });
        return;
      }
    }
    setTimeout(() => {
      const fallback = replyOffline(textoParaModelo);
      addMsg("aline", fallback);
      history.push({ role: "assistant", content: fallback });
    }, 500 + Math.random() * 500);
  }
  sendBtn.addEventListener("click", send);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });

  // Acciones rápidas
  document.querySelectorAll("[data-say]").forEach(b => {
    b.addEventListener("click", () => {
      input.value = b.dataset.say;
      send();
    });
  });

  // --- Generar imagen (solo con servidor: Stable Diffusion / FLUX) ---
  const imagePrompt = $("#imagePrompt");
  const imageBtn = $("#imageBtn");
  const imageMsg = $("#imageMsg");
  const generatedImage = $("#generatedImage");
  if (imageBtn) {
    imageBtn.addEventListener("click", async () => {
      const prompt = imagePrompt.value.trim();
      if (!prompt) { imageMsg.textContent = "Describe la imagen primero."; return; }
      imageMsg.textContent = "Generando imagen… puede tardar 20-60 s.";
      imageBtn.disabled = true;
      try {
        const img = await ALINE_AI.imageViaServer("Aline, adult fictional woman, brown hair in two ponytails, black Hello Kitty top: " + prompt);
        generatedImage.src = img.url;
        generatedImage.classList.remove("hidden");
        imageMsg.textContent = "Lista. Solo para adultos, personaje ficticio.";
      } catch (e) {
        imageMsg.textContent = "✗ " + e.message;
      } finally {
        imageBtn.disabled = false;
      }
    });
  }

  // --- Ajustes: nombre y modelo real BYOK (solo en este navegador) ---
  const nameInput = $("#userName");
  const apiInput = $("#apiKey");
  const providerSelect = $("#provider");
  const endpointInput = $("#endpoint");
  const modelInput = $("#model");
  const serverUrlInput = $("#serverUrl");
  const useServerInput = $("#useServer");
  const saveSettings = $("#saveSettings");
  const testBtn = $("#testApi");
  const apiMsg = $("#apiMsg");
  function fillPreset() {
    const p = (typeof ALINE_AI !== "undefined" && ALINE_AI.presets[providerSelect.value]) || {};
    if (providerSelect.value !== "custom") {
      endpointInput.value = p.endpoint || "";
      modelInput.value = p.model || "";
    }
  }
  if (typeof ALINE_AI !== "undefined") {
    const cfg = ALINE_AI.getConfig();
    providerSelect.value = cfg.provider;
    endpointInput.value = cfg.endpoint;
    modelInput.value = cfg.model;
    if (serverUrlInput) serverUrlInput.value = cfg.serverUrl || "";
    if (useServerInput) useServerInput.checked = !!cfg.useServer;
  }
  providerSelect.addEventListener("change", fillPreset);
  nameInput.value = localStorage.getItem("aline-nombre") || "";
  apiInput.value = localStorage.getItem("aline-api") ? "••••••••" : "";
  function saveAll() {
    localStorage.setItem("aline-nombre", nameInput.value.trim());
    localStorage.setItem("aline-provider", providerSelect.value);
    localStorage.setItem("aline-endpoint", endpointInput.value.trim());
    localStorage.setItem("aline-model", modelInput.value.trim());
    if (serverUrlInput) localStorage.setItem("aline-server-url", serverUrlInput.value.trim());
    if (useServerInput) localStorage.setItem("aline-use-server", useServerInput.checked ? "si" : "no");
    const v = apiInput.value.trim();
    if (v && v !== "••••••••") localStorage.setItem("aline-api", v);
    refreshStatus();
  }
  saveSettings.addEventListener("click", () => {
    saveAll();
    saveSettings.textContent = "Guardado ✓";
    setTimeout(() => saveSettings.textContent = "Guardar", 1500);
  });
  testBtn.addEventListener("click", async () => {
    saveAll();
    apiMsg.textContent = "Probando…";
    try {
      const answer = await ALINE_AI.chat([{ role: "user", content: "Hola, di solo: prueba ok" }]);
      apiMsg.textContent = "✓ Conectado. El modelo respondió: " + answer;
    } catch (e) {
      apiMsg.textContent = "✗ No conectó: " + e.message + ". Revisa proveedor, modelo y key.";
    }
  });
  $("#clearData").addEventListener("click", () => {
    ["aline-18", "aline-nombre", "aline-api", "aline-provider", "aline-endpoint", "aline-model", "aline-server-url", "aline-use-server", "aline-conversation-id", "aline-memoria", "aline-modo"].forEach(k => localStorage.removeItem(k));
    location.reload();
  });
})();
