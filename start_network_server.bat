@echo off
cd /d "%~dp0"
title Sport Booking Server (LAN)
echo Starting Sport Booking Server in Local Network...
node server.js
if %errorlevel% neq 0 (
    echo [ERROR] Server stopped with error code %errorlevel%
    pause
)
