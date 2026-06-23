# LocalArt Context Menu Design

## Goal

Add LocalArt-specific actions to the tldraw right-click context menu while preserving the default tldraw context menu.

## Scope

- Replace the default `ContextMenu` component with a wrapper that renders `DefaultContextMenuContent` plus a LocalArt group.
- LocalArt group actions:
  - `Export selection PNG`: calls the same PNG export path used by the Agent panel.
  - `Add AI placeholder`: creates the existing `AIImageHolder` placeholder at the viewport center and selects it.
  - `Generate revision`: calls the same generation path used by the Agent panel and is disabled/hidden when no revision prompt exists.
- Reuse existing `ChatPanel` action code rather than duplicating behavior.

## Non-goals

- No custom clipboard write in this phase.
- No destructive actions beyond tldraw defaults.
- No Electron native menu or OS-level shortcut changes.

## Testing

- Extract reusable `AgentActionButtons` presentational component from `ChatPanel`.
- Server-render the component to verify it exposes panel and context-menu labels.
- Bundle-check `App`, `ChatPanel`, and the new context menu component.
