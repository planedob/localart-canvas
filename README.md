# LocalArt Canvas — 三 Agent 联合开发（本地文档包）

这是一个**本地文件夹**，里面是项目骨架 + 三个 AI 的工作安排与职责。
流程是：**本地准备好文档 → Codex 把它建成 GitHub 仓库 → 三个 AI 按本地文档开发 → 进度随时存进仓库。**

## 执行顺序（重要）

**第 0 步｜Codex 建仓库**：把本文件夹交给已连 GitHub 的 Codex，让它执行 `00_START_给Codex.md`。
它会 `git init` → `gh repo create` 推上 GitHub → 跑 `bootstrap.sh` 建好 labels/看板/起步 issue。
**这一步之前没有仓库，所以必须先做这步**，否则其它 AI 无处读写进度。

**第 1 步｜各 AI 开工**：仓库建好后，在仓库克隆目录里启动三个 AI，各读自己的本地角色文档干活：

| 文档 | 给谁 | 职责 |
|---|---|---|
| `00_START_给Codex.md` | Codex（第 0 步用） | 建仓库 + 推文件 + 初始化 |
| `AGENTS.md` | **Codex** | 主力开发：按 issue 实现、写测试、开 PR |
| `CLAUDE.md` | **Claude Code** | 规划 + 验收：拆任务、定接口、审 PR、决定合并 |
| `GEMINI.md` | **Gemini** | 侦察 + 文档：读代码库/查 API、写文档 |
| `COORDINATION.md` | 三个都读 | 协作规则、接力流程、Goal 模式、权限红线 |
| `PRODUCT_SPEC.md` | Claude 读 | 里程碑，Claude 据此拆 issue |
| `bootstrap.sh` | 第 0 步跑一次 | 建 labels / 看板 / 起步 issue / safe-start tag / main 保护 |
| `.github/workflows/ci.yml` | GitHub 自动 | PR 的 lint+test 闸口 |
| `scripts/run-*.sh` | 第 1 步启动 | 各 AI 的 Goal 循环 runner |

## 各 AI 怎么「看仓库」并干活

两部分：①在仓库**本地克隆目录里启动**，自动读到自己的 `*.md`（角色+规则）和代码；
②通过已认证的 `gh` 读 GitHub 上的 **issues / PR / 看板**，知道现在到哪步、该干什么。
干完用 `git push` + `gh` 写回。**进度始终保存在 GitHub 仓库里**，跨设备/跨 AI 都能接上。

## 前提（每台跑 AI 的机器各一次）
- 装好 CLI：Codex CLI / Claude Code / Gemini CLI。
- `gh auth login` 用同一 GitHub 账号认证（三个 AI 读写 GitHub 的通道）。
- 第 0 步建好仓库后，其它机器 `git clone` 下来再启动 AI。

## 启动各 AI（第 1 步之后）
在仓库目录里各开一个终端：
```bash
bash scripts/run-gemini.sh     # 侦察
bash scripts/run-claude.sh     # 拆卡 + 验收
bash scripts/run-codex.sh      # 主力实现
```
它们各自进 LOOP：`git pull` → 取本阶段 issue → 干 → 改 label 交棒 → `commit/push`，跑到额度耗尽后自动退避、等窗口重置再续。
（runner 里各 CLI 的启动 flag 以 `--help` 当前版本为准，可能需微调；CI 里的 lint/test 命令等项目骨架建好后改成实际命令。）

## 安全网
- Gitea 镜像保持开启 = 离线备份；`safe-start` tag = 回滚点（`git reset --hard safe-start`）。
- agent 永不自动做：改设置/保护/权限、force-push、删分支/历史、动 secrets（见 `COORDINATION.md` 第 4 节）。
