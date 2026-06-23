# PNG Export Design

## Scope

Add a first-pass PNG export for the canvas without expanding the backend. The export is initiated from the existing LocalArt Agent panel and uses tldraw's `editor.toImage()` in the renderer.

## Behavior

- If the user has selected shapes, export only those shapes.
- If nothing is selected, export all shapes on the current page.
- If there are no exportable shapes, show an error entry in the Agent panel instead of creating an empty file.
- The downloaded filename is `localart-canvas.png`.
- Export options: PNG, background enabled, 16px padding, pixel ratio 2.

## Components

- `client/png-export.ts`: small helper functions for picking target shapes and downloading the PNG blob.
- `client/components/ChatPanel.tsx`: adds an `Export PNG` button and reports export errors through the existing chat error stream.
- Tests cover target selection, empty canvas behavior, download behavior, and button rendering.

## Out of scope

- Full-page viewport screenshot export.
- Server-side PNG rendering.
- Export settings UI for scale/background/padding.
