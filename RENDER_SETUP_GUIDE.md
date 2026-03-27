# Render Environment Variables Setup Guide

## Why `.env` File Exists Locally But Not On Render

- **Local Development**: `.env` file loads environment variables when running backend locally
- **Render Production**: Environment variables are configured in Render's dashboard (not from the repo)
- **Security**: `.env` is in `.gitignore` and never committed to GitHub

## Steps to Configure VAPID Keys on Render

### 1. Log into Render Dashboard
- Go to https://dashboard.render.com
- Select your backend service (xavlink-backend)

### 2. Navigate to Environment Variables
- Click on your service
- Go to **Settings** → **Environment**
- Scroll to "Environment Variables" section

### 3. Add Web Push Variables
Click "Add Environment Variable" for each:

| Key | Value |
|-----|-------|
| `VAPID_PUBLIC_KEY` | `BDfVIjnra5oYREaTmfxe7oj5P0E_PAEx1RJ6yLAG-K7a6VvG82OqPNWaQsm1gVKiQID1Z0YUGyeCPj_iSgx3QXY` |
| `VAPID_PRIVATE_KEY` | `5u52dN0d6pSl6cYUFQwkvQ-xWjgTFGkzml-O18bufIM` |
| `VAPID_SUBJECT` | `mailto:support@xavlink.com` |

### 4. Verify Other Variables (if missing)
Ensure these are also set:
- `DATABASE_URL` - Your PostgreSQL connection string
- `JWT_SECRET` - Your JWT secret key
- `NODE_ENV` - Set to `production`
- `CORS_ORIGIN` - Include your web app URL
- `FRONTEND_URL` - Your web app URL
- `CLOUDINARY_*` - Cloud storage credentials (if using)

### 5. Save and Redeploy
- Click "Save" on environment variables
- Render will automatically redeploy with the new variables
- Wait for deployment to complete (~2-3 minutes)
- Check deployment logs to confirm success

## Testing Push Notifications After Deployment

1. **Mobile**: Open app and send/receive messages - should see push notifications
2. **Web**: Enable notifications in browser - should see push notifications when message received
3. **Backend Logs**: Check Render logs to see "📤 Push notification sent" messages

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Web Push not configured" | VAPID keys not in Render environment |
| Notifications not appearing | Check notification permissions in browser/phone settings |
| 500 error on `/notifications/vapid-key` | `VAPID_PUBLIC_KEY` not set in Render |
| Subscriptions not saving | Check `webPushService.js` is deployed (git push committed) |

## Local Development (If Needed)

If running backend locally:
- The local `.env` file will be loaded automatically
- VAPID keys in local `.env` will be used for testing
- Changes to `.env` require backend restart

---

**Status**: Web push notifications fully implemented and ready for production deployment
