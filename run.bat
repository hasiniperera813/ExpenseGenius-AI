@echo off
title AI Expense Management System - Backend Server
echo ==============================================================================
echo           Starting AI Expense Management System (FastAPI + Gemini)
echo ==============================================================================

cd /d "%~dp0backend"

if not exist ".venv\Scripts\python.exe" (
    echo [INFO] Virtual environment not found. Creating .venv...
    python -m venv .venv
    echo [INFO] Installing required dependencies...
    .venv\Scripts\python.exe -m pip install -r requirements.txt
)

REM Initialize / seed database if not yet created
if not exist "..\database\expenses.db" (
    echo [INFO] Initializing and seeding database...
    .venv\Scripts\python.exe seed_data.py
)

echo.
echo ==============================================================================
echo [SUCCESS] Server starting at: http://127.0.0.1:8000
echo [SWAGGER] Interactive API Docs: http://127.0.0.1:8000/docs
echo [REDOC]   Alternative Docs:    http://127.0.0.1:8000/redoc
echo ==============================================================================
echo.

.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
pause
