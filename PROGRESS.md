# Progress

## M0 · 环境与调研

状态：完成。

完成内容：

- 引入官方 `tldraw/agent-template` 提交 `0adc288481d514cc4995424901207c57a4bb3dfc`。
- 安装依赖并通过 `npm run build`。
- 浏览器实际验证：页面加载、矩形创建、拖动和删除均可操作。
- `docs/notes.md` 已记录自定义 shape、prompt part、action、Cloudflare/云模型依赖、tldraw 许可证、ComfyUI 与 Ollama。
- 本机 Ollama `0.20.7` 可访问；ComfyUI `127.0.0.1:8188` 当前未运行。

运行：

```bash
npm ci
npm run dev -- --host 127.0.0.1
```

手测步骤：

1. 打开 `http://127.0.0.1:5173/`。
2. 选择矩形工具，在画布拖出矩形。
3. 用选择工具拖动矩形。
4. 点击顶部删除按钮，确认矩形消失。

验证记录：

- 页面标题：`LocalArt Canvas`。
- 页面同时呈现 tldraw 画布和右侧 Agent 面板。
- 控制台无 error；有 4 条上游 zh-CN locale 缺少两个新 key 的 warning，不影响交互。
- 构建有单个大 chunk warning，属于上游模板基线，M1 后再做拆包。

已知限制：

- M0 基线中的 Agent 请求依赖 Cloudflare 与云模型密钥；该运行路径已在 M1 删除。
- ComfyUI 未启动，因此 M0 只完成 API 调研，未执行真实生成。
- tldraw 生产使用需要合法 license key，不能通过代码移除许可证水印。

## M1 · MVP 核心闭环

状态：完成。

已完成：

- 本地 Express tool server 与 `/api/health`。
- Vite `/api` 同源代理，开发环境不再依赖 Cloudflare Vite runtime。
- Ollama client：模型发现、配置校验、OpenAI 兼容聊天和可读错误。
- 安装本地 `gemma3:1b`，真实请求返回成功。
- 右侧 LocalArt Agent 面板可读取选中 shape 摘要并显示 Ollama 回复。
- 浏览器实测：选中矩形后发送请求，面板显示 `PANEL_OK` 与模型名，无新增 console error。
- `AIImageHolder` 自定义形状已注册到主画布和历史 viewer。
- 浏览器实测：AI 图片占位形状可显示、移动和删除，无 console error。
- 画布截图已随选中 shape 摘要发送给 Ollama；`gemma3:4b` 真实视觉请求返回 `VISION_OK`。
- ComfyUI adapter 已覆盖 workflow prompt 注入、提交、历史轮询、结果下载、节点错误和超时。
- 生成结果会保存到 `canvas/assets/`，面板会把返回的 `AIImageHolder` 放到源对象右侧。
- 使用本地假 ComfyUI 协议服务完成浏览器端闭环：选中矩形、调用真实 Ollama、点击生成、在原图右侧创建 `AIImageHolder`。
- 修复 Vite 缺少 `/assets` 代理导致生成图片无法加载的问题；修复后浏览器控制台无 error。
- `canvas/document.json` 自动保存已生效，API 可读回包含生成图片形状的完整 snapshot，图片文件已写入 `canvas/assets/`。
- 删除旧 Cloudflare Worker、云模型 SDK 和未使用的官方 Agent runtime；当前启动不需要云模型 key。
- tldraw license key 可通过 `VITE_TLDRAW_LICENSE_KEY` 合法注入。
- 在外置卷安装并启动 ComfyUI `v0.25.1`，Apple MPS 识别正常。
- 下载并逐个校验官方模型 SHA-256：Flux.2 klein 4B BF16、Qwen 3 4B FP4 text encoder、Flux2 VAE。
- 定位 Apple MPS 不支持 FP8 diffusion 权重，切换官方 BF16 权重后真实生成成功；512×512、4 步首次生成耗时约 56 秒。
- LocalArt `/api/generations` 真实返回本地 asset，生成的红帆船 PNG 正常解码并显示。
- 浏览器真实闭环通过：选中画布对象 → `gemma3:4b` 返回生成提示词 → 点击 `Generate revision` → Flux.2 klein 新图出现在原图右侧。
- Ollama 聊天成功后自动调用本地卸载接口，真实验证 `ollama ps` 为空，避免 16GB 机器同时常驻 LLM 与图像模型。
- 停止并重启 LocalArt 前后端后，浏览器确认旧图、真实生成图、位置和 asset 全部从 `canvas/document.json` 恢复。

当前复现：

```bash
npm ci
OLLAMA_MODEL=gemma3:4b \
COMFYUI_WORKFLOW_PATH=./config/comfyui-workflow.json \
npm run dev
```

协议级闭环手测：

1. 启动符合 ComfyUI `/prompt`、`/history/{prompt_id}`、`/view` 协议的服务及 API workflow。
2. 在画布创建并选中矩形，输入修订要求后点击 `Send to Ollama`。
3. 收到模型回复后点击 `Generate revision`。
4. 确认新 `AIImageHolder` 出现在原选区右侧，图片 URL 为 `/assets/...`。
5. 确认 `canvas/document.json` 和 `canvas/assets/` 已写入。

已知限制：

- Apple MPS 需使用 Flux.2 klein BF16 diffusion 权重；FP8 权重会因 PyTorch MPS 不支持 FP8 dtype 而失败。
- tldraw 开发环境仍显示官方许可证提示，生产使用需配置合法 `VITE_TLDRAW_LICENSE_KEY`。
- 上游 tldraw zh-CN locale 缺少两个新 key，会产生 warning，不影响功能。

## M2 · 第一阶段 Electron 壳

状态：完成。

验收交接、录屏步骤与第 11 节逐项自检见 `docs/M2S1-验收交接.md`。Claude 验收已通过，模型接入硬闸口已解除。

已完成：

- Electron 主进程使用 `utilityProcess.fork` 运行 Express 服务，服务固定监听 `127.0.0.1` 并由系统分配动态端口。
- 主窗口等待 utility ready 消息后创建；启动失败和 renderer 加载失败会显示可读错误页。
- `contextIsolation: true`、`nodeIntegration: false`、sandbox 开启；preload 只暴露平台与打包状态。
- 开发模式继续使用 Vite，`LOCALART_API_TARGET` 动态指向 utility 服务；原浏览器 `npm run dev` 路径保留。
- 打包态默认数据目录为 Electron `userData/canvas`，开发态为仓库 `./canvas`，并支持 `LOCALART_CANVAS_DIR` 覆盖。
- `/api/health` 与右侧状态区显示 Ollama、ComfyUI 的连接状态、端点和实际 canvas 目录，并提供启动提示。
- Electron 退出只回收 LocalArt utility 与开发态 Vite，不操作用户的 Ollama、ComfyUI 或模型。
- Forge 已在 Apple arm64 生成未签名 `.app` 与 ZIP；ZIP 路径为 `out/make/zip/darwin/arm64/LocalArt Canvas-darwin-arm64-0.0.0.zip`。
- GitHub Actions 已配置 macOS、Windows、Ubuntu 三平台测试、构建与 Forge make，并上传构建产物。
- 自动测试当前 67 项通过，renderer、desktop bundle、类型检查与 macOS package/make 通过。
- 修复实测发现的三个 Electron 打包边界问题：utility 使用 `process.parentPort`、utility 入口从 asar 解包、打包态 `cwd` 使用 resources 目录；均新增回归测试。
- 浏览器模式实测通过：状态区显示 Ollama/ComfyUI/canvas，`gemma3:4b` 返回 `BROWSER_M2_OK`；无新增应用错误，仅有已知 tldraw zh-CN locale warning。
- Electron 开发态实测通过：loading → 动态 utility 端口 → Vite 主窗口，真实 Ollama 返回 `ELECTRON_M2_OK`。
- Electron 开发态退出后 LocalArt utility 与 Vite 均回收，用户 `ollama serve` 保持可访问。
- 打包态实测通过：应用从动态端口加载，canvas 路径为 `/Users/dc/Library/Application Support/localart-canvas/canvas`。
- 打包态新增形状、退出、重开后恢复成功，未迁移仓库 `./canvas`。
- 打包态真实闭环通过：Ollama 生成修订提示，ComfyUI Flux.2 klein 4 步生成约 60 秒，512×512 PNG 保存到 `userData/canvas/assets`，新 `AIImageHolder` 出现在源图右侧。
- 关闭打包应用后无残留 LocalArt 进程，Ollama 与 ComfyUI 均保持可访问；测试用 ComfyUI 随后由开发终端单独停止。
- GitHub 基础 CI `27968992033` 通过。
- Desktop package `27968992057` 通过：macOS、Ubuntu、Windows 均完成 67 项测试、build、Forge make 与产物上传。

仍属已知限制：

- Windows/Linux GUI、路径与模型连接仍标记为实机未验。

本阶段未包含：云模型 fallback、历史/导出、主题与快捷键、自动模型安装/启动、数据自动迁移、签名与公证。

## M2 · 第二阶段统一模型 Provider

状态：代码、自动验证、浏览器与 Electron 本地模型实测完成；真实云端密钥验收待执行。

已完成：

- Ollama 与 OpenAI-compatible 统一为服务端 `ChatBackend`，Renderer 仍只调用 loopback `/api`。
- Primary/Backup 两槽位路由完成；只有网络失败、超时、429、5xx 触发 fallback，其他错误直接报告。
- AIBuff、官方 OpenAI、Ollama、自定义端点预设及完整侧栏配置完成。
- 文字与 OpenAI `image_url` 画布截图格式共用同一云端适配器。
- 普通配置与 API Key 分文件原子保存；读取 API 只返回 `hasApiKey`，环境变量具有最高优先级。
- Electron 使用 `userData/config`，浏览器开发模式使用已忽略的 `.localart/`，并支持 `LOCALART_CONFIG_DIR`。
- 新增配置读取、保存、连接测试 API；测试连接只发送固定最小文字，不携带 shape 或截图。
- 聊天面板显示实际 Primary/Backup、预设、模型及 fallback 原因；原有 ComfyUI 生成与落图流程保持不变。

自动验证（2026-06-23）：

- `npm test`：31 个测试文件、107 项测试通过。
- `npm run build`：Vite renderer、Electron desktop bundle 和 TypeScript 检查通过。
- `npm run typecheck`：通过。
- fallback、配置持久化、密钥脱敏和 OpenAI-compatible 请求使用本地 mock 验证，不使用真实云端密钥。
- 仍有原有 Vite 大 chunk warning；不影响构建，本阶段未扩大范围做拆包。

浏览器实测（2026-06-23）：

- `http://127.0.0.1:5173/` 正常加载模型路由侧栏，无框架错误覆盖层。
- 服务状态显示 Ollama 已连接、ComfyUI 未运行；未运行的 ComfyUI 不影响聊天和配置 UI。
- Primary“测试连接”真实调用本机 `gemma3:4b`，显示 `primary connected: gemma3:4b`。
- 保存默认路由后生成 `.localart/model-providers.json` 与 `.localart/model-secrets.json`；密钥文件权限实测为 `0600`，内容为空对象。
- 停止并重新启动前后端后，Primary Ollama、Backup AIBuff、Base URL、模型和超时设置恢复成功。
- 选中现有画布对象后发送 `Reply with exactly LOCAL_ROUTING_OK`，真实 Ollama 返回 `LOCAL_ROUTING_OK`，聊天面板显示 `Primary · Ollama · gemma3:4b`。
- 浏览器控制台无应用 error；仅有已知 tldraw zh-CN locale 缺少两个 key 的 warning。
- fallback 实机演练：Primary 通过环境变量指向临时本地 OpenAI-compatible 端点并返回 `503 PRIMARY_MOCK_503`，Backup 指向真实 Ollama `gemma3:4b`。
- fallback 请求成功返回 `FALLBACK_ROUTING_OK`，面板显示 `Backup · Ollama · gemma3:4b` 与 `Fallback: PRIMARY_MOCK_503`；环境变量覆盖字段全部只读显示。
- 演练结束后临时 503 服务、Vite 和 Express 均已停止，保存的用户配置未被环境变量测试覆盖。

Electron 开发态实测（2026-06-23）：

- 当前源码 Electron 窗口显示完整 Primary/Backup 配置侧栏；测试时另一个旧打包应用实例已关闭，避免误读旧 UI。
- Primary“测试连接”真实调用本机 `gemma3:4b`，显示 `primary connected: gemma3:4b`。
- 保存路由后配置写入 `~/Library/Application Support/localart-canvas/config`；普通配置与密钥文件分离，密钥文件权限为 `0600`。
- 退出并重新执行 `OLLAMA_MODEL=gemma3:4b npm run dev:desktop` 后，Primary、Backup、端点、模型与超时设置恢复成功。
- 选中现有画布对象后发送 `Reply with exactly ELECTRON_ROUTING_OK`，真实 Ollama 返回 `ELECTRON_ROUTING_OK`，面板显示 `Primary · Ollama · gemma3:4b`。
- 退出 Electron 后，开发态 Electron、Vite 和 utility 进程均回收；用户的 Ollama 服务继续在线。

macOS 打包态实测（2026-06-23）：

- 重新执行 `npm run package`，生成包含当前模型路由 UI 的 Apple arm64 未签名 `.app`；Vite、desktop bundle 与类型检查通过。
- 打包应用从动态 loopback 端口启动，画布目录为 `userData/canvas`，路由配置从 `userData/config` 恢复。
- 当前打包窗口显示 Primary/Backup 侧栏，Primary 真实连接 `gemma3:4b` 成功。
- 关闭打包应用后无残留 LocalArt 进程，用户的 Ollama 服务继续在线。

待人工验收：

1. 在侧栏填入 AIBuff 或其他 OpenAI-compatible 端点、模型和 API Key，完成文字请求。
2. 选择画布对象，验证云模型收到截图并返回修订提示词。
3. 人为制造可 fallback 的 Primary 错误，确认 Backup 接管并显示原因。
4. 用成功的云端回复继续调用 ComfyUI，确认新图仍落在原图右侧。

### ComfyUI history 空响应回归修复（2026-06-23）

真实 ComfyUI 回归时发现：ComfyUI 已完成 prompt，并且 `/history/{prompt_id}` 最终能返回输出图片，但 LocalArt 偶发报错 `Failed to execute 'json' on 'Response': Unexpected end of JSON input`。定位结论是 ComfyUI 在执行完成前后可能短暂返回 HTTP 200 空 body，旧实现直接 `historyResponse.json()`，把“尚无可读 history”当成致命 JSON 错误。

已修复：

- `ComfyUIClient.generate()` 对 `/history/{prompt_id}` 的 HTTP 200 空 body 继续轮询。
- 非空但非法 JSON 仍按 `ComfyUI history returned invalid JSON` 报错，不吞掉真实协议错误。
- 新增回归测试覆盖“第一次 history 为空、下一次返回图片”的路径。

验证记录：

- `npx vitest run server/comfy/ComfyUIClient.test.ts`：1 个测试文件、6 项通过。
- `npm test`：31 个测试文件、108 项通过。
- 真实 ComfyUI + Flux.2 klein：从浏览器点击 `Generate revision` 后，ComfyUI 记录 `Prompt executed in 63.55 seconds`，LocalArt 服务端新增资产 `canvas/assets/c07536ec-cbe4-4b28-a7d3-a9b6ad5eda98.png`。
- `/api/health` 显示 Ollama 与 ComfyUI 均 available。

本轮未能完整确认的点：

- in-app Browser 在生成后触发 URL policy 拦截，阻止继续读取 DOM/console；未绕过该安全策略。
- `canvas/document.json` 未出现本次新资产 `c07536ec-cbe4-4b28-a7d3-a9b6ad5eda98.png` 对应的 `AIImageHolder` 引用，因此这次只确认到“Comfy 返回结果并保存资产”，未确认“前端新图落画布并 autosave”。后续需在可继续操作的浏览器/Electron 窗口中复测 UI 落图，或补一个可注入 editor/mock 的 `ChatPanel.generateRevision` 回归测试。
- 本机本轮 `npm run typecheck`/`npm run build` 在 TypeScript 阶段出现 0 CPU 静默挂起；专项测试与全量 Vitest 已通过，TypeScript 验证需重跑获得明确退出码后才能作为通过项记录。

后续补充：

- 已将前端生成后落图逻辑抽成 `insertGeneratedRevisionShape()`，避免该路径只能靠 GUI 验证。
- 新增 `client/revision-shape.test.ts`，覆盖“生成资产 URL → 创建 `AIImageHolder` → 放到源选区右侧 → 选中新 shape”。
- `npx vitest run client/revision-shape.test.ts --pool=forks --maxWorkers=1`：1 个测试文件、1 项通过。
- GitHub CI `27994101572` 通过：测试、Vite build、desktop bundle、typecheck 均完成。
- GitHub Desktop package `27994101569` 通过：macOS、Ubuntu、Windows 打包任务完成。
- 本机仍处于低内存/I/O 状态，包含 tldraw runtime 的更大本地测试组与 `npx vite build` 会在启动/transform 阶段挂住；以 GitHub Actions 结果作为本轮完整自动验证依据。

CI 打包态真实闭环复测（2026-06-23）：

- 下载 GitHub Desktop package `27994317890` 的 `localart-canvas-macos-latest` artifact，并解压运行其中的 `LocalArt Canvas.app`。
- 使用临时画布目录 `LOCALART_CANVAS_DIR=/tmp/localart-ci-canvas`、本机 Ollama `gemma3:4b`、本机 ComfyUI Flux.2 klein workflow。
- 通过 Electron remote debugging 在打包窗口中填写修订请求：`Return only this image prompt: a clean minimalist green triangle centered on a warm white background, no text`。
- Ollama 返回干净 prompt：`a clean minimalist green triangle centered on a warm white background, no text`。
- 点击 `Generate revision` 后，ComfyUI 执行完成：`Prompt executed in 67.16 seconds`。
- 打包 app DOM 中出现 1 个 `data-testid="ai-image-holder"`，图片为 `/assets/0c4676be-6a64-48b7-a65c-ce8b981f4900.png`，alt/prompt 为上述 green triangle prompt。
- `/tmp/localart-ci-canvas/assets/0c4676be-6a64-48b7-a65c-ce8b981f4900.png` 已生成，`/tmp/localart-ci-canvas/document.json` 已写入对应 `ai-image-holder` 与 `assetUrl`。
- 退出并重启同一个 CI 打包 app 后，DOM 仍恢复出同一个 `AIImageHolder` 和 asset URL，确认打包态落图与持久化恢复通过。

开发态复测注意：

- `npm run dev:desktop` 期间 Vite 多次误判源文件变化并 HMR/reload，导致生成请求被打断；该 dev-only 热更新干扰不作为产品闭环失败结论。

### M2 导出 JSON / ZIP（2026-06-23）

已完成：

- 新增 `GET /api/export/canvas.json`，导出当前画布文档，下载名为 `localart-canvas.json`。
- 新增 `GET /api/export/canvas.zip`，导出 `document.json` 与 `canvas/assets/` 下的本地资产，下载名为 `localart-canvas.zip`。
- ZIP 使用内置无压缩 stored 格式生成，包含 CRC32 与路径安全检查，不新增运行时依赖。
- 右侧 LocalArt Agent 面板新增 `Export JSON` / `Export ZIP` 下载入口。
- 新增服务端、ZIP 生成器、前端导出 URL 与面板渲染测试。

验证记录：

- `npx tsx -e "import { createStoredZipArchive } from './server/export/zip.ts'; ..."`：通过，生成 ZIP 包并确认包含 `document.json`、`assets/a.txt` 和文件内容。
- `npx esbuild server/app.ts client/export-api.ts client/components/ChatPanel.tsx --bundle --platform=node --format=esm --outdir=/tmp/localart-export-build --external:react --external:react-dom --external:tldraw`：通过。
- `npx esbuild server/export/zip.test.ts server/app.test.ts client/export-api.test.ts client/components/ChatPanel.test.tsx --bundle --platform=node --format=esm --outdir=/tmp/localart-export-test-build --external:vitest --external:supertest --external:react --external:react-dom --external:tldraw`：通过。
- GitHub CI `28020071432` 通过：`npm run build` 完成。
- GitHub Desktop package `28020071557` 通过：macOS、Ubuntu、Windows 均完成 `npm test`、`npm run build`、`npm run make` 与 artifact 上传。

本机验证限制：

- 本机当前 `vitest`、完整 `tsc`、以及动态 import `express` 会出现 0 输出/0 CPU 静默挂起；已中止，未作为失败结论。
- 后续以 GitHub CI 的 `npm test`、`npm run build`、Desktop package 作为完整自动验证依据。

### M2 导出 PNG（2026-06-24）

已完成：

- 右侧 LocalArt Agent 面板新增 `Export PNG`。
- PNG 导出优先使用当前选中形状；无选中时导出当前页面全部形状。
- 空画布导出时在 Agent 面板显示错误：`There are no canvas shapes to export`。
- PNG 下载名为 `localart-canvas.png`，使用 tldraw `editor.toImage()`，配置为 PNG、带背景、16px padding、2x pixel ratio。
- 新增 `client/png-export.ts` 与测试，覆盖目标选择、空画布错误、blob 下载流程和面板按钮渲染。

验证记录：

- `npx esbuild client/png-export.ts client/png-export.test.ts client/components/ChatPanel.tsx client/components/ChatPanel.test.tsx --bundle --platform=node --format=esm --outdir=/tmp/localart-png-build --external:vitest --external:react --external:react-dom --external:tldraw`：通过。
- GitHub CI `28048456275` 通过：`npm run build` 完成。
- GitHub Desktop package `28048456564` 通过：macOS、Ubuntu、Windows 均完成 `npm test`、`npm run build`、`npm run make` 与 artifact 上传。

本机验证限制：

- 本机 `npm run typecheck` 仍在 TypeScript 阶段静默挂起，已中止；以 GitHub CI / Desktop package 为完整验证依据。

### M2 历史版本回溯 · 后端基础（2026-06-24）

已完成：

- `CanvasStore.write()` 在覆盖当前 `document.json` 前自动保存旧文档到 `canvas/versions/`。
- 首次写入不创建历史；重复写入同一内容不创建重复历史。
- 新增 `CanvasStore.listVersions()`、`readVersion(id)`、`restoreVersion(id)`。
- 新增 `GET /api/canvas/versions`，返回版本列表。
- 新增 `POST /api/canvas/versions/:id/restore`，把指定版本恢复为当前画布文档。
- 新增存储层和 API 测试，覆盖快照、列表、恢复和重复写入。

验证记录：

- `npx esbuild server/storage/CanvasStore.ts server/storage/CanvasStore.test.ts server/app.ts server/app.test.ts --bundle --platform=node --format=esm --outdir=/tmp/localart-history-build --external:vitest --external:supertest`：通过。
- `npx tsx -e "... CanvasStore history smoke ..."`：通过，确认创建 1 个版本并恢复旧文档。
- GitHub CI `28049065705` 通过：`npm run build` 完成。
- GitHub Desktop package `28049064873` 通过：macOS、Ubuntu、Windows 均完成 `npm test`、`npm run build`、`npm run make` 与 artifact 上传。

未完成：

- 前端历史列表/恢复 UI 尚未接入；当前能力可通过本地 API 使用。

### M2 历史版本回溯 · 前端 UI（2026-06-24）

已完成：

- 新增 `client/canvas-history.ts`：封装 `GET /api/canvas/versions` 与 `POST /api/canvas/versions/:id/restore`。
- 新增右侧栏 `Canvas History` 面板，位置在模型路由面板和 LocalArt Agent 面板之间。
- 面板支持刷新版本列表、显示空状态/加载状态/错误状态。
- 每个版本显示创建时间和版本 id，点击 `Restore` 后调用后端恢复，并立刻 `editor.loadSnapshot(document)` 刷新当前画布。
- 新增 API 客户端和面板渲染测试。

验证记录：

- 红测：`npx esbuild client/canvas-history.test.ts --bundle --platform=node --format=esm --outdir=/tmp/localart-history-ui-red --external:vitest` 因缺少 `./canvas-history` 失败，符合预期。
- 红测：`npx esbuild client/components/HistoryPanel.test.tsx --bundle --platform=node --format=esm --outdir=/tmp/localart-history-panel-red --external:vitest --external:react --external:react-dom` 因缺少 `./HistoryPanel` 失败，符合预期。
- `npx esbuild client/canvas-history.ts client/canvas-history.test.ts client/components/HistoryPanel.tsx client/components/HistoryPanel.test.tsx client/App.tsx --bundle --platform=node --format=esm --outdir=/tmp/localart-history-ui-build --external:vitest --external:react --external:react-dom --external:tldraw`：通过。
- `npx esbuild client/canvas-history.ts client/canvas-history.test.ts client/components/HistoryPanel.tsx client/components/HistoryPanel.test.tsx client/App.tsx --bundle --platform=node --format=esm --outdir=/tmp/localart-history-ui-build-final --external:vitest --external:react --external:react-dom --external:tldraw`：通过。
- `git diff --check`：通过。
- GitHub CI `28051047179` 通过：`npm run build` 完成。
- GitHub Desktop package `28051047155` 通过：macOS、Ubuntu、Windows 均完成 `npm test`、`npm run build`、`npm run make` 与 artifact 上传。

### M2 UI/UX 打磨 · Agent 快捷键（2026-06-24）

已完成：

- 新增快捷键 helper：`Cmd/Ctrl+Shift+P` 触发 PNG 导出，`Cmd/Ctrl+Shift+G` 触发生成修订版。
- 快捷键会跳过 `input`、`textarea`、`select` 和 `contenteditable`，避免用户打字时误触。
- LocalArt Agent 面板按钮显示快捷键提示。
- 新增 helper 测试，覆盖快捷键匹配和输入区过滤。

验证记录：

- 红测：`npx esbuild client/agent-shortcuts.test.ts --bundle --platform=node --format=esm --outdir=/tmp/localart-shortcuts-red --external:vitest` 因缺少 `./agent-shortcuts` 失败，符合预期。
- `npx esbuild client/agent-shortcuts.ts client/agent-shortcuts.test.ts --bundle --platform=node --format=esm --outdir=/tmp/localart-shortcuts-helper-build --external:vitest`：通过。
- 本机 `perl -e 'alarm 30; exec @ARGV' npx vitest run client/components/ChatPanel.test.tsx --config vitest.config.ts` 在 Vitest 启动阶段超时退出，未跑到断言；沿用当前已知本机 Vitest 挂起限制，以 focused bundle 与 GitHub CI 为准。
- `npx esbuild client/agent-shortcuts.ts client/agent-shortcuts.test.ts client/components/ChatPanel.tsx client/components/ChatPanel.test.tsx --bundle --platform=node --format=esm --outdir=/tmp/localart-shortcuts-build --external:vitest --external:react --external:react-dom --external:tldraw`：通过。
- `git diff --check`：通过。
- GitHub CI `28051455896` 通过：`npm run build` 完成。
- GitHub Desktop package `28051455890` 通过：macOS、Ubuntu、Windows 均完成 `npm test`、`npm run build`、`npm run make` 与 artifact 上传。

### M2 UI/UX 打磨 · LocalArt 右键菜单（2026-06-24）

已完成：

- 新增 `LocalArtContextMenu`，保留 tldraw 默认右键菜单，并追加 `LocalArt` 分组。
- 右键菜单新增 `Export selection PNG`、`Add AI placeholder`、`Generate revision`。
- 新增 `localart:agent-action` 浏览器事件通道，右键菜单把动作交给现有 `ChatPanel` 执行，复用现有导出、占位图、生成修订版和错误展示逻辑。
- README 已补充右键菜单说明。

验证记录：

- 红测：`npx esbuild client/components/LocalArtContextMenu.test.tsx --bundle --platform=node --format=esm --outdir=/tmp/localart-context-menu-red --external:vitest --external:react --external:react-dom --external:tldraw` 因缺少 `./LocalArtContextMenu` 失败，符合预期。
- `npx esbuild client/components/ChatPanel.tsx client/components/ChatPanel.test.tsx --bundle --platform=node --format=esm --outdir=/tmp/localart-context-actions-build --external:vitest --external:react --external:react-dom --external:tldraw`：通过。
- `npx esbuild client/agent-events.ts client/components/LocalArtContextMenu.tsx client/components/LocalArtContextMenu.test.tsx client/components/ChatPanel.tsx client/components/ChatPanel.test.tsx client/App.tsx --bundle --platform=node --format=esm --outdir=/tmp/localart-context-menu-build-final --external:vitest --external:react --external:react-dom --external:tldraw`：通过。
- `git diff --check`：通过。
