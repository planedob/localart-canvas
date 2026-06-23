# Agent Shortcuts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add visible keyboard shortcuts for PNG export and revision generation in the LocalArt Agent panel.

**Architecture:** Put shortcut matching/filtering in `client/agent-shortcuts.ts`, test it directly, and wire it from `ChatPanel` with a document-level keydown listener.

**Tech Stack:** React 19, TypeScript, browser KeyboardEvent, existing `downloadCanvasPng()` and `generateRevision()` actions.

---

### Task 1: Shortcut helper

**Files:**
- Create: `client/agent-shortcuts.ts`
- Create: `client/agent-shortcuts.test.ts`

- [ ] Write tests for PNG export shortcut, generation shortcut, and editable-target skip.
- [ ] Confirm tests fail because helper is missing.
- [ ] Implement helper functions and re-run focused checks.
- [ ] Commit.

### Task 2: ChatPanel wiring

**Files:**
- Modify: `client/components/ChatPanel.tsx`
- Modify: `client/components/ChatPanel.test.tsx`

- [ ] Add tests that button labels expose shortcut hints.
- [ ] Confirm the label test fails.
- [ ] Add `useEffect` keydown listener calling the existing actions.
- [ ] Update labels with shortcut hints.
- [ ] Run focused bundle checks and commit.

### Task 3: Documentation

**Files:**
- Modify: `PROGRESS.md`

- [ ] Record shortcuts and verification evidence.
- [ ] Push and verify GitHub CI/package.
