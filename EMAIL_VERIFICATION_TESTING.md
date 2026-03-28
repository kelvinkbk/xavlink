# Email Verification & Password Reset - Testing Guide

## Quick Start

### 1. Register a New Account

**Web (http://localhost:5173/register)**

1. Fill in registration form:
   - Name
   - Email
   - Password (6+ characters)
   - Course
   - Year
   - Bio (optional)
2. Click "Register"
3. See "Check your email for verification" message

**Mobile (RegisterScreen)**

1. Fill in registration form
2. Click "Register"
3. Navigate to VerifyEmailScreen

### 2. Verify Email

**Via Email Link (Production)**

- Check your email for "XavLink - Verify Your Email" message
- Click the "Verify Email" button or copy the link
- Browser redirects to `/verify-email?token=<TOKEN>`
- Page shows success → auto-redirect to login

**Development Mode (Console)**

- Check server console or email logs
- Look for verification link in output
- Copy token from link manually

### 3. Login with Verified Account

1. Go to `/login`
2. Enter email and password
3. Login succeeds if email is verified
4. If email not verified: "Email not verified" message appears
5. Click "Resend Verification" to get new email

### 4. Password Reset

**Step 1: Request Reset**

1. Go to `/forgot-password`
2. Enter email address
3. See "Check your email" confirmation

**Step 2: Reset Password**

1. Check email for "XavLink - Password Reset Request"
2. Click "Reset Password" button
3. Enter new password (6+ characters)
4. Confirm password
5. Submit form
6. See success message
7. Redirected to login
8. Login with new password

---

## Testing Scenarios

### Scenario 1: Successful Registration Flow

```
1. Register with new email
   ✓ Account created (emailVerified: false)
   ✓ Verification email sent
   ✓ Can see verification screen

2. Click verification link
   ✓ Email marked as verified (emailVerified: true)
   ✓ Token cleared
   ✓ Auto-redirect to login

3. Login
   ✓ Email verification check passes
   ✓ Login successful
   ✓ Can access dashboard
```

### Scenario 2: Login Before Verification

```
1. Register account (don't verify)
2. Try to login
   ✗ Error: "Email not verified"
   ✓ New verification email sent
   ✓ Option to resend visible

3. Verify email
   ✓ Now can login successfully
```

### Scenario 3: Password Reset Flow

```
1. Click "Forgot Password"
2. Enter email
   ✓ Email sent with reset link
   ✓ Success message shows

3. Click email link
   ✓ ResetPassword page loads with token

4. Enter new password
   ✓ Password validation works (6+ chars)
   ✓ Fill confirm password

5. Submit
   ✓ Password updated
   ✓ Token cleared
   ✓ Redirect to login

6. Login with new password
   ✓ Success with new password
   ✓ Old password no longer works
```

### Scenario 4: Token Expiration

```
1. Register account
2. Wait 24+ hours (or modify DB to expire token)
3. Try to click old verification link
   ✗ Error: "Invalid or expired token"
   ✓ Option to resend

4. Click "Resend Verification"
   ✓ Get new token (24 hours from now)
   ✓ Can verify with new link
```

### Scenario 5: Password Reset Token Expiration

```
1. Request password reset
2. Wait 1+ hour (or modify DB to expire token)
3. Try to use reset link
   ✗ Error: "Invalid or expired token"

4. Restart password reset
   ✓ Can get new token from forgot password
```

---

## Database Schema

User table requires these fields:

```sql
-- Email verification
emailVerified BOOLEAN DEFAULT false
verificationToken VARCHAR(255) NULL
verificationTokenExpiry DATETIME NULL

-- Password reset
resetToken VARCHAR(255) NULL
resetTokenExpiry DATETIME NULL
```

---

## Environment Variables

```bash
# Email Service Configuration
EMAIL_PROVIDER=gmail  # or 'smtp'
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password

# Alternative for SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
SMTP_SECURE=false

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:5173

# Optional
EMAIL_FROM=noreply@xavlink.com
```

---

## Email Templates

### Verification Email

- **Subject**: "XavLink - Verify Your Email"
- **Expiry**: 24 hours
- **Contains**: Click here button + Link
- **On Click**: Redirects to `/verify-email?token=<TOKEN>`

### Password Reset Email

- **Subject**: "XavLink - Password Reset Request"
- **Expiry**: 1 hour
- **Contains**: Click here button + Link
- **On Click**: Redirects to `/reset-password?token=<TOKEN>`

---

## API Endpoints (Testing with curl/Postman)

### 1. Register

```bash
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "course": "CS",
  "year": 2
}

Response:
{
  "message": "Registration successful. Please verify your email.",
  "user": { ... }
}
```

### 2. Verify Email

```bash
POST /auth/verify-email
Content-Type: application/json

{
  "token": "<VERIFICATION_TOKEN>"
}

Response:
{
  "message": "Email verified successfully"
}
```

### 3. Resend Verification

```bash
POST /auth/resend-verification
Content-Type: application/json

{
  "email": "john@example.com"
}

Response:
{
  "message": "Verification email sent"
}
```

### 4. Forgot Password

```bash
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "john@example.com"
}

Response:
{
  "message": "If that email exists, a reset link has been sent"
}
```

### 5. Reset Password

```bash
POST /auth/reset-password
Content-Type: application/json

{
  "token": "<RESET_TOKEN>",
  "newPassword": "newpassword123"
}

Response:
{
  "message": "Password reset successful"
}
```

### 6. Login (with email verification check)

```bash
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}

Response (if verified):
{
  "user": { ... },
  "token": "..."
}

Response (if not verified):
{
  "message": "Email not verified. We've sent a verification link to your email."
}
```

---

## Development vs Production

### Development Mode

- Email service logs to console
- No actual email sent
- Verification still works with tokens
- Useful for testing without email setup

### Production Mode

- Email service uses SMTP/Gmail
- Real emails sent to users
- All verification flows work end-to-end
- Requires EMAIL_PROVIDER environment variable

---

## Debugging Tips

### Check Email Service

Look for logs in console:

```
📧 Email (Development Mode): { to: "...", subject: "...", ... }
✅ Verification email sent to john@example.com
✅ Password reset email sent to john@example.com
```

### Check Database

```sql
-- View user email verification status
SELECT id, email, emailVerified, verificationToken, verificationTokenExpiry
FROM users
WHERE email = 'john@example.com';

-- Check if token matches
SELECT * FROM users
WHERE verificationToken = '<COPIED_TOKEN>';

-- Check reset token
SELECT id, email, resetToken, resetTokenExpiry
FROM users
WHERE email = 'john@example.com';
```

### Common Issues

**1. Email Not Sending**

- Check EMAIL_PROVIDER is set
- Check email credentials are correct
- For Gmail: use app-specific password
- Check email service isn't in development mode

**2. Token Not Working**

- Token has expired (24h for verification, 1h for reset)
- Token doesn't match in database
- User not found with that token
- Use GET `/verify-email?token=<TOKEN>` for browser

**3. Login Still Not Working After Verification**

- Check `emailVerified` is true in database
- Check token was properly cleared
- Restart login after clearing browser cache

---

## Monitoring in Production

### Metrics to Track

- Registration -> Email verification conversion rate
- Time to verify (how long users take to click)
- Verification email bounce/fail rate
- Password reset success rate
- Token expiration rate

### Alerts to Set

- High email failure rate
- Password reset requested multiple times
- Verification email not clicked (24h+)
- Suspicious patterns (many resets from same IP)

---

## Future Enhancements

- [ ] SMS verification as alternative
- [ ] Social login (skip email verification)
- [ ] Email verification on profile changes
- [ ] Rate limiting on verification requests
- [ ] Custom email templates per brand
- [ ] Email delivery tracking/webhooks
- [ ] Multi-language email templates
- [ ] Two-factor authentication via email OTP

---

## Troubleshooting Checklist

Before reporting issues:

- [ ] Registered user exists in database
- [ ] Email service is properly configured
- [ ] Token hasn't expired (check timestamp)
- [ ] Frontend URL is correct in emails
- [ ] Browser cookies/cache cleared
- [ ] Tried resending email
- [ ] Checked email spam folder
- [ ] Checked server logs for errors
- [ ] Verified email in database is correct
- [ ] Reset password works with valid token

---

## Support

For issues:

1. Check server logs for error messages
2. Verify environment variables are set
3. Check token validity in database
4. Test with new registration
5. Test with development email service (console logs)
