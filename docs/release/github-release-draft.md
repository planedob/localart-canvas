# GitHub Release Draft

## Title

LocalArt Canvas v0.1.0 M2 Preview

## Tag

`v0.1.0`

## Summary

LocalArt Canvas is a local-first AI visual canvas built on tldraw, Ollama, and ComfyUI. This M2 preview includes the desktop shell, local generation loop, unified local/cloud model routing, export, history restore, shortcuts, and LocalArt context menu.

## Highlights

- Electron desktop shell for macOS / Windows / Linux packaging.
- Local M1 loop: selected canvas object → model prompt → ComfyUI generation → new image on canvas.
- Ollama local model support.
- OpenAI-compatible provider support with AIBuff / OpenAI / Custom presets.
- Primary / Backup fallback with visible route and fallback reason.
- Local config and key storage outside the repository.
- JSON / ZIP / PNG export.
- Canvas History restore.
- Cmd/Ctrl+Shift+P PNG export shortcut.
- Cmd/Ctrl+Shift+G generate revision shortcut.
- LocalArt right-click menu actions.

## Validation

- Claude M2 signoff: `docs/M2-验收签收-Claude.md`
- CI: `28112571800`
- Desktop package: `28112571712`
- Clean local evidence package: `docs/validation-evidence-clean/localart-m2-clean-validation-evidence.zip` on the maintainer machine

## Known limitations

- macOS app is unsigned unless the maintainer completes signing and notarization.
- Windows package is unsigned unless the maintainer completes code signing.
- Windows / Linux GUI behavior still requires real-machine QA before public distribution.
- Cloud model validation requires the user to provide their own OpenAI-compatible endpoint and API key.
- LocalArt does not install, start, or stop Ollama / ComfyUI; users must run them separately.
- Chat responses are non-streaming in this preview.

## Manual install notes

Download the platform artifact from the Desktop package workflow. Start Ollama and ComfyUI first, then launch LocalArt Canvas and confirm the service status panel shows both services connected.

## Security notes

Do not include API keys, tokens, certificates, `.localart/`, `canvas/`, or private validation recordings in release assets.
