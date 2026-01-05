const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const prisma = require("../config/prismaClient");
const {
  sendPasswordResetEmail,
  sendVerificationEmail,
} = require("../services/emailService");

const sanitizeUser = (user) => {
  if (!user) return null;
  // Remove sensitive fields before returning to clients
  // eslint-disable-next-line no-unused-vars
  const { password, ...rest } = user;
  return rest;
};

const signToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, course, year, bio, profilePic } = req.body;
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required" });
    }

    // Normalize optional numeric field year to integer or null
    const yearValue =
      year === undefined || year === null || year === "" ? null : Number(year);
    if (yearValue !== null && Number.isNaN(yearValue)) {
      return res.status(400).json({ message: "Year must be a number" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpiry = new Date(Date.now() + 24 * 3600000); // 24 hours

    // Auto-verify email if EMAIL_PROVIDER is not configured
    const emailVerified = !process.env.EMAIL_PROVIDER;

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role: "user",
        course,
        year: yearValue,
        bio,
        profilePic,
        emailVerified,
        verificationToken,
        verificationTokenExpiry,
      },
    });

    // Only send verification email if EMAIL_PROVIDER is configured
    if (process.env.EMAIL_PROVIDER) {
      const verificationLink = `${
        process.env.FRONTEND_URL || "http://localhost:5173"
      }/verify-email?token=${verificationToken}`;
      await sendVerificationEmail(user.email, user.name, verificationLink);
    }

    res.status(201).json({
      message: emailVerified
        ? "Registration successful"
        : "Registration successful. Please verify your email.",
      user: sanitizeUser(user),
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.isSuspended) {
      return res.status(403).json({ message: "Account is suspended" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Only enforce email verification if EMAIL_PROVIDER is configured
    if (!user.emailVerified && process.env.EMAIL_PROVIDER) {
      const needsNewToken =
        !user.verificationToken ||
        !user.verificationTokenExpiry ||
        new Date(user.verificationTokenExpiry) <= new Date();

      let verificationToken = user.verificationToken;
      let verificationTokenExpiry = user.verificationTokenExpiry;

      if (needsNewToken) {
        verificationToken = crypto.randomBytes(32).toString("hex");
        verificationTokenExpiry = new Date(Date.now() + 24 * 3600000); // 24 hours
        await prisma.user.update({
          where: { id: user.id },
          data: {
            verificationToken,
            verificationTokenExpiry,
          },
        });
      }

      const verificationLink = `${
        process.env.FRONTEND_URL || "http://localhost:5173"
      }/verify-email?token=${verificationToken}`;
      await sendVerificationEmail(user.email, user.name, verificationLink);

      return res.status(403).json({
        message:
          "Email not verified. We've sent a verification link to your email.",
      });
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      return res.status(200).json({
        message: "2FA required",
        requires2FA: true,
        userId: user.id,
      });
    }

    const token = signToken(user);
    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Return success even if user not found (security best practice)
      return res.json({
        message: "If that email exists, a reset link has been sent",
      });
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // TODO: Send email with reset link
    // For now, just log it (in production, use nodemailer or similar)
    const resetLink = `${
      process.env.FRONTEND_URL || "http://localhost:5173"
    }/reset-password?token=${resetToken}`;

    await sendPasswordResetEmail(user.email, resetToken, resetLink);

    res.json({ message: "If that email exists, a reset link has been sent" });
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ message: "Token and new password are required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    // Find user with valid reset token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(), // Token must not be expired
        },
      },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token" });
    }

    // Hash new password and clear reset token
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    res.json({ message: "Password reset successful" });
  } catch (err) {
    next(err);
  }
};

exports.verifyEmail = async (req, res, next) => {
  try {
    const token = req.query.token || req.body.token;
    if (!token) {
      return res
        .status(400)
        .json({ message: "Verification token is required" });
    }

    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        verificationTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired verification token" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
      },
    });

    res.json({ message: "Email verified successfully" });
  } catch (err) {
    next(err);
  }
};

exports.resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.json({
        message: "If that email exists, a verification link has been sent",
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpiry = new Date(Date.now() + 24 * 3600000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        verificationTokenExpiry,
      },
    });

    const verificationLink = `${
      process.env.FRONTEND_URL || "http://localhost:5173"
    }/verify-email?token=${verificationToken}`;
    await sendVerificationEmail(user.email, user.name, verificationLink);

    res.json({ message: "Verification email sent" });
  } catch (err) {
    next(err);
  }
};

exports.verifyTwoFactorToken = async (req, res, next) => {
  try {
    const { userId, token } = req.body;

    if (!userId || !token) {
      return res
        .status(400)
        .json({ message: "User ID and token are required" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({ message: "2FA not enabled" });
    }

    // Import verifyTwoFactorToken from controller
    const { verifyTwoFactorToken } = require("./twoFactorController");
    const isValid = verifyTwoFactorToken(user.twoFactorSecret, token);

    if (!isValid) {
      return res.status(401).json({ message: "Invalid 2FA token" });
    }

    // Generate JWT token
    const jwtToken = signToken(user);
    res.json({ token: jwtToken, user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
};
