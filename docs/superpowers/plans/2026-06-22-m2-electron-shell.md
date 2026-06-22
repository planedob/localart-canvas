# M2 Electron Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the first M2 phase as a secure Electron desktop shell that runs the existing Express service in an Electron utility process, preserves browser development, stores packaged data under `userData/canvas`, exposes local service status, and produces macOS/Windows/Linux packages.

**Architecture:** Keep the renderer as an ordinary HTTP client. Electron main starts a bundled utility service on `127.0.0.1:0`, waits for its ready message, then loads either its production origin or a Vite dev server whose proxy points at that dynamic origin. Pure helpers isolate path resolution and lifecycle decisions so Electron-specific behavior can be tested without booting a GUI.

**Tech Stack:** Electron, Electron Forge, Express 5, Vite 8, React 19, TypeScript, esbuild, Vitest, GitHub Actions.

---

## File map

- `desktop/canvas-dir.ts`: single packaged/development canvas-directory resolver.
- `desktop/canvas-dir.test.ts`: path precedence tests.
- `desktop/utility-service.ts`: starts the Express app on loopback/dynamic port and optionally serves the renderer.
- `desktop/utility-service.test.ts`: ready/error, binding and SPA fallback tests.
- `desktop/utility.ts`: tiny Electron utility-process entry that bridges `parentPort` messages.
- `desktop/service-lifecycle.ts`: pure ready/error/exit state machine.
- `desktop/service-lifecycle.test.ts`: lifecycle transition tests.
- `desktop/service-controller.ts`: maps lifecycle events to window/failure/termination callbacks.
- `desktop/service-controller.test.ts`: verifies ready opens the window and shutdown terminates only LocalArt's child.
- `desktop/api-target.ts`: validates the dynamic development proxy origin.
- `desktop/api-target.test.ts`: default and override proxy tests.
- `desktop/main.ts`: loading window, utility process, Vite development process and shutdown orchestration.
- `desktop/preload.ts`: read-only desktop metadata bridge.
- `desktop/globals.d.ts`: renderer type for the preload API.
- `client/service-status.ts`: health response types, fetcher and display-state formatter.
- `client/service-status.test.ts`: API and display-state tests.
- `client/components/ServiceStatus.tsx`: visible Ollama, ComfyUI and canvas status.
- `client/components/ServiceStatus.test.tsx`: server-rendered status/UI guidance tests.
- `server/app.ts`: include `canvasDirectory` in `/api/health`.
- `server/app.test.ts`: assert the expanded health contract.
- `vite.config.ts`: dynamic `LOCALART_API_TARGET` proxy.
- `vitest.config.ts`: include desktop tests.
- `scripts/build-desktop.mjs`: bundle main, preload and utility entries as CommonJS.
- `forge.config.cjs`: cross-platform Forge packaging configuration.
- `.github/workflows/desktop-package.yml`: three-platform package gate.
- `package.json`, `package-lock.json`: Electron dependencies and commands.
- `.gitignore`: ignore desktop build/package output.
- `README.md`, `PROGRESS.md`: setup, packaging, limitations and M2 status.

### Task 1: Desktop build baseline

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.gitignore`
- Modify: `vitest.config.ts`
- Create: `scripts/build-desktop.mjs`

- [ ] **Step 1: Add Electron and packaging dependencies**

Run:

```bash
npm install --save-dev electron @electron-forge/cli @electron-forge/maker-deb @electron-forge/maker-squirrel @electron-forge/maker-zip esbuild
```

Expected: `package.json` and `package-lock.json` include the new development dependencies.

- [ ] **Step 2: Prepare the desktop build script without changing the active build**

Create the bundler in the next step, but do not yet add it to the existing `build` command because its entry files are introduced in Task 6. This keeps the committed browser baseline runnable.

```json
{ "main": ".desktop/main.cjs" }
```

Keep all existing browser scripts.

- [ ] **Step 3: Create the desktop bundler**

Create `scripts/build-desktop.mjs` using esbuild with three entry points and explicit CommonJS output:

```js
import { build } from 'esbuild'

await build({
  entryPoints: {
    main: 'desktop/main.ts',
    preload: 'desktop/preload.ts',
    utility: 'desktop/utility.ts',
  },
  outdir: '.desktop',
  outExtension: { '.js': '.cjs' },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  external: ['electron'],
  sourcemap: true,
})
```

- [ ] **Step 4: Expand test discovery and ignored outputs**

Add `desktop/**/*.test.ts` to `vitest.config.ts`. Add `.desktop/` and `out/` to `.gitignore`.

- [ ] **Step 5: Verify the existing baseline remains green**

Run:

```bash
npm test
npm run build
```

Expected: all existing tests and the browser build pass. The desktop bundler is activated after its entries exist in Task 6.

- [ ] **Step 6: Commit the build baseline**

```bash
git add package.json package-lock.json .gitignore vitest.config.ts scripts/build-desktop.mjs
git commit -m "chore: add electron build baseline"
```

### Task 2: Canvas directory resolver

**Files:**
- Create: `desktop/canvas-dir.test.ts`
- Create: `desktop/canvas-dir.ts`

- [ ] **Step 1: Write failing path-precedence tests**

```ts
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { getCanvasDir } from './canvas-dir'

describe('getCanvasDir', () => {
  test('resolves an explicit override from the project directory', () => {
    expect(getCanvasDir({ override: './external', isPackaged: true, projectDirectory: '/repo', userDataDirectory: '/user' }))
      .toBe(path.resolve('/repo', 'external'))
  })

  test('uses repository canvas in development', () => {
    expect(getCanvasDir({ isPackaged: false, projectDirectory: '/repo', userDataDirectory: '/user' }))
      .toBe(path.join('/repo', 'canvas'))
  })

  test('uses userData canvas when packaged', () => {
    expect(getCanvasDir({ isPackaged: true, projectDirectory: '/repo', userDataDirectory: '/user' }))
      .toBe(path.join('/user', 'canvas'))
  })
})
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `npm test -- desktop/canvas-dir.test.ts`

Expected: FAIL with module `./canvas-dir` not found.

- [ ] **Step 3: Implement the resolver**

```ts
import path from 'node:path'

export interface CanvasDirOptions {
  override?: string
  isPackaged: boolean
  projectDirectory: string
  userDataDirectory: string
}

export function getCanvasDir(options: CanvasDirOptions): string {
  if (options.override?.trim()) return path.resolve(options.projectDirectory, options.override)
  return options.isPackaged
    ? path.join(options.userDataDirectory, 'canvas')
    : path.join(options.projectDirectory, 'canvas')
}
```

- [ ] **Step 4: Verify GREEN and commit**

```bash
npm test -- desktop/canvas-dir.test.ts
git add desktop/canvas-dir.ts desktop/canvas-dir.test.ts
git commit -m "feat: resolve electron canvas directory"
```

Expected: 3 tests pass.

### Task 3: Health contract and renderer status UI

**Files:**
- Modify: `server/app.ts`
- Modify: `server/app.test.ts`
- Create: `client/service-status.ts`
- Create: `client/service-status.test.ts`
- Create: `client/components/ServiceStatus.tsx`
- Create: `client/components/ServiceStatus.test.tsx`
- Modify: `client/App.tsx`
- Modify: `client/index.css`

- [ ] **Step 1: Extend the health test first**

In the existing `/api/health` test, require:

```ts
expect(response.body.canvas).toEqual({ directory: config.canvasDirectory })
```

Run: `npm test -- server/app.test.ts`

Expected: FAIL because `canvas` is absent.

- [ ] **Step 2: Add the canvas directory to health**

Add to the health JSON in `server/app.ts`:

```ts
canvas: { directory: config.canvasDirectory },
```

Run: `npm test -- server/app.test.ts`

Expected: PASS.

- [ ] **Step 3: Write failing status API tests**

Define tests for `fetchServiceHealth()` returning the typed response, throwing a readable error for non-2xx responses, and `formatServiceStatus()` producing these labels:

```ts
expect(formatServiceStatus(true, 'Ollama')).toEqual({ label: '已连接', tone: 'connected', guidance: null })
expect(formatServiceStatus(false, 'Ollama').guidance).toContain('ollama serve')
expect(formatServiceStatus(false, 'ComfyUI').guidance).toContain('启动 ComfyUI')
```

Run: `npm test -- client/service-status.test.ts`

Expected: FAIL because `client/service-status.ts` does not exist.

- [ ] **Step 4: Implement the status client**

Export `ServiceHealth`, `fetchServiceHealth(fetchImplementation = fetch)` and `formatServiceStatus(available, service)` from `client/service-status.ts`. Fetch `/api/health`, preserve endpoint URLs and canvas directory, and throw `Local service health failed (<status>)` on failure.

- [ ] **Step 5: Write failing rendered component tests**

Use `renderToStaticMarkup` to assert that connected markup contains both endpoint URLs and the canvas directory, while disconnected markup contains `ollama serve` and `启动 ComfyUI`.

Run: `npm test -- client/components/ServiceStatus.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 6: Implement and mount the component**

`ServiceStatus` loads health on mount, renders `服务状态`, status badges, endpoint URLs, canvas directory, refresh control and concise startup guidance. Mount it above `ChatPanel` in the right rail and add compact status styles without changing the canvas interaction area.

- [ ] **Step 7: Verify and commit**

```bash
npm test -- server/app.test.ts client/service-status.test.ts client/components/ServiceStatus.test.tsx
npm test
git add server/app.ts server/app.test.ts client/service-status.ts client/service-status.test.ts client/components/ServiceStatus.tsx client/components/ServiceStatus.test.tsx client/App.tsx client/index.css
git commit -m "feat: show local service health"
```

Expected: full suite passes.

### Task 4: Utility HTTP service

**Files:**
- Create: `desktop/utility-service.test.ts`
- Create: `desktop/utility-service.ts`
- Create: `desktop/utility.ts`

- [ ] **Step 1: Write failing service-start tests**

Test `startUtilityService(options)` with temporary canvas/dist directories and injected fetch. Assert:

```ts
expect(result.host).toBe('127.0.0.1')
expect(result.port).toBeGreaterThan(0)
expect(await fetch(`${result.origin}/api/health`).then(r => r.status)).toBe(200)
expect(await fetch(`${result.origin}/nested/route`).then(r => r.text())).toContain('LocalArt test shell')
```

Also assert that a missing production renderer directory rejects with a message containing that path.

- [ ] **Step 2: Verify RED**

Run: `npm test -- desktop/utility-service.test.ts`

Expected: FAIL because `startUtilityService` is missing.

- [ ] **Step 3: Implement utility service startup**

Create a function with this public contract:

```ts
export interface UtilityServiceOptions {
  environment: Record<string, string | undefined>
  projectDirectory: string
  rendererDirectory?: string
  serveRenderer: boolean
  fetchImplementation?: typeof fetch
}

export interface RunningUtilityService {
  host: '127.0.0.1'
  port: number
  origin: string
  close(): Promise<void>
}
```

It must call existing config/app/generation factories, force `LOCALART_HOST=127.0.0.1` and `LOCALART_PORT=0`, create the canvas directory and verify write access before listening, validate the renderer directory, serve `dist` and an Express 5 SPA fallback in production, and close through the returned promise.

- [ ] **Step 4: Add the Electron bridge entry**

`desktop/utility.ts` reads `LOCALART_PROJECT_DIR`, `LOCALART_RENDERER_DIR` and `LOCALART_SERVE_RENDERER`, starts the service, posts `{ type: 'ready', port }` through `parentPort`, posts `{ type: 'error', message }` on failure, and closes on `SIGTERM`/parent disconnect. It must not launch or terminate Ollama or ComfyUI.

- [ ] **Step 5: Verify and commit**

```bash
npm test -- desktop/utility-service.test.ts
npm test
git add desktop/utility-service.ts desktop/utility-service.test.ts desktop/utility.ts
git commit -m "feat: run tool server as electron utility"
```

Expected: utility tests and all M1 tests pass.

### Task 5: Main-process lifecycle state machine

**Files:**
- Create: `desktop/service-lifecycle.test.ts`
- Create: `desktop/service-lifecycle.ts`
- Create: `desktop/service-controller.test.ts`
- Create: `desktop/service-controller.ts`

- [ ] **Step 1: Write failing state-transition tests**

Test these transitions:

```ts
expect(reduceServiceState({ status: 'starting' }, { type: 'ready', port: 43123 }))
  .toEqual({ status: 'ready', port: 43123 })
expect(reduceServiceState({ status: 'starting' }, { type: 'error', message: 'boom' }))
  .toEqual({ status: 'failed', message: 'boom' })
expect(reduceServiceState({ status: 'starting' }, { type: 'exit', code: 1 }))
  .toEqual({ status: 'failed', message: 'LocalArt service exited before ready (code 1)' })
```

Also assert invalid ready ports are rejected and exits after ready are reported as failures.

- [ ] **Step 2: Verify RED**

Run: `npm test -- desktop/service-lifecycle.test.ts`

Expected: FAIL because the reducer is missing.

- [ ] **Step 3: Implement the pure reducer**

Export discriminated unions `ServiceState`, `ServiceEvent` and `reduceServiceState`. Accept ready ports only when integer `1..65535`; normalize unknown errors; never encode any action involving Ollama or ComfyUI.

- [ ] **Step 4: Verify GREEN and commit**

First write controller tests with callback spies. A `ready` message must call `openMainWindow(port)` once; an error or premature exit must call `showFailure(message)` once; `shutdown()` must call only the injected `terminateUtility()` callback and must not contain Ollama/ComfyUI process hooks. Verify RED, then implement the minimal controller around `reduceServiceState`.

```bash
npm test -- desktop/service-lifecycle.test.ts desktop/service-controller.test.ts
git add desktop/service-lifecycle.ts desktop/service-lifecycle.test.ts desktop/service-controller.ts desktop/service-controller.test.ts
git commit -m "feat: model electron service lifecycle"
```

Expected: lifecycle tests pass.

### Task 6: Secure Electron main process and development startup

**Files:**
- Create: `desktop/api-target.test.ts`
- Create: `desktop/api-target.ts`
- Create: `desktop/preload.ts`
- Create: `desktop/globals.d.ts`
- Create: `desktop/main.ts`
- Modify: `vite.config.ts`

- [ ] **Step 1: Write a failing dynamic-proxy target test**

Add `desktop/api-target.test.ts` asserting `getApiTarget({})` returns `http://127.0.0.1:3001`, a valid `LOCALART_API_TARGET` overrides it, and a non-loopback target throws.

Run: `npm test -- desktop/api-target.test.ts`

Expected: FAIL because `desktop/api-target.ts` does not exist.

- [ ] **Step 2: Implement dynamic Vite proxy target**

Implement `getApiTarget()` in `desktop/api-target.ts`, import it in `vite.config.ts`, and use it for both `/api` and `/assets`:

```ts
const apiTarget = getApiTarget(process.env)
proxy: { '/api': apiTarget, '/assets': apiTarget }
```

Run: `npm test -- desktop/api-target.test.ts`

Expected: PASS.

- [ ] **Step 3: Add minimal preload API**

Expose only:

```ts
contextBridge.exposeInMainWorld('localArtDesktop', {
  platform: process.platform,
  isPackaged: process.argv.includes('--localart-packaged=1'),
})
```

Declare the matching read-only `Window.localArtDesktop` type. Main passes `--localart-packaged=1` or `0` through `webPreferences.additionalArguments`. Do not expose filesystem, shell, IPC send or command execution.

- [ ] **Step 4: Implement Electron orchestration**

`desktop/main.ts` must:

1. create a small loading `BrowserWindow` with inline local HTML;
2. resolve `getCanvasDir()` and pass it as `LOCALART_CANVAS_DIR`;
3. start `.desktop/utility.cjs` with `utilityProcess.fork` and `serviceName: 'LocalArt Tool Server'`;
4. wait for a valid ready message using the lifecycle reducer;
5. in development, spawn the Vite CLI with `LOCALART_API_TARGET` set to the dynamic service origin and wait for `http://127.0.0.1:5173`;
6. in packaged mode, load the utility origin, which serves `dist`;
7. create the main window with `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` and the preload path;
8. show a readable local error document when startup or renderer loading fails;
9. kill the utility process and development Vite child during quit;
10. never execute lifecycle commands for Ollama or ComfyUI.

At this point activate the desktop scripts in `package.json`:

```json
{
  "scripts": {
    "build": "vite build && npm run build:desktop && npm run typecheck",
    "build:desktop": "node scripts/build-desktop.mjs",
    "dev:desktop": "npm run build:desktop && electron .",
    "package": "npm run build && electron-forge package",
    "make": "npm run build && electron-forge make"
  }
}
```

- [ ] **Step 5: Build and typecheck**

Run:

```bash
npm run build:desktop
npm run typecheck
```

Expected: both pass and `.desktop/main.cjs`, `.desktop/preload.cjs`, `.desktop/utility.cjs` exist.

- [ ] **Step 6: Verify tests and commit**

```bash
npm test
git add desktop/main.ts desktop/preload.ts desktop/globals.d.ts desktop/api-target.ts desktop/api-target.test.ts vite.config.ts package.json package-lock.json
git commit -m "feat: add secure electron application shell"
```

### Task 7: Electron Forge packaging

**Files:**
- Create: `forge.config.cjs`
- Modify: `package.json`

- [ ] **Step 1: Add Forge configuration**

Create `forge.config.cjs` with:

```js
const { MakerDeb } = require('@electron-forge/maker-deb')
const { MakerSquirrel } = require('@electron-forge/maker-squirrel')
const { MakerZIP } = require('@electron-forge/maker-zip')

module.exports = {
  packagerConfig: {
    asar: true,
    name: 'LocalArt Canvas',
    executableName: 'localart-canvas',
    extraResource: ['dist', 'config/comfyui-workflow.example.json'],
  },
  makers: [
    new MakerSquirrel({ name: 'localart_canvas' }),
    new MakerZIP({}, ['darwin', 'linux']),
    new MakerDeb({ options: { maintainer: 'LocalArt Canvas contributors', homepage: 'https://github.com/planedob/localart-canvas' } }),
  ],
}
```

Ensure `package.json.config.forge` points to `./forge.config.cjs` if the installed Forge version requires an explicit config path.

- [ ] **Step 2: Package the current platform**

Run:

```bash
npm run package
```

Expected: Forge creates a macOS `.app` under `out/` with bundled `dist`, utility entry and workflow example.

- [ ] **Step 3: Make the current platform artifact**

Run:

```bash
npm run make
```

Expected: Forge creates an unsigned macOS ZIP under `out/make/`.

- [ ] **Step 4: Commit packaging configuration**

```bash
git add forge.config.cjs package.json package-lock.json
git commit -m "chore: configure electron forge packaging"
```

### Task 8: Cross-platform CI and operator documentation

**Files:**
- Create: `.github/workflows/desktop-package.yml`
- Modify: `README.md`
- Modify: `PROGRESS.md`

- [ ] **Step 1: Add the package matrix**

Create a workflow triggered by pull requests, pushes to `main`, and manual dispatch. Use `macos-latest`, `windows-latest`, and `ubuntu-latest`; set up Node 22 with npm cache; run:

```yaml
- run: npm ci
- run: npm test
- run: npm run build
- run: npm run make
```

Upload `out/make/**` as a per-platform artifact. Do not publish a release, use signing secrets, or modify repository settings.

- [ ] **Step 2: Document desktop development and endpoints**

README must include `npm run dev:desktop`, `npm run package`, `npm run make`, the packaged canvas location, `LOCALART_CANVAS_DIR`, and endpoint examples for macOS/Linux shell and Windows PowerShell.

- [ ] **Step 3: Document unsigned macOS opening**

Include Finder right-click → Open as the preferred path and this development fallback:

```bash
xattr -dr com.apple.quarantine "/Applications/LocalArt Canvas.app"
```

State that Windows/Linux packages are CI-built but real-hardware GUI and model connectivity remain unverified.

- [ ] **Step 4: Record M2 phase-one verification scope**

Add a `M2 · 第一阶段 Electron 壳` section to `PROGRESS.md` with completed automated checks, package locations, manual checks, and remaining M2 features. Do not mark it complete until Task 9 succeeds.

- [ ] **Step 5: Commit CI and docs**

```bash
git add .github/workflows/desktop-package.yml README.md PROGRESS.md
git commit -m "ci: verify desktop packages across platforms"
```

### Task 9: End-to-end verification and milestone

**Files:**
- Modify: `PROGRESS.md`

- [ ] **Step 1: Run the full automated gate**

```bash
npm ci
npm test
npm run build
npm run make
```

Expected: all tests pass, typecheck/build pass, and the current-platform package is produced.

- [ ] **Step 2: Verify browser mode**

Run `OLLAMA_MODEL=gemma3:4b COMFYUI_WORKFLOW_PATH=./config/comfyui-workflow.json npm run dev`, open `http://127.0.0.1:5173`, and verify canvas load, service status, selection, chat and revision generation without new console errors.

- [ ] **Step 3: Verify Electron development mode**

Run the same configuration with `npm run dev:desktop`. Verify loading window → main window, dynamic API origin, status UI, one real M1 revision, and clean utility-process shutdown while Ollama/ComfyUI keep their prior state.

- [ ] **Step 4: Verify packaged persistence**

Open the unsigned app, create content, quit, reopen, and confirm restoration from the displayed `userData/canvas` path. Confirm there is no automatic migration from repository `./canvas`.

- [ ] **Step 5: Finalize progress and inspect scope**

Update `PROGRESS.md` with exact commands/results. Run:

```bash
git diff --check
git status --short
rg -n "watermark|licenseKey|OLLAMA|COMFYUI" desktop client server
```

Expected: no whitespace errors, only intentional changes/untracked user `.DS_Store` files, legal tldraw license injection preserved, and no process-control commands for Ollama/ComfyUI.

- [ ] **Step 6: Commit, tag and push**

```bash
git add PROGRESS.md
git commit -m "docs: mark m2 electron shell complete"
git tag -a m2s1-done -m "M2 Electron shell phase complete"
git push origin main
git push origin m2s1-done
```

Only perform this step after every acceptance check passes. Preserve the existing `safe-start`, `m0-done`, and `m1-done` tags.
