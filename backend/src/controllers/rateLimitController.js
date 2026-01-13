const prisma = require("../config/prismaClient");

/**
 * Get rate limit statistics for monitoring
 * Admin-only endpoint
 */
exports.getRateLimitStats = async (req, res, next) => {
  try {
    // In a production setup with Redis store, you'd query Redis here
    // For now, return configuration information

    const rateLimitConfig = {
      general: {
        windowMs: "15 minutes",
        maxRequests: 100,
        description: "General API rate limit per IP",
      },
      authentication: {
        windowMs: "15 minutes",
        maxRequests: 5,
        description: "Login/Register attempts per IP",
      },
      postCreation: {
        windowMs: "1 hour",
        maxRequests: 20,
        description: "Post creation limit per IP",
      },
      comments: {
        windowMs: "1 hour",
        maxRequests: 50,
        description: "Comment creation limit per IP",
      },
      uploads: {
        windowMs: "1 hour",
        maxRequests: 10,
        description: "File upload limit per IP",
      },
      passwordReset: {
        windowMs: "1 hour",
        maxRequests: 3,
        description: "Password reset attempts per IP",
      },
      readOperations: {
        windowMs: "15 minutes",
        maxRequests: 200,
        description: "Read-heavy operations per IP",
      },
    };

    res.json({
      message: "Rate limit configuration",
      config: rateLimitConfig,
      note: "These limits are applied per IP address. Upgrade to Redis-backed store for distributed rate limiting.",
    });
  } catch (err) {
    next(err);
  }
};
