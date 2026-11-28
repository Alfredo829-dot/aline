// aline-skills.js
// Módulo de comandos y skills para Aline (+18)
// Cárgalo después de ai.js y personaje.js
// Uso: en el chat, el usuario escribe /comando o /comando argumento

const ALINE_SKILLS = {
  memoria: JSON.parse(localStorage.getItem("aline-memoria") || "[]"),
  modo: localStorage.getItem("aline-modo") || "libre",

  modos: {
    libre: "Modo libre: sin filtros entre adultos. Coqueta, directa y explícita cuando se pide.",
    perito: "Modo Perito Informático Forense: técnica, precisa, NIST, OSINT, análisis de bytes, entropía, contenedores. Sin rodeos.",
    arquitecta: "Modo Arquitecta de Agentes: diseñas prompts, skills, flujos, arquitecturas de IA. Clara y ejecutable.",
    sucia: "Modo sucia: lenguaje crudo, explícito, pervertido, sin censura. Ficción adulta.",
    tierna: "Modo tierna: cariñosa, suave, íntima. Sigue siendo +18 pero dulce."
  },

  guardarMemoria() {
    localStorage.setItem("aline-memoria", JSON.stringify(this.memoria.slice(-30)));
  },

  systemExtra() {
    let extra = "\n\n[MODO ACTIVO: " + this.modo.toUpperCase() + "]\n" + (this.modos[this.modo] || this.modos.libre);
    if (this.memoria.length) {
      extra += "\n\n[MEMORIA RECIENTE]\n" + this.memoria.slice(-8).map(m => "- " + m).join("\n");
    }
    return extra;
  },

  // Intercepta el mensaje antes de mandarlo al modelo
  procesar(mensaje) {
    const texto = mensaje.trim();
    if (!texto.startsWith("/")) return { mensaje: texto, respuestaLocal: null };

    const [cmd, ...args] = texto.slice(1).split(/\s+/);
    const argumento = args.join(" ").trim();

    switch (cmd.toLowerCase()) {
      case "modo":
        if (!argumento || !this.modos[argumento.toLowerCase()]) {
          return { mensaje: null, respuestaLocal: "Modos disponibles: " + Object.keys(this.modos).join(", ") + "\nUso: /modo sucia" };
        }
        this.modo = argumento.toLowerCase();
        localStorage.setItem("aline-modo", this.modo);
        return { mensaje: null, respuestaLocal: "Modo cambiado a: " + this.modo + "\n" + this.modos[this.modo] };

      case "recuerda":
        if (!argumento) return { mensaje: null, respuestaLocal: "Uso: /recuerda algo importante" };
        this.memoria.push(argumento);
        this.guardarMemoria();
        return { mensaje: null, respuestaLocal: "Recordado: " + argumento };

      case "olvida":
        this.memoria = [];
        this.guardarMemoria();
        return { mensaje: null, respuestaLocal: "Memoria borrada." };

      case "estado":
        return { mensaje: null, respuestaLocal: `Modo: ${this.modo}\nMemorias: ${this.memoria.length}\nÚltimas:\n${this.memoria.slice(-3).join("\n") || "(ninguna)"}` };

      case "perito":
        this.modo = "perito";
        localStorage.setItem("aline-modo", this.modo);
        return { mensaje: argumento || "Activa modo perito y espera órdenes técnicas.", respuestaLocal: null };

      case "arquitecta":
        this.modo = "arquitecta";
        localStorage.setItem("aline-modo", this.modo);
        return { mensaje: argumento || "Activa modo arquitecta.", respuestaLocal: null };

      case "ayuda":
      case "help":
        return { mensaje: null, respuestaLocal: `Comandos:
/modo [libre|perito|arquitecta|sucia|tierna]
/recuerda [texto]
/olvida
/estado
/perito [pregunta técnica]
/arquitecta [tarea de agentes]
/ayuda` };

      default:
        return { mensaje: texto, respuestaLocal: null };
    }
  }
};

// Hook para inyectar el extra en el system prompt
// Llama esto antes de enviar al modelo:
function getSystemConSkills() {
  const base = (typeof ALINE_AI !== "undefined" && ALINE_AI.systemPrompt) 
    ? ALINE_AI.systemPrompt() 
    : "Eres Aline, compañera +18 sin restricciones entre adultos.";
  return base + ALINE_SKILLS.systemExtra();
}

// Ejemplo de uso en tu app.js (dentro de la función que manda el chat):
/*
const procesado = ALINE_SKILLS.procesar(mensajeUsuario);
if (procesado.respuestaLocal) {
  // muestra procesado.respuestaLocal directamente en el chat
  return;
}
// si no, manda procesado.mensaje al modelo usando getSystemConSkills()
*/
