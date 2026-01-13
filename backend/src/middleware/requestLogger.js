/**
 * Request logging middleware
 * Logs request method, URL, IP, and response time
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  const timestamp = new Date().toISOString();

  // Log request
  console.log(
    `[${timestamp}] ${req.method} ${req.path} - IP: ${
      req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || "Unknown"
    }`
  );

  // Log response when finished
  res.on("finish", () => {
    const duration = Date.now() - start;
    const statusColor =
      res.statusCode >= 500
        ? "🔴"
        : res.statusCode >= 400
        ? "🟡"
        : res.statusCode >= 300
        ? "🔵"
        : "🟢";

    console.log(
      `${statusColor} [${timestamp}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`
    );
  });

  next();
}

module.exports = requestLogger;
