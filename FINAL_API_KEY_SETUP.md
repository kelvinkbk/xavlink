# Final API Key Setup Implementation Guide

**Status:** You are currently selecting APIs in Google Cloud Console  
**Step:** Creating restricted API key with appropriate Firebase APIs

---

## Current Screen: API Restrictions Selector

You're looking at a dropdown list of available Google Cloud APIs. You need to select the APIs that your XavLink app will use.

### APIs Already Identified in Your Project:
```
✅ Firebase Cloud Messaging API (selected)
```

---

## APIs to Select for XavLink

### Required for Firebase Mobile App:

| API Name | Purpose | Select? |
|----------|---------|---------|
| **Firebase Cloud Messaging API** | Push notifications | ✅ YES (already selected) |
| **Firebase Installations API** | Firebase SDK authentication | ✅ YES (select it) |
| **Cloud Storage API** | Image/file uploads | ✅ YES (select it) |
| **Firebase Rules API** | Firestore/RTDB security | ✅ YES (select it) |

### Optional (Not needed for basic XavLink):
- Cloud Logging API
- Cloud Monitoring API
- Firebase Hosting API

---

## Step-by-Step: Select the APIs

### 1. Firebase Cloud Messaging API
**Status:** ✅ Already checked  
**Action:** Leave as is

### 2. Firebase Installations API
**How to find:**
- Use the "Filter" box at the top
- Type: `firebase installations`
- Click the checkbox next to it

**If you can't find it:**
- Scroll down in the list
- Look for items starting with "Firebase"

### 3. Cloud Storage API
**How to find:**
- Use the "Filter" box
- Type: `cloud storage api`
- Check the "Cloud Storage API" checkbox (not "Cloud Storage" alone)

**Alternative:**
- Type just: `storage`
- Select "Cloud Storage API"

### 4. Firebase Rules API
**How to find:**
- Use the "Filter" box
- Type: `firebase rules`
- Check the checkbox

---

## Checklist Before Clicking OK

Make sure these are checked (✅):
- [ ] Firebase Cloud Messaging API ✅
- [ ] Firebase Installations API ✅
- [ ] Cloud Storage API ✅
- [ ] Firebase Rules API ✅

**Total: 4 APIs selected**

---

## If You Can't Find an API

**Option 1: Just use Firebase Cloud Messaging**
- Firebase Cloud Messaging API alone is sufficient for basic functionality
- Click OK with just that selected
- You can edit the key later to add more APIs

**Option 2: Don't restrict the key**
- Go back and select "Don't restrict key"
- This is simpler for development
- Less secure, but acceptable for dev/testing

---

## Next Actions After Selecting:

1. ✅ Confirm your 4 APIs are checked
2. 🔄 Click blue **"OK"** button at bottom right
3. ⏳ Page will close and show your key settings
4. 🔄 Click blue **"Create"** button to generate the key
5. 📋 Copy the new key immediately
6. 📝 Update `google-services.json` with the new key

---

## After You Click OK:

```
Your API Key Creation Settings:
┌─────────────────────────────────┐
│ Application restrictions: ✅    │
│   Android apps                  │
│                                 │
│ Android restrictions: ✅        │
│   Package: com.kelvinkbk...     │
│   SHA-1: 4A:15:95:30:D8...      │
│                                 │
│ API restrictions: ✅            │
│   Firebase Cloud Messaging      │
│   Firebase Installations        │
│   Cloud Storage API             │
│   Firebase Rules API            │
│                                 │
│           [Create]              │
└─────────────────────────────────┘
```

---

## Timeline Now

```
NOW:        Select APIs → Click OK → Click Create (5 min)
THEN:       Copy key → Update google-services.json (2 min)
THEN:       Run git-filter-repo (5 min)
THEN:       Rebuild app (10 min)
TOTAL:      ~22 minutes remaining
```

---

## Success Indicators

After clicking OK, you should see:
- ✅ Your configuration summary with selected APIs listed
- ✅ A blue "Create" button ready to click
- ✅ No error messages

---

## Questions?

**Can't find an API?**
→ Use the Filter field, it searches by name

**Want to change APIs later?**
→ Yes, you can edit the key anytime

**Worried about missing APIs?**
→ You can start with just Firebase Cloud Messaging and add more later

**What if I select wrong APIs?**
→ No problem, click OK then Cancel on the summary screen if needed

---

## Right Now:

**Your current action:**
1. Use Filter field (or scroll) to find APIs
2. Click checkbox for each API
3. Ensure 4 APIs are selected
4. Click **"OK"** button

**Go ahead and select the APIs now! When done, the key will be created.** ✅
