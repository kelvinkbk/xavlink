# Firebase Push Notifications Setup Guide

## Issue Fixed

The Firebase Cloud Messaging (FCM) initialization error has been partially resolved by:

- ✅ Adding `com.google.gms:google-services` plugin to build configuration
- ✅ Adding Firebase Cloud Messaging dependency
- ⏳ **REMAINING: Replace placeholder google-services.json with your actual credentials**

## Steps to Complete Firebase Setup

### 1. Get Your Google Services JSON from Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your existing project or create a new one: `xavlink`
3. In the left sidebar, go to **Project Settings** (gear icon)
4. Click the **General** tab
5. Scroll down to find your Android app: `com.kelvinkbk.xavlinkmonorepo`
6. If it doesn't exist, click **Add app** > **Android** and follow the setup
7. Download the `google-services.json` file

### 2. Replace the Placeholder File

1. Copy the downloaded `google-services.json`
2. Replace the file at: `mobile/android/app/google-services.json`
   - Located in this project at: `d:\project\xavlink\mobile\android\app\google-services.json`

### 3. Enable Firebase Messaging Services

In Firebase Console:

1. Go to **Build** > **Cloud Messaging**
2. Take note of your **Server API Key** (you'll need this for backend push notifications)
3. Enable **Firebase Cloud Messaging**

### 4. (Optional) Configure FCM in app.json

If you want to add FCM plugin explicitly to your Expo config:

```json
{
  "plugins": [
    [
      "expo-build-properties",
      {
        "android": {
          "enableNetworkModule": true
        }
      }
    ],
    [
      "expo-notifications",
      {
        "icon": "./assets/icon.png",
        "color": "#ffffff"
      }
    ]
  ]
}
```

### 5. Backend Configuration

Make sure your backend has:

- Firebase Server API Key stored in `.env` as `FIREBASE_SERVER_KEY`
- Proper FCM endpoint configured for sending push notifications

## Verification Checklist

- [ ] Downloaded `google-services.json` from Firebase Console
- [ ] Replaced `mobile/android/app/google-services.json` with your credentials
- [ ] Firebase Cloud Messaging is enabled in Firebase Console
- [ ] Backend has Firebase Server API Key configured
- [ ] Rebuilt the Android app with `eas build --platform android` or `npm run android`

## Common Issues & Solutions

### "Default FirebaseApp is not initialized" Error

**Cause**: `google-services.json` is missing or invalid

**Solution**:

1. Verify the file exists at `mobile/android/app/google-services.json`
2. Confirm it's the actual JSON file, not the template
3. Check the package name matches: `com.kelvinkbk.xavlinkmonorepo`

### Still Getting FCM Errors After Setup

1. Clean rebuild: `cd mobile/android && ./gradlew clean`
2. Rebuild the app: `eas build --platform android --clear-cache`
3. Clear cache on physical device or emulator before installing

## Testing Push Notifications

After setup is complete:

1. **In Firebase Console**:
   - Go to **Cloud Messaging** > **Send your first message**
   - Compose test notification
   - Select your device/topic
   - Send and verify notification appears on phone

2. **From Backend**:
   - Use the Firebase Server API with your Server Key
   - Send test push to device/user tokens

## Resources

- [Expo Notifications Documentation](https://docs.expo.dev/push-notifications/)
- [Firebase Cloud Messaging Setup](https://docs.expo.dev/push-notifications/fcm-credentials/)
- [Firebase Console](https://console.firebase.google.com/)
