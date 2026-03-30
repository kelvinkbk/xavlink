# Email Verification Setup - Complete Guide

**Project:** XavLink  
**Last Updated:** March 30, 2026  
**Status:** Production Ready

---

## 📋 Table of Contents

1. [Backend Setup](#backend-setup)
2. [Frontend Setup](#frontend-setup)
3. [Testing](#testing)
4. [Production Config](#production-config)

---

## Backend Setup

### Step 1: Update Environment Variables

Edit `backend/.env`:

```env
# Email Configuration
EMAIL_PROVIDER=gmail          # Options: gmail, sendgrid, mailgun, smtp
EMAIL_FROM=your-email@gmail.com
EMAIL_PASSWORD=your-app-password  # Use app-specific password for Gmail
FRONTEND_URL=http://localhost:5173  # URL where verification link is sent

# For Development (Console Emails)
# Leave EMAIL_PROVIDER empty or unset for console logging
```

### Step 2: Verify Backend Controller

Check `backend/src/controllers/authController.js` has email functions:

```javascript
// Should include:
1. sendVerificationEmail() - Sends email with verification link
2. verifyEmail() - Marks user as verified
3. resendVerificationEmail() - Resends verification link
4. forgotPassword() - Sends password reset email
```

### Step 3: Update Database Schema

Ensure your User table has these fields (Prisma):

```prisma
model User {
  id                    String   @id @default(cuid())
  email                 String   @unique
  emailVerified         Boolean  @default(false)
  emailVerificationToken String?
  emailVerificationTokenExpiry DateTime?
  passwordResetToken    String?
  passwordResetTokenExpiry DateTime?
  // ... other fields
}
```

Run migration if needed:

```bash
cd backend
npx prisma migrate dev --name add_email_verification
```

### Step 4: Test Backend Email Sending

```bash
cd backend
npm run dev
```

Test endpoint in Postman or curl:

```bash
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Password123!",
  "name": "Test User"
}
```

**Response:** Should see in console (development):

```
📧 Email (Development Mode): {
  to: "test@example.com",
  subject: "XavLink - Verify Your Email",
  token: "xxx..."
}
```

---

## Frontend Setup

### Step 1: Create Register Page

File: `web/src/pages/Register.jsx`

```jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("✅ Check your email to verify your account!");
        setTimeout(() => navigate("/verify-email"), 2000);
      } else {
        setMessage(`❌ ${data.message || "Registration failed"}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: "500px", margin: "50px auto" }}>
      <h1>Register</h1>
      <form onSubmit={handleRegister}>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "10px",
            backgroundColor: "#007AFF",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          {loading ? "Registering..." : "Register"}
        </button>
      </form>
      {message && <p style={{ marginTop: "10px" }}>{message}</p>}
    </div>
  );
}
```

### Step 2: Create Email Verification Page

File: `web/src/pages/VerifyEmail.jsx`

```jsx
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function VerifyEmail() {
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check if token is in URL
    const urlToken = searchParams.get("token");
    if (urlToken) {
      setToken(urlToken);
      verifyEmail(urlToken);
    }
  }, [searchParams]);

  const verifyEmail = async (verificationToken) => {
    setLoading(true);
    try {
      const res = await fetch(
        `http://localhost:5000/api/auth/verify-email?token=${verificationToken}`,
        { method: "GET" },
      );

      const data = await res.json();

      if (res.ok) {
        setMessage("✅ Email verified successfully! Redirecting to login...");
        setTimeout(() => navigate("/login"), 2000);
      } else {
        setMessage(`❌ ${data.message || "Verification failed"}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    }
    setLoading(false);
  };

  const handleManualVerify = async (e) => {
    e.preventDefault();
    if (!token) {
      setMessage("❌ Please enter the verification token");
      return;
    }
    verifyEmail(token);
  };

  return (
    <div
      style={{ maxWidth: "500px", margin: "50px auto", textAlign: "center" }}
    >
      <h1>Verify Your Email</h1>

      {!searchParams.get("token") && (
        <form onSubmit={handleManualVerify}>
          <p>If you didn't receive the email, paste the token here:</p>
          <input
            type="text"
            placeholder="Paste verification token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              marginBottom: "10px",
              boxSizing: "border-box",
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px",
              backgroundColor: "#007AFF",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            {loading ? "Verifying..." : "Verify"}
          </button>
        </form>
      )}

      {message && (
        <p
          style={{
            marginTop: "20px",
            padding: "10px",
            backgroundColor: message.includes("✅") ? "#e8f5e9" : "#ffebee",
            color: message.includes("✅") ? "#2e7d32" : "#c62828",
            borderRadius: "5px",
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
```

### Step 3: Add Routes

File: `web/src/App.jsx`

```jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import Login from "./pages/Login";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/login" element={<Login />} />
        {/* Other routes */}
      </Routes>
    </BrowserRouter>
  );
}
```

---

## Testing

### Test Scenario 1: Development Mode (Console)

1. **Start Backend:**

   ```bash
   cd backend
   npm run dev
   ```

2. **Register User:**
   - Go to: http://localhost:5173/register
   - Fill: name, email, password
   - Click Register

3. **Check Console:**
   - Look in backend terminal
   - You'll see:

   ```
   📧 Email (Development Mode): {
     to: "test@example.com",
     subject: "XavLink - Verify Your Email",
     token: "eyJhbGc..."
   }
   ```

4. **Copy Token:**
   - Copy the full token string

5. **Verify Email:**
   - Go to: http://localhost:5173/verify-email
   - Paste token
   - Click Verify
   - See success message

---

### Test Scenario 2: With Gmail

#### A. Setup Gmail App Password

1. Go to: https://myaccount.google.com/security
2. Enable **2-Step Verification**
3. Go to **App Passwords**
4. Generate password for "Mail" and "Windows"
5. Copy the 16-character password

#### B. Update .env

```env
EMAIL_PROVIDER=gmail
EMAIL_FROM=your-email@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx  # The 16-char password
FRONTEND_URL=http://localhost:5173
```

#### C. Test Email Sending

1. Register account
2. Check email inbox
3. Click link in email
4. Should verify automatically

---

### Test Scenario 3: Email Reset Password

#### Add Forgot Password Page

File: `web/src/pages/ForgotPassword.jsx`

```jsx
import { useState } from "react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(
        "http://localhost:5000/api/auth/forgot-password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        },
      );

      const data = await res.json();

      if (res.ok) {
        setMessage("✅ Check your email for password reset link");
        setEmail("");
      } else {
        setMessage(`❌ ${data.message}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    }

    setLoading(false);
  };

  return (
    <div style={{ maxWidth: "500px", margin: "50px auto" }}>
      <h1>Reset Password</h1>
      <form onSubmit={handleForgotPassword}>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "10px",
            backgroundColor: "#007AFF",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>
      {message && <p style={{ marginTop: "10px" }}>{message}</p>}
    </div>
  );
}
```

---

## Production Config

### Step 1: Use SendGrid (Recommended)

Sign up: https://sendgrid.com

```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

### Step 2: Update Backend Email Service

File: `backend/src/services/emailService.js`

```javascript
const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendEmail(to, subject, html) {
  try {
    const msg = {
      to,
      from: process.env.EMAIL_FROM,
      subject,
      html,
    };

    await sgMail.send(msg);
    console.log(`✅ Email sent to ${to}`);
  } catch (error) {
    console.error("❌ Email send failed:", error);
    throw error;
  }
}

module.exports = { sendEmail };
```

### Step 3: Set Frontend URL

```env
# For Production
FRONTEND_URL=https://yourdomain.com
```

---

## Troubleshooting

| Problem           | Solution                                     |
| ----------------- | -------------------------------------------- |
| Email not sending | Check EMAIL_PROVIDER and credentials in .env |
| Link not in email | Check FRONTEND_URL is correct                |
| Token expired     | Set expiry to 24 hours in controller         |
| Gmail blocked     | Use app-specific password, enable 2FA        |
| Email marked spam | Use SendGrid, add SPF/DKIM records           |

---

## Complete Checklist

### Backend

- [ ] Environment variables configured (.env)
- [ ] Email service implemented
- [ ] User model has email fields
- [ ] API endpoints working (/register, /verify-email, /forgot-password)
- [ ] Emails sending in development (check console)

### Frontend

- [ ] Register page created
- [ ] VerifyEmail page created
- [ ] Routes added
- [ ] Can handle URL tokens
- [ ] Can accept manual tokens

### Testing

- [ ] Test registration flow
- [ ] Test email verification
- [ ] Test password reset
- [ ] Test with real email (Optional)

### Production

- [ ] Use production email service (SendGrid)
- [ ] Update FRONTEND_URL to production domain
- [ ] Add SPF/DKIM records to domain
- [ ] Test complete flow in staging

---

## Email Templates

### Verification Email

```html
<h2>Welcome to XavLink!</h2>
<p>Click the link below to verify your email:</p>
<a href="${FRONTEND_URL}/verify-email?token=${token}">Verify Email</a>
<p>Or copy this token: ${token}</p>
<p>This link expires in 24 hours.</p>
```

### Password Reset Email

```html
<h2>Reset Your Password</h2>
<p>Click the link below to reset your password:</p>
<a href="${FRONTEND_URL}/reset-password?token=${token}">Reset Password</a>
<p>Or copy this token: ${token}</p>
<p>This link expires in 1 hour.</p>
```

---

## Summary

✅ **Setup Complete When:**

1. Backend emails send to console (dev)
2. Frontend registers users
3. Verification page works with tokens
4. Users can verify and login
5. Password reset works
6. (Optional) Real emails working with SendGrid

**Time to Complete:** ~30-45 minutes

---

**Questions?** Check your backend logs and browser console for error messages!
