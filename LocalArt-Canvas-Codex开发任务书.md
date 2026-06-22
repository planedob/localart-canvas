# LocalArt Canvas — Codex 开发任务书

## 1. 分工

- Codex 是唯一开发者：负责环境、调研、实现、测试和文档。
- Claude 仅在里程碑交付后按本文件验收。
- 不使用多 Agent 协调、Issue 接力或 PR 审批流程。

## 2. 项目

LocalArt Canvas 是本地优先、可混合云模型的个人 AI 视觉工作台。用户在 tldraw 无限画布上用框、箭头和文字标注图片，应用读取标注与画布上下文，通过 Ollama 理解指令、通过 ComfyUI 生成修订图，并把结果放在原图旁。画布和资产保存在 `./canvas/`。

技术栈：tldraw Agent Starter Kit、Vite、React 19、TypeScript；本地服务层；Ollama OpenAI 兼容 API；ComfyUI Workflow API；后续 Electron。

## 3. 工程约定

- 直接在 `main` 小步提交，提交信息使用 Conventional Commits。
- 每个产品行为至少有一条自动测试；无法自动化的验收步骤写入 `PROGRESS.md`。
- `README.md` 始终提供可执行的安装与启动说明。
- 每完成里程碑，更新 `PROGRESS.md`，推送代码并创建 `m0-done`、`m1-done` 等标签。
- 保留 `safe-start` 回滚标签。

## 4. 里程碑

### M0：环境与调研

- 引入并跑通官方 tldraw Agent Starter Kit。
- 在 `docs/notes.md` 记录自定义 shape、agent、action 钩子，水印与云依赖位置。
- 记录 ComfyUI Workflow API 的提交、状态、结果图和错误处理。
- 记录 Ollama OpenAI 兼容调用。

### M1：MVP 核心闭环

- 移除水印与云强依赖，纯本地启动。
- 增加可显示、移动、删除的 `AIImageHolder` 形状。
- AI 面板读取选中形状和画布截图，并显示 Ollama 回应。
- 接入 ComfyUI，生成图片并放入画布。
- 实现“标注 → 生成修订版 → 新图位于原图旁”。
- 自动保存并从 `./canvas/` 恢复画布 JSON 与资产。

### M2：可用版

- Electron 跨平台打包。
- 本地与云端模型切换。
- 历史回溯和 PNG、JSON、ZIP 导出。
- 主题、快捷键和右键菜单。

### M3：可选进阶

- 插件、ControlNet/IP-Adapter、批量生成、A/B 测试和开源发布。

## 5. 验收

### M0

- [ ] 官方 demo 能启动且画布可交互。
- [ ] `docs/notes.md` 覆盖 fork 钩子、水印/云依赖、ComfyUI 和 Ollama。

### M1

- [ ] 无云密钥时可纯本地启动。
- [ ] `AIImageHolder` 可显示、移动、删除。
- [ ] AI 面板可发送选中形状和截图，并显示 LLM 回应。
- [ ] Ollama 可完成一次本地指令。
- [ ] ComfyUI 可生成一张图并放到画布。
- [ ] 画标注后点击生成，新图出现在原图旁。
- [ ] 重启后从 `./canvas/` 恢复。
- [ ] 每项有自动测试或 `PROGRESS.md` 手测步骤。

## 6. 交付

交付里程碑前确认代码和 tag 已推送、`PROGRESS.md` 已更新、README 可照着运行。Claude 根据本文件输出通过或修复清单。

## 7. 红线

不得自动修改 secrets、token、CI 凭据、仓库设置、权限；不得 force-push、删除历史、分支或仓库；不得向非 GitHub 远端写入。
