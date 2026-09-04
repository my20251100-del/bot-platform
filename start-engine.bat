@echo off
title WhatsApp Bot Engine
cd /d "%~dp0"
echo ========================================================
echo   Starting WhatsApp Bot Engine (24/7 Background Runner)
echo ========================================================
node --env-file=.env.local engine/index.mjs
if %errorlevel% neq 0 (
    echo.
    echo Engine stopped unexpectedly. Restarting in 5 seconds...
    timeout /t 5
    goto start
)
pause
