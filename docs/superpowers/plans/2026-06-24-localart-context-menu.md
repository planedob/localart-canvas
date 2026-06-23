# LocalArt Context Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add LocalArt actions to the tldraw right-click menu without removing the default tldraw menu.

**Architecture:** Extract common action rendering from `ChatPanel`, add `LocalArtContextMenu` as a tldraw `components.ContextMenu` override, and pass the current action handlers/prompts from `App`.

**Tech Stack:** React 19, TypeScript, tldraw `ContextMenu` override, existing LocalArt generation/export helpers.

---

### Task 1: Extract Agent action controls

**Files:**
- Modify: `client/components/ChatPanel.tsx`
- Modify: `client/components/ChatPanel.test.tsx`

- [ ] Write a render test for `AgentActionButtons` showing export PNG, placeholder, clear, and generate shortcut labels.
- [ ] Confirm the test fails because `AgentActionButtons` does not exist.
- [ ] Extract the presentational button group from `ChatPanel`.
- [ ] Run focused bundle check and commit.

### Task 2: LocalArt context menu component

**Files:**
- Create: `client/components/LocalArtContextMenu.tsx`
- Create: `client/components/LocalArtContextMenu.test.tsx`
- Modify: `client/App.tsx`

- [ ] Write a render test for the LocalArt menu content labels.
- [ ] Confirm the component is missing.
- [ ] Implement `LocalArtContextMenuContent` with default menu content plus LocalArt buttons.
- [ ] Mount it as `components.ContextMenu`.
- [ ] Run focused bundle check and commit.

### Task 3: Documentation and verification

**Files:**
- Modify: `README.md`
- Modify: `PROGRESS.md`

- [ ] Document right-click LocalArt actions in README.
- [ ] Record red/green verification in PROGRESS.
- [ ] Push and verify GitHub CI/package.
