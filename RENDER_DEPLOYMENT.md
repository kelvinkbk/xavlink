# 🚀 XavLink Backend - Render Deployment Guide

## 📋 Prerequisites

- Render account
- PostgreSQL database created on Render
- GitHub repository connected to Render

---

## 🔧 Step 1: Environment Variables

In your Render Dashboard → Backend Service → Environment:

### Required Environment Variables:

```
DATABASE_URL=postgresql://xavlink_db_user:ozBLR3vdOaJw5bQ9y48zZUqiEKNJ5cbd@dpg-d5durrkhg0os73fho2a0-a/xavlink_db

JWT_SECRET=super_secure_random_string_change_this_in_production

PORT=5000

NODE_ENV=production

FRONTEND_URL=https://your-frontend-url.onrender.com
```

### Optional (for Email Features):

```
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

---

## 🏗️ Step 2: Build & Start Commands

### Build Command:

```bash
npm install && npm run build
```

### Start Command:

```bash
npm start
```

---

## 🧬 Step 3: What Happens During Deployment

1. **Install Dependencies**: `npm install`
2. **Generate Prisma Client**: `npx prisma generate`
3. **Run Migrations**: `npx prisma migrate deploy`
4. **Start Server**: `node src/server.js`

---

## ✅ Verification Steps

After deployment:

1. Check Render logs for successful migration
2. Test API endpoint: `https://your-backend.onrender.com/api/health`
3. Verify database tables in Render PostgreSQL dashboard

---

## 🔍 Troubleshooting

### Migration Errors

```bash
# Manual migration (Render Shell)
npx prisma migrate deploy
```

### Database Connection Issues

- Verify DATABASE_URL is correct (from Render PostgreSQL → Internal Database URL)
- Check if PostgreSQL service is running
- Ensure firewall/network allows connection

### Prisma Client Errors

```bash
# Regenerate Prisma Client
npx prisma generate
```

---

## 📊 Database Schema

The migration will create:

- Users table (with roles: user, moderator, admin)
- Posts, Comments, Likes
- Skills, Reviews, Ratings
- Chat, Messages, Groups
- Notifications, Reports, Audit Logs
- Email verification & 2FA tables

---

## 🔐 Security Notes

1. ✅ Change `JWT_SECRET` to a strong random string
2. ✅ Use Render's Internal Database URL for `DATABASE_URL`
3. ✅ Enable "Auto-Deploy" for automatic updates from GitHub
4. ✅ Set `NODE_ENV=production`

---

## 🎯 Next Steps

1. Deploy frontend (web) to Render/Vercel
2. Update `FRONTEND_URL` in backend environment
3. Test full-stack functionality
4. Seed admin user: `npm run prisma:seed`
