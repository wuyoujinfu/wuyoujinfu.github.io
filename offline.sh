#!/bin/bash
# ===================================
# 🔴 一键下线无游金服网站
# ===================================
set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_DIR"

echo "🔴 正在下线 wuyoujinfu.github.io ..."

# 确保工作区干净
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️  有未提交的更改，请先 commit 或 stash"
  exit 1
fi

# 删除所有站点文件
rm -f index.html favicon.svg robots.txt sitemap.xml
rm -rf css/ js/ data/ .github/

# 提交并推送
git add -A
git commit -m "🔴 下线网站" -m "Co-Authored-By: Claude <noreply@anthropic.com>" || true
git push origin main

echo ""
echo "✅ 网站已下线"
echo "   CDN 缓存约 10-60 分钟后完全清除"
echo "   恢复请运行: ./online.sh"
