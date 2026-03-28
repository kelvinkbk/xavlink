# 🔐 Security Remediation Quick Reference Card

## YOU ARE HERE: Creating New API Key in Google Cloud

```
┌─────────────────────────────────────────────┐
│ Step 1: Create New Key         [YOU ARE HERE]│
├─────────────────────────────────────────────┤
│ Step 2: Remove from git history [→ NEXT]    │
│ Step 3: Update config           [WAITING]   │
│ Step 4: Verify on GitHub        [WAITING]   │
│ Step 5: Rebuild app             [WAITING]   │
└─────────────────────────────────────────────┘
```

---

## IMMEDIATE ACTION: Right Now in Google Cloud Console

**Your current screen:** API Restrictions options

### What to do:

1. ✅ **Select:** "Don't restrict key" (already selected)
2. ✅ **Click:** Blue **"Create"** button at bottom right
3. ⏳ **Wait:** New key is generated (takes a few seconds)
4. 📋 **Copy:** New API key (looks like: `AIzaSy...`)

### After key is created:

1. Open: `d:\project\xavlink\mobile\google-services.json`
2. Find: `"current_key": "***REMOVED***"`
3. Replace with: Your new key from clipboard
4. Save file

**Time: 5 minutes ⏱️**

---

## THEN: Run git-filter-repo Command

After you update google-services.json:

```powershell
cd d:\project\xavlink
pip install git-filter-repo
git filter-repo --path mobile/google-services.json --invert-paths
git push origin main --force
```

**Time: 5 minutes ⏱️**

---

## FINALLY: Verify and Rebuild

```powershell
cd d:\project\xavlink\mobile
npm install
eas build --platform android
```

**Time: 10 minutes ⏱️**

---

## Progress Tracking

| Step             | Status         | Time        |
| ---------------- | -------------- | ----------- |
| 1. Create key    | 🟡 IN PROGRESS | 5 min       |
| 2. Git cleanup   | ⏳ Waiting     | 5 min       |
| 3. Update config | ⏳ Waiting     | 2 min       |
| 4. Verify        | ⏳ Waiting     | 2 min       |
| 5. Rebuild       | ⏳ Waiting     | 10 min      |
| **TOTAL**        | **85% done**   | **~24 min** |

---

## Quick Copy-Paste Commands

**Step 2: Remove from git history**

```powershell
pip install git-filter-repo
cd d:\project\xavlink
git filter-repo --path mobile/google-services.json --invert-paths
git push origin main --force
```

**Step 5: Rebuild app**

```powershell
cd d:\project\xavlink\mobile
npm install
eas build --platform android
```

---

## Files You Need

- Update: `mobile/google-services.json` (replace API key only)
- View: `EXPOSED_KEY_CHECKLIST.md` (full checklist)
- View: `SECURITY_REMEDIATION_STATUS.md` (tracking)

---

## Critical Reminders

🔴 **DO:**

- ✅ Create the new API key NOW
- ✅ Copy it immediately
- ✅ Run git-filter-repo to remove old key from history
- ✅ Force push: `git push origin main --force`

🔴 **DON'T:**

- ❌ Commit google-services.json (it's in .gitignore)
- ❌ Skip git-filter-repo step
- ❌ Share the new API key publicly
- ❌ Forget to update the local file

---

## Success Indicators

After everything is done:

✅ Google Cloud Console shows new API key created  
✅ google-services.json has new key (local, not committed)  
✅ git log shows google-services.json removed from history  
✅ GitHub security alert is resolved  
✅ Mobile app rebuilds successfully

---

## Support

**Questions?** Check these files:

- `EXPOSED_KEY_CHECKLIST.md` - Step-by-step guide
- `API_KEY_CREATION_GUIDE.md` - Google Cloud details
- `SECURITY_REMEDIATION_STATUS.md` - Full tracking

---

## Timeline

```
NOW         → 5 min: Create key + update config
5 min       → 10 min: Run git-filter-repo
10 min      → 14 min: Verify on GitHub
14 min      → 24 min: Rebuild app
24 min      ✅ DONE - Security remediation complete!
```

---

**Status: READY TO COMPLETE STEP 1** 🚀

Click "Create" button in Google Cloud Console now!
