# Aline — Compañera IA +18

Simulador de compañera IA adulta, para celular. Chat + animaciones en vídeo. Sin servidor, sin cuentas, sin claves en el código.

## Qué es

- **Personaje:** Aline, adulta ficticia. Pelo castaño en dos coletas, ojos rojos, top negro de Hello Kitty.
- **Chat con modelo real (BYOK):** conecta tu propia API OpenAI-compatible en Ajustes del sitio: proveedor, endpoint, modelo y key. La key se guarda solo en tu navegador (localStorage). Nunca va al repo ni al chat. Sin key, responde offline con respuestas locales en `js/personaje.js`.
- **Proveedores listos:** Groq (por defecto, `openai/gpt-oss-120b` — `llama-3.3-70b-versatile` ya no existe en cuentas nuevas de Groq, la API da 404), Together AI (`meta-llama/Llama-3.3-70B-Instruct-Turbo`), OpenAI (`gpt-4o-mini`), OpenRouter y DeepSeek, o uno personalizado con su endpoint de `chat/completions`.
- **Servidor propio (opcional, carpeta `server/`):** Node + Express que conecta con modelos open-source (Llama/Mistral vía Together AI, Replicate o tu propio servidor con GPUs con Ollama/vLLM) y motores de imagen (Stable Diffusion vía Together, Replicate o tu Automatic1111 local), y guarda los chats en PostgreSQL cifrados con AES-256-GCM. En Ajustes pon la URL de tu servidor y marca “Usar mi servidor”: ahí el chat y el botón 🎨 Generar imagen van por tu servidor, y la key ya no va en el navegador. El servidor acepta `system` por llamada, así los modos de skills llegan al modelo. Ver `server/README.md`.
- **Imágenes siempre de Aline, sin modificarla:** el botón 🎨 Generar imagen siempre usa el bloqueo de personaje (`ALINE_AI.buildImagePrompt()` en `js/ai.js`): misma cara, mismo pelo castaño en dos coletas, mismos ojos rojos, mismo top negro Hello Kitty, choker con cruz y shorts negros. Lo que escribas solo cambia escena, lugar o pose; si pides otra cosa, sale Aline con eso, no la cosa sola. Sin servidor, genera directo con Together FLUX gratis (`FLUX.1-schnell-Free`) usando la key de Together que pegues en Ajustes (Key para imágenes); si Together bloquea la llamada desde el navegador, usa tu servidor.
- **Skills y animaciones (`js/aline-skills.js`, `js/aline-animaciones.js`):** comandos en el chat. Skills: `/modo [libre|perito|arquitecta|sucia|tierna]`, `/recuerda`, `/olvida`, `/estado`, `/perito`, `/arquitecta`, `/ayuda` — el modo y la memoria se inyectan en el system prompt con `getSystemConSkills()`. Animaciones: `/lista`, `/anima [nombre]`, `/pose [coqueta|de lado|tímida|beso|sensual|playa|alberca]`, `/idle`, además de detección automática por palabras (beso, playa, parque…).
- **Puerta +18:** pide confirmar 18+ antes de entrar. Se guarda solo en el teléfono.

## Animaciones — los 7 vídeos

Todos en `clips/`, 10 s, 688×1152, vertical, con audio AAC (se reproducen en silencio, `muted`, como tus otros simuladores).

| Archivo | Animación | Escenario | Disparador en chat |
|---|---|---|---|
| `aline-01-idle-guino.mp4` | Guiño (idle principal) | Fondo claro | hola, saluda, guiño |
| `aline-02-idle-parque.mp4` | Parque | Parque con árboles | parque, paseo |
| `aline-03-idle-alberca.mp4` | Alberca | Alberca | alberca, piscina, verano |
| `aline-04-perfil-izquierda.mp4` | Mirada de lado | Playa, perfil izquierdo | mirada, perfil, mírame |
| `aline-05-idle-playa.mp4` | Playa | Playa / cielo | playa, mar, sol |
| `aline-06-perfil-timida.mp4` | Tímida | Ciudad, perfil derecho | tímida, tierna, dulce |
| `aline-07-beso.mp4` | Beso | Fondo claro | beso, bésame, te quiero, amor |

El idle rota solo cada 22 s entre las 6 de idle/perfil. El beso es una reacción: se reproduce una vez y vuelve al guiño.

También hay botones directos para cada animación y botones rápidos: Hola, Beso, Mírame, Te quiero, Anímame.

## Archivos

```
index.html          — puerta +18, escenario de vídeo, chat, ajustes
css/app.css         — diseño móvil, vertical
js/personaje.js     — Aline: animaciones, triggers, respuestas offline
js/ai.js            — cliente de modelo real OpenAI-compatible (BYOK)
js/app.js           — puerta, reproductor, rotación idle, chat (modelo o offline)
clips/*.mp4         — 7 vídeos del personaje (34 MB en total)
img/poster.jpg      — póster (frame del vídeo 01)
img/poster-beso.jpg — póster del beso
manifest.webmanifest
.nojekyll           — para GitHub Pages
```

## Publicar en GitHub Pages

1. Crear el repo `Alfredo829-dot/aline` (público).
2. Subir todo el contenido de esta carpeta a la rama `main`.
3. En Settings → Pages → Deploy from branch → `main` / `/ (root)`.
4. Abrir `https://alfredo829-dot.github.io/aline/`.

Nota: GitHub Pages tiene límite recomendado de 100 MB por repo; este proyecto pesa ~34 MB, cabe sin problema.

## Privacidad

- Sin cuentas, sin servidor, sin analítica.
- La confirmación +18, tu nombre y tu API key (si la pones) viven solo en tu navegador.
- “Borrar mis datos de este teléfono” limpia todo y vuelve a pedir la edad.

## Estado

Terminado: puerta +18, 7 animaciones ligadas, chat offline con triggers, rotación idle, botones, ajustes y README. Falta solo crear el repo y subirlo.
