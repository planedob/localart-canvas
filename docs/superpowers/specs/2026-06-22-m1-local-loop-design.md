# M1 Local Loop Design

## Scope

M1 delivers one local-first vertical loop:

```text
canvas image + user annotations
  → collect selected shapes and screenshot
  → Ollama turns context into an image-edit prompt
  → ComfyUI runs a configured API workflow
  → generated image becomes an AIImageHolder beside the source
  → canvas JSON and assets persist under ./canvas
```

Cloud model fallback, Electron packaging, history UI, export bundles, and advanced image controls remain M2.

## Runtime architecture

- `client/`: Vite React application and tldraw editor.
- `server/`: local Express tool server.
- Development uses Vite on `127.0.0.1:5173` and Express on `127.0.0.1:3001`; Vite proxies `/api` to Express.
- Production build lets Express serve `dist/client`.
- Browser code never calls Ollama or ComfyUI directly. This avoids CORS, centralizes timeouts/errors, and provides the filesystem boundary for `./canvas`.
- Runtime settings come from environment variables with safe localhost defaults. No secrets are committed.

## Local service contracts

### Health

`GET /api/health` returns availability and configuration state for Ollama and ComfyUI.

### Ollama

`POST /api/chat`

```ts
type LocalChatRequest = {
  message: string
  selectedShapes: unknown[]
  screenshotDataUrl?: string
}

type LocalChatResponse = {
  message: string
  model: string
}
```

The service discovers installed models through `/api/tags`. `OLLAMA_MODEL` overrides selection; otherwise the first installed model is used. No installed model produces a clear setup error.

### ComfyUI

`POST /api/generations`

```ts
type GenerateImageRequest = {
  prompt: string
  sourceImageDataUrl?: string
}

type GenerateImageResponse = {
  assetId: string
  url: string
  promptId: string
}
```

The workflow is loaded from `COMFYUI_WORKFLOW_PATH`. Named node IDs are configured for positive prompt and optional source image. The service submits `/prompt`, waits via bounded history polling, fetches `/view`, and stores the result in `canvas/assets/`.

## AIImageHolder

The shape stores:

```ts
type AIImageHolderShape = TLBaseShape<
  'ai-image-holder',
  {
    w: number
    h: number
    assetUrl: string
    prompt: string
    status: 'ready' | 'error'
  }
>
```

It renders an image with a small “AI revision” label. Standard tldraw selection handles provide move/delete behavior. The shape util is registered in the main editor and history viewer.

## Interaction

The existing right panel is simplified for M1:

1. Text input sends selected shape summaries and a screenshot to `/api/chat`.
2. The visible Ollama reply becomes the proposed edit prompt.
3. “Generate revision” sends that prompt and screenshot to `/api/generations`.
4. On success, create `AIImageHolder` to the right of the selected/source bounds.
5. Errors appear in the panel without mutating the canvas.

## Persistence

- Browser canvas snapshots are posted to `PUT /api/canvas/state` after a debounce.
- `GET /api/canvas/state` restores on startup.
- JSON is written atomically to `canvas/document.json`.
- Generated images live in `canvas/assets/` and are served from `/assets/*`.
- Missing or corrupt state returns a recoverable empty document response and logs the reason.

## Testing

- Vitest unit tests for runtime config, Ollama model selection/error mapping, ComfyUI submit/poll/result/error paths, and atomic persistence.
- Shape util tests for default props and geometry.
- Browser smoke test for shape display/move/delete.
- Browser integration with fake local service for panel context and generated-shape placement.
- Real Ollama and ComfyUI hand tests are recorded in `PROGRESS.md`.

## Licensing

`VITE_TLDRAW_LICENSE_KEY` is passed to `<Tldraw>`. Development works without it. Production requires a valid tldraw license; watermark behavior remains controlled by the license.
