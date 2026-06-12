@echo off
cd /d "d:\无畏契约战术布置\val-tactics"
start "" "npx" wrangler pages dev dist --port 8788
start "" "npx" vite --host
echo T教练已启动: http://localhost:5173
