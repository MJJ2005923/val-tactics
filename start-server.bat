@echo off
set PROJ=d:\val-tactics\val-tactics

start "Wrangler" /d "%PROJ%" cmd /k "npx wrangler pages dev functions --port 8788"
timeout /t 3 /nobreak >nul
start "Vite" /d "%PROJ%" cmd /k "npm run dev"

echo T教练已启动 http://localhost:5173
pause
