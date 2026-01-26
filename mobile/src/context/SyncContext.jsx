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

    // Register listeners
    socket.on("new_post", handleNewPost);
    socket.on("post_liked", handlePostLiked);
    socket.on("post_unliked", handlePostUnliked);
    socket.on("new_comment", handleNewComment);
    socket.on("post_deleted", handlePostDeleted);
    socket.on("post_updated", handlePostUpdated);

    // Cleanup
    return () => {
      socket.off("new_post", handleNewPost);
      socket.off("post_liked", handlePostLiked);
      socket.off("post_unliked", handlePostUnliked);
      socket.off("new_comment", handleNewComment);
      socket.off("post_deleted", handlePostDeleted);
      socket.off("post_updated", handlePostUpdated);
    };
  }, []);

  return (
    <SyncContext.Provider value={{ syncEvents }}>
      {children}
    </SyncContext.Provider>
  );
};
