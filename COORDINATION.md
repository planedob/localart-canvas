# COORDINATION.md — 三 Agent 协同协议（GitHub 主线）

> **每个 agent 每次开工第一件事**：`git pull` + 读本文件 + `gh issue list` 看当前看板，再动手。
> 三个 agent 不直接对话，只通过 GitHub 异步对接：读共享状态 → 干自己这棒 → 写回状态 → 交棒。

---

## 0. 总线 = GitHub（唯一可写源）

- GitHub 承载一切协调数据：issues / PR / 看板 / Actions / 代码。
- Gitea（NAS）降级为**只读离线镜像**，自动 push-mirror 备份。**任何 agent 不向 Gitea 写。**
- 全部 push / pull 只走 GitHub，避免双远端脑裂。

## 1. 进度数据的载体

- **Issue = 任务卡**：一个任务一个 issue，正文用三段式（目标 / 接口契约 / 验收标准，见 CLAUDE.md）。
- **Label = 状态**：
  - 阶段：`stage:recon` `stage:planning` `stage:ready` `stage:building` `stage:review` `stage:done`
  - 归属：`agent:gemini` `agent:claude` `agent:codex`
- **Project 看板**：列 = 各 stage，卡随 label 自动归位 —— 这是进度的唯一真相视图。
- **PR = 构建交付 + 验收闸口**：Codex 开 PR 写 `Closes #N`；Claude 用 PR review 验收；合并 = done。
- **评论 = 异步留言**：交棒时在 issue/PR 留一句「做完了 → 见 X → 下一棒」，并改 label。

## 2. 接力环（自动循环）

```
[Gemini] recon 出侦察笔记 → 评论 + 改 stage:planning
[Claude] 写任务卡 + 定接口   → 改 stage:ready，assign agent:codex
[Codex]  实现 + 测试 + 开 PR  → 改 stage:review
[Claude] PR review：
           通过 → approve（且 CI 绿）→ 合并 → stage:done
           不过 → request changes + 修复清单 → 回 Codex（stage:building）
循环直到该 stage 无可做 issue，或额度耗尽。
```

## 3. Goal 模式（无人值守循环）

每个 agent 的目标都锚在 issue 队列上，自主循环：

```
LOOP（额度未耗尽时）：
  1. git pull；gh issue list --label "stage:<我的阶段>" 取最上面一个未 assign 的
  2. assign 给自己，做我角色的活（见各自 *.md 第「Goal 模式」节）
  3. 完成后改 label 交棒 + 留评论 + 小步 commit/push
  4. 我这一阶段没 issue 可做时：idle 等上游推进，或执行我的「补给动作」
撞 5 小时窗口/周上限：把当前 issue 卡在哪写进评论，commit，退出。
```

> **自我补给（防止流水线饿死）**：Claude 在 planning/review 队列都空时，从 `PRODUCT_SPEC.md`
> 拆下一个里程碑成若干新 `stage:ready` issue，喂满流水线 —— 这是「跑到额度耗尽」不空转的关键。

## 4. 权限与红线（默认放权方式）

**默认 = 半自动放权**：构建 / 审查 / 修复全自动，满足「Claude approve + CI 绿」即**自动合并**，你不用盯。
但以下动作 agent **永不自动执行**，因为它们会把「可恢复的乱」变成「不可恢复的乱」：

- 改分支保护 / 仓库设置 / 协作者权限
- force-push 到 `main`、删分支、删 issue/PR、删历史
- 改 secrets / token / CI 凭据
- 向 Gitea 或任何非 GitHub 远端写

需要上述任一动作时：agent 停下，在 issue 留言请人处理。

`main` 分支保护：要求 1 个 approve（Claude）+ CI 通过才可合并 —— 这条让「自动合并」仍有客观闸口。

## 5. 放手前的安全网（开跑前先备好）

1. 保持 Gitea 镜像开启 = 离线备份。
2. 开跑前打一个已知良好 tag：`git tag safe-start && git push --tags`，跑飞了可一键回滚。
3. 给 PR 配一条 GitHub Actions（lint + 测试），作为自动合并的客观依据。

## 6. 想要「零护栏全自动」？

把第 4 节自动合并条件改成无条件、解除 `main` 保护即可。
**不建议**：AI 审 AI + 自动合并 + 全程无人，两个模型的共有盲区会直接进 main。
虽然有 Git 可回滚，但可能一整个额度窗口产出一堆要返工的东西。真要这么跑，至少保留第 5 节的 tag + 镜像兜底。
