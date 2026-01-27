import React, { createContext, useContext, useEffect, useState } from "react";
import { getSocket, onMessage } from "../services/socket";

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
    const socket = getSocket();
    if (!socket) return;

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
    const handleNewNotification = (data) => {
      console.log("🔔 New notification:", data);
      setSyncEvents((prev) => ({ ...prev, newNotification: data }));
    };

    const handleUnreadCount = (data) => {
      console.log("🔢 Unread count:", data);
      setSyncEvents((prev) => ({ ...prev, unreadCount: data }));
    };

    // Register listeners
    socket.on("new_post", handleNewPost);
    socket.on("post_liked", handlePostLiked);
    socket.on("post_unliked", handlePostUnliked);
    socket.on("new_comment", handleNewComment);
    socket.on("post_deleted", handlePostDeleted);
    socket.on("post_updated", handlePostUpdated);
    socket.on("user_updated", handleUserUpdated);
    socket.on("user_followed", handleUserFollowed);
    socket.on("user_unfollowed", handleUserUnfollowed);
    socket.on("notification:new", handleNewNotification);
    socket.on("notification:unread-count", handleUnreadCount);

    // Cleanup
    return () => {
      socket.off("new_post", handleNewPost);
      socket.off("post_liked", handlePostLiked);
      socket.off("post_unliked", handlePostUnliked);
      socket.off("new_comment", handleNewComment);
      socket.off("post_deleted", handlePostDeleted);
      socket.off("post_updated", handlePostUpdated);
      socket.off("user_updated", handleUserUpdated);
      socket.off("user_followed", handleUserFollowed);
      socket.off("user_unfollowed", handleUserUnfollowed);
      socket.off("notification:new", handleNewNotification);
      socket.off("notification:unread-count", handleUnreadCount);
    };
  }, []);

  return (
    <SyncContext.Provider value={{ syncEvents }}>
      {children}
    </SyncContext.Provider>
  );
};
