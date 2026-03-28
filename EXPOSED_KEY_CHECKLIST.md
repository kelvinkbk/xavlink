# 🔐 Exposed API Key Remediation Checklist

**Exposed Key:** `***REMOVED***`  
**File:** `mobile/google-services.json`  
**Status:** ⏰ AWAITING YOUR ACTION

---

## ✅ What I've Already Done

- [x] Detected exposed Google API Key in `mobile/google-services.json`
- [x] Added `google-services.json` to `.mobile/.gitignore`
- [x] Created `SECURITY_INCIDENT_REPORT.md` with detailed remediation steps
- [x] Committed and pushed security fixes to GitHub
- [ ] **Your turn →** Complete the steps below

---

## 🚨 ACTION REQUIRED - Complete These Steps TODAY

### Step 1: Rotate the Exposed API Key (5 minutes)

**URL:** https://console.cloud.google.com/apis/credentials

1. Log in to Google Cloud Console
2. Select project: `xavlink-6182e`
3. Find the exposed key: `***REMOVED***`
4. Click **DELETE** button
5. Create a new API key:
   - Click **+ Create Credentials** → **API Key**
   - Choose **Application restrictions: Android apps**
   - Add your package name: `com.kelvinkbk.xavlinkmonorepo`
   - Add SHA-1 certificate fingerprint: `4A:15:95:30:D8:2F:6F:6D:30:89:4F:AB:72:0C:F9:5B:14:1D:47:A6`
   - Click **Done**
   - Copy the new API key that's generated

### Step 2: Remove Exposed Key from Git History (5 minutes)

Run these commands in PowerShell:

```powershell
# Install git-filter-repo (one-time)
pip install git-filter-repo

# Navigate to project
cd d:\project\xavlink

# Remove google-services.json from all git history
git filter-repo --path mobile/google-services.json --invert-paths

# Force push the cleaned history
git push origin main --force
```

**⚠️ Important:** This rewrite history, so:
- All team members need to re-clone the repository
- Don't skip this step - it's critical for security

### Step 3: Update Local Configuration (2 minutes)

```powershell
cd d:\project\xavlink\mobile

# Replace the old key in google-services.json with your new key
# Edit the file and update the "current_key" value

# Then commit (optional, for your local reference)
git add google-services.json
```

### Step 4: Verify on GitHub (2 minutes)

1. Go to: https://github.com/kelvinkbk/xavlink
2. Click **Settings** tab
3. Click **Security & analysis** → **Secret scanning**
4. Verify the alert is **resolved**
5. If still showing: Click **Revoke** next to the exposed secret

### Step 5: Rebuild Mobile App (10 minutes)

```powershell
cd d:\project\xavlink\mobile

# Update dependencies
npm install

# Rebuild with EAS
eas build --platform android

# Or if building locally
cd android
./gradlew assembleRelease --no-daemon
```

---

## 📊 Security Impact

| Exposure Time | Risk Level | Action |
|---|---|---|
| Key was committed publicly | 🔴 HIGH | Delete key, remove from history |
| Anyone could access it | 🔴 HIGH | Create new key with restrictions |
| Currently still in history | 🔴 HIGH | Run git-filter-repo TODAY |
| Will be secure after cleanup | ✅ SAFE | Continue normal operations |

---

## 💾 Quick Reference

**New API Key Location:** [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)

**Old Key (DELETE):** `***REMOVED***`

**New Key:** `[PASTE HERE AFTER CREATING]`

**Files to Never Commit:**
- `mobile/google-services.json`
- `mobile/GoogleService-Info.plist`
- `.env`
- `.env.local`
- Any file with credentials

---

## ⏱️ Estimated Time to Complete

- Step 1 (Rotate key): 5 min
- Step 2 (Remove from history): 5 min
- Step 3 (Update config): 2 min
- Step 4 (Verify): 2 min
- Step 5 (Rebuild): 10 min

**Total: ~24 minutes**

---

## 📝 Proof of Completion

After finishing all steps, you should be able to verify:

```bash
# 1. Check that google-services.json is not in git history
git log --oneline -- mobile/google-services.json
# Should show: fatal: ambiguous argument 'mobile/google-services.json'

# 2. Verify the new key is in your local file (not committed)
cat mobile/google-services.json
# Should show your NEW key

# 3. Check GitHub Security alert is gone
# Go to: https://github.com/kelvinkbk/xavlink/security/secret-scanning
# Alert should be RESOLVED or not visible
```

---

## 🆘 Need Help?

- Detailed steps: See `SECURITY_INCIDENT_REPORT.md`
- Google Cloud docs: https://cloud.google.com/docs/authentication/api-keys
- Git Filter Repo: https://github.com/newren/git-filter-repo

**DO THIS NOW - It takes less than 30 minutes and is critical for security! 🔐**
