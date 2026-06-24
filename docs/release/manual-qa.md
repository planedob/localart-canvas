# Manual QA for Desktop Release

Run this checklist on each platform before a public release.

## Shared setup

1. Download the platform artifact from the latest passing Desktop package run.
2. Start Ollama.
3. Pull or confirm a local model, for example `gemma3:4b`.
4. Start ComfyUI on `http://127.0.0.1:8188`.
5. Launch LocalArt Canvas.
6. Confirm the right panel shows:
   - Ollama connected
   - ComfyUI connected
   - Canvas directory under user data

## M1 loop

1. Add or select a canvas object.
2. Enter a short revision request.
3. Send to model.
4. Confirm the reply shows the actual route, for example `Primary · Ollama · gemma3:4b`.
5. Click `Generate revision`.
6. Wait for ComfyUI.
7. Confirm `Generating…` clears.
8. Confirm a new `AIImageHolder` appears on the canvas.

## Persistence

1. Close LocalArt Canvas.
2. Confirm Ollama and ComfyUI remain running.
3. Reopen LocalArt Canvas.
4. Confirm the previous canvas content is restored.

## Export

1. Click `Export JSON` and confirm the JSON opens.
2. Click `Export ZIP` and confirm it contains `document.json` and assets.
3. Click `Export PNG` and confirm the PNG opens.

## History

1. Make a visible canvas change.
2. Wait for autosave.
3. Make another visible change.
4. Use Canvas History to restore the previous version.
5. Confirm the canvas changes back.

## Model fallback

1. Set Primary to an unreachable local URL such as `http://127.0.0.1:9`.
2. Enable Backup and set it to Ollama `http://127.0.0.1:11434` with a valid local model.
3. Save routing.
4. Send a short prompt.
5. Confirm the response shows `Backup` and a readable fallback reason.
6. Restore Primary to the normal local endpoint.

## Platform-specific notes

### macOS

- Unsigned builds may require Finder → right click → Open.
- Public distribution should use Developer ID signing and notarization.

### Windows

- Unsigned installers may trigger SmartScreen.
- Public distribution should use a code signing certificate.

### Linux

- Validate both package installation and direct archive launch if both artifacts are provided.
- Confirm ComfyUI/Ollama loopback networking works under the target desktop environment.
