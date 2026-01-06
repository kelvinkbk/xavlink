const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const prisma = require("./config/prismaClient");

const PORT = process.env.PORT || 5000;

/*
  IMPORTANT:
  - Render + Socket.io needs relaxed CORS initially
  - You can lock this later once stable
*/
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // IMPORTANT for Render + Vercel + Expo
    credentials: true,
  },
  transports: ["websocket"], // avoid polling issues on Render
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
server.listen(PORT, () => {
  console.log(`🚀 XavLink backend running on port ${PORT}`);
});

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
