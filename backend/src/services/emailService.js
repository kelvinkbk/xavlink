const nodemailer = require("nodemailer");

// Configure transporter based on environment
const createTransporter = () => {
  // Use console mode when provider is not set
  const emailProvider = (process.env.EMAIL_PROVIDER || "").toLowerCase();

  if (emailProvider === "gmail") {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD, // Use app-specific password for Gmail
      },
    });
  }

  if (emailProvider === "smtp") {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  // Default: development transporter (logs to console)
  return {
    sendMail: async (mailOptions) => {
      console.log("📧 Email (Development Mode):", mailOptions);
      return { response: "Development mode - email logged to console" };
    },
  };
};

const transporter = createTransporter();

exports.sendPasswordResetEmail = async (email, resetToken, resetLink) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: "XavLink - Password Reset Request",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>You requested to reset your password. Click the link below to proceed:</p>
          
          <p style="margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Reset Password
            </a>
          </p>
          
          <p style="color: #666; font-size: 14px;">
            Or copy and paste this link in your browser:<br/>
            <code style="background: #f4f4f4; padding: 8px; display: inline-block; margin-top: 8px;">
              ${resetLink}
            </code>
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            This link will expire in 1 hour.<br/>
            If you didn't request this reset, please ignore this email.
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #999; font-size: 12px;">
            XavLink - Campus Skills Marketplace
          </p>
        </div>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to ${email}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("❌ Failed to send password reset email:", error.message);
    return { success: false, error: error.message };
  }
};

exports.sendVerificationEmail = async (email, name, verificationLink) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: "XavLink - Verify Your Email",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Verify your email, ${name || "User"}</h2>
          <p>Thanks for signing up! Please confirm your email to activate your account.</p>
          <p style="margin: 30px 0;">
            <a href="${verificationLink}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Verify Email
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">
            Or copy and paste this link in your browser:<br/>
            <code style="background: #f4f4f4; padding: 8px; display: inline-block; margin-top: 8px;">
              ${verificationLink}
            </code>
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            This link will expire in 24 hours.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #999; font-size: 12px;">
            XavLink - Campus Skills Marketplace
          </p>
        </div>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent to ${email}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("❌ Failed to send verification email:", error.message);
    return { success: false, error: error.message };
  }
};

exports.sendWelcomeEmail = async (email, name) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: "Welcome to XavLink! 🎉",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to XavLink, ${name}!</h2>
          <p>Thank you for joining the campus skills marketplace.</p>
          
          <p>You can now:</p>
          <ul>
            <li>📝 Share your skills and expertise</li>
            <li>🔍 Discover other students' skills</li>
            <li>💬 Connect and collaborate with peers</li>
            <li>⭐ Rate and review other users</li>
            <li>🤝 Build your professional network</li>
          </ul>
          
          <p style="margin: 30px 0;">
            <a href="${
              process.env.FRONTEND_URL || "http://localhost:5173"
            }" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Get Started
            </a>
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            Questions? Visit our help center or contact support.
          </p>
        </div>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${email}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("❌ Failed to send welcome email:", error.message);
    return { success: false, error: error.message };
  }
};

exports.sendNotificationEmail = async (email, subject, message) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: `XavLink - ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${subject}</h2>
          <p>${message}</p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            XavLink - Campus Skills Marketplace
          </p>
        </div>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Notification email sent to ${email}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("❌ Failed to send notification email:", error.message);
    return { success: false, error: error.message };
  }
};

// Test transporter connectivity
exports.verifyEmail = async () => {
  try {
    await transporter.verify();
    console.log("✅ Email service configured and ready");
    return true;
  } catch (error) {
    console.error("⚠️ Email service error:", error.message);
    console.error(
      "   Running in console mode. Configure .env for email sending."
    );
    return false;
  }
};
