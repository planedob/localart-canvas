# LocalArt Canvas

LocalArt Canvas 是本地优先的 AI 视觉工作台。当前仓库以官方 tldraw Agent Starter Kit 为基础，目标是实现“在画布上标注 → 调用 Ollama 与 ComfyUI → 把修订图放到原图旁”的本地闭环。

## 当前状态

M0 基线已建立：画布与 Agent 面板可在本地启动，代码钩子和本地 API 调研见 [`docs/notes.md`](docs/notes.md)，进度和手测记录见 [`PROGRESS.md`](PROGRESS.md)。

## 环境要求

- Node.js 22.15 或更高版本
- npm
- M1 本地 AI 功能需要：
  - Ollama，默认地址 `http://127.0.0.1:11434`
  - ComfyUI，默认地址 `http://127.0.0.1:8188`

## 安装与启动

```bash
npm ci
npm run dev -- --host 127.0.0.1
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

当前模板的云端模型请求仍依赖 Cloudflare Worker 和 Anthropic/OpenAI/Google 密钥；M1 将其替换为本地服务与 Ollama，并加入 ComfyUI 图像生成。

## tldraw 许可证

tldraw SDK 可在开发环境使用；生产部署需要有效的 trial、commercial 或 hobby license key。水印显示由许可证类型控制。本项目不会通过 CSS 或修改 SDK 绕过许可证机制。

## 文档

- [`LocalArt-Canvas-Codex开发任务书.md`](LocalArt-Canvas-Codex开发任务书.md)：唯一产品与验收总纲
- [`PROGRESS.md`](PROGRESS.md)：里程碑进度和复现步骤
- [`docs/notes.md`](docs/notes.md)：M0 调研记录
