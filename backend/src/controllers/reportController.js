const prisma = require("../config/prismaClient");

const sanitizeReport = (report) => {
  if (!report) return null;
  return report;
};

const VALID_REPORT_REASONS = [
  "spam",
  "harassment",
  "inappropriate_content",
  "misinformation",
  "copyright",
  "other",
];

exports.createReport = async (req, res, next) => {
  try {
    const {
      reason,
      description,
      reportedUserId,
      reportedPostId,
      reportedMessageId,
    } = req.body;

    console.log("Report request body:", req.body);
    console.log("Extracted fields:", {
      reason,
      description,
      reportedUserId,
      reportedPostId,
      reportedMessageId,
    });

    if (!reason || !description) {
      return res
        .status(400)
        .json({ message: "Reason and description are required" });
    }

    if (!VALID_REPORT_REASONS.includes(reason)) {
      return res.status(400).json({ message: "Invalid report reason" });
    }

    if (description.length < 10) {
      return res
        .status(400)
        .json({ message: "Description must be at least 10 characters" });
    }

    if (!reportedUserId && !reportedPostId && !reportedMessageId) {
      return res.status(400).json({
        message:
          "Either reportedUserId, reportedPostId, or reportedMessageId is required",
      });
    }

    // Prevent self-reports
    if (reportedUserId === req.user.id) {
      return res.status(400).json({ message: "Cannot report yourself" });
    }

    // Check if already reported by this user for same target
    const existing = await prisma.report.findFirst({
      where: {
        reporterId: req.user.id,
        reportedUserId: reportedUserId || undefined,
        reportedPostId: reportedPostId || undefined,
        reportedMessageId: reportedMessageId || undefined,
        status: "pending",
      },
    });

    if (existing) {
      return res
        .status(409)
        .json({ message: "You already have a pending report for this" });
    }

    const report = await prisma.report.create({
      data: {
        reporterId: req.user.id,
        reason,
        description,
        reportedUserId: reportedUserId || null,
        reportedPostId: reportedPostId || null,
        reportedMessageId: reportedMessageId || null,
      },
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        reportedUser: { select: { id: true, name: true, email: true } },
      },
    });

    res.status(201).json({ report: sanitizeReport(report) });
  } catch (err) {
    next(err);
  }
};

exports.listReports = async (req, res, next) => {
  try {
    const { status = "pending", page = 1, limit = 20 } = req.query;

    const take = Math.min(Number(limit) || 20, 100);
    const skip = ((Number(page) || 1) - 1) * take;

    const where = {};
    if (status && ["pending", "resolved", "dismissed"].includes(status)) {
      where.status = status;
    }

    const [total, reports] = await Promise.all([
      prisma.report.count({ where }),
      prisma.report.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
          reporter: { select: { id: true, name: true, email: true } },
          reportedUser: { select: { id: true, name: true, email: true } },
          resolvedByUser: { select: { id: true, name: true } },
        },
      }),
    ]);

    res.json({ reports, total, page: Number(page) || 1, limit: take });
  } catch (err) {
    next(err);
  }
};

exports.updateReportStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, resolutionNote } = req.body;

    const VALID_STATUSES = ["pending", "resolved", "dismissed"];
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        message: "Invalid status. Must be: pending, resolved, or dismissed",
      });
    }

    const report = await prisma.report.update({
      where: { id },
      data: {
        status,
        resolutionNote: resolutionNote || null,
        resolvedBy: ["resolved", "dismissed"].includes(status)
          ? req.user.id
          : null,
        updatedAt: new Date(),
      },
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        reportedUser: { select: { id: true, name: true, email: true } },
        resolvedByUser: { select: { id: true, name: true } },
      },
    });

    // Log audit action
    const { logAction } = require("./auditLogController");
    await logAction("report_resolved", req.user.id, id, "report", {
      status,
      resolutionNote,
    });

    res.json({ report: sanitizeReport(report) });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Report not found" });
    }
    next(err);
  }
};

exports.getReportDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        reportedUser: { select: { id: true, name: true, email: true } },
        resolvedByUser: { select: { id: true, name: true } },
      },
    });

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    res.json({ report: sanitizeReport(report) });
  } catch (err) {
    next(err);
  }
};
