# CrowdShield — Owner Git Cheatsheet (Ashutosh)

## SETUP — Do once on GitHub website

### Add a collaborator
1. github.com/Asky03/Crowdshield1 → Settings → Collaborators
2. Click "Add people" → type their GitHub username
3. They get an email invite — they must accept it

### Protect the main branch (IMPORTANT — do this now)
1. github.com/Asky03/Crowdshield1 → Settings → Branches
2. Click "Add branch protection rule"
3. Branch name pattern: `main`
4. Check these boxes:
   - ✅ Require a pull request before merging
   - ✅ Require approvals: 1
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - ✅ Do not allow bypassing the above settings
5. Save changes
   → Now nobody (including you) can push directly to main

---

## EVERY SPRINT — Create branches for contributors

```bash
# Always start from latest main
git checkout main
git pull origin main

# Create branch for each feature
git checkout -b feat/zone-capacity-scoring
git push origin feat/zone-capacity-scoring

git checkout main
git checkout -b feat/map-integration
git push origin feat/map-integration

git checkout main
git checkout -b feat/csrnet-upgrade
git push origin feat/csrnet-upgrade

# Go back to main when done
git checkout main
```

---

## REVIEWING A PULL REQUEST

### On GitHub website:
1. Go to your repo → Pull Requests tab
2. Click the PR to review
3. Check the CI status — must show green ✅ before reviewing
4. Click "Files changed" tab — read every file changed
5. Add comments on specific lines if needed
6. Click "Review changes" → Approve or Request changes
7. If approved → click "Merge pull request" → "Confirm merge"
8. Click "Delete branch" after merging (keeps repo clean)

### Using git locally to test a PR before merging:
```bash
# Fetch the contributor's branch
git fetch origin feat/zone-capacity-scoring

# Switch to it locally and test it
git checkout feat/zone-capacity-scoring
cd backend && npm test
cd .. && npm run dev
# Test it manually in browser

# If happy, go back to GitHub and approve + merge
git checkout main
```

---

## AFTER MERGING — Update your local main

```bash
git checkout main
git pull origin main
# Your local main now matches the merged result
```

---

## SEEING WHAT CHANGED

```bash
# See all branches (local + remote)
git branch -a

# See commits on a branch vs main
git log main..feat/zone-capacity-scoring --oneline

# See exactly what files changed
git diff main..feat/zone-capacity-scoring --name-only

# See full diff
git diff main..feat/zone-capacity-scoring
```

---

## IF SOMETHING GOES WRONG

```bash
# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes) — DANGEROUS
git reset --hard HEAD~1

# Revert a specific commit after it's merged
git revert <commit-hash>
git push origin main

# See commit hashes
git log --oneline -10
```

---

## CI/CD — How it connects to Render

When a PR is merged to main:
1. GitHub Actions runs tests one final time ✅
2. Render detects the push to main automatically
3. Render runs `npm install` then `npm start`
4. New version is live in ~3 minutes
5. Check: https://crowdshield-backend-hdlm.onrender.com/api/health

If Render does not auto-deploy:
→ Render Dashboard → your service → Manual Deploy → Deploy latest commit