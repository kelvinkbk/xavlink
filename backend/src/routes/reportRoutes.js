const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const {
  createReport,
  listReports,
  updateReportStatus,
  getReportDetails,
} = require("../controllers/reportController");
const { listAuditLogs } = require("../controllers/auditLogController");

const router = express.Router();

// Public: create report (auth required)
router.post("/", authMiddleware, createReport);

// Admin/Moderator only: list and manage reports
router.get(
  "/",
  authMiddleware,
  requireRole(["admin", "moderator"]),
  listReports
);
router.get(
  "/:id",
  authMiddleware,
  requireRole(["admin", "moderator"]),
  getReportDetails
);
router.patch(
  "/:id/status",
  authMiddleware,
  requireRole(["admin", "moderator"]),
  updateReportStatus
);

// Admin/Moderator: view audit logs
router.get(
  "/logs/history",
  authMiddleware,
  requireRole(["admin", "moderator"]),
  listAuditLogs
);

module.exports = router;
