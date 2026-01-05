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

  console.error(err);
  const status = err.status || 500;
  const message = err.message || "Something went wrong";
  res.status(status).json({ message });
}

module.exports = errorHandler;
