const prisma = require("../config/prismaClient");
const {
  notifyRequest,
  notifyRequestAccepted,
  notifyRequestRejected,
} = require("../services/notificationService");

exports.sendRequest = async (req, res, next) => {
  try {
    const { toUserId, skillId, message, deadline, isUrgent } = req.body;
    if (!toUserId || !skillId) {
      return res
        .status(400)
        .json({ message: "toUserId and skillId are required" });
    }

    const request = await prisma.request.create({
      data: {
        fromUserId: req.user.id,
        toUserId,
        skillId,
        message: message || null,
        deadline: deadline ? new Date(deadline) : null,
        isUrgent: isUrgent || false,
      },
      include: {
        fromUser: { select: { name: true } },
        skill: { select: { title: true } },
      },
    });

    // Create notification for the recipient
    try {
      await notifyRequest({
        requestId: request.id,
        requestType: "skill",
        senderId: req.user.id,
        recipientId: toUserId,
        io: global.io,
      });
    } catch (notifErr) {
      console.error("Failed to create request notification:", notifErr);
    }

    res.status(201).json(request);
  } catch (err) {
    next(err);
  }
};

exports.getReceived = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const requests = await prisma.request.findMany({
      where: { toUserId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        fromUser: {
          select: { id: true, name: true, profilePic: true, course: true },
        },
        skill: true,
      },
    });

    res.json(requests);
  } catch (err) {
    next(err);
  }
};

exports.updateRequestStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (
      !["pending", "accepted", "rejected", "completed", "cancelled"].includes(
        status
      )
    ) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const request = await prisma.request.findUnique({
      where: { id },
      include: {
        fromUser: { select: { name: true } },
        toUser: { select: { name: true } },
      },
    });
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.toUserId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this request" });
    }

    const updated = await prisma.request.update({
      where: { id },
      data: { status },
    });

    // Create notification for the requester
    try {
      if (status === "accepted") {
        await notifyRequestAccepted({
          requestId: id,
          accepterId: req.user.id,
          senderId: request.fromUserId,
          io: global.io,
        });
      } else if (status === "rejected") {
        await notifyRequestRejected({
          requestId: id,
          rejectedById: req.user.id,
          senderId: request.fromUserId,
          io: global.io,
        });
      }
    } catch (notifErr) {
      console.error("Failed to create request status notification:", notifErr);
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
};
