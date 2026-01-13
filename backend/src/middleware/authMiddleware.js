const jwt = require("jsonwebtoken");
const prisma = require("../config/prismaClient");
const crypto = require("crypto");

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.replace("Bearer ", "")
    : req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, email: payload.email, role: payload.role };

    // Update device session last active time (async, don't block request)
    updateDeviceSessionActivity(payload.id, req).catch((err) => {
      console.error("Failed to update device session:", err);
    });

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

// Helper function to update device session activity
async function updateDeviceSessionActivity(userId, req) {
  try {
    const userAgent = req.headers["user-agent"] || "Unknown";
    const ipAddress =
      req.ip ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      "Unknown";

    const deviceFingerprint = crypto
      .createHash("sha256")
      .update(`${userAgent}-${ipAddress}`)
      .digest("hex")
      .substring(0, 16);

    await prisma.deviceSession.updateMany({
      where: {
        userId,
        deviceId: deviceFingerprint,
      },
      data: {
        lastActiveAt: new Date(),
      },
    });
  } catch (error) {
    // Silently fail - don't break requests
    console.error("Failed to update device session activity:", error);
  }
}

// Optional authentication - doesn't fail if no token
function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.replace("Bearer ", "")
    : req.cookies?.token;

  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { id: payload.id, email: payload.email, role: payload.role };
    } catch (err) {
      // Token is invalid, but we don't fail - just continue without user
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
}

module.exports = authMiddleware;
module.exports.optionalAuthMiddleware = optionalAuthMiddleware;
