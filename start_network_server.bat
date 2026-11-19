@echo off
cd /d "%~dp0"
title SportBook Server (LAN)
echo Starting SportBook Server in Local Network...
node server.js
if %errorlevel% neq 0 (
    echo [ERROR] Server stopped with error code %errorlevel%
    pause
)
