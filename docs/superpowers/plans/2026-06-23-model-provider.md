# Unified Model Provider Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add configurable Ollama/OpenAI-compatible Primary and Backup chat routing, secure local configuration, strict fallback, and a full sidebar editor without regressing the M1 canvas-to-ComfyUI loop.

**Architecture:** The Express utility service owns provider configuration, secrets, provider clients, and fallback routing. The renderer reads and writes only sanitized routing data through loopback APIs; `/api/chat` keeps its existing request shape and adds route metadata to its response. Focused storage, provider, routing, API, desktop-path, and React units remain independently testable.

**Tech Stack:** TypeScript, Node.js filesystem/fetch, Express 5, React 19, Electron utility process, Zod 4, Vitest, Supertest.

---

## File Structure

- `server/model/types.ts`: shared slot, request, response, error, and sanitized configuration types.
- `server/model/config-schema.ts`: Zod validation, presets, defaults, URL normalization, and environment overrides.
- `server/model/ModelConfigStore.ts`: atomic public configuration and secret-file persistence.
- `server/model/ProviderError.ts`: structured error classification and safe messages.
- `server/model/OpenAICompatibleBackend.ts`: OpenAI-compatible text/vision client.
- `server/model/OllamaChatBackend.ts`: existing Ollama behavior behind the shared interface.
- `server/model/ChatRouter.ts`: Primary/Backup execution and strict fallback policy.
- `server/model/ModelRoutingService.ts`: resolved configuration, persistence, backend construction, connection tests.
- `server/app.ts`: chat and model-routing HTTP endpoints.
- `server/config.ts`: model configuration directory in runtime config.
- `desktop/config-dir.ts`: Electron `userData/config` path resolution.
- `desktop/main.ts`, `desktop/utility-service.ts`: pass and create the configuration directory.
- `client/model-routing.ts`: renderer-safe API types and request helpers.
- `client/model-routing-state.ts`: pure editor state transitions and save-payload construction.
- `client/components/ModelRoutingPanel.tsx`: full Primary/Backup editor.
- `client/components/ChatPanel.tsx`: provider-neutral labels and route provenance.
- `client/App.tsx`, `client/index.css`: mount and style the editor.
- `.gitignore`, `README.md`, `PROGRESS.md`: local config exclusion, usage, and verification record.

### Task 1: Runtime Configuration Directory

**Files:**
- Create: `desktop/config-dir.ts`
- Create: `desktop/config-dir.test.ts`
- Modify: `server/config.ts`
- Modify: `server/config.test.ts`
- Modify: `desktop/main.ts`
- Modify: `desktop/utility-service.ts`
- Modify: `.gitignore`

- [x] **Step 1: Write failing runtime path tests**

```ts
expect(getConfigDir({ projectDirectory: '/repo', userDataDirectory: '/user' })).toBe('/user/config')
expect(getConfigDir({ override: './private', projectDirectory: '/repo', userDataDirectory: '/user' })).toBe('/repo/private')
expect(createRuntimeConfig({}, '/repo').modelConfigDirectory).toBe('/repo/.localart')
```

- [x] **Step 2: Run the focused tests and verify missing exports fail**

Run: `npx vitest run desktop/config-dir.test.ts server/config.test.ts`

Expected: FAIL because `getConfigDir` and `modelConfigDirectory` do not exist.

- [x] **Step 3: Implement path resolution and propagation**

```ts
export function getConfigDir(options: ConfigDirOptions): string {
	return options.override?.trim()
		? path.resolve(options.projectDirectory, options.override)
		: path.join(options.userDataDirectory, 'config')
}
```

Add `modelConfigDirectory` to `RuntimeConfig`, default it to `path.resolve(projectDirectory, environment.LOCALART_CONFIG_DIR ?? '.localart')`, pass Electron's resolved absolute path through `LOCALART_CONFIG_DIR`, create it before starting Express, and add `.localart/` to `.gitignore`.

- [x] **Step 4: Run focused tests**

Run: `npx vitest run desktop/config-dir.test.ts server/config.test.ts desktop/utility-service.test.ts`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add .gitignore desktop/config-dir.ts desktop/config-dir.test.ts desktop/main.ts desktop/utility-service.ts server/config.ts server/config.test.ts
git commit -m "feat: add local model config directory"
```

### Task 2: Validated Configuration and Secret Store

**Files:**
- Create: `server/model/types.ts`
- Create: `server/model/config-schema.ts`
- Create: `server/model/config-schema.test.ts`
- Create: `server/model/ModelConfigStore.ts`
- Create: `server/model/ModelConfigStore.test.ts`

- [x] **Step 1: Write failing schema and persistence tests**

```ts
expect(createDefaultRoutingConfig({ OLLAMA_MODEL: 'gemma3:4b' }).primary).toMatchObject({
	preset: 'ollama', model: 'gemma3:4b', enabled: true,
})
expect(() => parseSlotConfig({ ...slot, baseUrl: 'ftp://bad.test' })).toThrow('http')
await store.update({ slots, secretUpdates: { primary: { action: 'set', value: 'sk-secret' } } })
expect(await store.readSanitized()).toMatchObject({ primary: { hasApiKey: true } })
expect(JSON.stringify(await store.readSanitized())).not.toContain('sk-secret')
```

- [x] **Step 2: Run tests and verify missing modules fail**

Run: `npx vitest run server/model/config-schema.test.ts server/model/ModelConfigStore.test.ts`

Expected: FAIL because the modules do not exist.

- [x] **Step 3: Implement schemas, environment precedence, and atomic storage**

Define `ModelSlotConfig`, `RoutingConfig`, `SanitizedModelSlot`, and explicit `SecretUpdate` unions. Use Zod to require `http:` or `https:`, reject URL username/password/query credentials, strip trailing slashes, validate timeout `1000..300000`, and require a model for enabled OpenAI-compatible slots. Ollama keeps its existing empty-model automatic discovery behavior. Implement `ModelConfigStore` with `model-providers.json` and `model-secrets.json`, temporary sibling files plus `rename`, and `chmod(0o600)` for secrets where supported.

Environment overrides use `LOCALART_PRIMARY_*` and `LOCALART_BACKUP_*`; legacy `OLLAMA_BASE_URL` and `OLLAMA_MODEL` seed the default Primary. Sanitized reads expose `hasApiKey` and `environmentOverrides`, never the secret value.

- [x] **Step 4: Run focused tests**

Run: `npx vitest run server/model/config-schema.test.ts server/model/ModelConfigStore.test.ts`

Expected: PASS, including `retain`, `set`, `clear`, restart reads, and no plaintext key in sanitized output.

- [x] **Step 5: Commit**

```bash
git add server/model/types.ts server/model/config-schema.ts server/model/config-schema.test.ts server/model/ModelConfigStore.ts server/model/ModelConfigStore.test.ts
git commit -m "feat: persist sanitized model routing config"
```

### Task 3: Shared Provider Backends and Safe Errors

**Files:**
- Create: `server/model/ProviderError.ts`
- Create: `server/model/ProviderError.test.ts`
- Create: `server/model/OpenAICompatibleBackend.ts`
- Create: `server/model/OpenAICompatibleBackend.test.ts`
- Create: `server/model/OllamaChatBackend.ts`
- Create: `server/model/OllamaChatBackend.test.ts`
- Modify: `server/ollama/OllamaClient.ts`

- [x] **Step 1: Write failing provider tests**

```ts
await backend.chat({ message: 'Revise', selectedShapes: [], screenshotDataUrl: 'data:image/jpeg;base64,abc' })
expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
	model: 'vision-model', stream: false,
	messages: [{ role: 'user', content: expect.any(Array) }],
})
expect(classifyHttpError(429, { error: { message: 'slow down' } }).kind).toBe('rate_limit')
expect(classifyHttpError(401, {}).retryable).toBe(false)
```

- [x] **Step 2: Run focused tests and verify failure**

Run: `npx vitest run server/model/ProviderError.test.ts server/model/OpenAICompatibleBackend.test.ts server/model/OllamaChatBackend.test.ts`

Expected: FAIL because the provider modules do not exist.

- [x] **Step 3: Implement the provider boundary**

Implement `ProviderError` with the approved kinds and a `retryable` boolean. `OpenAICompatibleBackend` sends Bearer auth to `${baseUrl}/chat/completions`, uses `AbortSignal.timeout`, maps network/timeout/status/malformed response errors, and returns `{ message, model }`. `OllamaChatBackend` wraps or refactors the current `OllamaClient`, preserving model discovery and best-effort unload after success.

Use a single helper to build selected-shape text and OpenAI `image_url` content so both backends produce equivalent prompts.

- [x] **Step 4: Run provider and legacy tests**

Run: `npx vitest run server/model server/ollama/OllamaClient.test.ts`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add server/model/ProviderError.ts server/model/ProviderError.test.ts server/model/OpenAICompatibleBackend.ts server/model/OpenAICompatibleBackend.test.ts server/model/OllamaChatBackend.ts server/model/OllamaChatBackend.test.ts server/ollama/OllamaClient.ts
git commit -m "feat: add unified chat provider backends"
```

### Task 4: Strict Primary and Backup Router

**Files:**
- Create: `server/model/ChatRouter.ts`
- Create: `server/model/ChatRouter.test.ts`

- [x] **Step 1: Write the failing fallback matrix**

```ts
it.each(['network', 'timeout', 'rate_limit', 'server'] as const)('falls back for %s', async (kind) => {
	primary.chat.mockRejectedValue(new ProviderError(kind, 'safe', { retryable: true }))
	expect(await router.chat(request)).toMatchObject({ slot: 'backup', fallback: { from: 'primary' } })
})
it.each(['auth', 'invalid_request', 'model_not_found', 'policy', 'config'] as const)('does not fall back for %s', async (kind) => {
	primary.chat.mockRejectedValue(new ProviderError(kind, 'safe', { retryable: false }))
	await expect(router.chat(request)).rejects.toThrow('safe')
	expect(backup.chat).not.toHaveBeenCalled()
})
```

- [x] **Step 2: Run the router tests and verify failure**

Run: `npx vitest run server/model/ChatRouter.test.ts`

Expected: FAIL because `ChatRouter` does not exist.

- [x] **Step 3: Implement one-attempt routing**

`ChatRouter.chat` invokes Primary once, returns route metadata on success, and invokes Backup once only when the thrown `ProviderError.retryable` is true and Backup exists. Unknown errors become non-retryable safe provider errors. A dual failure includes sanitized Primary and Backup summaries without request data.

- [x] **Step 4: Run router tests**

Run: `npx vitest run server/model/ChatRouter.test.ts`

Expected: PASS and each backend call count is at most one.

- [x] **Step 5: Commit**

```bash
git add server/model/ChatRouter.ts server/model/ChatRouter.test.ts
git commit -m "feat: route chat through primary and backup"
```

### Task 5: Routing Service and Express APIs

**Files:**
- Create: `server/model/ModelRoutingService.ts`
- Create: `server/model/ModelRoutingService.test.ts`
- Modify: `server/app.ts`
- Modify: `server/app.test.ts`
- Modify: `server/index.ts`
- Modify: `desktop/utility-service.ts`

- [x] **Step 1: Write failing API tests**

```ts
await request(app).get('/api/model-routing').expect(200).expect(({ body }) => {
	expect(body.primary.hasApiKey).toBe(false)
	expect(JSON.stringify(body)).not.toContain('sk-secret')
})
await request(app).put('/api/model-routing').send(validUpdate).expect(204)
await request(app).post('/api/model-routing/test').send({ slot: 'primary' }).expect(200)
await request(app).post('/api/chat').send(chatRequest).expect(200).expect(({ body }) => {
	expect(body).toMatchObject({ slot: 'primary', provider: 'ollama' })
})
```

- [x] **Step 2: Run API tests and verify failure**

Run: `npx vitest run server/model/ModelRoutingService.test.ts server/app.test.ts`

Expected: FAIL because model-routing endpoints and route metadata are absent.

- [x] **Step 3: Implement service construction and endpoints**

`ModelRoutingService` reads effective slots, builds the correct backend, creates a `ChatRouter` per operation, saves validated updates, and tests one selected slot with the fixed message `Reply with LOCALART_CONNECTION_OK.` and no shapes or screenshot. Inject it into `createApp`; preserve dependency injection for tests.

Return 400 for invalid configuration, 503 for provider failures, 200 for sanitized reads/tests, and 204 for successful saves. Extend `/api/chat` response without changing its request body.

- [x] **Step 4: Run server tests**

Run: `npx vitest run server`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add server/model/ModelRoutingService.ts server/model/ModelRoutingService.test.ts server/app.ts server/app.test.ts server/index.ts desktop/utility-service.ts
git commit -m "feat: expose model routing APIs"
```

### Task 6: Renderer API and Full Routing Editor

**Files:**
- Create: `client/model-routing.ts`
- Create: `client/model-routing.test.ts`
- Create: `client/model-routing-state.ts`
- Create: `client/model-routing-state.test.ts`
- Create: `client/components/ModelRoutingPanel.tsx`
- Create: `client/components/ModelRoutingPanel.test.tsx`
- Modify: `client/App.tsx`
- Modify: `client/index.css`

- [x] **Step 1: Write failing renderer tests**

```ts
expect(swapSlots(state)).toMatchObject({ primary: state.backup, backup: state.primary })
expect(buildSavePayload({ ...state, primaryApiKeyInput: '' })).toMatchObject({
	secretUpdates: { primary: { action: 'retain' } },
})
const markup = renderToStaticMarkup(<ModelRoutingPanelView state={state} handlers={handlers} />)
expect(markup).toContain('Primary → Backup')
expect(markup).toContain('Save routing')
```

- [x] **Step 2: Run focused client tests and verify failure**

Run: `npx vitest run client/model-routing.test.ts client/model-routing-state.test.ts client/components/ModelRoutingPanel.test.tsx`

Expected: FAIL because the API helper and component do not exist.

- [x] **Step 3: Implement API helpers and controlled editor**

Create `getModelRouting`, `saveModelRouting`, and `testModelSlot`. Keep swapping, preset changes, secret-update construction, and dirty detection in pure functions in `model-routing-state.ts`. Build two controlled cards with preset, Base URL, model, masked API Key input, timeout, enabled switch, explicit clear, test connection, swap, dirty state, and save status. Export a presentational `ModelRoutingPanelView` for server-rendered component tests. Preset changes fill known defaults; environment-overridden inputs are disabled with a source label.

Mount the panel above chat in `App.tsx`. Add compact dark sidebar CSS with a scrollable settings section so the chat history remains usable at 350px width.

- [x] **Step 4: Run client tests**

Run: `npx vitest run client/model-routing.test.ts client/model-routing-state.test.ts client/components/ModelRoutingPanel.test.tsx`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add client/model-routing.ts client/model-routing.test.ts client/model-routing-state.ts client/model-routing-state.test.ts client/components/ModelRoutingPanel.tsx client/components/ModelRoutingPanel.test.tsx client/App.tsx client/index.css
git commit -m "feat: add model routing sidebar editor"
```

### Task 7: Chat Provenance and Provider-Neutral UX

**Files:**
- Modify: `client/local-api.ts`
- Modify: `client/local-api.test.ts`
- Modify: `client/components/ChatPanel.tsx`
- Create: `client/components/ChatPanel.test.tsx`
- Modify: `client/index.css`

- [ ] **Step 1: Write failing provenance tests**

```ts
expect(await requestLocalChat(request, fetchMock)).toMatchObject({
	slot: 'backup', preset: 'aibuff', fallback: { reason: 'Primary timed out' },
})
```

```tsx
const markup = renderToStaticMarkup(<ChatEntryView entry={entry} />)
expect(markup).toContain('Backup · AIBuff · claude')
expect(markup).toContain('Primary timed out')
expect(renderToStaticMarkup(<ChatSubmitLabel isSending={false} />)).toContain('Send to model')
```

- [ ] **Step 2: Run focused tests and verify old Ollama labels fail**

Run: `npx vitest run client/local-api.test.ts client/components/ChatPanel.test.tsx`

Expected: FAIL because route metadata is not rendered and the button still says `Send to Ollama`.

- [ ] **Step 3: Implement route feedback**

Use routed response types from `server/model/types.ts`. Store route metadata on assistant entries, display `Primary/Backup · preset · model`, show a short fallback reason, change the header subtitle to `Primary → Backup`, and rename the action to `Send to model`. Preserve revision prompt assignment and `Generate revision` behavior.

- [ ] **Step 4: Run client and M1 regression tests**

Run: `npx vitest run client`

Expected: PASS, including canvas placement and persistence tests.

- [ ] **Step 5: Commit**

```bash
git add client/local-api.ts client/local-api.test.ts client/components/ChatPanel.tsx client/components/ChatPanel.test.tsx client/index.css
git commit -m "feat: show active model route in chat"
```

### Task 8: Documentation and Full Verification

**Files:**
- Modify: `README.md`
- Modify: `PROGRESS.md`

- [ ] **Step 1: Document setup and security boundaries**

Add AIBuff/OpenAI/custom examples, `LOCALART_PRIMARY_*` and `LOCALART_BACKUP_*`, configuration file locations, environment precedence, strict fallback conditions, and the fact that keys are local files rather than OS keychain entries. Keep Ollama-only startup as the default path.

- [ ] **Step 2: Run the full verification suite**

Run: `npm test && npm run build && npm run typecheck`

Expected: all tests pass, Vite and desktop bundles build, and TypeScript reports no errors.

- [ ] **Step 3: Verify secret exclusion mechanically**

Run: `git status --short && git grep -nE 'sk-[A-Za-z0-9]{8,}|Bearer [A-Za-z0-9_-]{8,}' -- ':!package-lock.json'`

Expected: no real-looking committed key; only unrelated pre-existing `.DS_Store` files remain untracked.

- [ ] **Step 4: Record verification and manual-test boundaries**

Update `PROGRESS.md` with test counts, build results, local config paths, mock fallback coverage, and mark real AIBuff/Ollama/Electron GUI checks accurately as performed or pending. Do not claim a real provider test without evidence.

- [ ] **Step 5: Commit documentation**

```bash
git add README.md PROGRESS.md
git commit -m "docs: document model provider routing"
```

- [ ] **Step 6: Final repository check**

Run: `git status --short && git log --oneline -10`

Expected: only the two pre-existing `.DS_Store` files are untracked; model provider work is split into focused Conventional Commits.
