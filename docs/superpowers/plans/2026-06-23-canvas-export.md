# Canvas Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add local JSON and ZIP export for the current canvas state and assets.

**Architecture:** The Express tool server exposes download endpoints backed by the existing `CanvasStore` and `canvas/assets` directory. The renderer adds export buttons that navigate to the loopback endpoints, so secrets never leave local disk.

**Tech Stack:** Node/Express, React, TypeScript, Vitest, Supertest, built-in `node:zlib` for ZIP output.

---

### Task 1: Server export endpoints

**Files:**
- Modify: `server/app.ts`
- Modify: `server/app.test.ts`
- Create: `server/export/zip.ts`
- Test: `server/export/zip.test.ts`

- [ ] Write failing tests for `/api/export/canvas.json` and `/api/export/canvas.zip`.
- [ ] Implement a minimal ZIP writer using local file bytes and stored canvas JSON.
- [ ] Add Express endpoints with attachment headers.
- [ ] Run `npx vitest run server/app.test.ts server/export/zip.test.ts`.
- [ ] Commit as `feat: add canvas export endpoints`.

### Task 2: Renderer export controls

**Files:**
- Create: `client/export-api.ts`
- Modify: `client/components/ChatPanel.tsx`
- Modify: `client/index.css`
- Test: `client/export-api.test.ts`

- [ ] Write a failing test for export URL helpers.
- [ ] Add two local export buttons: JSON and ZIP.
- [ ] Keep export UI simple and local-only; no API keys or external upload.
- [ ] Run `npx vitest run client/export-api.test.ts client/components/ChatPanel.test.tsx`.
- [ ] Commit as `feat: add canvas export controls`.

### Task 3: Verification and progress

**Files:**
- Modify: `README.md`
- Modify: `PROGRESS.md`

- [ ] Run `npm test`.
- [ ] Run `npm run build` or use GitHub Actions if the local machine hits the known low-memory TypeScript/Vite hang.
- [ ] Record export usage and verification.
- [ ] Push and confirm GitHub CI + Desktop package are green.
