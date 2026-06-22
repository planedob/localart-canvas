# 00 · 给 Codex 的启动指令（第一步，先执行这个）

> 这是整件事的第一步。**此时还没有 GitHub 仓库**——你的第一个任务不是写代码，
> 而是把当前这个本地文件夹建成 GitHub 仓库并推上去。你已连接 GitHub，可以直接做。

## 你（Codex）按顺序执行

1. 确认当前工作目录是本项目的本地文件夹，里面应有：
   `00_START_给Codex.md`(本文件)、`README.md`、`COORDINATION.md`、
   `AGENTS.md`、`CLAUDE.md`、`GEMINI.md`、`PRODUCT_SPEC.md`、
   `bootstrap.sh`、`.github/workflows/ci.yml`、`scripts/`、`docs/`。

2. 初始化本地 git（若还没有）：
   ```bash
   git init
   git add -A
   git commit -m "chore: 初始化 LocalArt Canvas 项目骨架与协作文档"
   ```

3. 在 GitHub 创建远程仓库并推送（一条命令搞定，仓库名可改）：
   ```bash
   gh repo create localart-canvas --private --source=. --remote=origin --push
   ```
   - 要公开就把 `--private` 换成 `--public`。
   - 若提示已存在同名仓库，换个名字或先确认。

4. 验证推送成功：
   ```bash
   git remote -v
   gh repo view --web
   ```

5. 运行一次初始化脚本，建好协作所需的 labels / 看板 / 起步 issue / 回滚 tag / main 保护：
   ```bash
   bash bootstrap.sh
   ```

6. 回报给人类：仓库地址、bootstrap 创建的 issue 编号、看板是否建成、main 保护是否设上。

## 完成这一步后就停

- **这一步只做：建仓库 + 推文件 + 初始化。不要开始写功能代码。**
- 之后三个 AI 各自按本地的角色文档开工：
  - 你 **Codex** → `AGENTS.md`（主力开发）
  - **Claude Code** → `CLAUDE.md`（规划 + 验收）
  - **Gemini** → `GEMINI.md`（侦察 + 文档）
  - 三者共同的协作规则、接力流程、Goal 模式、红线 → `COORDINATION.md`
- 你后续的活从 `stage:ready` 且 `agent:codex` 的 issue 里取（见 `AGENTS.md`）。
- 红线（永不自动做的危险操作）见 `COORDINATION.md` 第 4 节，建仓库这步不涉及。
