@echo off
cd /d "%~dp0"
title SportBook Server (LAN)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    echo [INFO] Port 3000 is occupied by PID %%a. Freeing port...
    taskkill /f /pid %%a >nul 2>&1
)

timeout /t 1 >nul 2>&1

echo Starting SportBook Server in Local Network...
node server.js
if %errorlevel% neq 0 (
    echo [ERROR] Server stopped with error code %errorlevel%
    pause
)
