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

        // Send local notification to user (works even when app is backgrounded)
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: data.title || "XavLink Notification",
              body:
                data.message ||
                data.description ||
                "You have a new notification",
              sound: data.sound || "default",
              vibrate: [0, 250, 250, 250],
              badge: 1,
              categoryId: "notification",
              data: data,
            },
            trigger: null, // Show immediately
          });
          console.log("✅ Local notification sent");
        } catch (error) {
          console.error("Error sending local notification:", error);
        }
      };

      // New post notification
      const handleNewPostNotification = async (data) => {
        console.log("📝 New post notification:", data);
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `${data.userName || "Someone"} posted`,
              body: data.content?.substring(0, 80) || "Check out the new post",
              sound: "default",
              vibrate: [0, 250, 250, 250],
              badge: 1,
              data: { type: "post", ...data },
            },
            trigger: null,
          });
        } catch (error) {
          console.error("Error sending post notification:", error);
        }
      };

      // Message notification
      const handleNewMessageNotification = async (data) => {
        console.log("💬 New message notification:", data);
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `Message from ${data.senderName || "Unknown"}`,
              body: data.text?.substring(0, 80) || "You have a new message",
              sound: "default",
              vibrate: [0, 250, 250, 250],
              badge: 1,
              data: { type: "message", ...data },
            },
            trigger: null,
          });
        } catch (error) {
          console.error("Error sending message notification:", error);
        }
      };

      const handleUnreadCount = (data) => {
        console.log("🔢 Unread count:", data);
        setSyncEvents((prev) => ({ ...prev, unreadCount: data }));
      };

      // Register listeners
      s.on("new_post", (data) => {
        handleNewPost(data);
        // Send notification for new post
        handleNewPostNotification(data);
      });
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
      s.on("send_message", (data) => {
        // Send notification for new message
        handleNewMessageNotification(data);
      });

      // Cleanup function
      return () => {
        s.off("new_post");
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
        s.off("send_message");
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
