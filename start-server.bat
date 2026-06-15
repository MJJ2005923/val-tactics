@echo off
cd /d "d:\无畏契约战术布置\val-tactics"

echo ========================================
echo   T教练 本地开发环境
echo ========================================
echo.

echo [1/2] 启动 API (Wrangler :8788)...
start "Wrangler API" cmd /c "cd /d d:\无畏契约战术布置\val-tactics && npx wrangler pages dev functions --port 8788 && pause"

timeout /t 3 /nobreak >nul

echo [2/2] 启动前端 (Vite :5173)...
start "Vite Frontend" cmd /c "cd /d d:\无畏契约战术布置\val-tactics && npm run dev && pause"

echo.
echo 两个窗口启动中...
echo Wrangler 出现 Ready 后打开: http://localhost:5173
pause
