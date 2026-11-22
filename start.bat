@echo off
cd /d "%~dp0"
title SportBook (http://localhost:3000)

echo ===================================================
echo   Starting SportBook server: http://localhost:3000
echo ===================================================
echo.

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    echo [INFO] Port 3000 is currently occupied by PID %%a. Freeing port...
    taskkill /f /pid %%a >nul 2>&1
)

timeout /t 1 >nul 2>&1

start http://localhost:3000

node server.js
if %errorlevel% neq 0 pause
