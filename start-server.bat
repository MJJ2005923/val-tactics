@echo off
cd /d d:\val-tactics\val-tactics

start "Wrangler" cmd /k "npx wrangler pages dev functions --port 8788"
timeout /t 2 /nobreak >nul
start "Vite" cmd /k "npm run dev"

echo T教练已启动 http://localhost:5173
