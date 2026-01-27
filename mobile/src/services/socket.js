import { io } from "socket.io-client";
import { API_BASE } from "./api";

// Remove /api suffix from API_BASE to get socket server URL
const SOCKET_URL = API_BASE
  ? API_BASE.replace(/\/api$/, "")
  : "http://localhost:5000";

let socket;

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id);
    });

    socket.on("connect_error", (err) => {
      console.error("❌ Socket connection error:", err.message);
    });

    socket.on("disconnect", (reason) => {
      console.log("⚠️ Socket disconnected:", reason);
    });
  }
  return socket;
};

// Join user's notification room
export const joinUserRoom = (userId) => {
  const s = getSocket();
  if (userId) {
    s.emit("join_user_room", { userId });
  }
};

// Mark user as online
export const markUserOnline = (userId) => {
  const s = getSocket();
  if (userId) {
    s.emit("user_online", { userId });
  }
};

// Chat room management
export const joinRoom = (chatId) => {
  const s = getSocket();
  if (chatId) {
    s.emit("join_room", { chatId });
  }
};

// Typing indicators
export const sendTyping = (chatId, userId, userName) => {
  const s = getSocket();
  s.emit("typing", { chatId, userId, userName });
};

export const sendStopTyping = (chatId, userId) => {
  const s = getSocket();
  s.emit("stop_typing", { chatId, userId });
};

export const sendMessage = (payload, callback) => {
  const s = getSocket();
  console.log("📤 Emitting send_message:", payload);
  s.emit("send_message", payload, (response) => {
    console.log("📥 send_message response:", response);
    if (callback) callback(response);
  });
};

export const onMessage = (handler) => {
  const s = getSocket();
  s.on("receive_message", handler);
  return () => s.off("receive_message", handler);
};

// Notification listeners
export const onNewNotification = (handler) => {
  const s = getSocket();
  s.on("new_notification", handler);
  return () => s.off("new_notification", handler);
};
