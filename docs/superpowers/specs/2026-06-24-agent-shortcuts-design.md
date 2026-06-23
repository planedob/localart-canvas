# Agent Shortcuts Design

## Goal

Add small, visible keyboard shortcuts for existing LocalArt Agent actions so M2 has concrete shortcut polish without changing the core canvas workflow.

## Scope

- `Cmd/Ctrl+Shift+P`: export the current selection/page as PNG.
- `Cmd/Ctrl+Shift+G`: generate a revision when a revision prompt is available.
- Show shortcut hints in the existing Agent panel button labels.
- Ignore shortcuts while the user is typing in an input, textarea, select, or contenteditable element.

## Non-goals

- No global shortcut registration in Electron main.
- No configurable shortcut editor.
- No custom tldraw context menu in this phase.

## Testing

- Add pure helper tests for shortcut matching and editable-target filtering.
- Keep DOM event wiring thin inside `ChatPanel`.
