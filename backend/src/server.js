const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const prisma = require("./config/prismaClient");

const PORT = process.env.PORT || 5000;
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : ["http://localhost:5173"];

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// Expose io globally for controllers
global.io = io;

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Join user's personal notification room
  socket.on("join_user_room", ({ userId }) => {
    if (!userId) return;
    socket.join(`user:${userId}`);
    console.log(`User ${userId} joined notification room`);
  });

  // Join chat room
  socket.on("join_room", ({ chatId }) => {
    if (!chatId) return;
    socket.join(chatId);
  });

  // Typing indicator
  socket.on("typing", ({ chatId, userId, userName }) => {
    socket.to(chatId).emit("user_typing", { userId, userName });
  });

  socket.on("stop_typing", ({ chatId, userId }) => {
    socket.to(chatId).emit("user_stopped_typing", { userId });
  });

  // User online status
  socket.on("user_online", ({ userId }) => {
    socket.userId = userId;
    io.emit("user_status_change", { userId, status: "online" });
  });

  socket.on("disconnect", () => {
    if (socket.userId) {
      io.emit("user_status_change", {
        userId: socket.userId,
        status: "offline",
      });
    }
  });

  socket.on("send_message", async (payload, callback) => {
    const { chatId, senderId, text, attachmentUrl } = payload || {};
    if (!senderId || !text) {
      callback?.({ error: "senderId and text are required" });
      return;
    }

    try {
      const chatIdToUse = chatId || (await prisma.chat.create({ data: {} })).id;
      const message = await prisma.message.create({
        data: {
          chatId: chatIdToUse,
          senderId,
          text,
          attachmentUrl: attachmentUrl || null,
        },
        include: {
          sender: {
            select: { id: true, name: true, profilePic: true },
          },
        },
      });

      socket.join(chatIdToUse);
      io.to(chatIdToUse).emit("receive_message", message);
      callback?.({ chatId: chatIdToUse, message });
    } catch (err) {
      console.error("send_message error", err);
      callback?.({ error: "Failed to send message" });
    }
  });
});

server.listen(PORT, () => {
  console.log(`XavLink backend running on port ${PORT}`);
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
