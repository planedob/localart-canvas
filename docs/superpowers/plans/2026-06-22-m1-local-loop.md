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
- [ ] Commit `feat: add local tool server`.

### Task 2: Ollama conversation slice

**Files:**
- Create: `server/ollama/OllamaClient.ts`, `server/ollama/OllamaClient.test.ts`
- Modify: `server/app.ts`

- [x] Write failing tests for model discovery, configured-model selection, no-model error, success, and HTTP error mapping.
- [x] Implement the minimal client against `/api/tags` and `/v1/chat/completions`.
- [x] Add `POST /api/chat`.
- [x] Run tests and build.
- [x] Add a minimal panel response path and verify with a real local model.
- [ ] Commit `feat: connect local ollama chat`.

### Task 3: AIImageHolder

**Files:**
- Create: `client/shapes/AIImageHolderShape.tsx`, `client/shapes/AIImageHolderShape.test.ts`
- Modify: `client/App.tsx`, `client/components/chat-history/TldrawViewer.tsx`

- [x] Write failing tests for default props and rectangle geometry.
- [x] Implement the shape util and component.
- [x] Register it in both editors.
- [x] Browser-test display, move, and delete.
- [ ] Commit `feat: add ai image holder shape`.

### Task 4: ComfyUI adapter

**Files:**
- Create: `server/comfy/ComfyUIClient.ts`, `server/comfy/ComfyUIClient.test.ts`, `server/comfy/workflow.ts`
- Modify: `server/app.ts`

- [ ] Write failing tests for workflow patching, submit success, node validation error, completed output, timeout, and execution error.
- [ ] Implement `/prompt`, bounded `/history/{id}` polling, `/view`, and asset storage.
- [ ] Add `POST /api/generations`.
- [ ] Run tests and build.
- [ ] Commit `feat: add comfyui generation adapter`.

### Task 5: Annotation-to-revision UI

**Files:**
- Create: `client/local-api.ts`, `client/revision-context.ts`, tests for both
- Modify: `client/components/ChatPanel.tsx`, `client/components/ChatInput.tsx`, `client/index.css`

- [ ] Write failing tests for context serialization and placement to the right of source bounds.
- [ ] Implement selected-shape summaries and screenshot capture.
- [ ] Show Ollama response and generation status.
- [ ] Create `AIImageHolder` from the returned asset URL.
- [ ] Browser-test the full flow with fake Ollama/ComfyUI responses.
- [ ] Commit `feat: connect annotation revision flow`.

### Task 6: Filesystem persistence

**Files:**
- Create: `server/storage/CanvasStore.ts`, `server/storage/CanvasStore.test.ts`
- Modify: `server/app.ts`, `client/App.tsx`

- [ ] Write failing tests for missing state, atomic write/read, corrupt JSON, and asset path validation.
- [ ] Implement `GET/PUT /api/canvas/state` and `/assets`.
- [ ] Add debounced save and startup restore.
- [ ] Browser-test restart recovery.
- [ ] Commit `feat: persist canvas locally`.

### Task 7: M1 verification

**Files:**
- Modify: `README.md`, `PROGRESS.md`

- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Verify no-cloud-key startup.
- [ ] Complete a real Ollama conversation.
- [ ] Complete a real ComfyUI generation and annotation-to-revision flow.
- [ ] Restart and verify state recovery.
- [ ] Push `main`, wait for green CI, create and push `m1-done`.
