# M2 第一阶段 · Electron 壳与打包基线设计

状态：已批准

依据：`docs/M2-Electron-进度与架构决策.md` 与用户提供的 `M2决策与执行指令-回复Codex.md`

## 1. 目标

把现有 LocalArt Canvas 浏览器应用封装为 Electron 桌面应用，同时完整保留 M1 的本地 HTTP API、Ollama/ComfyUI 闭环、画布持久化和浏览器开发模式。

本阶段只交付 Electron 壳、运行时隔离、数据目录、服务状态 UI 与跨平台打包基线。历史/导出、模型 fallback、主题与交互打磨不在本阶段范围内。

## 2. 核心约束

- Renderer 继续通过 HTTP 调用现有 `/api` 与 `/assets`，不改写为 Electron IPC。
- Express 必须运行在 Electron `utilityProcess.fork` 创建的受管子进程中，不运行在主进程线程。
- 服务只监听 `127.0.0.1`，端口传 `0`，由操作系统分配空闲端口。
- Electron 不下载、不启动、不停止 Ollama、ComfyUI 或模型。
- `contextIsolation: true`、`nodeIntegration: false`，preload 只暴露必要的只读运行信息。
- 保留 tldraw 官方水印与 license 校验，不添加隐藏、修改或绕过代码。
- 浏览器开发模式必须继续使用当前 `npm run dev`，行为不回归。

## 3. 运行架构

### 3.1 Electron 主进程

主进程负责：

1. 计算运行模式和资源路径。
2. 通过单一 `getCanvasDir()` 解析画布数据目录。
3. 用 `utilityProcess.fork` 启动打包后的服务入口。
4. 向子进程传入画布目录、Ollama URL、ComfyUI URL、workflow 路径和静态前端目录。
5. 显示轻量 loading window。
6. 等待子进程通过 `parentPort.postMessage` 返回 `{ type: 'ready', port }`。
7. 创建主 BrowserWindow，加载 `http://127.0.0.1:<port>`，然后关闭 loading window。
8. 应用退出时终止 utility process，只回收 LocalArt 自己的进程。

子进程异常退出时，主进程显示可读错误窗口并提供退出按钮。本阶段不做无限自动重启，避免崩溃循环。

### 3.2 Utility service process

新增 Electron 专用服务入口，复用现有：

- `createRuntimeConfig`
- `createApp`
- `createGenerationService`
- `CanvasStore`

服务调用 `listen(0, '127.0.0.1')`，获取实际端口后通知父进程。生产模式下额外托管 Vite `dist/`：

- `/api/*`：现有 API
- `/assets/*`：画布资产
- 其他 GET 请求：返回 `dist/index.html`

静态资源目录缺失、端口监听失败或服务初始化失败时，子进程向父进程发送 `{ type: 'error', message }` 后退出。

### 3.3 开发模式

保留两条开发路径：

- 浏览器模式：`npm run dev`，Vite `5173` 代理到 Express `3001`。
- Electron 模式：Vite 仍运行在 `5173`；utility process 使用动态 API 端口；Electron BrowserWindow 加载 Vite URL。Vite 的 `/api` 与 `/assets` 代理目标通过启动时环境变量指向动态端口。

为避免动态代理配置复杂化，Electron 开发脚本先启动 utility process 并取得端口，再启动 Vite 并设置 `LOCALART_API_TARGET=http://127.0.0.1:<port>`，最后创建 BrowserWindow。

## 4. 数据目录

`getCanvasDir()` 是 Electron 数据目录的唯一来源：

1. 若设置 `LOCALART_CANVAS_DIR`，使用该路径并解析为绝对路径。
2. Electron 开发模式默认使用仓库 `./canvas/`。
3. Electron 打包模式默认使用 `app.getPath('userData')/canvas`。

首版不自动迁移仓库下的旧 `./canvas/`。UI 在服务状态区域显示实际数据目录。高级用户可通过 `LOCALART_CANVAS_DIR` 指向外置卷。

## 5. 服务连接与配置

Ollama 与 ComfyUI 继续由用户自行运行。端点配置沿用：

- `OLLAMA_BASE_URL`
- `COMFYUI_BASE_URL`
- `OLLAMA_MODEL`
- `COMFYUI_WORKFLOW_PATH`
- `COMFYUI_PROMPT_NODE_ID`

Electron 将这些值传给 utility process。UI 调用扩展后的 `/api/health`，显示：

- Ollama：已连接 / 未找到、当前 URL。
- ComfyUI：已连接 / 未找到、当前 URL。
- Canvas：实际数据目录。

未连接时显示简短引导：

- Ollama：运行 `ollama serve` 并确认已安装模型。
- ComfyUI：启动 ComfyUI 并确认监听配置中的 URL。

本阶段不提供自动启动助手，不打包模型。端点通过环境变量配置，README 给出 macOS、Windows PowerShell 和 Linux 示例。

## 6. Renderer 与 preload

Renderer 保持普通 Web 应用，不直接访问 Node API。

preload 仅暴露：

```ts
interface LocalArtDesktopApi {
  platform: NodeJS.Platform
  isPackaged: boolean
}
```

服务状态、数据路径与端点全部从本地 HTTP API 获取，避免 Electron 与浏览器维护两套状态来源。

## 7. 打包

使用 Electron Forge 管理开发与打包：

- macOS：未签名 `.app` / ZIP
- Windows：Squirrel 安装包
- Linux：DEB 与 ZIP

生产构建顺序：

1. Vite 构建 renderer 到 `dist/`。
2. TypeScript 分别构建 Electron main、preload 和 utility service 入口。
3. Forge 将 Electron 运行时、编译后的桌面代码、`dist/`、server 运行依赖和默认 workflow 示例打入应用。

不在 asar 内写入画布数据。所有运行数据写到 `userData/canvas` 或显式配置目录。

macOS 第一阶段不签名、不公证。README 明确：

- 首选 Finder 右键 → 打开。
- 开发测试可执行 `xattr -dr com.apple.quarantine <App>`。

## 8. CI

GitHub Actions 使用 matrix：

- `macos-latest`
- `windows-latest`
- `ubuntu-latest`

每个平台执行：

1. `npm ci`
2. `npm test`
3. `npm run build`
4. 对应平台的 Forge package/make

CI 只证明代码可编译并产出包。Windows/Linux 的 GUI、路径、Ollama/ComfyUI 连接明确标记为“实机未验”。CI 不发布 release，不修改 secrets，不签名。

## 9. 错误处理

- Utility process 在 ready 前失败：loading window 显示错误，主窗口不创建。
- Ollama/ComfyUI 不可用：桌面应用仍启动，状态 UI 显示未连接，相关操作沿用现有可读错误。
- workflow 缺失：Ollama 对话仍可用，生成按钮请求返回配置错误。
- 数据目录不可写：服务启动失败并向主进程报告具体路径。
- Renderer 加载失败：主进程显示加载错误，不静默白屏。

## 10. 测试策略

### 自动测试

- `getCanvasDir()`：显式覆盖、开发默认、打包默认。
- Utility service：动态端口、loopback 绑定、ready/error 消息、静态前端 fallback。
- 主进程生命周期控制器：收到 ready 后创建主窗口；退出时 kill utility process；不操作 Ollama/ComfyUI。
- `/api/health`：返回服务状态、端点与 canvas 目录。
- Renderer 状态组件：连接、断开、引导与数据目录。
- 现有 38 项 M1 测试全部保留。

### 手动验收

- macOS Electron 开发模式启动。
- 未签名 macOS 包生成并通过右键打开。
- Electron 内演示一次真实 M1 闭环。
- 退出 Electron 后确认 utility process 被回收，Ollama/ComfyUI 仍在用户原有状态。
- 重启 Electron 后从 `userData/canvas` 恢复画布。
- 浏览器模式重新执行 M1 核心手测。

## 11. 完成标准

- macOS Electron 从动态 loopback 服务加载并完成真实 M1 闭环。
- Express 运行于 `utilityProcess`，退出时干净回收。
- 打包态使用 `userData/canvas`，路径可覆盖并在 UI 显示。
- 浏览器开发模式无回归。
- 未签名 macOS 包可生成并打开，README 有 Gatekeeper 说明。
- Windows/Linux CI 可打包，且文档标注实机未验。
- UI 显示 Ollama/ComfyUI 状态、端点、启动引导和 canvas 路径。
- 无水印绕过代码。
- 测试、构建与 CI 通过；README、PROGRESS 更新；创建并推送 `m2s1-done`。

## 12. 明确不做

- 自动安装或启动 Ollama、ComfyUI、模型。
- 云模型 fallback 与模型切换 UI。
- 历史版本、PNG/JSON/ZIP 导出。
- 自动迁移旧 `./canvas/`。
- macOS 签名、公证与 release 发布。
- Windows/Linux 实机 GUI 验收。
- tldraw 水印隐藏或许可校验绕过。
