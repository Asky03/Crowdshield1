@echo off
title CrowdShield
color 0A
cls

echo.
echo  ==========================================
echo   CrowdShield - Starting Up
echo  ==========================================
echo.

:: ── Check .env exists ──────────────────────────────────────────
if not exist "%~dp0backend\.env" (
  echo  ERROR: backend\.env not found!
  echo  Please create it: cd backend then copy .env.example .env
  pause & exit /b 1
)

:: ── Install node_modules if missing ───────────────────────────
if not exist "%~dp0backend\node_modules" (
  echo  Installing backend packages (one time only)...
  cd /d "%~dp0backend"
  npm install
  cd /d "%~dp0"
  echo.
)

:: ── Create Python venv if missing ─────────────────────────────
if not exist "%~dp0ml\venv" (
  echo  Setting up Python environment (one time only)...
  cd /d "%~dp0ml"
  python -m venv venv
  call venv\Scripts\activate.bat
  pip install -r requirements.txt
  cd /d "%~dp0"
  echo.
)

:: ── Start Backend ──────────────────────────────────────────────
echo  [1/3] Starting Backend on port 5000...
start "CrowdShield Backend" cmd /k "title CrowdShield Backend && cd /d %~dp0backend && npm run dev"

:: Wait for backend to boot
timeout /t 4 /nobreak >nul

:: ── Start ML Service ───────────────────────────────────────────
echo  [2/3] Starting ML Service on port 8000...
start "CrowdShield ML" cmd /k "title CrowdShield ML && cd /d %~dp0ml && call venv\Scripts\activate.bat && uvicorn app:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 3 /nobreak >nul

:: ── Open Dashboard ─────────────────────────────────────────────
echo  [3/3] Opening Dashboard...
start "" "%~dp0frontend\index.html"

echo.
echo  ==========================================
echo   DONE! Two terminal windows opened.
echo.
echo   Backend:   http://localhost:5000/api/health
echo   ML:        http://localhost:8000/health
echo   Dashboard: Your browser just opened it
echo.
echo   DO NOT close the backend/ML terminals.
echo   This window can be closed.
echo  ==========================================
echo.
pause