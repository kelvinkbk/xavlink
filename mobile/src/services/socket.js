import { io } from "socket.io-client";
import { API_BASE } from "./api";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Remove /api suffix from API_BASE to get socket server URL
const SOCKET_URL = API_BASE
  ? API_BASE.replace(/\/api$/, "")
  : "http://localhost:5000";

let socket;
let initPromise = null;
let lastConnectErrorAt = 0;

// Initialize socket connection
const initSocket = async () => {
  if (initPromise) return initPromise;
  if (socket) return socket;

  initPromise = (async () => {
    try {
      console.log("🔌 Initializing socket connection to:", SOCKET_URL);
      const token = await AsyncStorage.getItem("token");
      const isHttps = SOCKET_URL.startsWith("https");
      const transports = isHttps ? ["polling"] : ["websocket", "polling"];

      socket = io(SOCKET_URL, {
        transports,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1500,
        reconnectionDelayMax: 5000,
        timeout: 10000,
        auth: {
          token: token || "",
        },
      });

      socket.on("connect", () => {
        console.log("✅ Socket connected:", socket.id);
        console.log("🔗 Transport:", socket.io.engine.transport.name);
      });

      socket.on("connect_error", (err) => {
        const now = Date.now();
        if (now - lastConnectErrorAt > 15000) {
          console.error("❌ Socket connection error:", err.message);
          lastConnectErrorAt = now;
        }
      });

      socket.on("disconnect", (reason) => {
        console.log("⚠️ Socket disconnected:", reason);
      });

      socket.on("reconnect", (attemptNumber) => {
        console.log("🔄 Socket reconnected after", attemptNumber, "attempts");
      });

      return socket;
    } catch (error) {
      console.error("❌ Error initializing socket:", error);
      return null;
    }
  })();

  return initPromise;
};

// Get socket - synchronous for already initialized, triggers async init if needed
export const getSocket = () => {
  if (!socket && !initPromise) {
    // Start initialization in the background
    initSocket().catch(console.error);
  }
  return socket;
};

// Ensure socket is initialized
export const ensureSocketInitialized = async () => {
  if (socket) return socket;
  await initSocket();
  return socket;
};

// Join user's notification room
export const joinUserRoom = (userId) => {
  const s = getSocket();
  if (userId && s?.connected) {
    s.emit("join_user_room", { userId });
  }
};

// Mark user as online
export const markUserOnline = (userId) => {
  const s = getSocket();
  if (!s) {
    console.warn("⚠️ Socket not initialized yet, will retry");
    // Retry after a short delay
    setTimeout(() => markUserOnline(userId), 500);
    return;
  }
  if (userId) {
    if (s.connected) {
      console.log("📤 Marking user online:", userId);
      s.emit("user_online", { userId });
    } else {
      console.warn("⚠️ Socket not connected, retrying");
      setTimeout(() => markUserOnline(userId), 1000);
    }
  }
};

// Chat room management
export const joinRoom = (chatId) => {
  const s = getSocket();
  if (chatId && s?.connected) {
    console.log("📤 Joining chat room:", chatId);
    s.emit("join_room", { chatId });
  } else if (chatId && s && !s.connected) {
    // Retry when connected
    setTimeout(() => joinRoom(chatId), 1000);
  }
};

// Typing indicators
export const sendTyping = (chatId, userId, userName) => {
  const s = getSocket();
  if (s?.connected) {
    s.emit("typing", { chatId, userId, userName });
  }
};

export const sendStopTyping = (chatId, userId) => {
  const s = getSocket();
  if (s?.connected) {
    s.emit("stop_typing", { chatId, userId });
  }
};

export const sendMessage = (payload, callback) => {
  const s = getSocket();
  if (s?.connected) {
    console.log("📤 Emitting send_message:", payload);
    s.emit("send_message", payload, (response) => {
      console.log("📥 send_message response:", response);
      if (callback) callback(response);
    });
  } else {
    console.error("❌ Socket not connected, cannot send message");
    if (callback) callback({ error: "Socket not connected" });
  }
};

export const onMessage = (handler) => {
  const s = getSocket();
  if (!s) {
    console.warn("Socket not initialized for message listener");
    return () => {};
  }
  s.on("receive_message", handler);
  return () => s.off("receive_message", handler);
};

// Notification listeners
export const onNewNotification = (handler) => {
  const s = getSocket();
  if (!s) {
    console.warn("Socket not initialized for notification listener");
    return () => {};
  }
  s.on("new_notification", handler);
  return () => s.off("new_notification", handler);
};
