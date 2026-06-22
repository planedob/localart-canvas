#!/usr/bin/env bash
# Gemini 的 Goal 模式 runner：循环跑到额度耗尽，耗尽后退避等窗口重置再续。
# 前提：已 gh auth login；本脚本在仓库克隆目录的上一级或仓库内运行。
# 注意：下面的启动 flag 以 Gemini CLI 当前版本 --help 为准，可能需微调。
set -uo pipefail
cd "$(dirname "$0")/.."

PROMPT="读取 GEMINI.md 和 COORDINATION.md。执行一次 Goal LOOP 迭代：
git pull；用 gh 取我这一阶段最上面的未认领 issue；完成我角色的工作；
改 label 交棒并留评论；小步 commit 后 push。若本阶段无活可做，输出 IDLE 并结束本次迭代。"

backoff=60
while true; do
  git pull --rebase --autostash 2>/dev/null || true
  if gemini --yolo -p "$PROMPT"; then
    backoff=60                       # 成功，正常间隔
    sleep 30
  else
    echo "[$(date)] Gemini 调用失败（多半是额度耗尽），退避 ${backoff}s 后重试"
    sleep "$backoff"
    backoff=$(( backoff < 1800 ? backoff*2 : 1800 ))   # 最长退避 30 分钟
  fi
done
