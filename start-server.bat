@echo off
echo ========================================
echo   T教练 本地开发环境
echo ========================================
echo.

echo [1/2] 启动 API (Wrangler :8788)...
start "API" /D "d:\无畏契约战术布置\val-tactics" cmd /k "C:\Program Files\nodejs\npx.cmd wrangler pages dev functions --port 8788"

timeout /t 2 /nobreak >nul

echo [2/2] 启动前端 (Vite :5173)...
start "Vite" /D "d:\无畏契约战术布置\val-tactics" cmd /k "C:\Program Files\nodejs\npm.cmd run dev"

echo.
echo 等 Wrangler 窗口出现 "Ready" 后打开:
echo    http://localhost:5173
echo.
pause
