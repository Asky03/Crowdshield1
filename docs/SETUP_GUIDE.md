# CrowdShield v2 — Complete Setup Guide
## Supabase Auth + PostgreSQL + AWS S3 + SNS + YOLO Heatmap + Optical Flow

---

## PART 1 — Supabase Setup (Free tier, takes ~10 min)

### Step 1.1 — Create Supabase project
1. Go to https://supabase.com → Sign up (free)
2. Click **New Project**
3. Fill in:
   - **Name**: `crowdshield`
   - **Database Password**: generate a strong one and save it
   - **Region**: pick closest to you
4. Wait ~2 minutes for project to spin up

### Step 1.2 — Get your API keys
1. Go to **Project Settings** (gear icon, bottom left)
2. Click **API** tab
3. Copy these — you'll need all three:
   - **Project URL** → `SUPABASE_URL`
   - **anon / public key** → `SUPABASE_ANON_KEY`
   - **service_role / secret key** → `SUPABASE_SERVICE_ROLE_KEY`
4. Click **JWT Settings** tab → copy **JWT Secret** → `SUPABASE_JWT_SECRET`

### Step 1.3 — Run the database schema
1. In Supabase sidebar → click **SQL Editor**
2. Click **+ New query**
3. Open `infra/supabase_schema.sql` from this project
4. Paste the entire contents into the editor
5. Click **Run** (green button)
6. You should see: "Success. No rows returned"

### Step 1.4 — Disable email confirmation (for development)
1. Go to **Authentication** → **Providers** → **Email**
2. Turn OFF **"Confirm email"** toggle
3. Save — now users can log in immediately after registering

### Step 1.5 — Verify tables were created
1. Go to **Table Editor** in sidebar
2. You should see: `profiles` and `crowd_analyses` tables

---

## PART 2 — AWS Setup (takes ~15 min)

### Step 2.1 — Create AWS account
1. Go to https://aws.amazon.com → Create account (free tier)
2. You need a credit card but S3 + SNS costs < $1/month for dev usage

### Step 2.2 — Create IAM user (NEVER use root account keys)
1. AWS Console → search "IAM" → click IAM
2. Left sidebar → **Users** → **Create user**
3. Username: `crowdshield-backend`
4. Next → **Attach policies directly**
5. Click **Create policy** (opens new tab):
   - Click **JSON** tab
   - Paste the contents of `infra/aws_iam_policy.json`
   - Next → Name it `CrowdShieldPolicy` → Create
6. Back in user creation → refresh policy list → search `CrowdShieldPolicy` → check it
7. Create user
8. Click on the user → **Security credentials** tab → **Create access key**
9. Use case: **Application running outside AWS**
10. Copy:
    - **Access key ID** → `AWS_ACCESS_KEY_ID`
    - **Secret access key** → `AWS_SECRET_ACCESS_KEY`
    ⚠️ You can only see the secret key ONCE — copy it now

### Step 2.3 — Create S3 bucket
1. AWS Console → search "S3" → **Create bucket**
2. Bucket name: `crowdshield-media` (must be globally unique — add your initials if taken)
3. Region: same region you'll put in `AWS_REGION`
4. **Block all public access**: KEEP THIS ON (files are private, accessed via presigned URLs)
5. Enable **Server-side encryption**: SSE-S3
6. Create bucket
7. Copy the bucket name → `AWS_S3_BUCKET`

### Step 2.4 — Create SNS topic for alerts
1. AWS Console → search "SNS" → **Topics** → **Create topic**
2. Type: **Standard**
3. Name: `crowdshield-alerts`
4. Create topic
5. Copy the **ARN** (looks like `arn:aws:sns:us-east-1:123456:crowdshield-alerts`) → `AWS_SNS_TOPIC_ARN`
6. Click **Create subscription**:
   - Protocol: **Email**
   - Endpoint: your email address
   - Create subscription
7. Check your email → click the confirmation link
8. You'll now receive email alerts when crowd risk is High or Critical

---

## PART 3 — Backend Setup

```bash
cd backend

# 1. Copy and fill environment file
cp .env.example .env
# Now open .env and paste in all values from Parts 1 and 2

# 2. Install dependencies
npm install

# 3. Start server
npm run dev
```

**Expected output:**
```
🛡️  CrowdShield v2 running on http://localhost:5000
   ENV: development
```

**Verify all services connected:**
```bash
curl http://localhost:5000/api/health
```
Expected:
```json
{
  "status": "ok",
  "services": {
    "mlService": "offline",
    "database": "connected",
    "s3": "configured",
    "sns": "configured"
  }
}
```
- `database: connected` means Supabase/PostgreSQL is working ✅
- `mlService: offline` is fine until you start Python

---

## PART 4 — ML Service Setup

```bash
cd ml

# 1. Create virtual environment
python -m venv venv

# 2. Activate
source venv/bin/activate        # Mac/Linux
venv\Scripts\activate           # Windows

# 3. Install packages (takes 3–5 min)
pip install -r requirements.txt

# 4. Start ML service
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

**Expected output:**
```
✅ YOLOv8n loaded
INFO:     Uvicorn running on http://0.0.0.0:8000
```

YOLOv8n (~6 MB) auto-downloads on first run.

**Run ML tests:**
```bash
python tests/test_full_pipeline.py
```

---

## PART 5 — Full End-to-End Test

```bash
# Terminal 1: backend running
# Terminal 2: ML service running
# Terminal 3: run these curl commands

# 1. Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Admin123","name":"Admin User"}'

# 2. Login — copy the access_token from response
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Admin123"}'

# 3. Upload image (replace TOKEN and /path/to/crowd.jpg)
curl -X POST http://localhost:5000/api/upload \
  -H "Authorization: Bearer TOKEN" \
  -F "media=@/path/to/crowd.jpg" \
  -F "location=Main Entrance"

# 4. Get all results
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:5000/api/analysis?limit=10"

# 5. Summary stats
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:5000/api/analysis/stats/summary"
```

---

## PART 6 — Open Frontend

```bash
cd frontend
# Open index.html directly in browser, or:
npx serve .
```

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| `database: disconnected` in health | Wrong Supabase keys | Double-check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env` |
| `table crowd_analyses does not exist` | Schema not run | Paste `supabase_schema.sql` into Supabase SQL editor and run it |
| `Invalid or expired token` | Wrong JWT | Make sure you're using `access_token` from login response |
| S3 upload fails `AccessDenied` | IAM policy wrong | Re-attach `CrowdShieldPolicy` to your IAM user; check bucket name matches |
| SNS not sending emails | Subscription unconfirmed | Check email and click confirmation link from AWS |
| `ML service unavailable` | Python not running | `cd ml && uvicorn app:app --port 8000 --reload` |
| YOLOv8 download fails | No internet | Use: `pip install ultralytics` then `from ultralytics import YOLO; YOLO('yolov8n.pt')` |
| `EADDRINUSE 5000` | Port in use | `lsof -ti:5000 | xargs kill` (Mac/Linux) |
| Email confirmation required | Supabase default | Authentication → Providers → Email → disable "Confirm email" |

---

## Architecture

```
Frontend (HTML/React)
        │ Bearer token (Supabase JWT)
        ▼
┌──────────────────────────────────────┐
│  Node.js + Express  :5000            │
│  ┌─────────────────────────────────┐ │
│  │ Supabase Auth middleware        │ │  ← verifies JWT
│  └─────────────────────────────────┘ │
│  Upload → /tmp → ML → S3 → DB → SNS  │
└──────┬───────────────────────────────┘
       │
       ├─── HTTP POST /analyze ──────────▶ FastAPI ML :8000
       │                                   YOLOv8n detection
       │                                   Gaussian heatmap
       │                                   Optical flow (video)
       │
       ├─── S3 PutObject ───────────────▶ AWS S3 (media + heatmaps)
       │
       ├─── Supabase INSERT ────────────▶ PostgreSQL (analysis records)
       │
       └─── SNS Publish ────────────────▶ AWS SNS → Email/SMS alerts
                                          (High + Critical only)
```
