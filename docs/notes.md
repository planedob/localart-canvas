# M0 调研记录

调研基线：官方 [`tldraw/agent-template`](https://github.com/tldraw/agent-template)，提交 `0adc288481d514cc4995424901207c57a4bb3dfc`（2026-06-12）。

## 1. 代码结构和 M1 钩子

### 应用与自定义 shape

- `client/App.tsx` 是画布组合入口。`<Tldraw>` 已传入 `tools`、`overrides` 和 `components`；M1 的 `AIImageHolder` 需新增 shape util，并通过 `shapeUtils` 传给这里。
- `client/components/chat-history/TldrawViewer.tsx` 创建只读历史画布。新增 shape 后也要把相同 shape util 传入该 viewer，否则历史预览无法渲染自定义形状。
- `client/tools/TargetShapeTool.tsx` 与 `TargetAreaTool.tsx` 展示了自定义 StateNode 工具注册方式。
- `client/App.tsx` 的 `components.HelperButtons`、`components.OnTheCanvas` 是追加画布 UI 和 overlay 的入口；右侧产品面板由 `client/components/ChatPanel.tsx` 渲染。

### Agent 可见内容

- `client/modes/AgentModeDefinitions.ts` 是能力总表。`parts` 决定发送给模型的上下文，`actions` 决定模型能做的事。
- `client/parts/SelectedShapesPartUtil.ts` 通过 `editor.getSelectedShapes()` 读取选择，并发送简化后的 shape ID。
- `client/parts/ScreenshotPartUtil.ts` 根据请求 bounds 过滤形状，用 `editor.toImage(..., { format: 'jpeg' })` 生成 data URL。
- `shared/schema/PromptPartDefinitions.ts` 定义 prompt part 的数据和消息构建逻辑。
- M1 可直接复用 selected-shapes 与 screenshot part，不需要重新发明画布采集层。

### Agent action

- `shared/schema/AgentActionSchemas.ts` 定义模型输出动作的 Zod schema。
- `client/actions/AgentActionUtil.ts` 提供注册、校验和执行基类。
- 每个动作在 `client/actions/*ActionUtil.ts` 实现 `applyAction()`，再导入 `AgentModeDefinitions.ts` 并加入 mode 的 `actions`。
- M1 的“生成修订版”更适合显式 UI 命令调用图像服务；若同时允许模型触发，可增加 `generate-image` schema 与 action util。

### 请求链

当前链路：

```text
ChatInput
  → TldrawAgent.prompt/request
  → 组装 PromptPart（选择、截图、形状、历史）
  → POST /stream
  → Cloudflare Worker
  → Durable Object / AgentService
  → Anthropic / OpenAI / Google
  → SSE actions
  → AgentActionUtil.applyAction()
```

`client/agent/TldrawAgent.ts` 的 `streamAgentActions()` 是浏览器端传输替换点。`worker/do/AgentService.ts` 是模型 provider 替换点。

## 2. 云依赖与外部请求

必须在 M1 拆除或隔离：

- `vite.config.ts`：`@cloudflare/vite-plugin`
- `worker/worker.ts`、`worker/do/AgentDurableObject.ts`、`worker/routes/stream.ts`
- `wrangler.toml`：Durable Object binding 与 migrations
- `worker/environment.ts`：三个云模型 API key
- `worker/do/AgentService.ts`：Anthropic、Google、OpenAI provider
- `shared/models.ts`：当前模型列表全是云模型
- `client/actions/CountryInfoActionUtil.ts`：示例外网 API

M1 推荐保留 `/stream` 浏览器契约，在本地 Node 服务内实现同一路由，先接 Ollama；这样 prompt part、SSE action parser 和绝大多数 Agent UI 无需重写。

## 3. tldraw 水印与许可证

当前页面右下角显示 “Get a license for production”。这是 tldraw SDK 的许可证行为，不是模板里可合法删除的普通品牌组件。

- 开发环境不要求 license key。
- 生产环境要求有效的 trial、commercial 或 hobby license key。
- commercial license 可移除水印；hobby license 保留 “made with tldraw” 水印。
- `Tldraw` 接受公开的 `licenseKey` prop，验证在客户端本地完成。

M1 应新增 `VITE_TLDRAW_LICENSE_KEY` 配置并传给 `<Tldraw licenseKey={...}>`。不得通过 CSS 隐藏、patch SDK 或伪造 key 绕过许可证。

官方说明：

- <https://tldraw.dev/sdk-features/license-key>
- <https://tldraw.dev/community/license>

## 4. ComfyUI Workflow API

默认本地地址：`http://127.0.0.1:8188`。2026-06-22 检查时本机该端口未启动。

### 工作流格式

ComfyUI 的普通保存格式包含节点布局；API 需要 `File → Export Workflow (API)` 导出的格式。根对象以数字 node ID 为 key，每个节点包含 `class_type` 和 `inputs`。提交前只替换约定节点的 prompt、seed、输入图片或模型名，不在运行时猜节点图。

### 最小调用链

1. `POST /prompt`

```json
{
  "prompt": {
    "3": {
      "class_type": "KSampler",
      "inputs": {}
    }
  },
  "client_id": "localart-canvas"
}
```

成功返回 `prompt_id` 和队列序号。校验失败返回 `error` 与 `node_errors`，应直接映射为可读错误，不进入轮询。

2. 等待执行

- 首选连接 `ws://127.0.0.1:8188/ws?clientId=<client_id>`，监听进度、节点错误和执行结束。
- 简化实现可轮询 `GET /history/{prompt_id}`，但要有超时和取消。

3. 读取结果

历史记录的输出节点包含 `filename`、`subfolder`、`type`。使用：

```text
GET /view?filename=<filename>&subfolder=<subfolder>&type=<type>
```

读取图片二进制，再创建本地 asset URL 或保存到 `./canvas/assets/`。

4. 错误策略

- 网络不可达：提示启动 ComfyUI 和实际地址。
- HTTP 非 2xx：保留状态码和响应摘要。
- `node_errors`：按 node ID 展示 class 与消息。
- WebSocket `execution_error`：终止任务并保留 prompt ID。
- 超时：允许取消等待，不假定 ComfyUI 队列已停止。

官方说明：

- <https://docs.comfy.org/development/comfyui-server/comms_routes>
- <https://docs.comfy.org/development/api-development/workflow-api-format>

## 5. Ollama OpenAI 兼容 API

2026-06-22 本机 Ollama 可访问，版本 `0.20.7`。

基础地址：

```text
http://127.0.0.1:11434/v1
```

聊天请求：

```bash
curl http://127.0.0.1:11434/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer ollama' \
  -d '{
    "model": "<本机已安装模型>",
    "messages": [{"role": "user", "content": "Reply with OK"}],
    "stream": false
  }'
```

`api_key`/Bearer 值对本地服务会被忽略，但部分 OpenAI SDK 要求提供非空字符串。`/v1/chat/completions` 支持 streaming、vision、JSON mode 和 tools；M1 可继续使用 AI SDK 的 OpenAI-compatible provider，或直接实现 SSE 适配。

运行前先用 `GET /api/tags` 获取本机模型。错误策略：

- 连接失败：提示启动 Ollama。
- 模型不存在：列出 `/api/tags` 返回的可选模型。
- 流中断：保留已显示文本，但不执行未完成 action。
- JSON/action schema 不合法：显示模型原始错误摘要，不写画布。

官方说明：

- <https://docs.ollama.com/api/openai-compatibility>
- <https://docs.ollama.com/capabilities/tool-calling>

## 6. M1 实施顺序

1. 建立可测试的运行时配置与本地健康检查。
2. 用 Node 本地服务替换 Cloudflare Durable Object，但保持 `/stream` 契约。
3. 先让 Ollama 返回普通可见消息，再恢复结构化 action。
4. 注册 `AIImageHolder` 并用静态 fixture 测试显示、移动、删除。
5. 建立 ComfyUI client，用 fake HTTP server 做提交、完成、错误和超时测试。
6. 串起选中形状、截图、生成按钮和结果定位。
7. 最后实现 `./canvas/` JSON 与 asset 持久化。
