# Deployment Guide for Backend Fixes

## Overview
This guide covers deploying the backend fixes to resolve the CORS, connectivity, and Cloudinary upload issues affecting the XavLink application.

## Changes Summary

### 1. **CRITICAL FIX**: Cloudinary Package Version Update
- **File**: `backend/package.json`
- **Change**: Upgraded `multer-storage-cloudinary` from `^2.2.1` to `^4.0.0`
- **File**: `backend/src/config/cloudinary.js`
- **Change**: Updated import to use named export: `const { CloudinaryStorage } = require("multer-storage-cloudinary");`
- **Why**: Fixes TypeError that prevented server from starting (cannot read property 'uploader' of undefined)
- **Impact**: File uploads will now work correctly

### 2. CORS Configuration Fix (`backend/src/app.js`)
- Fixed CORS middleware to properly reject unauthorized origins
- Added explicit allowed methods and headers
- Added preflight request caching
- Added debugging logs for origin validation

### 3. Enhanced Startup Diagnostics (`backend/src/server.js`)
- Added database connection test on startup
- Added detailed error logging for startup failures
- Added configuration logging for debugging

## Deployment Steps

### Step 1: Verify Environment Variables on Render.com

Log into your Render.com dashboard and verify these environment variables are set:

```
DATABASE_URL=<Your MongoDB Atlas connection string>
JWT_SECRET=<Your secure JWT secret>
CORS_ORIGIN=https://xavlink.vercel.app
NODE_ENV=production
CLOUDINARY_CLOUD_NAME=<Your Cloudinary cloud name>
CLOUDINARY_API_KEY=<Your Cloudinary API key>
CLOUDINARY_API_SECRET=<Your Cloudinary API secret>
```

**Important**: Make sure `DATABASE_URL` points to a valid MongoDB Atlas cluster.

### Step 2: Deploy to Render.com

1. Commit the changes:
   ```bash
   git add backend/package.json backend/src/config/cloudinary.js backend/src/app.js backend/src/server.js
   git commit -m "Fix Cloudinary package incompatibility, CORS configuration, and add startup diagnostics"
   ```

2. Push to your repository:
   ```bash
   git push origin main
   ```

3. Render.com will automatically deploy the changes (if auto-deploy is enabled)
   - Otherwise, manually trigger a deploy from the Render dashboard

### Step 3: Monitor Deployment

1. **Check Render Logs**:
   - Look for: `🔍 Testing database connection...`
   - Should see: `✅ Database connected successfully (X users)`
   - Should see: `🚀 XavLink backend running on port 5000`

2. **If deployment fails**, check logs for:
   - Database connection errors
   - Missing environment variables
   - Prisma schema issues

### Step 4: Test Connectivity

1. **Test Health Endpoint**:
   ```bash
   curl https://xavlink-backend.onrender.com/health
   ```
   Should return:
   ```json
   {
     "status": "ok",
     "service": "xavlink-backend",
     "database": "connected"
   }
   ```

2. **Test CORS**:
   ```bash
   curl -H "Origin: https://xavlink.vercel.app" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: Content-Type" \
        -X OPTIONS \
        https://xavlink-backend.onrender.com/api/auth/login
   ```
   Should include `Access-Control-Allow-Origin` header in response

3. **Test Frontend**: Visit https://xavlink.vercel.app and check:
   - Socket.io connection succeeds
   - No CORS errors in browser console
   - API calls work correctly

## Troubleshooting

### Issue: Server Crashes with Cloudinary Error

**Symptoms**:
- Server crashes immediately after startup
- Error: `TypeError: Cannot read properties of undefined (reading 'uploader')`
- Error mentions `multer-storage-cloudinary/lib/index.js`

**Root Cause**: Package version incompatibility between cloudinary v2.x and multer-storage-cloudinary v2.x

**Solution**: 
1. Ensure `package.json` has `multer-storage-cloudinary": "^4.0.0"`
2. Ensure `cloudinary.js` uses: `const { CloudinaryStorage } = require("multer-storage-cloudinary");`
3. Run `npm install` to update dependencies
4. Redeploy to Render.com

### Issue: Database Connection Fails

**Symptoms**: 
- Logs show: `❌ Failed to start server`
- Error mentions DATABASE_URL or connection timeout

**Solutions**:
1. Verify MongoDB Atlas cluster is running
2. Check DATABASE_URL format: `mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority`
3. Verify MongoDB Atlas IP whitelist (should allow all IPs: `0.0.0.0/0`)
4. Check if MongoDB credentials are correct

### Issue: CORS Errors Persist

**Symptoms**:
- Browser shows: "No 'Access-Control-Allow-Origin' header"
- Backend logs show: `⚠️ CORS origin rejected`

**Solutions**:
1. Verify `CORS_ORIGIN` environment variable is set correctly
2. Check that frontend origin matches exactly (no trailing slash)
3. Clear browser cache
4. Check Render logs to see which origin is being rejected

### Issue: 502/503 Errors (Cold Start)

**Symptoms**:
- First request after inactivity returns 502/503
- Subsequent requests work fine

**Solutions**:
1. This is expected on Render.com free tier (15min spin-down)
2. Options:
   - Upgrade to paid Render tier ($7/month)
   - Set up a keep-alive service (ping every 10 minutes)
   - Add user-facing "Starting server..." message
   - Accept 30-60 second cold start delay

### Issue: WebSocket/Socket.io Fails

**Symptoms**:
- Socket.io shows "xhr poll error"
- Real-time features don't work

**Solutions**:
1. Current config uses polling-only (required for Render.com)
2. Verify Socket.io CORS is allowing frontend origin
3. Check firewall/proxy settings if using custom domain

## Post-Deployment Checklist

- [ ] Backend health endpoint returns `"status": "ok"`
- [ ] Frontend connects to Socket.io successfully
- [ ] No CORS errors in browser console
- [ ] File uploads work
- [ ] Chat/messaging features work
- [ ] Notifications are received
- [ ] Monitor for 24 hours to ensure stability

## Rollback Plan

If deployment causes issues:

1. Revert commits:
   ```bash
   git revert HEAD
   git push origin main
   ```

2. Or manually rollback in Render dashboard:
   - Go to "Deploys" tab
   - Click on previous successful deploy
   - Select "Redeploy"

## Additional Resources

- [Render CORS Documentation](https://render.com/docs/cors)
- [Socket.io CORS Guide](https://socket.io/docs/v4/handling-cors/)
- [MongoDB Atlas IP Whitelist](https://docs.atlas.mongodb.com/security/ip-access-list/)
