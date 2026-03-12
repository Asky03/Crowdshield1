
# ╔══════════════════════════════════════════════════════════════╗
# ║     CrowdShield — .env SETUP + RUN GUIDE                    ║
# ║     Read this top to bottom. Do not skip any step.          ║
# ╚══════════════════════════════════════════════════════════════╝

# ──────────────────────────────────────────────────────────────
# STEP 1 — UNDERSTAND THE TWO ENV FILES
# ──────────────────────────────────────────────────────────────
#
#  .env.example  →  Template file. Already in your project.
#                   Contains placeholder text like "your-key-here".
#                   This IS committed to git. Never put real keys here.
#
#  .env          →  Your REAL secrets file. You create this yourself.
#                   This is NEVER committed to git (.gitignore blocks it).
#                   This is where you paste your actual keys.
#
#  RULE: .env.example shows the structure.
#        .env has your actual values.
#        They are in the same folder: CROWD-CLAUDE/backend/
#
# ──────────────────────────────────────────────────────────────
# STEP 2 — CREATE YOUR .env FILE
# ──────────────────────────────────────────────────────────────
#
#  In VS Code terminal, make sure you are inside the backend folder:
#
#    cd backend
#
#  Then create the .env file by copying the example:
#
#    Windows (PowerShell):   copy .env.example .env
#    Mac/Linux:              cp .env.example .env
#
#  Now open the new .env file in VS Code.
#  You will see placeholder text. Replace each one with your real value.
#
# ──────────────────────────────────────────────────────────────
# STEP 3 — FILL IN EACH KEY (exact locations shown below)
# ──────────────────────────────────────────────────────────────

# ┌─────────────────────────────────────────────────────────────┐
# │ KEY 1: PORT                                                 │
# └─────────────────────────────────────────────────────────────┘
PORT=5000
# This never changes. Leave it as 5000.

# ┌─────────────────────────────────────────────────────────────┐
# │ KEY 2: NODE_ENV                                             │
# └─────────────────────────────────────────────────────────────┘
NODE_ENV=development
# Leave this as "development" while building locally.

# ┌─────────────────────────────────────────────────────────────┐
# │ KEYS 3-6: SUPABASE (4 keys total)                          │
# └─────────────────────────────────────────────────────────────┘
#
# WHERE TO FIND THEM:
#   1. Go to https://supabase.com → your project dashboard
#   2. Click the gear icon (⚙) bottom-left → "Project Settings"
#   3. Click "API" in the left menu
#
#   On that page you will see:
#
#   ┌──────────────────────────────────────────────────┐
#   │  Project URL                                      │
#   │  https://abcxyzabcxyz.supabase.co    [Copy]      │ ← SUPABASE_URL
#   │                                                   │
#   │  Project API keys                                 │
#   │  anon  public    eyJhbGci...short...  [Copy]      │ ← SUPABASE_ANON_KEY
#   │  service_role    eyJhbGci...long...   [Copy]      │ ← SUPABASE_SERVICE_ROLE_KEY
#   └──────────────────────────────────────────────────┘
#
#   4. Still in Project Settings → click "API" → scroll down to find
#      "JWT Settings" section (or click the "JWT" tab at top)
#   5. Click "Legacy JWT Secret" tab → copy that value → SUPABASE_JWT_SECRET
#
SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR_SERVICE_ROLE_KEY
SUPABASE_JWT_SECRET=your-legacy-jwt-secret-string-here

# ┌─────────────────────────────────────────────────────────────┐
# │ KEYS 7-9: AWS (3 keys total)                               │
# └─────────────────────────────────────────────────────────────┘
#
# WHERE TO FIND THEM:
#   1. Go to https://console.aws.amazon.com
#   2. Search "IAM" → click IAM
#   3. Left sidebar → Users → click "crowdshield-backend" user
#   4. Click "Security credentials" tab
#   5. Under "Access keys" → click the key you created → copy both values
#
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
#   ↑ Change this to whatever region you chose when creating your S3 bucket
#   e.g., eu-west-1, ap-south-1, us-west-2 etc.

# ┌─────────────────────────────────────────────────────────────┐
# │ KEY 10: AWS_S3_BUCKET                                      │
# └─────────────────────────────────────────────────────────────┘
#
# WHERE TO FIND IT:
#   AWS Console → S3 → your bucket is listed with its exact name
#   Copy the name EXACTLY (case-sensitive, no spaces)
#
AWS_S3_BUCKET=crowdshield-media
#   ↑ Replace with your actual bucket name if you named it differently

# ┌─────────────────────────────────────────────────────────────┐
# │ KEY 11: AWS_SNS_TOPIC_ARN                                  │
# └─────────────────────────────────────────────────────────────┘
#
# WHERE TO FIND IT:
#   AWS Console → SNS → Topics → click "crowdshield-alerts"
#   Copy the "ARN" at the top of the page
#   It looks like: arn:aws:sns:us-east-1:123456789012:crowdshield-alerts
#
AWS_SNS_TOPIC_ARN=arn:aws:sns:us-east-1:YOUR-ACCOUNT-ID:crowdshield-alerts

# ┌─────────────────────────────────────────────────────────────┐
# │ KEY 12-13: ML + UPLOAD settings                            │
# └─────────────────────────────────────────────────────────────┘
ML_SERVICE_URL=http://localhost:8000
MAX_FILE_SIZE_MB=100
# These never change locally. Leave them as-is.


# ══════════════════════════════════════════════════════════════
# WHAT YOUR FINAL .env SHOULD LOOK LIKE (with real values)
# ══════════════════════════════════════════════════════════════
#
# PORT=5000
# NODE_ENV=development
# SUPABASE_URL=https://xyzabcxyzabc.supabase.co
# SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi...
# SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3...
# SUPABASE_JWT_SECRET=super-secret-jwt-string-from-supabase
# AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
# AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
# AWS_REGION=us-east-1
# AWS_S3_BUCKET=crowdshield-media
# AWS_SNS_TOPIC_ARN=arn:aws:sns:us-east-1:123456789012:crowdshield-alerts
# ML_SERVICE_URL=http://localhost:8000
# MAX_FILE_SIZE_MB=100
#
# NO quotes around values. NO spaces around = sign.
# One key=value per line. That's it.

