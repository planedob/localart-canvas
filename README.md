# LocalArt Canvas

LocalArt Canvas 是本地优先的 AI 视觉工作台。项目以 tldraw 画布为基础，实现“在画布上标注 → 调用 Ollama 与 ComfyUI → 把修订图放到原图旁”的本地闭环。

## 当前状态

M0 与 M1 已完成。当前已接通本地 Express tool server、Ollama、ComfyUI Workflow API、自定义图片形状与文件系统持久化，真实 Flux.2 klein 闭环已在 Apple M4 16GB 上验证。代码钩子和 API 调研见 [`docs/notes.md`](docs/notes.md)，进度和手测记录见 [`PROGRESS.md`](PROGRESS.md)。

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

## tldraw 许可证

tldraw SDK 可在开发环境使用；生产部署需要有效的 trial、commercial 或 hobby license key，并通过 `VITE_TLDRAW_LICENSE_KEY` 注入。水印显示由许可证类型控制，本项目不会通过 CSS 或修改 SDK 绕过许可证机制。

## 文档

- [`LocalArt-Canvas-Codex开发任务书.md`](LocalArt-Canvas-Codex开发任务书.md)：唯一产品与验收总纲
- [`PROGRESS.md`](PROGRESS.md)：里程碑进度和复现步骤
- [`docs/notes.md`](docs/notes.md)：M0 调研记录
