# Canvas History UI Design

## Goal

Expose the existing canvas version backend in the Electron/web sidebar so a user can list saved canvas versions and restore one without leaving the app.

## Scope

- Add a focused client API wrapper for `GET /api/canvas/versions` and `POST /api/canvas/versions/:id/restore`.
- Add a compact `HistoryPanel` in the right sidebar between model routing and the LocalArt Agent panel.
- Load versions on mount and on Refresh.
- Restore a selected version by calling the backend and then `editor.loadSnapshot(document)` so the visible canvas updates immediately.
- Show empty, loading, restoring, success, and error states inside the panel.

## Non-goals

- No asset duplication or asset history UI in this phase.
- No visual diff, thumbnails, naming, or pinning versions.
- No destructive delete/version pruning.

## Data flow

1. `HistoryPanel` receives the current tldraw `editor`.
2. It calls `listCanvasVersions()` on mount.
3. The user clicks `Restore` on a listed version.
4. `restoreCanvasVersion(id)` returns the restored snapshot document.
5. The panel calls `editor.loadSnapshot(document)` and refreshes the list.

## Error handling

- Non-OK list responses throw `Canvas versions load failed (status)`.
- Non-OK restore responses throw `Canvas version restore failed (status)`.
- UI keeps the previous list visible when refresh/restore fails and shows the error message.

## Testing

- Unit-test the API wrapper with mocked fetch.
- Server-render the presentational panel to verify empty/list/restoring copy and restore controls.
- Run a focused esbuild bundle check covering the new files and affected app/component files.
