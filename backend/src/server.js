const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const prisma = require("./config/prismaClient");
const { initializeFirebase } = require("./config/firebase");
const {
  startScheduledPostsPublisher,
} = require("./utils/scheduledPostsPublisher");
const {
  cleanupOldNotifications,
  notifyMessage,
} = require("./services/notificationService");

const PORT = process.env.PORT || 5000;

/*
  IMPORTANT:
  - Render + Socket.io needs relaxed CORS initially
  - You can lock this later once stable
*/
const server = http.createServer(app);

// Parse allowed origins from env or use defaults
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:8081", // Expo dev server
      "https://xavlink.vercel.app",
      "https://xavlink-kelvinkbks-projects.vercel.app",
      "https://xavlink-backend.onrender.com",
      "https://xavlink-28ehhlqb0-kelvins-projects-19ada992.vercel.app",
    ];

const io = new Server(server, {
  cors: {
    origin: "*", // Temporarily allow all origins to bypass Render's strict CORS blocks
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  },
  transports: ["websocket", "polling"], // Allow WebSocket for mobile, polling for fallback
  maxHttpBufferSize: 1e6, // 1MB
  pingInterval: 25000,
  pingTimeout: 60000,
  allowEIO3: true, // Support older clients
});

// Make io available in controllers if needed
global.io = io;

/* -------------------------------
   SOCKET CONNECTION
-------------------------------- */
io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);

  /* -------------------------------
     USER PRESENCE
  -------------------------------- */
  socket.on("user_online", ({ userId }) => {
    if (!userId) return;
    socket.userId = userId;
    socket.join(`user:${userId}`);
    io.emit("user_status_change", {
      userId,
      status: "online",
    });
  });

  socket.on("save_device_token", async ({ userId, token }) => {
    if (!userId || !token) {
      console.warn("❌ save_device_token: Missing userId or token");
      return;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { deviceTokens: true },
      });

      if (!user) {
        console.warn(`❌ User ${userId} not found`);
        return;
      }

      // Add token if it doesn't already exist
      const updatedTokens = Array.isArray(user.deviceTokens)
        ? user.deviceTokens
        : [];
      if (!updatedTokens.includes(token)) {
        updatedTokens.push(token);

        await prisma.user.update({
          where: { id: userId },
          data: { deviceTokens: updatedTokens },
        });

        console.log(`✅ Device token saved for user ${userId}`);
      } else {
        console.log(`ℹ️  Device token already registered for user ${userId}`);
      }
    } catch (error) {
      console.error("❌ Error saving device token:", error);
    }
  });

  socket.on("disconnect", () => {
    if (socket.userId) {
      io.emit("user_status_change", {
        userId: socket.userId,
        status: "offline",
      });
    }
    console.log("❌ Socket disconnected:", socket.id);
  });

  /* -------------------------------
     NOTIFICATION HANDLERS
  -------------------------------- */
  socket.on("notification:read", async ({ notificationId }) => {
    try {
      await prisma.notification.update({
        where: { id: notificationId },
        data: { read: true },
      });

      const unreadCount = await prisma.notification.count({
        where: { userId: socket.userId, read: false },
      });

      io.to(`user:${socket.userId}`).emit("notification:unread-count", {
        unreadCount,
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  });

  socket.on("notification:delete", async ({ notificationId }) => {
    try {
      await prisma.notification.delete({
        where: { id: notificationId },
      });

      io.to(`user:${socket.userId}`).emit("notification:deleted", {
        notificationId,
      });
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  });

  /* -------------------------------
     JOIN CHAT ROOM
     (frontend MUST call this)
  -------------------------------- */
  socket.on("join_room", ({ chatId }) => {
    if (!chatId) return;
    socket.join(chatId);
    console.log(`🟢 Joined chat room: ${chatId}`);
  });

  /* -------------------------------
     TYPING INDICATOR
  -------------------------------- */
  socket.on("typing", ({ chatId, userId, userName }) => {
    if (!chatId || !userId) return;
    socket.to(chatId).emit("user_typing", {
      userId,
      userName,
    });
  });

  socket.on("stop_typing", ({ chatId, userId }) => {
    if (!chatId || !userId) return;
    socket.to(chatId).emit("user_stopped_typing", {
      userId,
    });
  });

  /* -------------------------------
     SEND MESSAGE
     (chatId MUST exist)
  -------------------------------- */
  socket.on("send_message", async (payload, callback) => {
    const { chatId, senderId, text, attachmentUrl } = payload || {};

    if (!chatId || !senderId || !text) {
      callback?.({ error: "chatId, senderId and text are required" });
      return;
    }

    try {
      // Save message
      const message = await prisma.message.create({
        data: {
          chatId,
          senderId,
          text,
          attachmentUrl: attachmentUrl || null,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              profilePic: true,
            },
          },
        },
      });

      // Broadcast message to room
      io.to(chatId).emit("receive_message", message);

      // Send message notification to other participants
      try {
        await notifyMessage({
          chatId,
          senderId,
          senderName: message.sender.name,
          messagePreview: message.text
            ? message.text.substring(0, 60)
            : "Message",
          io,
        });
      } catch (notifErr) {
        console.error("Failed to send message notification:", notifErr);
      }

      callback?.({
        success: true,
        message,
      });
    } catch (error) {
      console.error("❌ send_message error:", error);
      callback?.({ error: "Failed to send message" });
    }
  });
});

/* -------------------------------
   START SERVER
-------------------------------- */
async function startServer() {
  try {
    // Test database connection before starting server
    console.log("🔍 Testing database connection...");
    await prisma.$connect();
    const userCount = await prisma.user.count();
    console.log(`✅ Database connected successfully (${userCount} users)`);

    // Initialize Firebase
    initializeFirebase();

    server.listen(PORT, () => {
      console.log(`🚀 XavLink backend running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🔒 CORS origins: ${allowedOrigins.length} configured`);

      // Start background job for publishing scheduled posts
      startScheduledPostsPublisher(10000); // Run every 10 seconds

      // Clean up old notifications daily
      setInterval(cleanupOldNotifications, 24 * 60 * 60 * 1000);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    console.error("💡 Possible causes:");
    console.error("   - DATABASE_URL not set or invalid");
    console.error("   - Database server unreachable");
    console.error("   - Prisma schema out of sync (run: npx prisma db push)");
    console.error("\nFull error:", error);
    process.exit(1);
  }
}

startServer();

/* -------------------------------
   CLEAN SHUTDOWN
-------------------------------- */
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
