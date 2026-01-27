const rateLimit = require("express-rate-limit");

// General API rate limiter - 100 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      message: "Too many requests, please try again later.",
      retryAfter: req.rateLimit.resetTime,
    });
  },
});

// Strict rate limiter for authentication endpoints - 5 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login/register attempts per windowMs
  message: "Too many authentication attempts, please try again later.",
  skipSuccessfulRequests: true, // Don't count successful requests
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      message:
        "Too many authentication attempts. Please try again in 15 minutes.",
      retryAfter: req.rateLimit.resetTime,
    });
  },
});

// Rate limiter for post creation - 20 posts per hour
const postCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 posts per hour
  message: "You've created too many posts. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      message: "Post creation limit reached. Please try again in an hour.",
      retryAfter: req.rateLimit.resetTime,
    });
  },
});

// Rate limiter for comments - 50 comments per hour
const commentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: "Too many comments posted. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for file uploads - 10 uploads per hour
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: "Too many file uploads. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      message: "Upload limit reached. Please try again in an hour.",
      retryAfter: req.rateLimit.resetTime,
    });
  },
});

// Strict rate limiter for password reset - 3 requests per hour
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: "Too many password reset attempts. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      message: "Password reset limit reached. Please try again in an hour.",
      retryAfter: req.rateLimit.resetTime,
    });
  },
});

// Lenient limiter for read operations - 200 requests per 15 minutes
const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: "Too many requests. Please slow down.",
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  apiLimiter,
  authLimiter,
  postCreationLimiter,
  commentLimiter,
  uploadLimiter,
  passwordResetLimiter,
  readLimiter,
};
