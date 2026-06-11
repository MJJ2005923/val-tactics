#!/bin/bash
# 🔍 AI 代码审查工具 — 使用 DeepSeek API 审查本地改动
# 用法: bash review.sh            → 审查暂存区改动
#       bash review.sh unstaged   → 审查未暂存改动
#       bash review.sh HEAD~1     → 审查最近一次提交

API_KEY="sk-1b496b7d50204b51be96b877b06ba7f8"
API_URL="https://api.deepseek.com/v1/chat/completions"

# 获取 diff
MODE="${1:-staged}"
if [ "$MODE" = "unstaged" ]; then
  DIFF=$(git diff 2>/dev/null)
  WHAT="未暂存改动"
elif [ "$MODE" = "all" ]; then
  DIFF=$(git diff HEAD 2>/dev/null)
  WHAT="全部未提交改动"
else
  DIFF=$(git diff --staged 2>/dev/null)
  WHAT="暂存区改动"
fi

if [ -z "$DIFF" ]; then
  echo "✅ 没有发现 $WHAT"
  exit 0
fi

# 限制 diff 长度避免超 token
DIFF=$(echo "$DIFF" | head -500)
echo "🔍 正在审查 $WHAT（$(echo "$DIFF" | wc -l) 行 diff）..."

PROMPT="你是代码审查专家。请审查以下 git diff，用中文输出：

## 🔴 严重问题（Bug、安全漏洞、资源泄漏）
## 🟡 改进建议（性能、可读性、重复代码）
## 🟢 好的做法（值得肯定的地方）
## 📋 总结（一句话概括审查结论）

只输出发现的问题，没问题的文件不要提。
Diff:
$DIFF"

RESP=$(curl -s "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d "$(jq -n --arg content "$PROMPT" '{
    model: "deepseek-chat",
    messages: [{role:"user",content:$content}],
    max_tokens: 2048,
    temperature: 0.3
  }')" 2>/dev/null)

# 解析输出
if echo "$RESP" | grep -q "choices"; then
  echo "$RESP" | jq -r '.choices[0].message.content' 2>/dev/null || echo "$RESP"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "审查完成 ✅  | 用时: $(date +%H:%M:%S)"
else
  echo "❌ API 调用失败: $RESP"
fi
