# CrowdShield — Windows Troubleshooting Guide

## WHY curl DOESN'T WORK IN POWERSHELL
PowerShell has its own "curl" that is NOT the real curl.
It gives "Unable to connect" even if the server IS running.

## USE THIS INSTEAD — open your browser and go to:
http://localhost:5000/api/health

That's it. If you see JSON, the backend is running fine.

---

## CHECKING IF BACKEND IS RUNNING

Option 1 — Browser (easiest):
  Open Chrome/Edge → type in address bar:
  http://localhost:5000/api/health

Option 2 — PowerShell (correct command):
  Invoke-RestMethod http://localhost:5000/api/health

Option 3 — Command Prompt (not PowerShell):
  curl http://localhost:5000/api/health

---

## WHAT GOOD OUTPUT LOOKS LIKE

{
  "status": "ok",
  "service": "CrowdShield Backend v2",
  "services": {
    "mlService": "offline",     <- OK if Python not started yet
    "database": "connected",    <- MUST be connected
    "s3": "configured",         <- MUST be configured
    "sns": "configured"         <- MUST be configured
  }
}

If database is "disconnected" → your Supabase keys in .env are wrong
If s3 is "not configured" → AWS_S3_BUCKET is missing from .env
If sns is "not configured" → AWS_SNS_TOPIC_ARN is missing from .env

---

## COMMON ERRORS AND FIXES

ERROR: Cannot find module 'express'
  → You haven't run npm install yet
  → Fix: cd backend && npm install

ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY
  → .env file is missing or keys not filled in
  → Fix: make sure backend\.env exists with real values

ERROR: EADDRINUSE port 5000 already in use
  → Something is already running on port 5000
  → Fix: run STOP.bat, then START.bat again
  → Or: in Command Prompt: netstat -ano | findstr :5000
    then: taskkill /PID <the number> /F

ERROR: nodemon is not recognized
  → npm install not complete
  → Fix: cd backend && npm install

ERROR: 'uvicorn' is not recognized
  → Python venv not activated, or packages not installed
  → Fix: cd ml && venv\Scripts\activate && pip install -r requirements.txt

---

## EVERY TIME YOU WANT TO START THE APP

Just double-click START.bat in your CROWD-CLAUDE folder.
It opens both terminals and the browser automatically.

To stop everything: double-click STOP.bat