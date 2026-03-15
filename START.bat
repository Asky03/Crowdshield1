@echo off
title CrowdShield Launcher
color 0A

echo.
echo  ============================================
echo   CrowdShield - Starting All Services
echo  ============================================
echo.

:: Check if .env exists
if not exist "backend\.env" (
  echo  ERROR: backend\.env file not found!
  echo  Run: cd backend then copy .env.example .env
  echo  Fill in your keys then run this again.
  pause
  exit /b 1
)

:: Install node packages if missing
if not exist "backend\node_modules" (
  echo  Installing backend packages...
  cd backend && npm install && cd ..
  echo.
)

:: Setup Python venv if missing
if not exist "ml\venv" (
  echo  Creating Python venv and installing packages (3-5 min)...
  cd ml
  python -m venv venv
  call venv\Scripts\activate.bat
  pip install -r requirements.txt
  cd ..
  echo.
)

echo  Starting Backend on port 5500...
start "CrowdShield Backend" cmd /k "cd /d %~dp0backend && npm run dev"

echo  Waiting for backend...
timeout /t 3 /nobreak >nul

echo  Starting ML Service on port 8000...
start "CrowdShield ML" cmd /k "cd /d %~dp0ml && call venv\Scripts\activate.bat && uvicorn app:app --host 0.0.0.0 --port 8000 --reload"

echo  Waiting for ML to load...
timeout /t 5 /nobreak >nul

echo  Opening Dashboard...
start "" "%~dp0frontend\index.html"

echo.
echo  ============================================
echo   All services started!
echo.
echo   Health check: http://localhost:5500/api/health
echo   Dashboard:    frontend\index.html
echo  ============================================
echo.
pause >nul