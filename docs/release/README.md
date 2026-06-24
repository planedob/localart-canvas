# LocalArt Canvas · Release Prep

M2 已通过 Claude 阶段验收。这个目录用于后续公开发布准备，不属于 M2 代码验收范围。

## 当前状态

- 最新 M2 归档提交：`b8d4f0b docs: archive m2 claude signoff`
- M2 tag：`m2-done`
- Claude 签收：`docs/M2-验收签收-Claude.md`
- 最新 CI：`28112214622`，通过
- 最新 Desktop package：`28112214466`，macOS / Windows / Ubuntu 全通过

## 发布前先跑

```bash
npm run release:preflight
```

这个命令只做本地只读检查，不发布、不签名、不公证、不改仓库设置、不读取密钥文件内容。

## 文档索引

- `P0-checklist.md`：发布准备检查清单。
- `manual-qa.md`：macOS / Windows / Linux 人工验收步骤。
- `github-release-draft.md`：GitHub Release 草稿。
- `rollback.md`：回滚和恢复说明。

## 红线

- 不提交 API Key、token、`.localart/`、`canvas/`、`out/`、签名证书。
- 不在脚本中读取或打印密钥文件内容。
- 不自动修改 GitHub 仓库设置。
- 不 force-push、不删历史、不删 tag。
- 不向非 GitHub 远端写入。
