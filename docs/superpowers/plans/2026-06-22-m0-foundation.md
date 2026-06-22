# M0 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the official tldraw Agent Starter Kit as the runnable LocalArt Canvas baseline and document the integration points needed for M1.

**Architecture:** Preserve the starter kit's `client`, `shared`, and `worker` boundaries during M0. Verify the unmodified upstream baseline first; M1 will then replace Cloudflare/provider coupling behind focused local adapters using test-first changes.

**Tech Stack:** Vite 8, React 19, TypeScript 5.8, tldraw 5, Cloudflare Workers baseline, Ollama, ComfyUI.

---

### Task 1: Replace the coordination skeleton with the official starter

**Files:**
- Create: `client/**`, `shared/**`, `worker/**`, `package.json`, `package-lock.json`, `vite.config.ts`, `wrangler.toml`
- Preserve: `AGENTS.md`, `LocalArt-Canvas-Codex开发任务书.md`, `docs/**`

- [x] Copy the official `tldraw/agent-template` working tree without its `.git` directory.
- [x] Change package metadata to LocalArt Canvas without changing runtime behavior.
- [x] Install locked dependencies with `npm install`.
- [x] Commit with `chore: adopt tldraw agent starter`.

### Task 2: Verify the official baseline

**Files:**
- Modify: `PROGRESS.md`

- [x] Run `npm run build`; expect exit code 0.
- [x] Run `npm run dev` and open the reported local URL.
- [x] Create, select, move, and delete a canvas shape.
- [x] Record the exact commands and observed result in `PROGRESS.md`.

### Task 3: Map M1 integration points

**Files:**
- Create: `docs/notes.md`

- [x] Identify custom shape registration and editor UI composition points.
- [x] Identify prompt parts for selected shapes and screenshots.
- [x] Identify action registration and execution points.
- [x] Identify all Cloudflare and hosted-model dependencies.
- [x] Identify tldraw license/watermark behavior without bypassing license terms.
- [x] Document ComfyUI `/prompt`, `/history/{prompt_id}`, `/view`, WebSocket status, API workflow format, and validation errors.
- [x] Document Ollama `http://localhost:11434/v1/chat/completions`, model selection, streaming, and local error handling.

### Task 4: Make the repository reproducible

**Files:**
- Modify: `README.md`, `.github/workflows/ci.yml`, `PROGRESS.md`

- [x] Replace obsolete multi-Agent instructions with install, dev, build, and M0 notes.
- [x] Update CI to run the actual install and build commands.
- [x] Run `npm ci` followed by `npm run build`; expect both to exit 0.
- [x] Verify the documented browser interaction again.
- [ ] Commit with `docs: document m0 baseline`.
- [ ] Push `main`, create and push `m0-done`.
