# Canvas History UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a sidebar history panel that lists canvas versions and restores a chosen version into the active tldraw editor.

**Architecture:** Keep backend communication in `client/canvas-history.ts`, keep rendering/state in `client/components/HistoryPanel.tsx`, and mount the panel from `client/App.tsx`. Tests cover the API wrapper and presentational markup; a focused bundle check catches TS/React integration.

**Tech Stack:** React 19, TypeScript, tldraw `Editor.loadSnapshot`, existing Express canvas history API, Vitest-style tests bundled via esbuild.

---

### Task 1: Canvas history client API

**Files:**
- Create: `client/canvas-history.ts`
- Create: `client/canvas-history.test.ts`

- [ ] Write failing tests for list and restore API behavior.
- [ ] Run focused bundle/test command and confirm missing module/export failure.
- [ ] Implement `listCanvasVersions()` and `restoreCanvasVersion()`.
- [ ] Re-run focused checks and commit.

### Task 2: History panel rendering and state

**Files:**
- Create: `client/components/HistoryPanel.tsx`
- Create: `client/components/HistoryPanel.test.tsx`
- Modify: `client/index.css`

- [ ] Write presentational render tests for empty and populated states.
- [ ] Confirm tests fail because the component does not exist.
- [ ] Implement `HistoryPanelView` and stateful `HistoryPanel`.
- [ ] Add compact dark sidebar styles.
- [ ] Re-run focused checks and commit.

### Task 3: Mount panel in the app

**Files:**
- Modify: `client/App.tsx`

- [ ] Add the panel below `ModelRoutingPanel` when `editor` is available.
- [ ] Run focused bundle check over `client/App.tsx`, `HistoryPanel`, and tests.
- [ ] Update `PROGRESS.md` with verification evidence and commit.
