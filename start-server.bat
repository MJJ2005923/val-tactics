@echo off
set "PATH=C:\Program Files\nodejs;%PATH%"
echo ========================================
echo   T教练 本地开发环境
echo ========================================
echo.

echo [1/2] 启动 API (Wrangler :8788)...
start "API-8788" /D "d:\无畏契约战术布置\val-tactics" cmd /k "npx wrangler pages dev functions --port 8788"

echo [2/2] 启动前端 (Vite :5173)...
start "Vite-5173" /D "d:\无畏契约战术布置\val-tactics" cmd /k "npm run dev"

echo.
echo 等 Wrangler 窗口出现 "Ready" 后，打开:
echo    http://localhost:5173
echo.
pause
