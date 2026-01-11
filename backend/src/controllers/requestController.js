const prisma = require("../config/prismaClient");
const { createNotification } = require("./notificationController");

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
    await createNotification({
      userId: toUserId,
      type: "request_received",
      title: "New Skill Request",
      message: `${request.fromUser.name} requested your "${request.skill.title}" skill`,
      relatedId: request.id,
    });

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
    const notificationTitle =
      status === "accepted"
        ? `${request.toUser.name} accepted your request`
        : `${request.toUser.name} rejected your request`;
    const notificationType =
      status === "accepted" ? "request_accepted" : "request_rejected";

    await createNotification({
      userId: request.fromUserId,
      type: notificationType,
      title: notificationTitle,
      message: `Your skill request has been ${status}`,
      relatedId: id,
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
};
