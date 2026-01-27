import { useState, useEffect } from "react";
import { socket } from "../services/socket";

export const useSync = () => {
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
    if (!socket) return;

    // Post events
    const handleNewPost = (data) =>
      setSyncEvents((prev) => ({ ...prev, newPost: data }));
    const handlePostLiked = (data) =>
      setSyncEvents((prev) => ({ ...prev, postLiked: data }));
    const handlePostUnliked = (data) =>
      setSyncEvents((prev) => ({ ...prev, postUnliked: data }));
    const handleNewComment = (data) =>
      setSyncEvents((prev) => ({ ...prev, newComment: data }));
    const handlePostDeleted = (data) =>
      setSyncEvents((prev) => ({ ...prev, postDeleted: data }));
    const handlePostUpdated = (data) =>
      setSyncEvents((prev) => ({ ...prev, postUpdated: data }));

    // User/Profile events
    const handleUserUpdated = (data) =>
      setSyncEvents((prev) => ({ ...prev, userUpdated: data }));
    const handleUserFollowed = (data) =>
      setSyncEvents((prev) => ({ ...prev, userFollowed: data }));
    const handleUserUnfollowed = (data) =>
      setSyncEvents((prev) => ({ ...prev, userUnfollowed: data }));

    // Notification events
    const handleNewNotification = (data) =>
      setSyncEvents((prev) => ({ ...prev, newNotification: data }));
    const handleUnreadCount = (data) =>
      setSyncEvents((prev) => ({ ...prev, unreadCount: data }));

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

  return syncEvents;
};
