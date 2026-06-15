---
tags: [项目, AI指引]
---
# 无畏契约战术板 — AI 开发指引

## 沟通规则（必要）
- **所有沟通以中文为主**，包括注释、提交信息、开发日志、回复内容

## 项目基本信息
- 项目名称：无畏契约战术板 (VALORANT Tactics Board)
- 项目文件夹：d:\val-tactics
- 源代码文件夹：val-tactics/
- 技术栈：React + TypeScript + Vite
- 运行端口：Vite 默认 5173

## 三阶段发布流程

| 阶段 | 环境 | 地址 | 操作 |
|:---|:---|:---|:---|
| 1. 开发 | 本地 | `http://localhost:5173/` | 所有改动在此进行 |
| 2. 测试 | 公网测试服 | `https://dev.val-tactics.pages.dev` | `npm run build && npx wrangler pages deploy dist --project-name=val-tactics --branch=dev` |
| 3. 上线 | 公网正式服 | `https://val-tactics.pages.dev` | `git checkout master && git merge dev && git push gitee master && npx wrangler pages deploy dist --project-name=val-tactics --branch=main && git checkout dev` |

**禁止日常开发直接推 master**，所有改动走 `dev → 测试服验证 → master 合入`。

## 日常 Git 流程
```bash
cd d:\val-tactics
git checkout dev
git add .
git commit -m "描述本次改动的提交信息"
git push github dev
```

## 本地开发环境

**推荐**：双击项目根目录 `start-server.bat` 自动开两个窗口。

**手动**：
```bash
# 终端1: Wrangler（API 代理，端口 8788）
cd val-tactics && npx wrangler pages dev functions --port 8788

# 终端2: Vite（前端，端口 5173）
cd val-tactics && npm run dev
```

> **端口被占**：8788/5173 被僵尸进程占用时，`taskkill /f /im node.exe` 杀掉重开即可。

### .dev.vars 本地环境变量

`val-tactics/.dev.vars` 需配置以下变量（不提交到 git）：

```
DEEPSEEK_KEY=sk-xxx          # DeepSeek API 密钥
ADMIN_KEY=val-tactics-admin-2026  # 管理后台登录密码
SUPABASE_SERVICE_KEY=eyJ...  # Supabase service_role JWT
```

> Wrangler 4.100.0 存在 `.dev.vars` 变量名解析 Bug，避免使用 3 字母前缀（如 `SB_KEY`）或以 `_ID` 结尾的变量名，会导致被静默丢弃。

## 工作流程
1. 每次开始工作前，阅读最新 dev-logs/ 了解当前进度
2. 每个步骤完成后进行验收，确认无误再进入下一步
3. 每次会话结束时，更新 dev-logs/YYYY-MM-DD.md 开发日志
4. **每次会话结束时，必须 git commit + push 提交所有改动**（防止代码丢失，可随时回退）

## 文档规范
- 所有开发规范文档在 docs/ 文件夹
- 每日开发日志在 dev-logs/ 文件夹，命名：YYYY-MM-DD.md
- T教练系统设计：`docs/T教练提示词设计.md`

## 代码规范
- TypeScript 严格模式，所有类型必须明确定义
- 组件使用函数式组件 + Hooks
- CSS 使用 CSS Modules，避免样式冲突
- 提交前确保 npm run build 无报错
- **特工/技能/地图名严格以 agents.ts 和 maps.ts 为准**，禁止使用其他译名

## 测试服部署
```bash
cd val-tactics
npm run build && npx wrangler pages deploy dist --project-name=val-tactics --branch=dev
```

## 项目当前状态

核心战术板（阶段 0-6）已全部完成。当前在持续推进：

| 模块 | 说明 |
|:---|:---|
| 社区 | 战术广场/点位分享/论坛/个人主页/排行/收藏/通知 |
| T教练 AI | 全屏对话+侧边栏聊天，知识洞察智能匹配 |
| 管理后台 | 数据面板+审核中心（数据采集/洞察审核/对话日志） |
| 知识库 | 15 个 Markdown 文件 + 动态采集（VCT/Wiki/版本/蒸馏） |

### 关键文件速查

| 文件 | 作用 |
|:---|:---|
| `src/data/knowledgeBase.ts` | T教练系统提示词构建 + 知识注入 |
| `src/components/AIPanel/AIChat.tsx` | 侧边栏 T教练对话 |
| `src/components/AIPage/AIPage.tsx` | 全屏 T教练对话 |
| `src/components/AdminPanel/AdminPage.tsx` | 管理后台独立页面 |
| `functions/api/[[route]].js` | Cloudflare Pages Worker（所有 API） |
| `knowledge/` | 15 个战术知识 Markdown 文件 |
| `supabase-schema.sql` | 数据库完整 schema |
