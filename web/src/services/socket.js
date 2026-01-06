import { io } from "socket.io-client";
import api from "./api";

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
