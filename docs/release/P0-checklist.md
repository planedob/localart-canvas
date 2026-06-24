# Release Prep P0 Checklist

## 1. 代码与验收基线

- [ ] `main` 位于期望提交。
- [ ] `m2-done` tag 存在且已推送。
- [ ] `docs/M2-验收签收-Claude.md` 存在。
- [ ] `PROGRESS.md` 记录最新 CI 与 Desktop package run。
- [ ] `README.md` 标明 M2 已完成。

## 2. 自动化

- [ ] GitHub CI 最近一轮通过。
- [ ] Desktop package 最近一轮通过。
- [ ] macOS artifact 可下载。
- [ ] Windows artifact 可下载。
- [ ] Ubuntu/Linux artifact 可下载。

## 3. 人工 QA

- [ ] macOS 真机启动。
- [ ] Windows 真机启动。
- [ ] Linux 真机启动。
- [ ] Ollama 连接显示正常。
- [ ] ComfyUI 连接显示正常。
- [ ] M1 闭环可完成：选中对象 → 提示词 → ComfyUI 生成 → 新图落画布。
- [ ] 关闭重启后画布恢复。
- [ ] JSON / ZIP / PNG 导出可打开。
- [ ] History Restore 可用。
- [ ] LocalArt 右键菜单可用。

## 4. 云模型人工验收

- [ ] AIBuff 或 OpenAI-compatible 端点由人工输入 API Key。
- [ ] Test connection 成功。
- [ ] 纯文本聊天成功。
- [ ] 带画布截图请求成功，或模型不支持多模态时显示可读错误。
- [ ] Primary 网络失败、超时、429、5xx 时 Backup 接管。
- [ ] Primary 401/403 时不切 Backup，并显示配置错误。
- [ ] 日志、截图、文档不包含 API Key。

## 5. 发布凭据与策略

- [ ] 决定是否公开发布。
- [ ] 决定是否使用 GitHub Releases。
- [ ] 决定版本号。
- [ ] 决定是否签名 / 公证。
- [ ] 若签名，人工准备 Apple Developer ID / Windows 证书。
- [ ] 若公证，人工准备 Apple notarization 凭据。

## 6. 最后检查

- [ ] `npm run release:preflight` 无 blocking failures。
- [ ] 没有提交 `.DS_Store`。
- [ ] 没有提交 `.localart/`、`canvas/`、`out/`。
- [ ] 没有提交 secrets / token / key / certificate。
- [ ] Release notes 不含私人录屏、私人聊天截图或敏感路径。
