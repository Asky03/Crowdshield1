# CrowdShield — Deployment Guide
## Backend → Render | Frontend → Vercel | Admin → Email Whitelist

---

## OVERVIEW

```
Your Laptop (dev)     →    GitHub repo
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
             Render.com               Vercel.com
           (Node.js backend)       (HTML frontend)
                    │
                    ▼
             Supabase + AWS
          (already configured)
```

---

## PART 1 — Push to GitHub (5 min)

```bash
# In your CROWD-CLAUDE folder
git init                          # if not done yet
git add .
git commit -m "feat: CrowdShield v2 ready for deployment"

# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/crowdshield.git
git push -u origin main
```

Make sure `.gitignore` is working — `.env` should NOT be in the commit.

---

## PART 2 — Deploy Backend to Render (10 min)

### Step 2.1 — Create Render account
1. Go to https://render.com → Sign up (free)
2. Connect your GitHub account

### Step 2.2 — Create Web Service
1. Click **New +** → **Web Service**
2. Connect your GitHub repo
3. Fill in:
   - **Name**: `crowdshield-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free
4. Click **Create Web Service**

### Step 2.3 — Add Environment Variables in Render
In your Render service dashboard → **Environment** tab → Add each one:

```
NODE_ENV                = production
PORT                    = 10000
SUPABASE_URL            = (paste from your .env)
SUPABASE_ANON_KEY       = (paste from your .env)
SUPABASE_SERVICE_ROLE_KEY = (paste from your .env)
SUPABASE_JWT_SECRET     = (paste from your .env)
AWS_ACCESS_KEY_ID       = (paste from your .env)
AWS_SECRET_ACCESS_KEY   = (paste from your .env)
AWS_REGION              = (paste from your .env)
AWS_S3_BUCKET           = (paste from your .env)
AWS_SNS_TOPIC_ARN       = (paste from your .env)
ML_SERVICE_URL          = http://localhost:8000  (update if you deploy ML too)
MAX_FILE_SIZE_MB        = 100
ADMIN_EMAILS            = youremail@gmail.com,other@gmail.com
FRONTEND_URL            = https://YOUR-APP.vercel.app  (fill after Step 3)
```

### Step 2.4 — Get your backend URL
After deploy finishes (2-3 min), you get a URL like:
```
https://crowdshield-backend.onrender.com
```
Copy this — you need it in the next steps.

### Step 2.5 — Test backend is live
Open in browser:
```
https://crowdshield-backend.onrender.com/api/health
```
Should return JSON with `"status":"ok"`.

---

## PART 3 — Deploy Frontend to Vercel (5 min)

### Step 3.1 — Update config.js FIRST
Open `frontend/config.js` and fill in your real values:

```js
window.CROWDSHIELD_API = 'https://crowdshield-backend.onrender.com/api';

window.CROWDSHIELD_SUPABASE_URL  = 'https://YOUR_PROJECT_ID.supabase.co';
window.CROWDSHIELD_SUPABASE_ANON = 'YOUR_SUPABASE_ANON_KEY';
```

Commit and push this change:
```bash
git add frontend/config.js
git commit -m "config: set production backend URL"
git push
```

### Step 3.2 — Create Vercel account
1. Go to https://vercel.com → Sign up with GitHub (free)

### Step 3.3 — Deploy frontend
1. Click **Add New Project**
2. Import your GitHub repo
3. Settings:
   - **Framework Preset**: Other
   - **Root Directory**: `frontend`
   - **Build Command**: (leave empty)
   - **Output Directory**: (leave empty — it's just HTML files)
4. Click **Deploy**

After ~1 minute you get a URL like:
```
https://crowdshield-abc123.vercel.app
```

### Step 3.4 — Update FRONTEND_URL in Render
Go back to Render → your service → Environment → update:
```
FRONTEND_URL = https://crowdshield-abc123.vercel.app
```
This fixes the password reset email link.

### Step 3.5 — Update Supabase redirect URL
1. Supabase → Authentication → URL Configuration
2. Add to **Redirect URLs**:
   ```
   https://crowdshield-abc123.vercel.app/reset-password.html
   ```
3. Set **Site URL** to:
   ```
   https://crowdshield-abc123.vercel.app
   ```

---

## PART 4 — Admin Access Control (IMPORTANT)

### How it works
When someone registers, the backend checks their email against `ADMIN_EMAILS`.
- Email IS in the list → gets `admin` role
- Email is NOT in the list → gets `operator` role
- Operators can only see their own uploads
- Admins see everything from all users

### Set up admin emails
In Render environment variables:
```
ADMIN_EMAILS = youremail@gmail.com,teammate@gmail.com
```

Multiple emails separated by commas. No spaces.

### Manually promote an existing user to admin
If someone already registered as operator and you want to make them admin:
1. Supabase → SQL Editor → run:
```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'their@email.com');
```

### Restrict registration (optional — prevent random signups)
If you want ONLY invited users to register, add this to Render env vars:
```
ALLOWED_REGISTRATION_DOMAINS = yourdomain.com,gmail.com
```
Then the backend will reject registrations from other domains.

---

## PART 5 — Fix Password Reset for Production

The reset link now works because:
1. `FRONTEND_URL` in Render points to your Vercel URL
2. Supabase redirect URL is configured (Step 3.5)
3. `reset-password.html` reads Supabase keys from `config.js`

**Test it:**
1. Go to your Vercel URL → click "Forgot password?"
2. Enter your email
3. Check inbox → click the link
4. It opens `reset-password.html` on your Vercel URL ✅
5. Enter new password → redirected to login ✅

---

## SUMMARY — URLs after deployment

| Service | URL |
|---------|-----|
| Dashboard | `https://your-app.vercel.app` |
| Backend API | `https://crowdshield-backend.onrender.com/api` |
| Health check | `https://crowdshield-backend.onrender.com/api/health` |

## IMPORTANT NOTES

- Render free tier **sleeps after 15 min of inactivity** — first request after sleep takes ~30 sec to wake up. Upgrade to paid ($7/mo) for always-on.
- Vercel frontend is always instant — no sleep.
- Your Supabase and AWS are already production-ready — no changes needed there.
- The ML service (Python/YOLOv8) is NOT deployed — uploads will use mock results until you deploy it separately (e.g. on a GPU server or Railway).