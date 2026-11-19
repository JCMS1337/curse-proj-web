@echo off
cd /d "%~dp0"
title SportBook (http://localhost:3000)

echo ===================================================
echo   Starting SportBook server: http://localhost:3000
echo ===================================================
echo.

start http://localhost:3000

node server.js
if %errorlevel% neq 0 pause
