const multer = require("multer");

function errorHandler(err, req, res, next) {
  // Handle Multer errors with clearer status codes
  if (err instanceof multer.MulterError) {
    const map = {
      LIMIT_FILE_SIZE: 413,
      LIMIT_UNEXPECTED_FILE: 400,
    };
    const status = map[err.code] || 400;
    console.error("Multer error:", err.code, err.message);
    return res.status(status).json({ message: err.message });
  }

  // Handle custom file filter errors
  if (err?.message === "Only image files are allowed") {
    console.error("File type error:", err.message);
    return res.status(err.status || 400).json({ message: err.message });
  }

  // Handle Prisma errors
  if (err.code && err.code.startsWith("P")) {
    console.error("Prisma error:", err.code, err.message);
    // Don't expose database errors in production
    if (process.env.NODE_ENV === "production") {
      return res.status(500).json({
        message: "Database error occurred",
      });
    }
    return res.status(500).json({
      message: err.message,
      code: err.code,
    });
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ message: "Invalid token" });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ message: "Token expired" });
  }

  // Log full error in development, sanitized in production
  if (process.env.NODE_ENV === "production") {
    console.error("Error:", {
      message: err.message,
      status: err.status || 500,
      path: req.path,
      method: req.method,
    });
  } else {
    console.error("Full error:", err);
  }

  const status = err.status || 500;
  // Don't expose internal error messages in production
  const message =
    process.env.NODE_ENV === "production" && status === 500
      ? "Internal server error"
      : err.message || "Something went wrong";

  res.status(status).json({
    message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
}

module.exports = errorHandler;
