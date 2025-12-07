# ChefAI Revamp Plan

## Goals
- Support multimodal ingestion (video, audio, images, URLs, text) with language-aware prompts.
- Extract transcripts and frame thumbnails to feed Gemini 2.5 for higher fidelity recipes.
- Keep output language aligned with detected source language (pt-pt, es, etc.).
- Add persistence with lightweight account creation plus export flows (PDF, Notion markdown, Drive-friendly JSON, plaintext).

## Architecture Overview
1. **Media Intake Layer** (`CreateRecipe`)
   - Drag/drop zone accepts combined video, audio, image, or document files.
   - Optional URL mode that defers to a new ingestion API (future-proof) but falls back to upload instructions today.
   - Language selector: auto-detect via transcript/OCR; user can override.
   - Video frame capture via `<video>` + `<canvas>` while client-side.

2. **Processing Services**
   - `mediaPipelineService.ts`: orchestrates
     1. `transcribeMedia` (Gemini) for audio/video.
     2. `runOcrOnImages` (Gemini text-only call) for cookbook photos.
     3. `detectLanguageFromText` using `franc` fallback to transcript detection call.
   - `generateRecipe` now receives transcripts, OCR, user instructions, captured frame, chosen language, and uses structured output enforcement.

3. **Persistence / Auth**
   - Replace ad-hoc prompt login with email-based local profile store (IndexedDB wrapper) to allow multiple accounts.
   - Provide abstraction `storageService.ts` that can later swap to Supabase; currently uses `localforage` for async storage.

4. **Export + Sharing**
   - PDF generation via `jspdf` + `html2canvas`.
   - Notion export: create Markdown + `notion-export.json` describing blocks; download as `.zip` for manual import.
   - Google Drive export: generate `.json` and trigger browser download; hooking to Drive API later by uploading same payload.
   - Plaintext copy / download already present; extend for structured text.

5. **UI Enhancements**
   - `RecipeView` gains Export drawer (PDF, Notion package, Drive JSON, Plaintext) plus Save toggles.
   - Dashboard surfaces saved recipes per account, with filters + search across languages.

## Phases
1. Refactor types and storage utilities.
2. Implement services (media pipeline, Gemini orchestration, export helpers).
3. Update UI flows (CreateRecipe, RecipeView, App navigation) for new features.
4. Polish error handling, loading states, and i18n scaffolding.
