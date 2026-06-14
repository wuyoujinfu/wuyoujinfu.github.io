#!/bin/bash
# ===================================
# 🟢 一键上线无游金服网站
# ===================================
set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_DIR"

echo "🟢 正在恢复 wuyoujinfu.github.io ..."

# 确保工作区干净
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️  有未提交的更改，请先 commit 或 stash"
  exit 1
fi

# 找到下线提交并回退
OFFLINE_COMMIT=$(git log --oneline -10 | grep "🔴 下线网站" | head -1 | cut -d' ' -f1)

if [ -z "$OFFLINE_COMMIT" ]; then
  echo "ℹ️  未找到下线提交，网站应该已在线"
  exit 0
fi

echo "   找到下线提交: $OFFLINE_COMMIT"
git revert --no-edit "$OFFLINE_COMMIT"
git push origin main

echo ""
echo "✅ 网站文件已恢复！"
echo ""
echo "⚙️  最后一步：手动开启 GitHub Pages"
echo "   👉 https://github.com/wuyoujinfu/wuyoujinfu.github.io/settings/pages"
echo "   把 Source 设为 GitHub Actions"
