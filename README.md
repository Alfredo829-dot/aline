# Aline — Compañera IA +18

Simulador de compañera IA adulta, para celular. Chat + animaciones en vídeo. Sin servidor, sin cuentas, sin claves en el código.

## Qué es

- **Personaje:** Aline, adulta ficticia. Pelo castaño en dos coletas, ojos rojos, top negro de Hello Kitty.
- **Chat offline:** responde sin internet y sin API, con respuestas locales en `js/personaje.js`.
- **API opcional (BYOK):** si quieres conectarle tu propia API, la key se guarda solo en tu navegador (localStorage). Nunca va al repo.
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
js/app.js           — puerta, reproductor, rotación idle, chat
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
