// aline-animaciones.js
// Control avanzado de movimientos y animaciones del cuerpo de Aline
// Cárgalo después de personaje.js
// Comandos: /anima [nombre]   /pose [descripcion]   /idle   /lista

const ALINE_ANIMA = {
  // Mapeo extra de palabras → animación (además de los triggers de personaje.js)
  mapaExtra: {
    "coquetea": "idle-guino",
    "provoca": "idle-guino",
    "guiña": "idle-guino",
    "mira de lado": "perfil-izquierda",
    "tímida": "perfil-timida",
    "timida": "perfil-timida",
    "beso": "beso",
    "besame": "beso",
    "muah": "beso",
    "playa": "idle-playa",
    "mar": "idle-playa",
    "alberca": "idle-alberca",
    "piscina": "idle-alberca",
    "parque": "idle-parque",
    "sexy": "idle-guino",
    "caliente": "idle-guino",
    "acércate": "perfil-izquierda",
    "ven": "perfil-izquierda"
  },

  // Poses/descripciones que puedes usar para generar nuevos vídeos o prompts
  poses: {
    "coqueta": "Aline de frente, brazos cruzados bajo el pecho, sonrisa ladeada, guiño lento, cuerpo ligeramente arqueado.",
    "de lado": "Aline de perfil izquierdo, mirando sobre el hombro, boca entreabierta, coletas moviéndose suave.",
    "tímida": "Aline de perfil derecho, mirada baja, sonrisa pequeña, manos cerca del cuerpo.",
    "beso": "Aline cierra los ojos, manda un beso volado con la mano, termina con sonrisa ladeada.",
    "sensual": "Aline de frente, una mano en la cadera, la otra tocando el top, mirada fija y labios entreabiertos.",
    "playa": "Aline en la playa, brazos cruzados, brisa moviendo las coletas, sonrisa relajada.",
    "alberca": "Aline junto a la alberca, piel húmeda, brazos cruzados, mirada directa."
  },

  lista() {
    const base = Object.keys(ALINE.animaciones || {}).join(", ");
    return "Animaciones disponibles:\n" + base + "\n\nComandos:\n/anima [nombre]\n/pose [coqueta|de lado|tímida|beso|sensual|playa|alberca]\n/idle\n/lista";
  },

  // Procesa comando o mensaje y devuelve qué animación reproducir
  procesar(mensaje) {
    const t = mensaje.trim().toLowerCase();

    if (t.startsWith("/lista") || t === "/animas" || t === "/animaciones") {
      return { local: this.lista(), anima: null };
    }

    if (t.startsWith("/anima ") || t.startsWith("/anim ")) {
      const nombre = t.replace(/^\/anim[a]?\s+/, "").trim();
      if (ALINE.animaciones && ALINE.animaciones[nombre]) {
        return { local: "Reproduciendo: " + nombre, anima: nombre };
      }
      return { local: "No existe esa animación. Usa /lista", anima: null };
    }

    if (t.startsWith("/pose ")) {
      const pose = t.replace("/pose ", "").trim();
      const desc = this.poses[pose] || "Pose no definida. Disponibles: " + Object.keys(this.poses).join(", ");
      return { local: "Pose registrada para generar:\n" + desc, anima: null, prompt: desc };
    }

    if (t === "/idle") {
      const pool = ALINE.idlePool || ["idle-guino"];
      const random = pool[Math.floor(Math.random() * pool.length)];
      return { local: "Idle aleatorio: " + random, anima: random };
    }

    // Detección automática por palabras
    for (const [palabra, anima] of Object.entries(this.mapaExtra)) {
      if (t.includes(palabra)) {
        return { local: null, anima };
      }
    }

    return { local: null, anima: null };
  }
};

// Ejemplo de uso en tu reproductor de vídeo (app.js):
/*
function manejarMensaje(mensaje) {
  const res = ALINE_ANIMA.procesar(mensaje);
  if (res.local) {
    agregarMensaje("Aline", res.local);
  }
  if (res.anima) {
    reproducirAnimacion(res.anima); // tu función actual que cambia el <video>
  }
  // si res.prompt existe, lo puedes copiar para generar nuevo clip
}
*/
