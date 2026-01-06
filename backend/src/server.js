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

// Parse allowed origins from env or use defaults
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:8081", // Expo dev server
      "https://xavlink.vercel.app",
      "https://xavlink-kelvinkbks-projects.vercel.app",
    ];

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // In production, be strict. In dev, be permissive.
        if (process.env.NODE_ENV === "production") {
          callback(new Error("Not allowed by CORS"));
        } else {
          callback(null, true);
        }
      }
    },
    credentials: true,
  },
  transports: ["polling"], // Only polling for Render - WebSocket may not work reliably
  maxHttpBufferSize: 1e6, // 1MB
  pingInterval: 25000,
  pingTimeout: 60000,
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
