<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1TUxPiwlT5x4F3d_1enBxpHa-q5yEK4w_

## Run Locally

**Prerequisites**
- Node.js 18+
- A Gemini API key (2.5 Flash access recommended)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create or update `.env.local` in the project root:

```
GEMINI_API_KEY=your-key-here
PORT=4000                # optional, defaults to 4000
VITE_API_BASE_URL=       # optional, leave blank for same-origin proxy
VITE_API_PROXY=http://localhost:4000
VITE_USE_FIREBASE_EMULATORS=false
VITE_FIREBASE_AUTH_EMULATOR_URL=http://127.0.0.1:9099
VITE_FIRESTORE_EMULATOR_HOST=127.0.0.1
VITE_FIRESTORE_EMULATOR_PORT=8080
```

> `VITE_API_PROXY` lets Vite proxy `/api/*` calls to the Express server during local development.
> Leave `VITE_USE_FIREBASE_EMULATORS=false` to talk to your hosted Firebase project. Flip it to `true` to keep everything local (see below).

### 3. Run the full stack

Start the ingestion/export server **and** the Vite client in parallel:

```bash
npm run dev:full
```

This runs:
- `npm run dev:server` → Express API at http://localhost:4000
- `npm run dev` → Vite dev server at http://localhost:3000 (proxied requests to `/api`)

If you prefer separate terminals, start the backend first:

```bash
npm run dev:server
```

Then, in a second terminal, run the client only:

```bash
npm run dev
```

You can confirm the API is live by opening http://localhost:4000/health or running:

```bash
curl http://localhost:4000/health
```

### 4. Optional: run fully offline with Firebase emulators

If your network blocks `firestore.googleapis.com`, keep auth + recipe storage local:

```bash
export VITE_USE_FIREBASE_EMULATORS=true
npm run firebase:emulators   # starts Firestore + Auth on 8080 / 9099
```

In a second terminal:

```bash
npm run dev
```

Or run both together:

```bash
VITE_USE_FIREBASE_EMULATORS=true npm run dev:emulated
```

The UI will now talk exclusively to the local emulators, so no external Google domains are required.

### 5. Build for production

```bash
npm run build
```

Serve the generated `dist/` folder behind the same origin as the Express API (or set `VITE_API_BASE_URL` to the deployed server URL).

## Feature Highlights

- **Agentic ingestion pipeline** – upload video, audio, multi-image scans, raw text, or paste TikTok/Shorts/Reels URLs. The backend downloads media, samples frames with FFmpeg, transcribes audio, and runs OCR before handing everything to Gemini 2.5 Flash.
- **Language-aware recipes** – automatic language detection keeps the final recipe in Portuguese, Spanish, English, etc., matching the source material (or an optional override).
- **Rich exports** – download PDF/Markdown/Plain text/JSON locally, or push the recipe to Notion (via integration secret + database ID) and Google Drive (via OAuth access token).
- **Metadata transparency** – transcripts and OCR notes are stored alongside recipes so you can audit how a recipe was assembled.
- **Local account + cookbook** – mock authentication keeps saved recipes per user; data stays in the browser for now but the API layer is ready for a hosted database.

> **Note:** Social media downloads happen server-side. The backend now uses `yt-dlp` to fetch Instagram/TikTok/YouTube clips automatically, but some platforms still require authenticated cookies. When that occurs, you’ll see a descriptive error—download the media manually and upload the file instead.

## Troubleshooting

| Symptom | Root Cause | Fix |
| --- | --- | --- |
| `http proxy error: /api/recipes` / `ECONNREFUSED` in Vite console | The Express ingestion server is not running, so the Vite dev proxy cannot reach `http://localhost:4000`. | Start the backend with `npm run dev:server` (or `npm run dev:full`) and wait for `ChefAI server running on http://localhost:4000`. Refresh the browser after the server boots. |
| `GEMINI_API_KEY missing` warning in server output | `.env.local` not configured or key name mismatch. | Ensure `.env.local` contains `GEMINI_API_KEY=...` and restart the server. |
| Video download fails for certain URLs | Platform requires authenticated cookies. | Download the video manually and use the upload flow. |

If the proxy has already logged errors, restart both terminals to clear the state: stop all processes, run `npm run dev:server`, verify `/health`, then run `npm run dev`.
