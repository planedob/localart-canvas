#!/usr/bin/env bash
# 一次性初始化：labels / Project 看板 / 起步 issue / safe-start tag / main 保护
# 前提：已 gh auth login，且当前目录是仓库克隆。
set -euo pipefail

echo "==> 1. 创建 labels"
# 阶段
for s in recon planning ready building review done; do
  gh label create "stage:$s" --color BFD4F2 --force >/dev/null || true
done
# 归属
gh label create "agent:gemini" --color 5319E7 --force >/dev/null || true
gh label create "agent:claude" --color D93F0B --force >/dev/null || true
gh label create "agent:codex"  --color 0E8A16 --force >/dev/null || true
gh label create "docs" --color C2E0C6 --force >/dev/null || true
echo "    labels ok"

echo "==> 2. 创建 Project 看板（需 gh 有 project 权限：gh auth refresh -s project）"
OWNER=$(gh repo view --json owner -q .owner.login)
gh project create --owner "$OWNER" --title "LocalArt Canvas Pipeline" || \
  echo "    （看板创建跳过/已存在；可去 GitHub Projects 手动建，列 = 各 stage）"

echo "==> 3. 起步侦察 issue（喂给 Gemini 的第一棒）"
gh issue create --title "[recon] tldraw fork 改动地图" \
  --label "stage:recon" --label "agent:gemini" \
  --body "产出 docs/research/tldraw-fork-map.md：自定义 shape/action 挂载点、官方水印与云依赖位置、核心 API 坑。完成后改 stage:planning 交给 Claude。" || true
gh issue create --title "[recon] ComfyUI Workflow API 接入笔记" \
  --label "stage:recon" --label "agent:gemini" \
  --body "产出 docs/research/comfyui-api.md：提交 workflow、取结果图、错误处理的最小可用方式。完成后改 stage:planning。" || true
echo "    seed issues ok"

echo "==> 4. 打 safe-start tag（回滚点）"
git tag safe-start 2>/dev/null && git push --tags || echo "    （tag 已存在或推送失败，手动确认）"

echo "==> 5. main 分支保护：需 1 review + CI 通过才可合并"
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
gh api -X PUT "repos/$REPO/branches/main/protection" \
  -H "Accept: application/vnd.github+json" \
  -f "required_status_checks[strict]=true" \
  -f "required_pull_request_reviews[required_approving_review_count]=1" \
  -F "enforce_admins=false" -F "restrictions=null" \
  >/dev/null 2>&1 && echo "    保护已设" || \
  echo "    （保护设置失败，去 Settings > Branches 手动开：require PR review + require status checks）"

echo "==> bootstrap 完成。接着启动 scripts/run-*.sh"
