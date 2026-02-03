import React, { createContext, useContext, useEffect, useState } from "react";
import * as Notifications from "expo-notifications";
import { getSocket } from "../services/socket";

const SyncContext = createContext();

export const useSyncContext = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error("useSyncContext must be used within SyncProvider");
  }
  return context;
};

export const SyncProvider = ({ children }) => {
  const [syncEvents, setSyncEvents] = useState({
    newPost: null,
    postLiked: null,
    postUnliked: null,
    newComment: null,
    postDeleted: null,
    postUpdated: null,
    userUpdated: null,
    userFollowed: null,
    userUnfollowed: null,
    newNotification: null,
    unreadCount: null,
  });

  useEffect(() => {
    // Try to get socket, which may be initializing
    let socket = getSocket();
    let retries = 0;
    const maxRetries = 10;

    const setupListeners = (s) => {
      if (!s) return;

      // Listen for post events
      const handleNewPost = (data) => {
        console.log("🆕 New post received:", data);
        setSyncEvents((prev) => ({ ...prev, newPost: data }));
      };

      const handlePostLiked = (data) => {
        console.log("❤️ Post liked:", data);
        setSyncEvents((prev) => ({ ...prev, postLiked: data }));
      };

      const handlePostUnliked = (data) => {
        console.log("💔 Post unliked:", data);
        setSyncEvents((prev) => ({ ...prev, postUnliked: data }));
      };

      const handleNewComment = (data) => {
        console.log("💬 New comment:", data);
        setSyncEvents((prev) => ({ ...prev, newComment: data }));
      };

      const handlePostDeleted = (data) => {
        console.log("🗑️ Post deleted:", data);
        setSyncEvents((prev) => ({ ...prev, postDeleted: data }));
      };

      const handlePostUpdated = (data) => {
        console.log("✏️ Post updated:", data);
        setSyncEvents((prev) => ({ ...prev, postUpdated: data }));
      };

      // User/Profile events
      const handleUserUpdated = (data) => {
        console.log("👤 User updated:", data);
        setSyncEvents((prev) => ({ ...prev, userUpdated: data }));
      };

      const handleUserFollowed = (data) => {
        console.log("➕ User followed:", data);
        setSyncEvents((prev) => ({ ...prev, userFollowed: data }));
      };

      const handleUserUnfollowed = (data) => {
        console.log("➖ User unfollowed:", data);
        setSyncEvents((prev) => ({ ...prev, userUnfollowed: data }));
      };

      // Notification events
      const handleNewNotification = async (data) => {
        console.log("🔔 New notification:", data);
        setSyncEvents((prev) => ({ ...prev, newNotification: data }));

        // Send local notification to user
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: data.title || "New Notification",
              body: data.message || data.description || "",
              data: data,
            },
            trigger: null, // Show immediately
          });
          console.log("✅ Local notification sent");
        } catch (error) {
          console.error("Error sending local notification:", error);
        }
      };

      const handleUnreadCount = (data) => {
        console.log("🔢 Unread count:", data);
        setSyncEvents((prev) => ({ ...prev, unreadCount: data }));
      };

      // Register listeners
      s.on("new_post", handleNewPost);
      s.on("post_liked", handlePostLiked);
      s.on("post_unliked", handlePostUnliked);
      s.on("new_comment", handleNewComment);
      s.on("post_deleted", handlePostDeleted);
      s.on("post_updated", handlePostUpdated);
      s.on("user_updated", handleUserUpdated);
      s.on("user_followed", handleUserFollowed);
      s.on("user_unfollowed", handleUserUnfollowed);
      s.on("new_notification", handleNewNotification);
      s.on("notification:unread-count", handleUnreadCount);

      // Cleanup function
      return () => {
        s.off("new_post", handleNewPost);
        s.off("post_liked", handlePostLiked);
        s.off("post_unliked", handlePostUnliked);
        s.off("new_comment", handleNewComment);
        s.off("post_deleted", handlePostDeleted);
        s.off("post_updated", handlePostUpdated);
        s.off("user_updated", handleUserUpdated);
        s.off("user_followed", handleUserFollowed);
        s.off("user_unfollowed", handleUserUnfollowed);
        s.off("new_notification", handleNewNotification);
        s.off("notification:unread-count", handleUnreadCount);
      };
    };

    if (socket) {
      return setupListeners(socket);
    }

    // Socket not initialized yet, retry
    const checkInterval = setInterval(() => {
      socket = getSocket();
      retries++;
      if (socket) {
        clearInterval(checkInterval);
        return setupListeners(socket);
      }
      if (retries >= maxRetries) {
        console.warn("⚠️ Socket not initialized after retries in SyncContext");
        clearInterval(checkInterval);
      }
    }, 300);

    return () => clearInterval(checkInterval);
  }, []);

  return (
    <SyncContext.Provider value={{ syncEvents }}>
      {children}
    </SyncContext.Provider>
  );
};
