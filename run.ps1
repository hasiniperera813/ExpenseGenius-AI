# AI Expense Management System - PowerShell Launcher
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "          Starting AI Expense Management System (FastAPI + Gemini)             " -ForegroundColor Green
Write-Host "==============================================================================" -ForegroundColor Cyan

$BackendDir = Join-Path $PSScriptRoot "backend"
Set-Location $BackendDir

$PythonExe = Join-Path $BackendDir ".venv\Scripts\python.exe"

if (-not (Test-Path $PythonExe)) {
    Write-Host "[INFO] Creating virtual environment (.venv)..." -ForegroundColor Yellow
    python -m venv .venv
    Write-Host "[INFO] Installing dependencies..." -ForegroundColor Yellow
    & $PythonExe -m pip install -r requirements.txt
}

$DbFile = Join-Path $PSScriptRoot "database\expenses.db"
if (-not (Test-Path $DbFile)) {
    Write-Host "[INFO] Seeding initial sample database..." -ForegroundColor Yellow
    & $PythonExe seed_data.py
}

Write-Host ""
Write-Host "[SUCCESS] Starting server on http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "[SWAGGER] Interactive Docs: http://127.0.0.1:8000/docs" -ForegroundColor Cyan
Write-Host "[REDOC]   Alternative Docs: http://127.0.0.1:8000/redoc" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host ""

& $PythonExe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
