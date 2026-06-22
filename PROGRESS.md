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

状态：代码与自动验证完成，真实云端密钥和 Electron GUI 手测待执行。

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

待人工验收：

1. 在侧栏填入 AIBuff 或其他 OpenAI-compatible 端点、模型和 API Key，完成文字请求。
2. 选择画布对象，验证云模型收到截图并返回修订提示词。
3. 人为制造可 fallback 的 Primary 错误，确认 Backup 接管并显示原因。
4. 重启 Electron，确认配置恢复且 API Key 不显示明文。
5. 用成功的云端回复继续调用 ComfyUI，确认新图仍落在原图右侧。
