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

  // --- Chat offline ---
  function addMsg(who, text) {
    const div = document.createElement("div");
    div.className = "msg " + who;
    div.textContent = text;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
  }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function findAnimFor(text) {
    const t = " " + text.toLowerCase() + " ";
    for (const [id, a] of Object.entries(ALINE.animaciones)) {
      if (a.triggers.some(k => t.includes(k))) return id;
    }
    return null;
  }
  function reply(text) {
    const t = text.toLowerCase();
    for (const item of ALINE.respuestas) {
      if (item.k.some(k => t.includes(k))) return pick(item.r);
    }
    return pick(ALINE.fallback);
  }
  function send() {
    const text = input.value.trim();
    if (!text) return;
    addMsg("tu", text);
    input.value = "";
    const anim = findAnimFor(text);
    if (anim) playAnimation(anim, true);
    setTimeout(() => addMsg("aline", reply(text)), 500 + Math.random() * 500);
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

  // --- Ajustes: nombre y API opcional (BYOK, solo en este navegador) ---
  const nameInput = $("#userName");
  const apiInput = $("#apiKey");
  const saveSettings = $("#saveSettings");
  nameInput.value = localStorage.getItem("aline-nombre") || "";
  apiInput.value = localStorage.getItem("aline-api") ? "••••••••" : "";
  saveSettings.addEventListener("click", () => {
    localStorage.setItem("aline-nombre", nameInput.value.trim());
    const v = apiInput.value.trim();
    if (v && v !== "••••••••") localStorage.setItem("aline-api", v);
    saveSettings.textContent = "Guardado ✓";
    setTimeout(() => saveSettings.textContent = "Guardar", 1500);
  });
  $("#clearData").addEventListener("click", () => {
    localStorage.removeItem("aline-18");
    localStorage.removeItem("aline-nombre");
    localStorage.removeItem("aline-api");
    location.reload();
  });
})();
