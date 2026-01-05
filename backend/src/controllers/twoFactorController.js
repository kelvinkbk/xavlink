const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const prisma = require("../config/prismaClient");

const sanitizeUser = (user) => {
  if (!user) return null;
  // eslint-disable-next-line no-unused-vars
  const { password, resetToken, resetTokenExpiry, ...rest } = user;
  return rest;
};

// Generate 2FA secret and QR code
exports.generateTwoFactorSecret = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.twoFactorEnabled) {
      return res
        .status(400)
        .json({ message: "2FA is already enabled for this account" });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `XavLink (${user.email})`,
      issuer: "XavLink",
      length: 32,
    });

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      secret: secret.base32,
      qrCode,
    });
  } catch (err) {
    next(err);
  }
};

// Verify and enable 2FA
exports.enableTwoFactor = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const { secret, token } = req.body;

    if (!secret || !token) {
      return res.status(400).json({ message: "Secret and token are required" });
    }

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token,
      window: 2,
    });

    if (!verified) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    // Save the secret
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret,
        twoFactorEnabled: true,
      },
    });

    res.json({
      message: "2FA enabled",
      user: sanitizeUser(user),
    });
  } catch (err) {
    next(err);
  }
};

// Disable 2FA
exports.disableTwoFactor = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Verify password
    const bcrypt = require("bcryptjs");
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid password" });
    }

    // Disable 2FA
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: null,
        twoFactorEnabled: false,
      },
    });

    res.json({
      message: "2FA disabled",
      user: sanitizeUser(updated),
    });
  } catch (err) {
    next(err);
  }
};

// Verify 2FA token during login
exports.verifyTwoFactorToken = (secret, token) => {
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token,
    window: 2,
  });
};
