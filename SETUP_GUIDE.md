# XavLink - Complete Setup Guide

## Table of Contents

1. [Quick Start (Development)](#quick-start)
2. [Backend Setup](#backend-setup)
3. [Web Setup](#web-setup)
4. [Mobile Setup](#mobile-setup)
5. [Email Configuration](#email-configuration)
6. [Database Setup](#database-setup)
7. [Production Deployment](#production-deployment)

---

## Quick Start

### Prerequisites

- Node.js 16+
- npm or yarn
- Git
- Android Studio (for mobile)
- Expo CLI (for mobile): `npm install -g expo-cli`
- PostgreSQL or MongoDB (depending on your setup)

### 1. Clone Repository

```bash
git clone https://github.com/kelvinkbk/xavlink.git
cd xavlink
```

---

## Backend Setup

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

### Step 2: Environment Variables

Create `.env` file in backend directory:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/xavlink
# OR for MongoDB:
# MONGO_URI=mongodb://localhost:27017/xavlink

# JWT
JWT_SECRET=your-secret-key-here-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key-min-32-chars
JWT_EXPIRES_IN=7d

# Frontend URLs
FRONTEND_URL=http://localhost:5173
RENDER_URL=https://yourapp.onrender.com

# Email Configuration (Important!)
EMAIL_PROVIDER=  # Leave empty for development (logs to console)
# EMAIL_PROVIDER=gmail  # For production with Gmail
# EMAIL_USER=your-email@gmail.com
# EMAIL_PASSWORD=your-app-specific-password
# OR for custom SMTP:
# EMAIL_PROVIDER=smtp
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_USER=your-user
# SMTP_PASSWORD=your-password
# SMTP_SECURE=false

EMAIL_FROM=noreply@xavlink.com

# Cloudinary (for image uploads)
CLOUDINARY_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Optional: Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Optional: Two-Factor Auth
TOTP_WINDOW=2
```

### Step 3: Database Setup

#### PostgreSQL

```bash
# Create database
createdb xavlink

# Run migrations (if using Prisma)
npx prisma migrate deploy

# Seed database (optional)
npm run seed
```

#### MongoDB

```bash
# MongoDB should be running on localhost:27017
# Or update MONGO_URI in .env
```

### Step 4: Start Backend

```bash
# Development
npm run dev

# Production
npm run start
```

Backend will run on `http://localhost:5000`

---

## Web Setup

### Step 1: Install Dependencies

```bash
cd web
npm install
```

### Step 2: Environment Variables

Create `.env.local` file in web directory:

```env
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=XavLink
VITE_APP_VERSION=1.0.0
```

### Step 3: Start Development Server

```bash
npm run dev
```

Web app will run on `http://localhost:5173`

### Build for Production

```bash
npm run build
npm run preview
```

---

## Mobile Setup

### Step 1: Install Dependencies

```bash
cd mobile
npm install

# For iOS (macOS only)
cd ios && pod install && cd ..
```

### Step 2: Environment Variables

Create `.env` file in mobile directory:

```env
EXPO_PUBLIC_API_URL=http://localhost:5000/api
EXPO_PUBLIC_NGROK_URL=  # Leave empty for local development
NODE_ENV=development
```

### Step 3: Run on Device/Emulator

#### Android

```bash
# Start Expo
npx expo start

# In another terminal, press 'a' to open Android
# Or build APK:
cd android
./gradlew assembleRelease
```

#### iOS (macOS)

```bash
npx expo start
# Press 'i' to open iOS simulator
```

#### Expo Go (Easiest for Testing)

```bash
npx expo start
# Scan QR code with Expo Go app on your phone
```

---

## Email Configuration

### Development Mode (Recommended for Testing)

```env
# Leave EMAIL_PROVIDER empty or remove it
# Emails will log to console instead of sending
```

Check server logs for verification emails and password reset links:

```
📧 Email (Development Mode): { to: "user@example.com", subject: "...", ... }
✅ Verification email sent to user@example.com
```

### Production with Gmail

#### 1. Enable 2-Step Verification

- Go to: https://myaccount.google.com/security
- Enable "2-Step Verification"

#### 2. Generate App Password

- Go to: https://myaccount.google.com/apppasswords
- Select "Mail" and "Windows Computer"
- Copy the generated 16-character password

#### 3. Update .env

```env
EMAIL_PROVIDER=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=xxxxxxxx xxxxxxxx  # 16-char password from step 2
EMAIL_FROM=XavLink <noreply@xavlink.com>
FRONTEND_URL=https://yourdomain.com
```

### Production with SendGrid

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.your-sendgrid-api-key
EMAIL_FROM=noreply@yourdomain.com
```

### Production with AWS SES

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=email-smtp.region.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASSWORD=your-smtp-password
EMAIL_FROM=noreply@yourdomain.com
```

---

## Database Setup

### Prisma (Recommended)

#### 1. Initialize Prisma

```bash
cd backend
npx prisma init
```

#### 2. Update DATABASE_URL in .env

```env
DATABASE_URL="postgresql://user:password@localhost:5432/xavlink"
```

#### 3. Create Schema

Schema should have:

```prisma
model User {
  id String @id @default(cuid())
  email String @unique
  emailVerified Boolean @default(false)
  verificationToken String?
  verificationTokenExpiry DateTime?
  resetToken String?
  resetTokenExpiry DateTime?
  // ... other fields
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

#### 4. Run Migrations

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### Database Tables Needed

#### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,

  -- Email verification
  emailVerified BOOLEAN DEFAULT false,
  verificationToken VARCHAR(255),
  verificationTokenExpiry TIMESTAMP,

  -- Password reset
  resetToken VARCHAR(255),
  resetTokenExpiry TIMESTAMP,

  -- Profile
  profilePic VARCHAR(255),
  bio TEXT,
  course VARCHAR(255),
  year INTEGER,

  -- Account
  role VARCHAR(50) DEFAULT 'user',
  isSuspended BOOLEAN DEFAULT false,
  twoFactorEnabled BOOLEAN DEFAULT false,
  twoFactorSecret VARCHAR(255),

  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_verificationToken ON users(verificationToken);
CREATE INDEX idx_users_resetToken ON users(resetToken);
```

---

## Verify Installation

### Backend Check

```bash
curl http://localhost:5000/api/health
# Should return: { "status": "ok" }
```

### Web Check

Open browser: `http://localhost:5173`
Should see login page

### Mobile Check

```bash
npx expo start
# Should show QR code to scan
```

### Email Check (Development)

1. Register at `http://localhost:5173/register`
2. Check server console for verification email
3. Copy token from console output
4. Visit: `http://localhost:5173/verify-email?token=<COPIED_TOKEN>`
5. Should see success message

---

## Common Issues

### Port Already in Use

```bash
# Find process using port 5000
lsof -i :5000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3000 npm run dev
```

### Database Connection Error

```bash
# Check PostgreSQL is running
psql -U postgres -d xavlink

# Or check MongoDB
mongo
```

### Email Not Sending

```bash
# Check EMAIL_PROVIDER is set correctly
echo $EMAIL_PROVIDER

# Verify credentials in .env
# Check server logs for error messages
```

### Mobile Won't Connect

```bash
# Make sure device is on same network as dev machine
# Update EXPO_PUBLIC_API_URL to your machine IP:
# EXPO_PUBLIC_API_URL=http://192.168.x.x:5000/api

# Or use ngrok for tunneling
ngrok http 5000
# Update EXPO_PUBLIC_NGROK_URL=https://xxxx.ngrok.io/api
```

### Prisma Issues

```bash
# Reset database (warning: deletes data)
npx prisma migrate reset

# Generate Prisma client
npx prisma generate

# View database
npx prisma studio
```

---

## Development Workflow

### 1. Start Backend

```bash
cd backend
npm run dev
```

### 2. Start Web (in another terminal)

```bash
cd web
npm run dev
```

### 3. Start Mobile (in another terminal)

```bash
cd mobile
npx expo start
# Press 'w' for web, 'a' for Android, 'i' for iOS
```

### 4. Test Email Verification

#### Web

1. Go to `http://localhost:5173/register`
2. Fill form and submit
3. Check console for verification link
4. Copy token and paste: `http://localhost:5173/verify-email?token=XXX`
5. Login after verification

#### Mobile

1. Open app on device/emulator
2. Register account
3. See VerifyEmailScreen
4. Check backend console for verification code
5. Enter code in app

---

## Production Deployment

### Backend (Render.com Example)

```bash
# Push to GitHub
git push origin main

# Connect to Render:
# 1. Go to https://render.com
# 2. Create New Web Service
# 3. Connect GitHub repo
# 4. Set environment variables (.env)
# 5. Deploy
```

### Web (Vercel/Netlify)

```bash
# Vercel
npm i -g vercel
vercel

# Or Netlify
# Connect GitHub repo to Netlify dashboard
# Set environment variables
# Auto-deploys on push to main
```

### Mobile (EAS Build)

```bash
# Install EAS CLI
npm install -g eas-cli

# Build APK for production
eas build --platform android --type apk

# Build IPA for iOS
eas build --platform ios --type ipa
```

---

## Next Steps After Setup

1. **Configure Email Service**
   - Set up Gmail App Password OR
   - Configure SendGrid/AWS SES credentials

2. **Test Email Flows**
   - Register and verify email
   - Test forgot password
   - Check email templates look good

3. **Set Up Database Backups**
   - Configure automated backups
   - Test restore process

4. **Configure Cloudinary**
   - Get API credentials
   - Test image uploads

5. **Set Up Monitoring**
   - Configure error logging (Sentry)
   - Set up uptime monitoring
   - Configure email alerts

---

## Useful Commands

### Backend

```bash
npm run dev       # Development
npm run start     # Production
npm run seed      # Seed database
npm run migrate   # Run migrations
npm test          # Run tests
npm run lint      # Check code
```

### Web

```bash
npm run dev       # Development
npm run build     # Build for production
npm run preview   # Preview production build
npm run lint      # Check code
```

### Mobile

```bash
npx expo start              # Start dev server
npx expo start --web        # Web version
./gradlew assembleRelease   # Build APK
cd ios && pod install       # Install iOS deps
```

---

## Support & Troubleshooting

If you encounter issues:

1. Check server logs for error messages
2. Verify all environment variables are set
3. Check database connection
4. Ensure ports 5000, 5173, and 19000 are available
5. Clear cache: `rm -rf node_modules && npm install`
6. Check GitHub Issues for similar problems

---

## Architecture Overview

```
xavlink/
├── backend/           # Express.js + Prisma
│   ├── src/
│   │   ├── controllers/   # Business logic
│   │   ├── services/      # Email, auth, etc
│   │   ├── routes/        # API endpoints
│   │   ├── middleware/    # Auth, error handling
│   │   └── config/        # Database config
│   └── .env              # Environment variables
│
├── web/               # React + Vite
│   ├── src/
│   │   ├── pages/        # Page components
│   │   ├── components/   # Reusable components
│   │   ├── services/     # API calls
│   │   └── context/      # State management
│   └── .env.local        # Environment variables
│
├── mobile/            # React Native + Expo
│   ├── src/
│   │   ├── screens/      # Screen components
│   │   ├── services/     # API calls
│   │   ├── context/      # State management
│   │   └── navigation/   # Navigation stack
│   ├── android/          # Android native
│   ├── ios/              # iOS native
│   └── .env              # Environment variables
│
└── README.md
```

---

## You're All Set! 🚀

Once you've completed these steps:
✅ Backend running on port 5000
✅ Web app running on port 5173
✅ Mobile app running via Expo
✅ Email verification working
✅ Password reset working

Start building with XavLink!
