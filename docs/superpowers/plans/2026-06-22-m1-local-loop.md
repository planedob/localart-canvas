# M1 Local Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the local Ollama + ComfyUI annotation-to-revision loop with a custom image shape and filesystem persistence.

**Architecture:** Replace Cloudflare runtime coupling with an Express tool server while keeping the Vite React client. Add tested adapters for Ollama, ComfyUI, and canvas storage; keep UI orchestration thin and create generated images through a registered tldraw custom shape.

**Tech Stack:** React 19, tldraw 5, Vite 8, Express, TypeScript, Vitest, Ollama OpenAI-compatible API, ComfyUI Workflow API.

---

### Task 1: Local server foundation

**Files:**
- Create: `server/config.ts`, `server/app.ts`, `server/index.ts`, `server/config.test.ts`
- Modify: `package.json`, `vite.config.ts`, `tsconfig.json`

- [x] Add Vitest, Express, tsx, concurrently, and Node typings.
- [x] Write failing config tests for localhost defaults and environment overrides.
- [x] Run the focused test and confirm failure.
- [x] Implement config parsing and make the tests pass.
- [x] Add `/api/health` and dev scripts.
- [x] Run tests and build.
- [x] Commit `feat: add local tool server`.

### Task 2: Ollama conversation slice

**Files:**
- Create: `server/ollama/OllamaClient.ts`, `server/ollama/OllamaClient.test.ts`
- Modify: `server/app.ts`

- [x] Write failing tests for model discovery, configured-model selection, no-model error, success, and HTTP error mapping.
- [x] Implement the minimal client against `/api/tags` and `/v1/chat/completions`.
- [x] Add `POST /api/chat`.
- [x] Run tests and build.
- [x] Add a minimal panel response path and verify with a real local model.
- [x] Commit `feat: connect local ollama chat`.

### Task 3: AIImageHolder

**Files:**
- Create: `client/shapes/AIImageHolderShape.tsx`, `client/shapes/AIImageHolderShape.test.ts`
- Modify: `client/App.tsx`, `client/components/chat-history/TldrawViewer.tsx`

- [x] Write failing tests for default props and rectangle geometry.
- [x] Implement the shape util and component.
- [x] Register it in both editors.
- [x] Browser-test display, move, and delete.
- [x] Commit `feat: add ai image holder shape`.

### Task 4: ComfyUI adapter

**Files:**
- Create: `server/comfy/ComfyUIClient.ts`, `server/comfy/ComfyUIClient.test.ts`, `server/comfy/workflow.ts`
- Modify: `server/app.ts`

- [x] Write failing tests for workflow patching, submit success, node validation error, completed output, and timeout.
- [x] Implement `/prompt`, bounded `/history/{id}` polling, `/view`, and asset storage.
- [x] Add `POST /api/generations`.
- [x] Run tests and build.
- [x] Commit `feat: add comfyui generation adapter`.

### Task 5: Annotation-to-revision UI

**Files:**
- Create: `client/local-api.ts`, `client/revision-context.ts`, tests for both
- Modify: `client/components/ChatPanel.tsx`, `client/components/ChatInput.tsx`, `client/index.css`

- [x] Write failing tests for context serialization and placement to the right of source bounds.
- [x] Implement selected-shape summaries and screenshot capture.
- [x] Show Ollama response and generation status.
- [x] Create `AIImageHolder` from the returned asset URL.
- [x] Browser-test the full flow with real Ollama and a fake ComfyUI protocol service.
- [x] Commit `feat: add comfyui flow and local persistence`.

### Task 6: Filesystem persistence

**Files:**
- Create: `server/storage/CanvasStore.ts`, `server/storage/CanvasStore.test.ts`
- Modify: `server/app.ts`, `client/App.tsx`

- [x] Write failing tests for missing state, atomic write/read, corrupt JSON, and asset path validation.
- [x] Implement `GET/PUT /api/canvas/state` and `/assets`.
- [x] Add debounced save and startup restore.
- [ ] Browser-test restart recovery.
- [x] Commit `feat: add comfyui flow and local persistence`.

### Task 7: M1 verification

**Files:**
- Modify: `README.md`, `PROGRESS.md`

- [x] Run `npm test`.
- [x] Run `npm run build`.
- [x] Verify no-cloud-key startup.
- [x] Complete a real Ollama conversation.
- [ ] Complete a real ComfyUI generation and annotation-to-revision flow.
- [ ] Restart and verify state recovery.
- [ ] Push `main`, wait for green CI, create and push `m1-done`.
