@echo off
title CrowdShield - Stop All Services
echo.
echo  Stopping CrowdShield services...
echo.

:: Kill node processes (backend)
taskkill /F /IM node.exe >nul 2>&1
echo  [x] Backend stopped

:: Kill uvicorn (ML service)
taskkill /F /IM python.exe >nul 2>&1
echo  [x] ML Service stopped

echo.
echo  All services stopped.
pause