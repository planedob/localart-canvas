# LocalArt Canvas M2 · 当前进度、卡点与 Electron 架构决策

更新日期：2026-06-22

## 1. 当前进度

### M0 · 环境与调研

状态：完成，标签 `m0-done` 已推送。

- tldraw 画布可本地启动和交互。
- 已记录自定义 shape、Agent/action 钩子、云依赖、ComfyUI Workflow API 与 Ollama 调用方式。

### M1 · MVP 核心闭环

状态：完成，标签 `m1-done` 已推送。

- 已移除 Cloudflare Worker、云模型 SDK 和旧 Agent runtime。
- `AIImageHolder` 可显示、移动、删除。
- AI 面板可读取选中形状与截图，并调用本地 Ollama。
- 已接通真实 ComfyUI `v0.25.1` 与 Flux.2 klein 4B。
- 已验证“选中画布对象 → Ollama 生成提示词 → ComfyUI 生成图片 → 新图放在原图右侧”。
- 画布 JSON 与图片资产自动保存到 `canvas/`，重启前后端后可恢复。
- Ollama 完成聊天后会自动释放模型，为 16GB 机器上的 ComfyUI 推理腾出统一内存。
- 自动测试 38 项通过，GitHub CI 通过。

### 总体完成度

- M0：100%
- M1：100%
- M2：刚开始
- 按 M0–M2 正式交付范围估算：约 65%
- M3 为可选进阶，不影响 MVP 与可用版交付。

## 2. 当前环境与已知限制

- 当前开发与真实验收机器：Apple M4、16GB 统一内存。
- Ollama：`0.20.7`，已验证 `gemma3:4b`。
- ComfyUI：`v0.25.1`，安装与模型位于外置卷 `/Volumes/2Tnd`。
- Apple MPS 当前无法运行 Flux.2 klein FP8 diffusion 权重，真实验证使用 BF16 4B 权重。
- tldraw 生产包需要合法 `VITE_TLDRAW_LICENSE_KEY`；开发环境会显示官方许可证提示。
- 上游 tldraw zh-CN locale 缺少两个新 key，会产生 warning，但不影响功能。
- 当前系统盘空间较紧，大型模型和 ComfyUI 不能放入应用安装包。

## 3. M2 范围与推进顺序

M2 包含四个相对独立的子系统，计划按以下顺序推进：

1. Electron 桌面壳与跨平台打包基线。
2. 历史回溯与 PNG、JSON、ZIP 导出。
3. 本地/云端模型切换与 fallback UI。
4. 主题、快捷键、右键菜单及整体 UI/UX 打磨。

当前只设计和实现第 1 项，避免一次改动四个子系统。

## 4. 已确认的 Electron 产品边界

- 第一阶段先在当前 Mac 完成 Electron 可运行、可打包基线。
- 同时准备 Windows 与 Linux 构建目标和 CI 配置，但暂不自动发布安装包。
- Electron 不负责下载、安装或更新 Ollama、ComfyUI 和大型模型。
- Electron 只检测并连接用户已经启动的 Ollama 与 ComfyUI 服务。
- 现有浏览器开发模式继续保留，不因 Electron 引入而失效。

## 5. Electron 架构候选

### 方案 A · Electron 主进程内启动现有 Express 服务（推荐）

Electron 主进程创建并管理现有 Express 应用。开发模式加载 Vite；生产模式由 Express 同时托管 `dist/`、`/api` 和 `/assets`，BrowserWindow 打开随机 localhost 端口。

优点：

- 最大程度复用 M1 已测试的 HTTP API 和服务层。
- 浏览器模式与 Electron 模式行为一致。
- 不需要额外 Node sidecar 进程，也不需要重写 IPC。
- 本地 assets、健康检查和错误处理路径保持统一。

代价：

- Electron 主进程需要负责服务启动、端口选择和退出清理。
- 必须限制服务只监听 `127.0.0.1`，避免暴露到局域网。
- 需要处理窗口启动早于服务就绪的情况。

### 方案 B · 独立 Node sidecar 子进程

Electron 启动一个打包后的 Node 服务子进程，BrowserWindow 再连接该服务。

优点：服务与 Electron 主进程隔离，崩溃边界更清晰。

代价：跨平台可执行文件路径、子进程退出、日志、端口和打包配置都更复杂，首版收益不足。

### 方案 C · 将 HTTP API 全部改为 Electron IPC

Renderer 通过 preload 暴露的安全 API 调用主进程，不再使用 Express。

优点：桌面应用边界清晰，不需要 localhost HTTP 服务。

代价：需重写 M1 的 API 客户端、服务入口和大量测试；浏览器模式还需保留另一套调用路径，维护成本最高。

## 6. 推荐架构草案

采用方案 A：

1. Electron 主进程读取运行配置。
2. 使用现有 `createApp` 创建 Express 应用，只监听 `127.0.0.1` 和系统分配的随机端口。
3. 开发模式下 BrowserWindow 加载 Vite 地址，API 仍走当前 Express 服务。
4. 生产模式下 Express 托管 Vite 构建产物，并让 BrowserWindow 加载本地服务地址。
5. Electron 中的默认画布目录改为 `app.getPath('userData')/canvas`，避免安装目录只读。
6. 关闭应用时停止 HTTP server，清理窗口引用，不终止用户自行运行的 Ollama 或 ComfyUI。
7. Renderer 不启用 Node integration；使用 `contextIsolation: true` 和最小 preload。

## 7. 当前卡点

### 卡点 1 · 架构方案尚未最终批准

推荐方案 A 已提出，但仍需用户明确批准后才能进入实现计划和代码阶段。

### 卡点 2 · Electron 数据目录迁移策略

浏览器开发模式目前使用仓库下的 `./canvas/`；Electron 生产模式推荐使用系统 `userData/canvas`。需要明确首版是否自动导入旧目录数据，还是只在文档中提供手工迁移说明。

推荐：首版不自动搬迁，在首次启动说明中展示实际数据目录；自动迁移留到历史与导出子项目处理。

### 卡点 3 · macOS 签名与公证

当前没有 Apple Developer ID 与公证凭据，且红线禁止自动修改 secrets。

推荐：M2 第一阶段先产出未签名本地包；签名、公证和发布流水线等用户提供凭据后单独实施。

### 卡点 4 · Windows/Linux 实机验收

当前只有 macOS 开发机。可以配置跨平台构建目标和 GitHub Actions matrix，但无法在本机完成 Windows/Linux GUI 与模型连接实测。

推荐：第一阶段以 macOS 实机验收为完成门槛；Windows/Linux 要求 CI 构建成功，并在后续提供对应实机验收记录。

### 卡点 5 · tldraw 生产许可证

Electron 生产包仍需要合法 `VITE_TLDRAW_LICENSE_KEY`。没有许可证时可验证开发包和技术打包流程，但不能把去除官方提示作为完成标准。

## 8. 决策结果

用户已于 2026-06-22 批准 M2 第一阶段，并作出以下最终决策：

1. 保留本地 HTTP 架构，但 Express 改由 Electron `utilityProcess.fork` 受管子进程运行，主进程不直接承载服务。
2. 打包态使用 `userData/canvas`，不自动迁移仓库 `./canvas/`；路径可通过 `LOCALART_CANVAS_DIR` 覆盖。
3. 第一阶段只生成未签名 macOS 包，签名和公证在用户提供凭据后单独处理。
4. Windows/Linux 以 CI 构建和打包成功为阶段门槛，并明确标注实机未验。
5. Electron 只连接用户自行启动的 Ollama/ComfyUI，不安装、不启动、不停止重型服务。
6. tldraw 水印和许可证校验完整保留。

正式规格见 `docs/superpowers/specs/2026-06-22-m2-electron-shell-design.md`。
