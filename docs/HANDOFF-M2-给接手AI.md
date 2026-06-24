# LocalArt Canvas · M2 接手 handoff

更新时间：2026-06-24

## 1. 当前结论

M0、M1、M2 主要代码工作已经完成，并已通过 Claude 阶段验收；剩余项目主要是人工环境验证、真实云端 key 验收、签名公证和发布策略。

当前归档范围：M2 代码层 + 自动化证据 + Claude 签收 + 人工验收清单。

## 2. 仓库状态

- 仓库：`planedob/localart-canvas`
- 本地路径：`/Users/dc/Desktop/localart-canvas-ops`
- 分支：`main`
- handoff 基准提交：`84e62c5 docs: record clean m2 validation evidence`
- handoff 文档提交：见 `git log --oneline -1`
- 已有里程碑 tag：`m0-done`、`m1-done`、`m2s1-done`
- 未跟踪文件：`.DS_Store`、`docs/superpowers/.DS_Store`，属于 macOS 垃圾文件，不要提交。

最新自动化结果：

- GitHub CI：`28088650326`，通过
- Desktop package：`28088650313`，通过
  - macOS package：通过
  - Windows package：通过
  - Linux package：通过

## 3. 完成度估算

- M0 环境与调研：100%
- M1 本地核心闭环：100%
- M2 代码与自动化：100%
- M2 Claude 阶段验收：100%，见 `docs/M2-验收签收-Claude.md`
- M2 发布前人工项：未纳入本阶段，包括真实云 key、Windows/Linux GUI 真机、签名公证
- 距离“可公开发布给普通用户”：约 85–90%，主要差签名、公证、真实多平台 GUI 和 release 流程

如果要做到正式公开发行，预计还需要 1–3+ 天，取决于签名证书、Apple notarization、Windows 证书和发布渠道。

## 4. 已完成内容

### M1

- 画布可用。
- `AIImageHolder` 可承载生成图片。
- Agent 面板可读取选中对象和画布截图。
- Ollama 本地 LLM 已接通。
- ComfyUI Workflow API 已接通。
- 标注 → 生成修订版 → 新图落在原图旁的闭环已完成，并在浏览器和打包 Electron 应用中验证。
- 画布数据自动保存和恢复已完成。

### M2

- Electron 桌面壳已完成，并已通过 Claude 第一阶段验收。
- 统一模型 Provider 已完成：
  - Ollama 本地模型
  - OpenAI-compatible 云端模型
  - AIBuff 默认 preset
  - 官方 OpenAI preset
  - Custom endpoint
  - Primary / Backup fallback
- fallback 策略已完成：
  - 网络错误、超时、429、5xx 可切 Backup
  - 401、403、模型不存在、请求格式错误不切 Backup，用于暴露配置问题
- 密钥本地存储已完成：
  - 浏览器开发态保存到 `.localart/`
  - Electron 保存到 `userData/config`
  - 密钥不进仓库、不进 URL、不写日志、不打进安装包
- 导出已完成：
  - JSON
  - ZIP
  - PNG
- 历史版本恢复已完成。
- Agent 快捷键已完成：
  - Cmd/Ctrl+Shift+P：导出 PNG
  - Cmd/Ctrl+Shift+G：生成修订版
- LocalArt 右键菜单已完成：
  - 保留 tldraw 默认菜单
  - 新增 LocalArt 分组
  - 支持导出选区 PNG、添加 AI placeholder、生成修订版
- 人工验收清单已写好：`docs/M2-剩余人工验收清单.md`

## 5. 已知取舍与注意事项

- 普通聊天当前固定非流式响应。对“生成 ComfyUI 提示词”这类短输出没问题，长聊天会等待完整响应；流式显示留作后续。
- 多模态依赖所选模型能力。如果用户给 Backup/Custom 配了纯文本模型，又发送画布截图，应该显示可读错误，不应泄露完整 provider 报文、API Key 或截图数据。
- Primary 遇到 401/403 不自动切 Backup。这是有意设计：主端 key 错误时应该暴露给用户修配置，而不是静默用 Backup 掩盖。
- 当前产品策略是不自动启动 Ollama / ComfyUI，只显示连接状态。用户需自行启动本地模型服务。
- Windows / Linux 已通过 CI 打包，但 GUI、本地路径和模型连接仍需真机确认。
- macOS / Windows 签名公证未做，需要开发者证书，属于人工凭据范围。

## 6. 接手 AI 先读这些文件

按顺序读：

1. `README.md`
2. `PROGRESS.md`
3. `docs/M2-剩余人工验收清单.md`
4. `docs/superpowers/specs/2026-06-23-model-provider-design.md`
5. `docs/M2S1-验收交接.md`
6. 最近提交：`git log --oneline -10`

接手 AI 不要先改代码。先确认当前验收证据和人工阻塞项。

## 7. 接手 AI 验证命令

在 `/Users/dc/Desktop/localart-canvas-ops` 执行：

```bash
git status --short
git log --oneline -5
gh run view 28088650326 --repo planedob/localart-canvas --json status,conclusion,url
gh run view 28088650313 --repo planedob/localart-canvas --json status,conclusion,url
```

开发启动：

```bash
npm ci
cp config/comfyui-workflow.example.json config/comfyui-workflow.json
OLLAMA_MODEL=gemma3:4b npm run dev
```

Electron 开发态：

```bash
OLLAMA_MODEL=gemma3:4b npm run dev:desktop
```

构建与打包：

```bash
npm run build
npm run package
npm run make
```

本机 Vitest / typecheck 曾出现启动阶段挂起；当前以 GitHub CI 和 Desktop package 作为完整自动化证据。

## 8. 接手 AI 需要继续做什么

### A. M2 签收归档

Claude 已签收 M2，结论见 `docs/M2-验收签收-Claude.md`。

接手 AI 应先核对：

- 仓库地址：`https://github.com/planedob/localart-canvas`
- handoff 基准提交：`84e62c5`
- CI：`28088650326`，通过
- Desktop package：`28088650313`，三平台通过
- `PROGRESS.md` 摘要
- `docs/M2-剩余人工验收清单.md`
- `docs/M2-验收签收-Claude.md`

### B. 真实云模型验收

需要 Eric 人工输入真实 key。接手 AI 不能读取、代填或提交密钥。

验收路径：

1. 启动应用。
2. 在模型配置中选择 AIBuff / OpenAI / Custom。
3. 人工输入 Base URL、Model、API Key。
4. Test connection。
5. 发一次纯文字请求。
6. 选中画布对象，发一次带截图请求。
7. 制造 Primary 网络错误，确认 Backup 接管。
8. 制造 Primary 401/403，确认不切 Backup。
9. 配纯文本模型并发送截图，确认错误可读且不泄露敏感数据。

### C. Windows / Linux GUI 真机验收

需要真实 Windows / Linux 机器：

1. 从 Desktop package artifact 下载对应平台包。
2. 安装或解压运行。
3. 启动 Ollama 和 ComfyUI。
4. 验证服务状态、M1 闭环、画布恢复、JSON/ZIP/PNG 导出、历史恢复、右键菜单。

### D. 签名、公证、发布

需要 Eric 提供凭据和决策：

- Apple Developer ID / notarization 方案
- Windows code signing certificate
- 是否使用 GitHub Releases
- 是否做 auto-update
- 版本号与 release notes 策略

未拿到这些前，不要写 secrets，不要改仓库设置，不要把凭据放进代码或 CI。

## 9. 红线

接手 AI 必须遵守：

- 不改 secrets / token / CI 凭据。
- 不 force-push 到 `main`。
- 不删历史、删分支、删仓库。
- 不改仓库设置或协作者权限。
- 不向 Gitea 或任何非 GitHub 远端写。
- 不提交 `.localart/`、`canvas/`、`out/`、密钥文件、`.DS_Store`。
- 不把 API Key 写进 URL、日志、安装包、截图、handoff 或 issue。

## 10. 给接手 AI 的提示词

```text
你接手 LocalArt Canvas。先读 README.md、PROGRESS.md、docs/M2-验收签收-Claude.md、docs/M2-剩余人工验收清单.md、docs/superpowers/specs/2026-06-23-model-provider-design.md、docs/M2S1-验收交接.md。当前 main handoff 基准提交是 84e62c5，CI 28088650326 通过，Desktop package 28088650313 三平台通过，M2 已获 Claude 阶段签收。不要先改代码，先核验状态和人工阻塞项。红线：不碰 secrets/token/CI 凭据，不 force-push，不删历史/分支/仓库，不改仓库设置，不写非 GitHub 远端。下一步如进入公开发布阶段，优先处理真实云模型 key 人工验收、Windows/Linux GUI 真机验收、签名公证和 release 策略；签名公证和发布需要 Eric 提供凭据和决策。
```

## 11. 当前交付建议

M2 已通过 Claude 阶段验收。后续公开发布时，把签名、公证、真实 key、Windows/Linux 真机明确作为发布阶段人工项，不要当作 M2 代码未完成项。
