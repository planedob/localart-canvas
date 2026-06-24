# LocalArt Canvas

LocalArt Canvas 是本地优先的 AI 视觉工作台。项目以 tldraw 画布为基础，实现“在画布上标注 → 调用 Ollama 与 ComfyUI → 把修订图放到原图旁”的本地闭环。

## 当前状态

M0、M1 与 M2 已完成并通过 Claude 阶段验收。M2 已实现 Electron 桌面壳、Ollama/OpenAI-compatible 统一聊天接口、Primary/Backup fallback、侧栏配置、JSON/ZIP/PNG 导出、历史版本恢复、基础快捷键和 LocalArt 右键菜单。真实 Flux.2 klein 本地闭环已在 Apple M4 16GB 的浏览器和打包 Electron 应用中验证。代码钩子和 API 调研见 [`docs/notes.md`](docs/notes.md)，进度和手测记录见 [`PROGRESS.md`](PROGRESS.md)。

## 环境要求

- Node.js 22.15 或更高版本
- npm
- M1 本地 AI 功能需要：
  - Ollama，默认地址 `http://127.0.0.1:11434`
  - ComfyUI，默认地址 `http://127.0.0.1:8188`

## 安装与启动

```bash
npm ci
cp config/comfyui-workflow.example.json config/comfyui-workflow.json
OLLAMA_MODEL=gemma3:4b npm run dev
```

浏览器打开 <http://127.0.0.1:5173/>。

生产构建：

```bash
npm run build
```

## Electron 桌面版

Electron 主进程会在独立 `utilityProcess` 中启动 LocalArt HTTP 服务，动态绑定 `127.0.0.1` 端口。Renderer 保持普通 Web 应用；`contextIsolation` 与 sandbox 开启，preload 只暴露平台和是否为打包态。Electron 不会安装、启动或停止 Ollama、ComfyUI 和模型。

桌面开发模式：

```bash
cp config/comfyui-workflow.example.json config/comfyui-workflow.json
OLLAMA_MODEL=gemma3:4b npm run dev:desktop
```

生成当前平台应用和安装包：

```bash
npm run package
npm run make
```

产物位于 `out/`。macOS 生成未签名 `.app` 和 ZIP；Windows 生成 Squirrel 安装包；Linux 生成 DEB 与 ZIP。Windows/Linux 当前只通过 CI 打包，GUI、路径与本地模型连接尚未实机验证。

打包后的画布默认存到 Electron `userData/canvas`，实际路径显示在右侧“服务状态”。开发模式仍使用仓库 `./canvas/`，不会自动迁移旧数据。可用 `LOCALART_CANVAS_DIR` 指向绝对路径或相对当前项目的路径。

macOS 未签名应用优先在 Finder 中右键应用并选择“打开”。开发测试需要清除隔离属性时执行：

```bash
xattr -dr com.apple.quarantine "/Applications/LocalArt Canvas.app"
```

macOS/Linux 自定义服务地址：

```bash
OLLAMA_BASE_URL=http://127.0.0.1:11434 \
COMFYUI_BASE_URL=http://127.0.0.1:8188 \
LOCALART_CANVAS_DIR=/Volumes/ArtData/localart-canvas \
npm run dev:desktop
```

Windows PowerShell：

```powershell
$env:OLLAMA_BASE_URL = "http://127.0.0.1:11434"
$env:COMFYUI_BASE_URL = "http://127.0.0.1:8188"
$env:LOCALART_CANVAS_DIR = "D:\LocalArt\canvas"
npm run dev:desktop
```

右侧状态区会显示 Ollama、ComfyUI 的连接状态和地址。未连接时，先运行 `ollama serve`，并单独启动 ComfyUI；桌面应用不会接管这两个用户进程。

## M0 手测

1. 打开本地页面，确认画布和右侧 Agent 面板出现。
2. 点击矩形工具，在画布拖出矩形。
3. 用选择工具拖动矩形。
4. 点击顶部删除按钮，确认矩形消失。

## 本地 AI 配置

推荐安装支持图像输入的 Ollama 模型：

```bash
ollama pull gemma3:4b
OLLAMA_MODEL=gemma3:4b npm run dev
```

可用环境变量：

```bash
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=gemma3:4b
COMFYUI_BASE_URL=http://127.0.0.1:8188
COMFYUI_WORKFLOW_PATH=./config/comfyui-workflow.json
COMFYUI_PROMPT_NODE_ID=4
LOCALART_CANVAS_DIR=./canvas
VITE_TLDRAW_LICENSE_KEY=your-license-key
```

默认示例使用 Flux.2 klein 4B BF16 diffusion 权重、FP4 Qwen 文本编码器和 Flux2 VAE，适配 Apple MPS。模型目录和 NVIDIA FP8 切换说明见 [`config/README.md`](config/README.md)。未提供工作流时，Ollama 聊天仍可使用，生成按钮会显示配置提示。

当前运行路径不包含 Cloudflare Worker 或云模型 SDK。真实验证环境为 Apple M4 16GB、Ollama `0.20.7`、ComfyUI `v0.25.1`、Flux.2 klein 4B；聊天完成后会自动释放 Ollama 模型，为本地图像生成腾出统一内存。

## 云模型与主备路由

右侧“Primary → Backup”区域可配置 Ollama、AIBuff、官方 OpenAI 或任意 OpenAI-compatible 端点。默认 Primary 为 Ollama；Backup 预设为 AIBuff，但没有模型名和 API Key 时保持禁用。Anthropic、Gemini、Grok 等模型首版通过兼容端点或 AIBuff 使用，不包含厂商原生 SDK。

浏览器开发模式把配置保存到仓库下已忽略的 `.localart/`。Electron 保存到 `userData/config`。普通设置与密钥分别位于 `model-providers.json`、`model-secrets.json`；密钥不会由配置读取 API 返回，也不会写入画布数据或安装包。首版使用本地文件权限，不接 OS Keychain。

环境变量优先于侧栏保存值：

```bash
LOCALART_PRIMARY_PROVIDER=ollama
LOCALART_PRIMARY_PRESET=ollama
LOCALART_PRIMARY_BASE_URL=http://127.0.0.1:11434
LOCALART_PRIMARY_MODEL=gemma3:4b

LOCALART_BACKUP_ENABLED=true
LOCALART_BACKUP_PROVIDER=openai-compatible
LOCALART_BACKUP_PRESET=aibuff
LOCALART_BACKUP_BASE_URL=https://api.aibuff.cc/v1
LOCALART_BACKUP_MODEL=your-model-name
LOCALART_BACKUP_API_KEY=your-api-key
```

两个槽位还支持 `TIMEOUT_MS`。配置目录可用 `LOCALART_CONFIG_DIR` 覆盖。环境变量覆盖的字段会在 UI 中只读显示。

只有连接失败、超时、HTTP 429 和 HTTP 5xx 会从 Primary 切到 Backup。认证错误、请求格式错误、模型不存在与内容策略错误不会自动切换，避免隐藏配置问题或产生意外云端费用。

## 画布导出、历史版本与快捷键

右侧 LocalArt Agent 面板提供：

- `Export JSON`：下载当前画布 JSON。
- `Export ZIP`：下载画布 JSON 与 assets 打包文件。
- `Export PNG`：导出当前选中形状；没有选中时导出当前页面全部形状。快捷键：`Cmd/Ctrl+Shift+P`。
- `Generate revision`：根据最近一次模型返回的修订提示生成新图。快捷键：`Cmd/Ctrl+Shift+G`。

右侧 `Canvas History` 面板会列出自动保存产生的历史版本。点击 `Restore` 会把对应版本恢复到当前画布，并立即刷新 tldraw 视图。首次保存不会产生历史版本；只有覆盖已有画布文档时才会记录旧版本。

画布右键菜单保留 tldraw 默认操作，并追加 `LocalArt` 分组：

- `Export selection PNG`
- `Add AI placeholder`
- `Generate revision`

## tldraw 许可证

tldraw SDK 可在开发环境使用；生产部署需要有效的 trial、commercial 或 hobby license key，并通过 `VITE_TLDRAW_LICENSE_KEY` 注入。水印显示由许可证类型控制，本项目不会通过 CSS 或修改 SDK 绕过许可证机制。

## 文档

- [`LocalArt-Canvas-Codex开发任务书.md`](LocalArt-Canvas-Codex开发任务书.md)：唯一产品与验收总纲
- [`PROGRESS.md`](PROGRESS.md)：里程碑进度和复现步骤
- [`docs/notes.md`](docs/notes.md)：M0 调研记录
- [`docs/M2S1-验收交接.md`](docs/M2S1-验收交接.md)：Electron 壳验收清单、录屏步骤与 CI 证据
- [`docs/M2-验收签收-Claude.md`](docs/M2-验收签收-Claude.md)：Claude 对 M2 阶段的签收结论
- [`docs/M2-剩余人工验收清单.md`](docs/M2-剩余人工验收清单.md)：云模型 key、Windows/Linux GUI、签名和发布等人工项
- [`docs/HANDOFF-M2-给接手AI.md`](docs/HANDOFF-M2-给接手AI.md)：当前完成度、剩余阻塞项和接手 AI 操作说明
- [`docs/superpowers/specs/2026-06-23-model-provider-design.md`](docs/superpowers/specs/2026-06-23-model-provider-design.md)：统一模型 Provider 与主备路由设计
