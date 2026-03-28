# API Key Creation Guide - XavLink

## Your Certificate Details ✅

Your Android Debug Certificate (for development):

```
SHA-1 Fingerprint: 4A:15:95:30:D8:2F:6F:6D:30:89:4F:AB:72:0C:F9:5B:14:1D:47:A6
SHA-256 Fingerprint: 61:4A:44:34:82:41:78:39:1D:E0:FB:C9:06:AD:45:C5:97:14:08:30:91:93:C0:0C:C3:4C:29:CF:E8:94:A0:AA
Package Name: com.kelvinkbk.xavlinkmonorepo
```

---

## Google Cloud Console Steps

### Step 1: Delete the Exposed Key

1. Go to: https://console.cloud.google.com/apis/credentials?project=xavlink-6182e
2. Under **API Keys** section, find: `***REMOVED***`
3. Click the **three dots** menu on the right
4. Select **Delete**
5. Confirm deletion

✅ **Status:** Old key is now DELETED and cannot be used

---

### Step 2: Create New Restricted API Key

1. Click **+ Create Credentials** button
2. Select **API Key** from the dropdown
3. A new key will be created - **DO NOT CLOSE THIS DIALOG YET**
4. Click **Edit API key** (or the pencil icon)

---

### Step 3: Configure Application Restrictions

In the API key settings:

**Application restrictions:**

- Select: **Android apps** (radio button)

**Android restrictions:**

- Click **Add an Android app**
- **Package name:** `com.kelvinkbk.xavlinkmonorepo`
- **SHA-1 certificate fingerprint:** `4A:15:95:30:D8:2F:6F:6D:30:89:4F:AB:72:0C:F9:5B:14:1D:47:A6`
- Click **Done**

**API restrictions:**

- Keep as: **Don't restrict key** (or select specific APIs if needed)

---

### Step 4: Save and Copy

1. Click **Save** button (blue button at bottom)
2. The page reloads
3. Find your new API key in the list under **API Keys**
4. Click the **copy icon** next to the key
5. Your new key is now copied to clipboard

📋 **Format:** `AIzaSy...` (starts with AIzaSy)

---

### Step 5: Update google-services.json

1. Open: `d:\project\xavlink\mobile\google-services.json`
2. Find this line:
   ```json
   "current_key": "***REMOVED***"
   ```
3. Replace with your new key:
   ```json
   "current_key": "PASTE_YOUR_NEW_KEY_HERE"
   ```
4. Save the file

---

## Verification Checklist

After completing above steps, verify:

- [ ] Old key is deleted from Google Cloud Console
- [ ] New API key created with Android restrictions
- [ ] Package name set to: `com.kelvinkbk.xavlinkmonorepo`
- [ ] SHA-1 fingerprint added: `4A:15:95:30:D8:2F:6F:6D:30:89:4F:AB:72:0C:F9:5B:14:1D:47:A6`
- [ ] New key copied to clipboard
- [ ] `google-services.json` updated with new key
- [ ] File saved

---

## Next Steps

After updating `google-services.json`:

```powershell
cd d:\project\xavlink\mobile

# DO NOT COMMIT google-services.json (it's in .gitignore)
# Just rebuild your app with the new credentials

npm install
eas build --platform android
# OR locally:
cd android
./gradlew assembleRelease --no-daemon
```

---

## Troubleshooting

### "SHA-1 Fingerprint is required"

→ You're on the right track! Copy the fingerprint from above and paste it into the field.

### Can't find fingerprint field

→ Make sure you selected **"Android apps"** under Application restrictions.

### New key not working in app

→ Make sure you updated `google-services.json` with the correct new key value.

### Still getting security alert on GitHub

→ After updating, run git-filter-repo to remove old key from history (see Step 2 in main checklist).

---

## Security Notes

✅ This fingerprint is safe to share - it's public information  
✅ The new API key will be restricted to Android apps only  
✅ Only your app package can use this key  
✅ Old key is permanently deleted

**Keep your new key secret - do NOT commit it to git!**

---

## Need the Fingerprints Again?

If you need the fingerprints later, run:

```powershell
keytool -list -v -keystore $env:USERPROFILE\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Look for the **SHA1:** and **SHA256:** fields in the output.
