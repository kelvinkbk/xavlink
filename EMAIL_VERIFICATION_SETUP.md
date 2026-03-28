# Email Verification Setup

## Overview

Email verification has been implemented for both registration and password reset flows in the XavLink application.

---

## 1. Registration Email Verification

### Flow

1. **User Registers**
   - Fill registration form (name, email, password, course, year, bio)
   - Click "Register" button

2. **Account Created (Unverified)**
   - Backend creates account with `emailVerified: false`
   - Verification email sent to user's email address
   - Frontend shows "Check your email" message

3. **User Verifies Email**
   - Click link in email → `/verify-email?token=<VERIFICATION_TOKEN>`
   - VerifyEmail.jsx page processes the token
   - Backend marks `emailVerified: true`
   - User can now login

4. **User Logs In**
   - Enter email and password on Login page
   - Backend checks if email is verified
   - If verified: login successful
   - If not verified: show "Please verify your email first"

### Files Involved

- **Frontend**
  - `web/src/pages/Register.jsx` - Updated to show verification screen after registration
  - `web/src/pages/VerifyEmail.jsx` - Existing page that processes verification token
  - `web/src/pages/Login.jsx` - Validates email verification status

- **Backend**
  - `backend/src/controllers/authController.js` - `register`, `verifyEmail`, `resendVerification`
  - `backend/src/services/emailService.js` - Sends verification emails
  - Database: User model has `emailVerified` boolean field

### Features

✅ Send verification email on registration
✅ Resend verification email option
✅ Token validation (time-limited)
✅ Email not verified check on login
✅ User-friendly verification page

---

## 2. Password Reset Email Verification

### Flow

1. **User Forgets Password**
   - Visit `/forgot-password` page
   - Enter email address

2. **Reset Email Sent**
   - Backend generates reset token (time-limited)
   - Email sent with reset link: `/reset-password?token=<RESET_TOKEN>`
   - Show "Check your email" success message

3. **User Resets Password**
   - Click link in email
   - ResetPassword.jsx page loads with token
   - User enters new password
   - Backend validates token and updates password

4. **Login with New Password**
   - User can now login with new password

### Files Involved

- **Frontend**
  - `web/src/pages/ForgotPassword.jsx` - Sends password reset request
  - `web/src/pages/ResetPassword.jsx` - Exists, handles password reset
  - Mobile: `mobile/src/screens/ForgotPasswordScreen.jsx` & `ResetPasswordScreen.jsx`

- **Backend**
  - `backend/src/controllers/authController.js` - `forgotPassword`, `resetPassword`
  - `backend/src/services/emailService.js` - Sends reset emails
  - Rate limiting on reset attempts (to prevent abuse)

### Features

✅ Secure reset token with expiration
✅ Rate limiting (passwordResetLimiter)
✅ Password validation (6+ characters)
✅ User-friendly reset flow

---

## 3. Email Sending Service

### Current Implementation

The application uses an email service (backend/src/services/emailService.js) to handle:

- Verification emails (registration)
- Password reset emails
- Notification emails

### Configuration

Email service is configured via environment variables:

```
SMTP_host=
SMTP_port=
SMTP_user=
SMTP_password=
SENDER_email=
```

---

## 4. API Endpoints

### Authentication Endpoints

| Method | Endpoint                    | Purpose                      |
| ------ | --------------------------- | ---------------------------- |
| POST   | `/auth/register`            | Register new user            |
| POST   | `/auth/verify-email`        | Verify email with token      |
| POST   | `/auth/resend-verification` | Resend verification email    |
| POST   | `/auth/forgot-password`     | Request password reset       |
| POST   | `/auth/reset-password`      | Reset password with token    |
| POST   | `/auth/login`               | Login (checks emailVerified) |

### Security Features

- ✅ Time-limited tokens (15 min for email verification, varies for password reset)
- ✅ Rate limiting on sensitive endpoints
- ✅ Token is single-use
- ✅ Backend validates all tokens

---

## 5. UI/UX Improvements Made

### Register Page

- ✅ After successful registration, shows verification message instead of auto-login
- ✅ Displays email address where verification was sent
- ✅ "Resend Verification Email" button
- ✅ Shows tips about checking spam folder
- ✅ "Back to Login" button

### Login Page

- ✅ Checks if email is verified before allowing login
- ✅ Shows helpful message if email not verified yet
- ✅ Option to resend verification from login page

### VerifyEmail Page

- ✅ Automatically processes token from email link
- ✅ Shows success/error status
- ✅ Auto-redirects to login on success
- ✅ Displays helpful error messages

### ForgotPassword Page

- ✅ Shows "Check your email" confirmation after submitting
- ✅ User-friendly messages
- ✅ Link back to login

---

## 6. Testing Email Verification

### Test Cases

#### Registration Verification

1. Register new account
2. Check that user cannot login before verification
3. Click verification link in email
4. Verify account shows success message
5. Login with verified account should work

#### Password Reset

1. Login, then logout
2. Click "Forgot Password" on login page
3. Enter email
4. Click reset link in email
5. Set new password
6. Login with new password should work

#### Error Cases

- Expired token → Show error message
- Invalid token → Show error message
- Resend verification → Should receive new email
- Wrong password on reset → Show validation error

---

## 7. Backend Requirements

### Database

User table must have:

```
emailVerified: BOOLEAN (default: false)
emailVerificationToken: STRING (nullable)
emailVerificationExpires: DATETIME (nullable)
passwordResetToken: STRING (nullable)
passwordResetExpires: DATETIME (nullable)
```

### Environment Variables

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-app-password
SENDER_EMAIL=noreply@xavlink.com
EMAIL_VERIFICATION_EXPIRY=900000  // 15 minutes in ms
PASSWORD_RESET_EXPIRY=3600000     // 1 hour in ms
```

---

## 8. Production Checklist

- [ ] Email service configured with proper SMTP settings
- [ ] Email templates are professional and branded
- [ ] Token expiry times are reasonable
- [ ] Rate limiting is enabled on sensitive endpoints
- [ ] Error messages don't leak sensitive information
- [ ] Mobile app updated to use new verification flow
- [ ] Test email sending for all flows
- [ ] Monitor email delivery success rate
- [ ] Set up email bounce handling

---

## 9. Future Enhancements

- [ ] Social login (Google, GitHub) - skip email verification
- [ ] Email verification on profile email change
- [ ] Email notification preferences
- [ ] Custom email templates
- [ ] Email analytics/tracking
- [ ] Two-factor authentication via email
- [ ] Bulk email operations for admins

---

## Summary

✅ **Email verification is now implemented for:**

- Registration (requires email verification before login)
- Password reset (uses email with secure token)

✅ **User flows are intuitive:**

- Clear messaging about what's happening
- Easy resend of verification emails
- Helpful error messages

✅ **Security is maintained:**

- Time-limited tokens
- Rate limiting
- Single-use tokens
- Proper validation

The system is production-ready pending email service configuration.
