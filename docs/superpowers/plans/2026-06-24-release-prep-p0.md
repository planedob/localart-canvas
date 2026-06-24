# Release Prep P0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add release preparation docs and a read-only local preflight checker for the post-M2 publishing phase.

**Architecture:** Keep release readiness logic in a focused Node script with pure exported check functions and a thin CLI wrapper. Documentation lives under `docs/release/` and README links to the release entry point.

**Tech Stack:** Node.js ESM, Vitest, Git CLI, GitHub CLI references, Markdown docs.

---

### Task 1: Add release preflight checker with tests

**Files:**
- Create: `scripts/release-preflight.mjs`
- Create: `scripts/release-preflight.test.ts`
- Create: `vitest.release.config.ts`

- [ ] **Step 1: Write failing tests**

Create tests that import `buildPreflightReport`, `formatReport`, and `hasSecretLikePath` from `scripts/release-preflight.mjs`. Cover required docs, missing docs, required tags, local-only tracked paths, secret-like paths, warnings for `.DS_Store`, and formatted output.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm run release:preflight:test
```

Expected: fail because `scripts/release-preflight.mjs` does not exist.

- [ ] **Step 3: Implement checker**

Add a read-only checker that:

- runs git commands through injectable helpers;
- checks required docs and tags;
- scans tracked/untracked path lists;
- never reads secret file contents;
- prints a report and exits 1 only for failure-level issues.

- [ ] **Step 4: Run tests**

Run:

```bash
npm run release:preflight:test
```

Expected: tests pass.

### Task 2: Add release docs

**Files:**
- Create: `docs/release/README.md`
- Create: `docs/release/P0-checklist.md`
- Create: `docs/release/github-release-draft.md`
- Create: `docs/release/manual-qa.md`
- Create: `docs/release/rollback.md`

- [ ] **Step 1: Create docs**

Write docs that cover:

- M2 signed-off status;
- release readiness checklist;
- manual QA for macOS / Windows / Ubuntu;
- GitHub Release draft text;
- rollback guidance;
- signing and notarization as explicit manual future work.

- [ ] **Step 2: Review docs for red lines**

Verify docs do not request committing secrets, changing repo visibility, force pushing, or writing non-GitHub remotes.

### Task 3: Wire docs and scripts into project

**Files:**
- Modify: `package.json`
- Modify: `README.md`
- Modify: `PROGRESS.md`

- [ ] **Step 1: Add npm script**

Add:

```json
"release:preflight": "node scripts/release-preflight.mjs"
```

- [ ] **Step 2: Update README**

Add a release preparation section linking `docs/release/README.md` and showing:

```bash
npm run release:preflight
```

- [ ] **Step 3: Update progress**

Record the release prep P0 work and verification commands in `PROGRESS.md`.

### Task 4: Verify and commit

**Files:**
- All files above.

- [ ] **Step 1: Run focused tests**

```bash
npm run release:preflight:test
```

- [ ] **Step 2: Run preflight**

```bash
npm run release:preflight
```

- [ ] **Step 3: Run build smoke**

```bash
npx esbuild scripts/release-preflight.mjs --bundle --platform=node --format=esm --outfile=/tmp/localart-release-preflight.mjs
```

- [ ] **Step 4: Commit**

```bash
git add package.json vitest.release.config.ts scripts/release-preflight.mjs scripts/release-preflight.test.ts docs/release README.md PROGRESS.md docs/superpowers/specs/2026-06-24-release-prep-p0-design.md docs/superpowers/plans/2026-06-24-release-prep-p0.md
git commit -m "docs: add release preparation preflight"
```
