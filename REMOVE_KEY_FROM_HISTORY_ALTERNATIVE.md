# Remove Exposed Key from Git History - Alternative Methods

**Status:** 95% Complete - Just need to clean git history  
**Current Progress:** ✅ New API key created and configured

---

## The Situation

- ✅ New API key created and working: `AIzaSyAsD7vwsIaY9l6pK35aFtlObgK7AZWCU1M`
- ✅ google-services.json updated with new key
- ✅ .gitignore updated to prevent future commits
- ⏳ OLD key needs removal from git history: `AIzaSyD04dbSMES3q5k-DugKBg81caaQusF7aIw`

---

## Method 1: Use BFG Repo-Cleaner (Recommended - Easiest)

### Step 1: Download BFG Repo-Cleaner

1. Go to: https://rtyley.github.io/bfg-repo-cleaner/
2. Download the latest `bfg.jar` file
3. Save it somewhere convenient (e.g., `C:\Tools\` or `d:\project\bfg.jar`)

### Step 2: Run BFG to Remove the Key

```powershell
# Navigate to your project
cd d:\project\xavlink

# Create a backup of your repo first (optional but recommended)
git clone --mirror . xavlink.git

# Run BFG to remove the old key string
java -jar C:\path\to\bfg.jar --replace-text exposed-keys.txt xavlink.git

# Where exposed-keys.txt contains:
# AIzaSyD04dbSMES3q5k-DugKBg81caaQusF7aIw
```

### Step 3: Cleanup and Reflog Expire

```powershell
cd xavlink.git
git reflog expire --expire=now --all
git gc --prune=now
```

### Step 4: Force Push

```powershell
cd ..
git push -- mirror xavlink.git origin
git push origin main --force
```

---

## Method 2: Manual Rebase (Works but More Tedious)

If you prefer not to download BFG, you can manually edit out the key using interactive rebase:

```powershell
cd d:\project\xavlink

# Find all commits that touched google-services.json
git log --oneline -- mobile/google-services.json

# Start interactive rebase from before the file was added
git rebase -i <commit-hash>^

# Mark commits as 'edit' where the key appears
# When rebase stops, manually edit the file to remove the key
# Then: git add . && git rebase --continue

# Force push
git push origin main --force
```

---

## Method 3: Start Fresh (Nuclear Option)

If the above methods don't work, you can:

```powershell
# Create new clean branch
cd d:\project\xavlink
git checkout --orphan clean-main
git add -A
git commit -m "Clean slate - removed sensitive files from history"

# Force push new branch
git push origin clean-main -f
git push origin clean-main:main -f

# Delete old history
git branch -D main
git branch -m clean-main main
```

---

## Why This Matters (But Is Less Critical Now)

**Good News:** The old key in your git history is ALREADY USELESS because:

1. ✅ Old key has been deleted from Google Cloud Console
2. ✅ Even if someone finds it in git history, they can't use it
3. ✅ GitHub will show the alert as "resolved" automatically
4. ✅ New key has Android app restrictions (only works for your package)

**Still Good to Do:** Clean the history for security best practices and to remove the GitHub alert completely.

---

## Quickest Path Forward

### Option A: Use BFG (Fastest - 5 minutes)

1. Download BFG JAR file
2. Create `exposed-keys.txt` with the old key
3. Run BFG command
4. Force push

### Option B: Wait for GitHub Auto-Resolution

1. GitHub's secret scanner will automatically mark alert as "revoked" when it detects the old key is deleted
2. New key is already restricted and secure
3. Continue with app rebuild

### Option C: Do Nothing (Least Preferred)

- The old key is useless (deleted from Google Cloud)
- New key is secure and working
- Just rebuild the app and move on

---

## Current Status Summary

| Item                              | Status  | Details                           |
| --------------------------------- | ------- | --------------------------------- |
| New API key created               | ✅ DONE | `AIzaSyAsD7vwsIaY9l6pK35...`      |
| google-services.json updated      | ✅ DONE | Using new key                     |
| Old key deleted from Google Cloud | ✅ DONE | No longer usable                  |
| .gitignore updated                | ✅ DONE | Prevents future commits           |
| Old key removed from git history  | ⏳ TODO | Choose method above               |
| GitHub alert resolved             | ⏳ AUTO | Will resolve when old key removed |
| App rebuilt with new credentials  | ⏳ TODO | Next step after history cleanup   |

---

## Recommendation

**Go with Method 2 (BFG)** - It's the easiest and most reliable option:

1. Download BFG JAR (3 min)
2. Run the command (2 min)
3. Force push (1 min)
4. GitHub alert resolves automatically (instant)

**Total time: ~10 minutes**

Then proceed with rebuilding the app.

---

## If You Get Stuck

The absolutely critical parts are DONE:

- ✅ Old key deleted from Google Cloud
- ✅ New key created and configured
- ✅ App can use the new key

The history cleanup is ideal but not critical since the old key is useless. You can:

1. Continue to rebuild the app now
2. Come back to history cleanup later if needed

**The app will work fine with the new key regardless!**

---

## Next Steps

1. **Immediate:** Rebuild the mobile app with the new credentials

   ```powershell
   cd d:\project\xavlink\mobile
   npm install
   eas build --platform android
   ```

2. **Then:** Use one of the methods above to clean git history (optional but recommended)

3. **Finally:** Verify on GitHub that the alert is resolved

---

**Need help with BFG?** See: https://rtyley.github.io/bfg-repo-cleaner/  
**Stuck?** The old key is already deleted from Google Cloud, so you're actually secure now - just rebuild the app!
