# Aline server

Servidor propio para Aline: chat con modelos open-source + imágenes + historial encriptado en PostgreSQL.

El sitio estático (`index.html`, GitHub Pages) sigue funcionando solo. El servidor es opcional: cuando lo configuras en Ajustes del sitio, el chat pasa por tu servidor en vez de llamar directo a la API desde el navegador, y los chats se guardan cifrados.

## Qué hace

- **Chat open-source:** Llama o Mistral, sin depender de OpenAI.
  - `together` — Together AI (recomendado para empezar, gratis al registrarse). Modelo por defecto: `meta-llama/Llama-3.3-70B-Instruct-Turbo`. También `mistralai/Mixtral-8x7B-Instruct-v0.1`.
  - `replicate` — Replicate, con tu token.
  - `ollama` — tu propio servidor con GPUs: Ollama, vLLM o llama.cpp con endpoint OpenAI-compatible (`OLLAMA_URL`, `OLLAMA_MODEL=llama3.1` o `mistral`).
  - `custom` — cualquier endpoint OpenAI-compatible que tú pongas.
  - `mock` — solo para probar sin keys.
- **Imágenes:** Stable Diffusion / FLUX.
  - `together` — Together AI Images.
  - `replicate` — Replicate SDXL / FLUX.
  - `local-sd` — tu propio Stable Diffusion con Automatic1111 en `http://localhost:7860` (`/sdapi/v1/txt2img`).
- **Base de datos ligera:** PostgreSQL, 2 tablas (`conversations`, `messages`, ver `schema.sql`). El contenido se guarda **cifrado con AES-256-GCM** (ver `crypto.js`): en la base nunca hay texto legible. Sin `CHAT_ENCRYPTION_KEY` el servidor no guarda chats, pero el chat sigue respondiendo.
- **Guardas:** el personaje es adulto y ficticio. Los prompts de imagen con menores se rechazan.

## Arrancar en 2 minutos (local)

```bash
cd server
cp .env.example .env
# Edita .env: pon CHAT_ENCRYPTION_KEY (openssl rand -hex 32)
# y TOGETHER_API_KEY (https://api.together.ai) o tu proveedor.
npm install
npm start
# -> http://localhost:3001/health
```

Prueba sin keys ni DB:

```bash
npm test
```

## Con PostgreSQL (Docker)

```bash
cd server
# Pon CHAT_ENCRYPTION_KEY y TOGETHER_API_KEY en .env
docker compose up --build
# DB en localhost:5432, server en localhost:3001
```

O con una Postgres en la nube (Neon, Railway, Supabase): pega su URL en `DATABASE_URL` en `.env`. El servidor crea las tablas solo al arrancar.

## Endpoints

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/health` | Estado: proveedor, DB, cifrado |
| GET | `/api/providers` | Proveedores configurados (sin keys) |
| POST | `/api/chat` | `{ messages, conversationId?, provider?, model? }` → `{ reply, conversationId, saved }` |
| GET | `/api/conversations` | Lista de chats guardados |
| GET | `/api/conversations/:id/messages` | Historial descifrado en el servidor |
| DELETE | `/api/conversations/:id` | Borra un chat |
| POST | `/api/image` | `{ prompt, provider? }` → `{ imageUrl }` o `{ imageBase64 }` |

## Conectar el sitio

En el sitio (Ajustes): pon **URL de tu servidor** (ej. `http://localhost:3001` en pruebas, o tu dominio/VPS en producción) y marca **Usar mi servidor**. A partir de ahí el chat y el botón de imagen van por `/api/chat` y `/api/image`, y la key ya no va en el navegador: va solo en el `.env` del servidor.

## Seguridad

- Nunca subas `.env` a GitHub (ya está en `.gitignore`).
- `CHAT_ENCRYPTION_KEY` es la única llave para leer los chats viejos: si la pierdes, los chats guardados no se pueden descifrar. Guárdala aparte.
- En producción pon `ALLOWED_ORIGIN=https://tu-dominio` y sirve el server detrás de HTTPS.
