# Canvas History Implementation Plan

## Task 1 · Storage snapshots

- Extend `CanvasStore.test.ts` with failing tests for snapshot creation, newest-first listing, restore, and duplicate-write no-op.
- Extend `CanvasStore.ts` with `listVersions()`, `readVersion(id)`, and `restoreVersion(id)`.
- Keep atomic writes for both current document and version files.

## Task 2 · API endpoints

- Extend `server/app.test.ts` with version list and restore tests.
- Add `GET /api/canvas/versions`.
- Add `POST /api/canvas/versions/:id/restore`.

## Task 3 · Verification and docs

- Run local syntax/static checks where the local runner allows.
- Push and verify GitHub CI + Desktop package.
- Record run IDs in `PROGRESS.md`.
