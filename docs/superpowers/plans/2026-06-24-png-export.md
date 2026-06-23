# PNG Export Implementation Plan

## Task 1 · PNG export helper

- Add tests in `client/png-export.test.ts`.
- Add `client/png-export.ts`.
- Helper responsibilities:
  - choose selected shapes first, then current page shapes;
  - throw a clear error for an empty canvas;
  - call `editor.toImage()` with stable PNG options;
  - create a temporary object URL and click a download anchor;
  - revoke the object URL.

## Task 2 · Chat panel integration

- Extend `ChatPanel.test.tsx` to expect `Export PNG`.
- Add the button to `ChatPanel.tsx`.
- Reuse existing error-entry UI when PNG export fails.

## Task 3 · Verification and progress

- Run focused static/build checks locally.
- Push and verify GitHub CI + Desktop package.
- Record the work and run IDs in `PROGRESS.md`.
