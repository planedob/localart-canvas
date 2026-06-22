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
