/**
 * Input validation and sanitization middleware
 */

/**
 * Sanitize string input - remove dangerous characters and trim
 */
function sanitizeString(str) {
  if (typeof str !== "string") return str;
  return str
    .trim()
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .substring(0, 10000); // Max length
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate pagination parameters
 */
function validatePagination(req, res, next) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  if (page < 1) {
    return res.status(400).json({ message: "Page must be greater than 0" });
  }

  if (limit < 1 || limit > 100) {
    return res.status(400).json({ message: "Limit must be between 1 and 100" });
  }

  req.pagination = { page, limit };
  next();
}

/**
 * Sanitize request body strings
 */
function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === "object") {
    Object.keys(req.body).forEach((key) => {
      if (typeof req.body[key] === "string") {
        req.body[key] = sanitizeString(req.body[key]);
      }
    });
  }
  next();
}

/**
 * Validate required fields
 */
function validateRequired(fields) {
  return (req, res, next) => {
    const missing = fields.filter((field) => !req.body[field]);
    if (missing.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missing.join(", ")}`,
      });
    }
    next();
  };
}

module.exports = {
  sanitizeString,
  isValidEmail,
  validatePagination,
  sanitizeBody,
  validateRequired,
};
