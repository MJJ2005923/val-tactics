# 无畏契约战术板 — AI 开发指引

## 项目基本信息
- 项目名称：无畏契约战术板 (VALORANT Tactics Board)
- 项目文件夹：d:\无畏契约战术布置
- 源代码文件夹：val-tactics/
- 技术栈：React + TypeScript + Vite
- 运行端口：Vite 默认 5173

## 工作流程
1. 每次开始工作前，阅读 docs/05-执行步骤总览.md 了解当前进度
2. 严格按照开发阶段顺序执行，不要跳阶段
3. 每个步骤完成后进行验收，确认无误再进入下一步
4. 每次会话结束时，更新 dev-logs/YYYY-MM-DD.md 开发日志

## 文档规范
- 所有开发规范文档在 docs/ 文件夹
- 每日开发日志在 dev-logs/ 文件夹
- 日志文件命名：YYYY-MM-DD.md

## 代码规范
- TypeScript 严格模式，所有类型必须明确定义
- 组件使用函数式组件 + Hooks
- CSS 使用 CSS Modules，避免样式冲突（组件内创建同名的 .module.css）
- 提交前确保 npm run build 无报错

## 启动开发服务器
```bash
cd val-tactics
npm run dev
```

## 构建生产版本
```bash
cd val-tactics
npm run build
```

## 阶段顺序
阶段 0 → 阶段 1 → 阶段 2 → 阶段 3 → 阶段 4 → 阶段 5 → 阶段 6

每个阶段内部按步骤编号顺序执行，完成一个步骤再开始下一个。
