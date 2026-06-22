# AGENTS.md — LocalArt Canvas 单人开发规约

`LocalArt-Canvas-Codex开发任务书.md` 是唯一工作依据。

- Codex 是唯一开发者，负责调研、实现、测试、文档、提交与里程碑标签。
- 直接在 `main` 小步提交；每个功能先写失败测试，再写最小实现。
- 每完成一个里程碑，更新 `PROGRESS.md`、验证 README 步骤、提交、推送并打 `mX-done` tag。
- 保留 `safe-start` tag。
- 禁止修改 secrets、token、CI 凭据、仓库设置和权限；禁止 force-push、删除历史、分支或仓库；禁止向非 GitHub 远端写入。
- 当前顺序：M0 环境与调研 → M1 标注生成闭环 → M2 可用版 → M3 可选进阶。
