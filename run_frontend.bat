@echo off
title AI Expense Management System - Frontend Dev Server
echo ==============================================================================
echo                 Starting Frontend Dev Server (Vite + React)
echo ==============================================================================

cd /d "%~dp0frontend"

if not exist "node_modules\" (
    echo [INFO] Installing frontend dependencies...
    npm install
)

echo.
echo [SUCCESS] Starting Vite frontend server...
echo.

npm run dev
pause
