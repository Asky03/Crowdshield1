
# ╔══════════════════════════════════════════════════════════════╗
# ║   CrowdShield — RUN, TEST & VERIFY CHECKLIST                ║
# ║   Follow every step in order. Each step builds on the last. ║
# ╚══════════════════════════════════════════════════════════════╝

# ══════════════════════════════════════════════════════════════
# PHASE A — BACKEND STARTUP
# ══════════════════════════════════════════════════════════════

# Open VS Code terminal (Ctrl + `)
# Make sure you are in the project root (CROWD-CLAUDE folder)

# ── Step A1: Go into backend folder ───────────────────────────
cd backend

# ── Step A2: Install all packages ─────────────────────────────
npm install

# Expected output (takes 30–60 seconds):
# added 287 packages, audited 287 packages in 45s

# ── Step A3: Verify .env exists and has your keys ─────────────
# Windows:
type .env

# Mac/Linux:
cat .env

# You should see all 13 keys filled in with real values.
# If you see "YOUR_xxx_HERE" placeholders, stop and fill them in first.

# ── Step A4: Start the backend ─────────────────────────────────
npm run dev

# Expected output — you should see EXACTLY this:
# ─────────────────────────────────────────────────
# [nodemon] starting `node src/server.js`
#
# 🛡️  CrowdShield v2 running on http://localhost:5000
#    ENV: development
# ─────────────────────────────────────────────────

# If you see an error instead, see TROUBLESHOOTING section below.

# ══════════════════════════════════════════════════════════════
# PHASE B — VERIFY ALL SERVICES ARE CONNECTED
# ══════════════════════════════════════════════════════════════

# Open a NEW terminal tab (keep backend running in the first one)
# Run this command:

curl http://localhost:5000/api/health

# OR open this URL in your browser:
# http://localhost:5000/api/health

# Expected response:
# ─────────────────────────────────────────────────
# {
#   "status": "ok",
#   "service": "CrowdShield Backend v2",
#   "timestamp": "2026-03-13T...",
#   "services": {
#     "mlService": "offline",        ← OK for now, Python not started yet
#     "database": "connected",       ← MUST be connected ✅
#     "s3": "configured",            ← MUST show configured ✅
#     "sns": "configured"            ← MUST show configured ✅
#   }
# }
# ─────────────────────────────────────────────────

# ⚠️  If database shows "disconnected":
#     → Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
#     → Make sure you ran the SQL schema in Supabase SQL Editor
#
# ⚠️  If s3 shows "not configured":
#     → AWS_S3_BUCKET is missing or empty in .env
#
# ⚠️  If sns shows "not configured":
#     → AWS_SNS_TOPIC_ARN is missing or empty in .env

# ══════════════════════════════════════════════════════════════
# PHASE C — TEST AUTH (REGISTER + LOGIN)
# ══════════════════════════════════════════════════════════════

# ── Step C1: Register a new user ──────────────────────────────

# On Windows (PowerShell):
Invoke-WebRequest -Uri "http://localhost:5000/api/auth/register" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"admin@crowdshield.dev","password":"Admin123","name":"Admin User"}'

# On Mac/Linux:
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@crowdshield.dev","password":"Admin123","name":"Admin User"}'

# Expected response:
# {
#   "message": "Registration successful. Check email to confirm account.",
#   "user": {
#     "id": "some-uuid-here",
#     "email": "admin@crowdshield.dev",
#     "name": "Admin User"
#   },
#   "session": { "access_token": "eyJ...", "refresh_token": "..." }
# }

# ── Step C2: Login ─────────────────────────────────────────────

# On Windows (PowerShell):
Invoke-WebRequest -Uri "http://localhost:5000/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"admin@crowdshield.dev","password":"Admin123"}'

# On Mac/Linux:
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@crowdshield.dev","password":"Admin123"}'

# Expected response:
# {
#   "message": "Login successful",
#   "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ...",  ← COPY THIS
#   "refresh_token": "...",
#   "user": { "id": "...", "email": "admin@crowdshield.dev", ... }
# }

# ⚠️  IMPORTANT: Copy the "access_token" value. You need it for all further requests.
#     It is a long string starting with "eyJ..."
#     Save it somewhere temporarily (Notepad, etc.)

# ── Step C3: Verify token works ───────────────────────────────

# Replace YOUR_TOKEN_HERE with the access_token you just copied:
# On Mac/Linux:
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Expected:
# { "user": { "id": "...", "email": "admin@crowdshield.dev", "role": "operator" } }

# ── Step C4: Verify user appeared in Supabase ─────────────────
# Go to: supabase.com → your project → Authentication → Users
# You should see "admin@crowdshield.dev" listed there ✅
# Go to: Table Editor → profiles table → you should see a row ✅

# ══════════════════════════════════════════════════════════════
# PHASE D — TEST UPLOAD PIPELINE (image → ML → S3 → DB → SNS)
# ══════════════════════════════════════════════════════════════

# Note: ML service is not running yet, so it will use the MOCK result.
# That is fine — it still tests S3 upload and DB storage.

# Replace YOUR_TOKEN_HERE and /path/to/any/image.jpg with a real image path

# On Mac/Linux:
curl -X POST http://localhost:5000/api/upload \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "media=@/path/to/crowd_photo.jpg" \
  -F "location=Main Gate"

# On Windows (PowerShell) — use a tool like Postman instead for file upload
# OR use the frontend index.html in your browser

# Expected response:
# {
#   "message": "Analysis complete",
#   "analysisId": "some-uuid",
#   "result": {
#     "crowdCount": 87,
#     "density": "high",
#     "riskLevel": "High",
#     "riskScore": 43.5,
#     "confidence": 0,
#     "processingTimeMs": 412,
#     "hasHeatmap": false,
#     "hasFlowAnalysis": false
#   }
# }

# ── Step D2: Verify the file is in S3 ─────────────────────────
# AWS Console → S3 → your bucket → media/ folder
# You should see your uploaded image there ✅

# ── Step D3: Verify the result is in PostgreSQL ───────────────
# Supabase → Table Editor → crowd_analyses table
# You should see a new row with all the analysis data ✅

# ── Step D4: Check the analysis list API ──────────────────────
curl http://localhost:5000/api/analysis \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Expected:
# { "total": 1, "limit": 20, "offset": 0, "results": [...] }

# ── Step D5: Check summary stats ──────────────────────────────
curl http://localhost:5000/api/analysis/stats/summary \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# ══════════════════════════════════════════════════════════════
# PHASE E — OPEN FRONTEND
# ══════════════════════════════════════════════════════════════

# Just open frontend/index.html directly in your browser.
# Double-click the file in VS Code explorer → it opens in browser.
# OR right-click → "Open with Live Server" if you have that extension.

# Login with admin@crowdshield.dev / Admin123
# Upload an image → see results appear
# Check history table populates

# ══════════════════════════════════════════════════════════════
# PHASE F — START ML SERVICE (optional for now)
# ══════════════════════════════════════════════════════════════

# Open a THIRD terminal tab
cd ml

# First time only:
python -m venv venv

# Activate venv:
# Windows:   venv\Scripts\activate
# Mac/Linux: source venv/bin/activate

# Install packages (first time only, takes 3-5 min):
pip install -r requirements.txt

# Start ML service:
uvicorn app:app --host 0.0.0.0 --port 8000 --reload

# Expected:
# ✅ YOLOv8n loaded
# INFO:     Uvicorn running on http://0.0.0.0:8000

# Now re-check health — mlService should show "online":
curl http://localhost:5000/api/health

# ══════════════════════════════════════════════════════════════
# TROUBLESHOOTING
# ══════════════════════════════════════════════════════════════

# ERROR: Cannot find module 'express'
#   → You didn't run npm install, or you're in the wrong folder
#   → Fix: cd backend && npm install

# ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing
#   → .env file doesn't exist or keys are empty
#   → Fix: make sure .env exists in backend/ folder with real values

# ERROR: database: disconnected in health check
#   → Supabase keys are wrong OR the schema SQL was never run
#   → Fix: paste supabase_schema.sql into Supabase SQL Editor and run it

# ERROR: 401 Invalid or expired token
#   → Token is wrong or you copied it incorrectly
#   → Fix: login again, copy the full access_token string

# ERROR: 409 Conflict on register
#   → Email already registered
#   → Fix: use a different email, or go to Supabase → Auth → Users → delete the user

# ERROR: AccessDenied from AWS S3
#   → IAM keys are wrong, or the bucket name in .env doesn't match the real bucket
#   → Fix: double-check AWS_S3_BUCKET matches exactly what you named it in AWS console

# ERROR: Port 5000 already in use
#   → Something else is running on port 5000
#   → Fix (Mac/Linux): lsof -ti:5000 | xargs kill
#   → Fix (Windows):   netstat -ano | findstr :5000  then  taskkill /PID <number> /F

# ERROR: nodemon is not recognized
#   → npm install didn't install devDependencies
#   → Fix: npm install  (run again in backend/ folder)
