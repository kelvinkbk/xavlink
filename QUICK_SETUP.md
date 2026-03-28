# XavLink - Quick Setup Checklist

## ✅ Pre-Setup Checklist
- [ ] Node.js 16+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] Git installed (`git --version`)
- [ ] PostgreSQL running (or configured in .env)
- [ ] Code editor (VS Code recommended)
- [ ] Terminal/Command prompt ready

---

## 🚀 Step-by-Step Setup (15 minutes)

### Step 1: Clone & Navigate (1 min)
```bash
git clone https://github.com/kelvinkbk/xavlink.git
cd xavlink
```

### Step 2: Backend Setup (5 min)
```bash
cd backend
npm install

# Create .env file with this content:
# PORT=5000
# DATABASE_URL=postgresql://user:password@localhost:5432/xavlink
# JWT_SECRET=your-secret-key-here-min-32-chars-long
# FRONTEND_URL=http://localhost:5173
# Leave EMAIL_PROVIDER empty for development

npm run dev
# ✅ Backend running on http://localhost:5000
```

### Step 3: Web Setup (5 min)
```bash
# In a NEW terminal window
cd web
npm install

# Create .env.local with:
# VITE_API_URL=http://localhost:5000/api

npm run dev
# ✅ Web running on http://localhost:5173
```

### Step 4: Mobile Setup (4 min)
```bash
# In a NEW terminal window
cd mobile
npm install

# Create .env with:
# EXPO_PUBLIC_API_URL=http://localhost:5000/api

npx expo start
# ✅ QR code displayed - scan with Expo Go app
```

---

## 🧪 Test Email Verification (3 min)

### Development Mode
1. Go to `http://localhost:5173/register`
2. Fill in form and click Register
3. Check **backend terminal** - you should see:
   ```
   📧 Email (Development Mode): { to: "your@email.com", subject: "XavLink - Verify Your Email", ... }
   ✅ Verification email sent to your@email.com
   ```
4. Copy token from the verification link shown
5. Visit: `http://localhost:5173/verify-email?token=PASTE_TOKEN_HERE`
6. See success message
7. Now you can login

---

## 📝 Environment Variables Reference

### Backend `.env`
```env
# Required
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/xavlink
JWT_SECRET=your-secret-key-minimum-32-characters-long
FRONTEND_URL=http://localhost:5173

# Optional (leave empty for development)
EMAIL_PROVIDER=
EMAIL_FROM=noreply@xavlink.com

# Optional Cloudinary (for image uploads)
CLOUDINARY_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### Web `.env.local`
```env
VITE_API_URL=http://localhost:5000/api
```

### Mobile `.env`
```env
EXPO_PUBLIC_API_URL=http://localhost:5000/api
```

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 5000 already in use | `lsof -i :5000` then `kill -9 <PID>` or use `PORT=3000 npm run dev` |
| Can't connect to database | Verify PostgreSQL is running and DATABASE_URL is correct |
| `npm install` fails | Delete `node_modules` and `package-lock.json`, then `npm install` again |
| Expo won't scan QR | Make sure phone and laptop are on same WiFi network |
| Email not sending | Check EMAIL_PROVIDER is set correctly in .env (leave empty for dev) |
| Can't login after verification | Check emailVerified is true in database: `SELECT email, emailVerified FROM users;` |

---

## 📂 Folder Structure
```
xavlink/
├── backend/    → API server (Node.js + Express)
├── web/        → Web app (React + Vite)
├── mobile/     → Mobile app (React Native + Expo)
└── docs/       → Documentation
```

---

## 🌐 Access Points

After setup, open these in your browser:

| App | URL | Purpose |
|-----|-----|---------|
| Web App | http://localhost:5173 | Main web interface |
| API | http://localhost:5000 | Backend API server |
| Backend Console | Terminal running `npm run dev` | View logs & emails |

---

## 📧 Email Flows Explained

### Registration & Verification
```
1. User registers at /register
2. Backend creates account with emailVerified = false
3. Verification email sent (logs to console in dev)
4. User clicks link or copies token
5. User verifies email at /verify-email?token=XXX
6. emailVerified = true
7. Can now login
```

### Password Reset
```
1. User clicks "Forgot Password"
2. Enters email at /forgot-password
3. Reset email sent (logs to console in dev)
4. User clicks link or copies token
5. Goes to /reset-password?token=XXX
6. Sets new password
7. Can login with new password
```

---

## 🎯 Features You Can Test

- ✅ Register and verify email
- ✅ Login after verification
- ✅ Reset forgotten password
- ✅ Send/receive messages in real-time
- ✅ Voice message recording & playback
- ✅ Image attachments
- ✅ Message reactions (emoji)
- ✅ Edit & delete messages
- ✅ Read receipts
- ✅ Typing indicators
- ✅ User profiles
- ✅ Follow/unfollow users
- ✅ Skills & endorsements

---

## 🚀 Next: Production Setup

When ready to deploy:

1. **Backend**: Deploy to Render, Railway, or Heroku
2. **Web**: Deploy to Vercel or Netlify
3. **Mobile**: Build APK/IPA with EAS Build
4. **Email**: Change to Gmail/SendGrid/AWS SES credentials
5. **Database**: Use managed PostgreSQL (AWS RDS, Railway, etc)

See SETUP_GUIDE.md for detailed production instructions.

---

## ❓ Questions?

Check these files for more info:
- `SETUP_GUIDE.md` - Complete setup with all options
- `EMAIL_VERIFICATION_SETUP.md` - Email system details
- `EMAIL_VERIFICATION_TESTING.md` - Test scenarios
- `README.md` - Project overview

Keep this checklist handy for quick reference! 🎉
