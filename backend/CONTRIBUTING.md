# CrowdShield — Contributor Guide

## Who reads this
Anyone added as a collaborator to this repo. Follow every step exactly.

---

## PART 1 — First time setup (do once)

### Option A — Using Git commands (recommended)

```bash
# 1. Clone the repo
git clone https://github.com/Asky03/Crowdshield1.git
cd Crowdshield1

# 2. Set up backend
cd backend
copy .env.example .env      # Windows
# cp .env.example .env      # Mac/Linux
# Ask Ashutosh for the real .env values — never commit them
npm install

# 3. Set up ML service
cd ../ml
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
pip install -r requirements.txt

# 4. Verify everything works
cd ../backend
npm test
# All tests should pass before you touch anything
```

### Option B — Using GitHub Desktop

1. Open GitHub Desktop → File → Clone Repository
2. Paste: `https://github.com/Asky03/Crowdshield1.git`
3. Choose a local folder → Clone
4. Open VS Code from GitHub Desktop (Repository → Open in VS Code)
5. Follow steps 2-4 above in VS Code terminal

---

## PART 2 — Every time you work on something

### Step 1 — Get the latest code first (always do this)
```bash
git checkout main
git pull origin main
```

### Step 2 — Switch to your feature branch
The branch will already exist — Ashutosh creates it.
```bash
git checkout feat/your-feature-name
# Example:
git checkout feat/zone-capacity-scoring
git checkout feat/map-integration
git checkout feat/csrnet-model
```

### Step 3 — Make your changes
Edit files in VS Code. Test locally before committing.

### Step 4 — Run tests before committing
```bash
cd backend
npm test
# All tests must pass. Fix any failures before pushing.
```

### Step 5 — Commit your changes
```bash
git add .
git commit -m "feat: short description of what you did"

# Good commit messages:
# feat: add zone capacity threshold scoring
# fix: correct CORS header for Vercel URL
# test: add unit tests for risk score calculation
# docs: update README with ML setup steps

# Bad commit messages:
# changes
# update
# fix stuff
# asdf
```

### Step 6 — Push to GitHub
```bash
git push origin feat/your-feature-name
```

### Step 7 — Create a Pull Request
1. Go to github.com/Asky03/Crowdshield1
2. You'll see a yellow banner: "feat/your-feature had recent pushes"
3. Click **Compare & pull request**
4. Fill in the PR description (what you changed and why)
5. Click **Create pull request**
6. Wait for CI tests to pass (green checkmark)
7. Ashutosh will review and merge

---

## PART 3 — Rules

- NEVER push directly to `main`
- NEVER commit `.env` files
- NEVER commit `node_modules/` or `venv/`
- Always run `npm test` before pushing
- One feature per branch — don't mix unrelated changes
- If tests fail in CI, fix them before asking for review

---

## PART 4 — Branch naming

| Type | Format | Example |
|------|--------|---------|
| New feature | `feat/description` | `feat/zone-scoring` |
| Bug fix | `fix/description` | `fix/cors-error` |
| Tests | `test/description` | `test/upload-pipeline` |
| Docs | `docs/description` | `docs/api-reference` |

---

## PART 5 — If you get stuck

```bash
# Accidentally edited main? Move changes to a branch:
git stash
git checkout feat/your-branch
git stash pop

# Conflicts after pulling? 
git pull origin main
# Fix the conflict markers in the files
git add .
git commit -m "fix: resolve merge conflicts"

# Want to see what changed?
git log --oneline -10
git diff main..feat/your-branch
```