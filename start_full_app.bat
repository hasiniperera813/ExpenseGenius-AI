@echo off
title ExpenseGenius AI - Starting System
echo ==============================================================================
echo              Starting AI Expense Management System (Full Stack)
echo ==============================================================================
echo.

REM Start Backend in new window
echo [1/2] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "ExpenseGenius AI - Backend (FastAPI)" cmd /k "cd /d %~dp0 && call run.bat"

REM Wait 3 seconds for backend to initialize
timeout /t 3 /nobreak >nul

REM Start Frontend in new window
echo [2/2] Starting React + Vite Frontend on http://localhost:5173 ...
start "ExpenseGenius AI - Frontend (Vite)" cmd /k "cd /d %~dp0 && call run_frontend.bat"

REM Open browser
timeout /t 2 /nobreak >nul
echo.
echo [SUCCESS] Opening app in your browser...
start http://localhost:5173

echo.
echo Application started! Keep the two command windows open while using the app.
echo ==============================================================================
