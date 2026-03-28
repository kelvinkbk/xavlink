# Security Incident Report: Exposed Google API Key

**Date Detected:** March 28, 2026  
**Severity:** 🔴 HIGH  
**Status:** ⚠️ REQUIRES IMMEDIATE ACTION

---

## 🚨 Summary

GitHub security scanning detected an exposed Google API Key in the repository:

- **File:** `mobile/google-services.json`
- **Key:** `***REMOVED***`
- **Commit:** `09b23249` (L18)
- **Detection:** Anyone with read access to this repository can view this exposed secret

---

## ⚠️ Immediate Actions Required (DO NOW)

### 1. **Rotate the Exposed API Key** (CRITICAL)

This key was committed to a public repository and is potentially compromised.

**Steps:**

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to: **APIs & Services → Credentials**
3. Find the API key: `***REMOVED***`
4. **DELETE** this key immediately
5. Create a new API key and update your Firebase configuration

**Why:** Anyone who found this key could:

- Make requests to your Firebase backend using your credentials
- Potentially access your data or incur charges
- Impersonate your application

### 2. **Remove from Git History** (CRITICAL)

Since the key was committed, we need to remove it from the entire git history:

```bash
# Option A: Using git-filter-repo (recommended)
# Install: pip install git-filter-repo

git filter-repo --path mobile/google-services.json --invert-paths

# Then force push
git push origin main --force
```

```bash
# Option B: Using BFG Repo-Cleaner (if you prefer)
# Download from: https://rtyley.github.io/bfg-repo-cleaner/

bfg --delete-files google-services.json

git reflog expire --expire=now --all
git gc --prune=now
git push origin main --force
```

### 3. **Update .gitignore** ✅ DONE

Added to `mobile/.gitignore`:

```
# Firebase & sensitive config files
google-services.json
GoogleService-Info.plist
```

This prevents future commits of these files.

---

## 📋 Current Status

| Step                    | Status     | Notes                                        |
| ----------------------- | ---------- | -------------------------------------------- |
| Detect exposed secret   | ✅ DONE    | Found in mobile/google-services.json         |
| Update .gitignore       | ✅ DONE    | Added google-services.json                   |
| Rotate API key          | ⚠️ PENDING | You must do this in Google Cloud Console     |
| Remove from git history | ⚠️ PENDING | Run git-filter-repo command above            |
| Update GitHub           | ⚠️ PENDING | After cleanup, GitHub alert should disappear |

---

## 🔧 Steps to Complete Remediation

### Step 1: Create New API Key

1. Visit: https://console.cloud.google.com/apis/credentials
2. Click "Create Credentials" → "API Key"
3. Restrict it to Android apps and your package name
4. Copy the new key

### Step 2: Update google-services.json Locally

Replace the old key with the new one (just locally, don't commit yet):

```json
{
  "api_key": [
    {
      "current_key": "YOUR_NEW_KEY_HERE"
    }
  ]
}
```

### Step 3: Remove from Git History

In your terminal:

```bash
cd d:\project\xavlink

# Install git-filter-repo if you don't have it
pip install git-filter-repo

# Remove google-services.json from all history
git filter-repo --path mobile/google-services.json --invert-paths

# Force push to GitHub
git push origin main --force
```

### Step 4: Verify on GitHub

1. Go to: https://github.com/kelvinkbk/xavlink
2. Check "Security" tab → "Secret scanning"
3. The alert should disappear within a few minutes
4. If not, try: **Settings → Security → Secret scanning → Revoke exposed secrets**

### Step 5: Update Local Mobile App

```bash
cd mobile

# Update google-services.json with new key
# Then rebuild and deploy
npm install
eas build
```

---

## 📧 Next Steps After Remediation

Once you've completed the above steps:

1. ✅ GitHub alert will resolve automatically
2. ✅ Repository will be secure
3. ✅ No one can use the old key (it's deleted)
4. ✅ New deployments will use the new key

---

## 🛡️ Prevention for Future

**Best practices to prevent this again:**

1. **Use `.gitignore` for sensitive files:**

   ```
   google-services.json
   GoogleService-Info.plist
   .env
   .env.local
   secrets.json
   ```

2. **Use environment variables instead:**

   ```bash
   # Instead of hardcoding in files
   const API_KEY = process.env.GOOGLE_API_KEY
   ```

3. **Check before committing:**

   ```bash
   git diff --cached  # Review what you're committing
   ```

4. **Use GitHub's protected branches:**
   - Require code review before merging
   - Enable branch protection rules

5. **Store secrets in:**
   - Environment variables
   - GitHub Secrets (for CI/CD)
   - Dedicated secret management (AWS Secrets Manager, Vault, etc.)

---

## 📞 Questions?

If you need help with any of these steps, refer to:

- [Google Cloud Credentials Docs](https://cloud.google.com/docs/authentication/api-keys)
- [GitHub Secret Scanning Docs](https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning)
- [Git Filter Repo Documentation](https://github.com/newren/git-filter-repo)

**⏰ Priority:** Complete the rotation and git cleanup TODAY to minimize risk exposure.
