import { io } from "socket.io-client";
import api from "./api";
import { chatService } from "./chatService";

// Derive base URL from existing axios instance
const baseURL =
  api.defaults.baseURL?.replace(/\/api$/, "") || "http://localhost:5000";

export const socket = io(baseURL, {
  withCredentials: true,
  autoConnect: true, // Auto-connect on initialization
  transports: ["polling"], // Use polling only for Render compatibility
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

// Heartbeat state
let heartbeatInterval = null;
let lastMessageTimestamp = null;
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

// Debug connection issues
socket.on("connect_error", (err) => {
  console.error("⚠️ Socket connect_error:", err?.message, err);
});

// Heartbeat ping/pong
socket.on("connect", () => {
  console.log("✅ Socket connected, starting heartbeat");

  // Start heartbeat interval
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(() => {
    if (socket.connected) {
      socket.emit("ping", { timestamp: Date.now() });
    }
  }, HEARTBEAT_INTERVAL);
});

socket.on("pong", ({ timestamp }) => {
  const latency = Date.now() - timestamp;
  console.log(`💓 Pong received (latency: ${latency}ms)`);
});

socket.on("disconnect", () => {
  console.log("❌ Socket disconnected, clearing heartbeat");
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
});

// Reconcile missed messages after reconnect
export const reconcileMissedMessages = async (chatId) => {
  try {
    if (!lastMessageTimestamp) {
      console.log("📝 No previous messages, skipping reconciliation");
      return [];
    }

    console.log(
      `🔄 Reconciling messages since ${new Date(
        lastMessageTimestamp
      ).toISOString()}`
    );

    // Fetch messages since last known timestamp
    const missedMessages = await chatService.getChatMessagesSince(
      chatId,
      lastMessageTimestamp
    );

    if (missedMessages.length > 0) {
      console.log(`📬 Found ${missedMessages.length} missed message(s)`);
      return missedMessages;
    }

    console.log("✓ No missed messages");
    return [];
  } catch (error) {
    console.error("❌ Failed to reconcile messages:", error);
    return [];
  }
};

// Track last message timestamp
export const updateLastMessageTimestamp = (timestamp) => {
  lastMessageTimestamp = timestamp;
  console.log(`⏱️ Updated last message timestamp: ${timestamp}`);
};

// Join user's notification room
export const joinUserRoom = (userId) => {
  if (userId) {
    socket.emit("join_user_room", { userId });
  }
};

// Mark user as online
export const markUserOnline = (userId) => {
  if (userId) {
    socket.emit("user_online", { userId });
  }
};

// Typing indicators
export const sendTyping = (chatId, userId, userName) => {
  socket.emit("typing", { chatId, userId, userName });
};

export const sendStopTyping = (chatId, userId) => {
  socket.emit("stop_typing", { chatId, userId });
};

export default socket;
