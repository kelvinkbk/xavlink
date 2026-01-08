require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");

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
const errorHandler = require("./middleware/errorHandler");
const {
  checkExpiredSuspensions,
} = require("./middleware/suspensionCheckMiddleware");

const app = express();

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

// Auto-check and lift expired suspensions on each request
app.use(checkExpiredSuspensions);

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "xavlink-backend" });
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

app.use(errorHandler);

module.exports = app;
