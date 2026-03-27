# Firebase Cloud Messaging Integration - Setup Guide

## Overview
The backend and mobile app are now configured to support Firebase push notifications. This guide walks through the remaining steps to complete the integration.

## Implementation Summary

### ✅ Completed Backend Changes

1. **Firebase Configuration** (`backend/src/config/firebase.js`)
   - Initializes Firebase Admin SDK from `FIREBASE_SERVICE_ACCOUNT` environment variable
   - Provides `getMessagingInstance()` for sending notifications
   - Handles initialization errors gracefully

2. **Push Notification Service** (`backend/src/utils/pushNotificationService.js`)
   - `sendPushNotification(userId, title, body, data)` - Send to single user
   - `sendBulkPushNotification(userIds, title, body, data)` - Send to multiple users
   - Automatically removes invalid device tokens
   - Supports Android high-priority notifications

3. **Socket.IO Integration** (`backend/src/server.js`)
   - Added `save_device_token` handler to store device tokens in database
   - Initializes Firebase on startup
   - Device tokens are deduplicated and stored in `User.deviceTokens` array

4. **User Model Update** (`backend/prisma/schema.prisma`)
   - Added `deviceTokens String[] @default([])` field
   - Migration file created: `20260326_add_device_tokens`

### ✅ Completed Mobile Changes

1. **Socket Service** (`mobile/src/services/socket.js`)
   - Sends Expo push token to backend on socket connection
   - Calls `save_device_token` event with userId and token

---

## 🚀 Next Steps: Complete Setup on Render

### Step 1: Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your **xavlink-6182e** project
3. Click **Project Settings** (⚙️ icon)
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key**
6. Save the downloaded JSON file

The file content will look like:
```json
{
  "type": "service_account",
  "project_id": "xavlink-6182e",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "firebase-adminsdk-...@xavlink-6182e.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}
```

### Step 2: Add to Render Environment Variables

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Open **XavLink Backend** service
3. Click **Environment** in the sidebar
4. Add new variable:
   - **Name:** `FIREBASE_SERVICE_ACCOUNT`
   - **Value:** Paste the entire JSON content from Step 1
   
⚠️ **Important:** Copy the ENTIRE JSON as a single line (Render handles the formatting)

5. Click **Save Changes** (backend will auto-redeploy)

### Step 3: Run Database Migration on Render

Once the environment variable is set and backend is deployed:

```bash
cd backend
npm run prisma:migrate:deploy
```

This adds the `deviceTokens` field to all existing User documents.

---

## 📝 Sending Push Notifications from Backend

After setup, use the push notification service in your controllers:

### Single User Notification
```javascript
const { sendPushNotification } = require('../utils/pushNotificationService');

// Send notification
await sendPushNotification(
  userId,
  'New Post from John',
  'John posted: "Check out my new project"',
  {
    type: 'post',
    postId: post.id,
    authorId: post.userId
  }
);
```

### Bulk Notifications
```javascript
const { sendBulkPushNotification } = require('../utils/pushNotificationService');

// Send to multiple users (e.g., all followers)
const followerIds = followers.map(f => f.id);
await sendBulkPushNotification(
  followerIds,
  'New Post from Someone You Follow',
  'Check out their latest post!',
  { type: 'post', postId: post.id }
);
```

---

## 🔄 Integration with Existing Features

### When to Send Notifications

Use the `sendPushNotification` function in your notification-triggering endpoints:

#### Example: New Post Notification
```javascript
// In postController.js
const { sendPushNotification, sendBulkPushNotification } = require('../utils/pushNotificationService');

exports.createPost = async (req, res) => {
  // ... create post logic ...
  
  // Get user's followers
  const followers = await prisma.follow.findMany({
    where: { followingId: userId },
  });
  
  const followerIds = followers.map(f => f.followerId);
  
  // Send push notifications to all followers
  await sendBulkPushNotification(
    followerIds,
    `${user.name} posted`,
    post.content.substring(0, 80),
    {
      type: 'post',
      postId: post.id,
      authorName: user.name
    }
  );
  
  res.json(post);
};
```

#### Example: Message Notification
```javascript
// In messageController.js or via Socket.IO
await sendPushNotification(
  recipientId,
  `Message from ${senderName}`,
  message.text.substring(0, 80),
  {
    type: 'message',
    chatId: chatId,
    senderId: senderId,
    senderName: senderName
  }
);
```

---

## 🧪 Testing Push Notifications

### 1. Test on Mobile App
- Build and run the Android APK
- App will automatically register device token when Socket.IO connects
- Check backend logs for: `✅ Device token saved for user [userId]`

### 2. Test Sending Notifications
Use this Node.js script to test:

```javascript
// test-push.js
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const messaging = admin.messaging();

// Get a test token from your app logs
const testToken = 'YOUR_EXPO_PUSH_TOKEN';

messaging.send({
  notification: {
    title: 'Test Notification',
    body: 'This is a test',
  },
  token: testToken,
}).then(response => {
  console.log('✅ Notification sent:', response);
}).catch(error => {
  console.error('❌ Error sending notification:', error);
});
```

---

## 📊 Monitoring

### Backend Logs
The backend logs show:
```
✅ Push notification sent to user [userId]: X succeeded, Y failed
🗑️ Removed X invalid tokens for user [userId]
📤 Bulk push notification: X/Y users notified
```

### Mobile Logs
The mobile app logs:
```
📱 Device token sent to backend
✅ Local notification sent
```

---

## 🔐 Security Notes

- Firebase credentials are securely stored in Render environment variables
- Device tokens are automatically cleaned up when messages fail
- Each user can have multiple device tokens (multiple devices/accounts)
- Old/invalid tokens are removed automatically

---

## 📚 Additional Resources

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [Expo Notifications Docs](https://docs.expo.dev/notifications/overview/)
- [Render Environment Variables](https://render.com/docs/environment-variables)

---

## ❌ Troubleshooting

### "Firebase not initialized" warning
- ✅ Check `FIREBASE_SERVICE_ACCOUNT` is set in Render
- ✅ Verify JSON is properly formatted (single line in Render UI)
- ✅ Restart backend service after adding environment variable

### Device tokens not saving
- Check mobile app logs for "Device token sent to backend"
- Verify userId is being sent correctly
- Check backend Socket.IO handler logs

### Notifications not arriving
- Verify notification channels are created on Android
- Check Android Settings → Apps → XavLink → Notifications is enabled
- Verify device token is still valid in database

---

## Next Phases

1. **Phase 1** (Current): Basic push notification infrastructure ✅
2. **Phase 2**: Integrate notifications into existing features (posts, messages, follows)
3. **Phase 3**: Add notification preferences/settings UI
4. **Phase 4**: Advanced scheduling and batching
