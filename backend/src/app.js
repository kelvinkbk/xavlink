require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const helmet = require("helmet");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const skillRoutes = require("./routes/skillRoutes");
const postRoutes = require("./routes/postRoutes");
const requestRoutes = require("./routes/requestRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const followRoutes = require("./routes/followRoutes");
const chatRoutes = require("./routes/chatRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const adminRoutes = require("./routes/adminRoutes");
const modRoutes = require("./routes/modRoutes");
const reportRoutes = require("./routes/reportRoutes");
const twoFactorRoutes = require("./routes/twoFactorRoutes");
const blockRoutes = require("./routes/blockRoutes");
const bookmarkRoutes = require("./routes/bookmarkRoutes");
const pinRoutes = require("./routes/pinRoutes");
const enhancementRoutes = require("./routes/enhancementRoutes");
const errorHandler = require("./middleware/errorHandler");
const {
  checkExpiredSuspensions,
} = require("./middleware/suspensionCheckMiddleware");
const requestLogger = require("./middleware/requestLogger");
const { apiLimiter } = require("./middleware/securityMiddleware");
const { sanitizeBody } = require("./middleware/validationMiddleware");

const app = express();

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable CSP for API (can be enabled for web)
    crossOriginEmbedderPolicy: false,
  })
);

// Trust proxy (important for rate limiting behind reverse proxy)
app.set("trust proxy", 1);

// Parse allowed origins from env or use defaults
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:8081", // Expo dev server
      "https://xavlink.vercel.app",
      "https://xavlink-kelvinkbks-projects.vercel.app",
    ];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Request logging (only in development or if LOG_REQUESTS=true)
if (
  process.env.NODE_ENV !== "production" ||
  process.env.LOG_REQUESTS === "true"
) {
  app.use(requestLogger);
}

// Apply rate limiting to all API routes
app.use("/api", apiLimiter);

// Sanitize request body
app.use(sanitizeBody);

// Auto-check and lift expired suspensions on each request
app.use(checkExpiredSuspensions);

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// Enhanced health check endpoint
app.get("/health", async (req, res) => {
  const prisma = require("./config/prismaClient");
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      service: "xavlink-backend",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: "connected",
      environment: process.env.NODE_ENV || "development",
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      service: "xavlink-backend",
      timestamp: new Date().toISOString(),
      database: "disconnected",
      error:
        process.env.NODE_ENV === "production"
          ? "Database unavailable"
          : error.message,
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/users", followRoutes);
app.use("/api/users", userRoutes);
app.use("/api/users/blocked", blockRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/bookmarks", bookmarkRoutes);
app.use("/api/pins", pinRoutes);
app.use("/api/2fa", twoFactorRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/mod", modRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/enhancements", enhancementRoutes);

app.use(errorHandler);

module.exports = app;
