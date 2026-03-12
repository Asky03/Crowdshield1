# CrowdShield — Phase 1 Implementation Guide

## Prerequisites
- Node.js ≥ 18
- Python ≥ 3.9
- Git

---

## Step 1 — Clone & Initialize Repo

```bash
git init crowdshield
cd crowdshield
# Copy all files into this directory, then:
git add .
git commit -m "feat: Phase 1 initial setup"
```

---

## Step 2 — Backend Setup

```bash
cd backend

# 1. Copy environment template
cp .env.example .env

# 2. Generate a JWT secret and paste it in .env
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 3. Install dependencies
npm install

# 4. Start development server
npm run dev
```

**Expected output:**
```
🛡️  CrowdShield Backend running
   ➜ http://localhost:5000
   ➜ ENV: development
```

### Verify backend:
```bash
curl http://localhost:5000/api/health
# → {"status":"ok","service":"CrowdShield Backend","mlService":"offline"}
```

---

## Step 3 — ML Service Setup

```bash
cd ml

# 1. Create virtual environment
python -m venv venv

# 2. Activate
source venv/bin/activate          # Mac/Linux
# OR
venv\Scripts\activate             # Windows

# 3. Install dependencies (takes 2–5 min)
pip install -r requirements.txt

# 4. Download YOLOv8n model weights (~6 MB)
python scripts/download_model.py

# 5. Start ML service
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

**Expected output:**
```
✅ YOLOv8 model loaded
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Verify ML service:
```bash
curl http://localhost:8000/health
# → {"status":"ok","service":"CrowdShield ML","model":"YOLOv8n"}
```

---

## Step 4 — Run ML Tests

```bash
cd ml
source venv/bin/activate
python tests/test_analyzer.py
```

**Expected output:**
```
🧪  CrowdShield ML Analyzer — Unit Tests
─────────────────────────────────────────
Test 1: Risk scoring thresholds
  ✅  score=    0 → Low
  ✅  score=   15 → Low
  ...
Test 3: Image analysis (synthetic test image)
  crowd_count:       0        ← synthetic image, normal
  risk_level:        Low
  ✅ Image analysis passed
```

---

## Step 5 — Run Backend Tests

```bash
cd backend
npm test
```

**Expected output:**
```
PASS src/__tests__/api.test.js
  Health
    ✓ GET /api/health → 200
  Auth
    ✓ POST /api/auth/register → 201 with token
    ✓ POST /api/auth/login → 200 with token
    ...
Tests: 9 passed
```

---

## Step 6 — Open Frontend

Open `frontend/index.html` directly in your browser, or serve it:

```bash
cd frontend
npx serve .
# → http://localhost:3000
```

**Test flow:**
1. Click "Create account" — register with email + password
2. Upload a crowd image (JPG/PNG)
3. See risk level, crowd count, confidence score
4. Check history table updates

---

## Full Workflow Test (curl)

```bash
# 1. Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Test1234","name":"Admin"}'

# 2. Login and save token
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Test1234"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# 3. Upload an image
curl -X POST http://localhost:5000/api/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "media=@/path/to/crowd.jpg" \
  -F "location=Gate A"

# 4. Get results
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/analysis

# 5. Summary stats
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/analysis/stats/summary
```

---

## Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `JWT_SECRET is not defined` | .env not set up | Copy `.env.example` → `.env`, add JWT_SECRET |
| `Cannot find module 'express'` | npm install not run | `cd backend && npm install` |
| `ML service unavailable` | Python service not running | `cd ml && uvicorn app:app --port 8000` — backend uses mock fallback |
| `File type not allowed` | Wrong MIME type | Use JPG/PNG/MP4/AVI/MOV only |
| `Token expired` | Old JWT | Log in again to get fresh token |
| `EADDRINUSE: port 5000` | Port already in use | Kill process: `lsof -ti:5000 | xargs kill` |
| `ModuleNotFoundError: ultralytics` | venv not activated | `source venv/bin/activate` |
| `Model file not found` | Weights not downloaded | `python scripts/download_model.py` |
| `cv2.error reading image` | Corrupt or unsupported image | Try a standard JPG |

---

## Architecture Summary

```
Browser/Client
     │  HTTP
     ▼
┌─────────────────────────────────┐
│  Node.js + Express (port 5000)  │
│  - JWT Auth                     │
│  - Multer upload                │
│  - In-memory store (Phase 1)    │
└───────────────┬─────────────────┘
                │ HTTP POST /analyze
                ▼
┌─────────────────────────────────┐
│  FastAPI ML Service (port 8000) │
│  - YOLOv8n person detection     │
│  - Risk scoring algorithm       │
│  - Image + video support        │
└─────────────────────────────────┘
```

---

## Phase 2 Prep Checklist

- [ ] Replace `userStore.js` with Supabase/PostgreSQL queries
- [ ] Replace `analysisStore.js` with database writes
- [ ] Add AWS S3 upload after local storage save
- [ ] Add `/api/auth/refresh` endpoint
- [ ] Add pagination to history query
- [ ] Add input validation to upload route location field
