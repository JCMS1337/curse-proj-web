@echo off
cd /d "%~dp0"
title Sport Booking App (http://localhost:3000)

echo ===================================================
echo   Starting local server: http://localhost:3000
echo ===================================================
echo.

start http://localhost:3000

node server.js
if %errorlevel% neq 0 pause
