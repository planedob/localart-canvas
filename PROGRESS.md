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

- Agent 请求仍依赖 Cloudflare 与云模型密钥；M1 替换为本地服务/Ollama。
- ComfyUI 未启动，因此 M0 只完成 API 调研，未执行真实生成。
- tldraw 生产使用需要合法 license key，不能通过代码移除许可证水印。

## M1 · MVP 核心闭环

状态：进行中。

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
- `canvas/document.json` 自动保存已生效，当前 API 可读回包含 2 个 shape 的完整 snapshot。

待完成：

- 提供并验证本机 Flux.2 klein ComfyUI API workflow。
- 用真实 ComfyUI 完成图片生成与落画布。
- 浏览器重启后复验 `canvas/document.json` 自动恢复。
