import { io } from "socket.io-client";
import { API_BASE } from "./api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Alert } from "react-native";

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
      const transports = ["websocket", "polling"]; // Always prefer websocket

      socket = io(SOCKET_URL, {
        transports,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1500,
        reconnectionDelayMax: 5000,
        timeout: 60000, // Important on Render: wait 60s for cold starts
        auth: {
          token: token || "",
        },
      });

      socket.on("connect", () => {
        console.log("✅ Socket connected:", socket.id);
        console.log("🔗 Transport:", socket.io.engine.transport.name);

        // Send device token to backend when socket connects
        sendDeviceTokenToBackend();
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

// Send device token to backend for push notifications
const sendDeviceTokenToBackend = async () => {
  try {
    // Show alert immediately to confirm this function is being called
    Alert.alert("🔔 Device Token", "Function called! Starting device token send...");

    console.log("🔔 [DeviceToken] Starting device token send...");

    // Get user from AsyncStorage (saved as JSON string after login)
    const userJson = await AsyncStorage.getItem("user");
    console.log(
      "🔔 [DeviceToken] User from storage:",
      userJson ? "✅ Found" : "❌ Not found",
    );

    if (!userJson) {
      console.warn(
        "⚠️ [DeviceToken] No user found in AsyncStorage, cannot send device token",
      );
      return;
    }

    const userObj = JSON.parse(userJson);
    const userId = userObj.id || userObj._id;
    console.log(
      "🔔 [DeviceToken] userId:",
      userId ? "✅ Found" : "❌ Not found",
    );

    if (!userId) {
      console.warn("⚠️ [DeviceToken] No userId found in user object");
      return;
    }

    // Get Expo push token for this device
    console.log("🔔 [DeviceToken] Getting Expo push token...");
    const token = await Notifications.getExpoPushTokenAsync();
    console.log(
      "🔔 [DeviceToken] Expo token:",
      token?.data ? "✅ Got token" : "❌ Failed",
    );

    if (!token?.data) {
      console.warn("⚠️ [DeviceToken] Failed to get Expo push token");
      return;
    }

    const s = getSocket();
    console.log(
      "🔔 [DeviceToken] Socket connected:",
      s?.connected ? "✅ Yes" : "❌ No",
    );

    if (s?.connected) {
      console.log("🔔 [DeviceToken] Emitting save_device_token...");
      s.emit("save_device_token", {
        userId,
        token: token.data,
      });
      console.log(
        "✅ Device token sent to backend:",
        token.data.substring(0, 30) + "...",
      );
    } else {
      console.warn(
        "⚠️ [DeviceToken] Socket not connected, cannot send device token",
      );
    }
  } catch (error) {
    console.error(
      "❌ [DeviceToken] Error sending device token:",
      error.message || error,
    );
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

// Message Reactions
export const sendReaction = (chatId, messageId, emoji) => {
  const s = getSocket();
  if (s?.connected) {
    console.log("📤 Emitting add_reaction:", { chatId, messageId, emoji });
    s.emit("add_reaction", { chatId, messageId, emoji }, (response) => {
      console.log("📥 add_reaction response:", response);
    });
  } else {
    console.error("❌ Socket not connected, cannot send reaction");
  }
};

export const removeMessageReaction = (chatId, messageId, emoji) => {
  const s = getSocket();
  if (s?.connected) {
    console.log("📤 Emitting remove_reaction:", { chatId, messageId, emoji });
    s.emit("remove_reaction", { chatId, messageId, emoji }, (response) => {
      console.log("📥 remove_reaction response:", response);
    });
  }
};

export const onReaction = (handler) => {
  const s = getSocket();
  if (!s) {
    console.warn("Socket not initialized for reaction listener");
    return () => {};
  }
  s.on("reaction_added", handler);
  return () => s.off("reaction_added", handler);
};

export const onReactionRemoved = (handler) => {
  const s = getSocket();
  if (!s) {
    console.warn("Socket not initialized for reaction removed listener");
    return () => {};
  }
  s.on("reaction_removed", handler);
  return () => s.off("reaction_removed", handler);
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
