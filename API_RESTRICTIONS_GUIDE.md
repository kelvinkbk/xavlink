# API Restrictions Configuration Guide

## Current Step: API Restrictions in Google Cloud Console

You're at the final configuration step before your new API key is created.

---

## API Restrictions Options

### Option 1: Don't restrict key ✅ RECOMMENDED FOR DEVELOPMENT

**What it means:**
- Key can call ANY Google API
- Simpler setup
- Good for testing and development

**Select this if:**
- You're setting up for development/testing
- You want simplicity and quick setup
- You'll restrict it later in production

**Security:** ⭐⭐ (Moderate - acceptable for dev)

---

### Option 2: Restrict key

**What it means:**
- Key can ONLY call APIs you specify
- More secure
- Requires selecting which APIs you use

**Select this if:**
- Setting up for production
- You want maximum security
- You know exactly which APIs you need

**For XavLink, you would select:**
- Firebase Realtime Database API
- Firebase Cloud Messaging API
- Firebase Storage API
- Cloud Messaging API

**Security:** ⭐⭐⭐⭐⭐ (Maximum)

---

## Decision for XavLink Setup

### For Now (Development):
✅ **Select: "Don't restrict key"** 
- Allows quick testing and iteration
- Android restrictions (package + fingerprint) provide baseline security

### For Production:
🔒 **Select: "Restrict key"** and add specific Firebase APIs
- Much more secure
- Prevents unauthorized API usage

---

## Next Steps NOW

1. **Keep "Don't restrict key" selected** (current setting)
2. **Click the blue "Create" button** at bottom right
3. **Wait for key to be generated**
4. **Copy the new API key** (format: `AIzaSy...`)
5. **Update `google-services.json`** with the new key
6. **Save the file**

---

## After Creating the Key

Your new API key will appear in the Credentials list. 

**Important:**
- ✅ Copy it immediately
- ✅ Do NOT share it publicly
- ✅ It's restricted to your Android app (package + fingerprint)
- ❌ Do NOT commit it to git (it's in .gitignore)

---

## Example: google-services.json Update

Find this in your file:
```json
"api_key": [
  {
    "current_key": "***REMOVED***"
  }
]
```

Replace with your new key:
```json
"api_key": [
  {
    "current_key": "AIzaSy_YOUR_NEW_KEY_HERE_DO_NOT_SHARE"
  }
]
```

---

## Summary of Your Security Setup

| Component | Status | Details |
|-----------|--------|---------|
| Old API key | 🔴 MUST DELETE | Delete from Google Cloud today |
| New API key | 🟡 CREATING | Being created now in Google Cloud |
| Android restrictions | ✅ CONFIGURED | Package + SHA-1 fingerprint set |
| API restrictions | 🟡 DECIDING | Choose "Don't restrict" for dev |
| google-services.json | 🟡 READY TO UPDATE | Will update after key created |
| Git history cleanup | 🟡 NEXT STEP | Run git-filter-repo after updating config |
| GitHub alert | 🟡 WILL RESOLVE | Disappears after git history cleanup |

---

## Timeline to Complete Everything

1. **Now:** Click Create button → Copy new key (2 min)
2. **Next:** Update google-services.json (2 min)
3. **After:** Run git-filter-repo (5 min)
4. **Final:** Verify GitHub alert resolved (2 min)

**Total remaining: ~11 minutes**

---

## Questions?

- **Can I change API restrictions later?** Yes! Edit the key anytime
- **Can I use this key on the web?** Yes, but it's restricted to Android apps
- **What if I lose the key?** Create a new one, old one becomes useless because it's deleted
- **Is this key safe to share?** No - keep it secret like a password

---

## Ready?

✅ **Click "Create" button to generate your new API key**

Then come back and update `google-services.json` with the new key that appears!
