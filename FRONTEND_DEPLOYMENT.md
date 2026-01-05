# 🌐 XavLink Frontend - Deployment Guide

## 📦 Web App (React + Vite)

### ✅ Already Configured
Your `web/src/services/api.js` is already set up correctly:
```javascript
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
```

---

## 🚀 Deploy to Vercel

### Step 1: Connect GitHub Repository
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import `kelvinkbk/xavlink`
4. Select **Root Directory**: `web`

### Step 2: Configure Build Settings
- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Step 3: Add Environment Variable
In Vercel Project Settings → Environment Variables:

```
VITE_API_URL=https://xavlink-backend.onrender.com/api
```

⚠️ **Important:**
- Variable name MUST start with `VITE_`
- NO trailing slash after `/api`
- Use your actual Render backend URL

### Step 4: Deploy
Click "Deploy" and wait for build to complete.

---

## 🚀 Alternative: Deploy to Netlify

### Step 1: Connect Repository
1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Select GitHub → `kelvinkbk/xavlink`

### Step 2: Build Settings
- **Base directory**: `web`
- **Build command**: `npm run build`
- **Publish directory**: `web/dist`

### Step 3: Environment Variables
In Site settings → Environment variables:

```
VITE_API_URL=https://xavlink-backend.onrender.com/api
```

### Step 4: Deploy
Click "Deploy site"

---

## 📱 Mobile App (React Native Expo)

### ✅ Already Configured
Your `mobile/src/services/api.js` auto-detects the API URL:
1. Reads `EXPO_PUBLIC_API_URL` from `.env`
2. Auto-detects from Expo dev server (LAN)
3. Handles Android emulator (`10.0.2.2`)

---

## 🧪 Development Setup

### Web (Local)
```bash
cd web
npm install
npm run dev
```

### Mobile (Expo Go)
```bash
cd mobile
npm install
npx expo start
```

**For production API during development:**

Update `web/.env`:
```
VITE_API_URL=https://xavlink-backend.onrender.com/api
```

Update `mobile/.env`:
```
EXPO_PUBLIC_API_URL=https://xavlink-backend.onrender.com/api
```

---

## 🔐 CORS Configuration

Make sure your backend `.env` has the correct frontend URL:

```env
FRONTEND_URL=https://your-frontend.vercel.app
```

Update `backend/src/app.js` CORS to allow your frontend domain.

---

## ✅ Verification Checklist

After deployment:

- [ ] Web app loads successfully
- [ ] Login/Register works
- [ ] API calls succeed (check Network tab)
- [ ] No CORS errors in console
- [ ] Mobile app connects to production API

---

## 🔍 Troubleshooting

### "Network Error" or "Failed to fetch"
- Check `VITE_API_URL` is set correctly in Vercel/Netlify
- Verify backend is running on Render
- Check browser console for CORS errors

### CORS Errors
- Update `FRONTEND_URL` in backend `.env`
- Redeploy backend after updating CORS settings

### Mobile Can't Connect
- For local dev: Use ngrok or LAN IP
- For production: Set `EXPO_PUBLIC_API_URL` in `mobile/.env`
- Rebuild with `npx expo start --clear`

---

## 🎯 Production URLs Example

- **Backend**: `https://xavlink-backend.onrender.com`
- **Web Frontend**: `https://xavlink.vercel.app`
- **API Endpoint**: `https://xavlink-backend.onrender.com/api`

---

## 📊 Environment Variables Summary

| Platform | Variable | Value |
|----------|----------|-------|
| Vercel/Netlify | `VITE_API_URL` | `https://xavlink-backend.onrender.com/api` |
| Render (Backend) | `FRONTEND_URL` | `https://xavlink.vercel.app` |
| Mobile (Expo) | `EXPO_PUBLIC_API_URL` | Auto-detects or set manually |
