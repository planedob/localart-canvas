# Canvas History Design

## Scope

Add a local history foundation for canvas state rollback. This first phase is backend/storage only: it creates version snapshots and exposes list/restore APIs. A polished history browser UI is a follow-up.

## Behavior

- `CanvasStore.write(nextDocument)` snapshots the previous `document.json` before replacing it.
- The first write does not create a history version because there is no previous state.
- Identical writes are no-ops and do not create duplicate history entries.
- Version files live under `canvas/versions/` and store `{ id, createdAt, document }`.
- `GET /api/canvas/versions` lists versions newest first.
- `POST /api/canvas/versions/:id/restore` restores a version into `document.json` and returns the restored document.

## Safety

- Version IDs are generated locally and sanitized for filenames.
- Missing/corrupt current documents are not snapshotted.
- Restoring a missing version returns a 404-style error at the API layer.
- No assets are copied in phase one; versions reference the same local `assets/` files, matching the current local-first storage model.

## Out of scope

- Visual history browser.
- Diff preview.
- Per-version asset archiving.
- Cloud sync.
