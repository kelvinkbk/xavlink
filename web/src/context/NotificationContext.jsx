/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useSocket } from "./SocketContext";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Listen for new notifications
  useEffect(() => {
    if (!socket) return;

    // Handle new notification
    const handleNewNotification = (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };

    // Handle unread count update
    const handleUnreadCount = ({ unreadCount }) => {
      setUnreadCount(unreadCount);
    };

    // Handle notification deleted
    const handleNotificationDeleted = ({ notificationId }) => {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    };

    socket.on("notification:new", handleNewNotification);
    socket.on("notification:unread-count", handleUnreadCount);
    socket.on("notification:deleted", handleNotificationDeleted);

    return () => {
      socket.off("notification:new", handleNewNotification);
      socket.off("notification:unread-count", handleUnreadCount);
      socket.off("notification:deleted", handleNotificationDeleted);
    };
  }, [socket]);

  // Mark notification as read
  const markAsRead = useCallback(
    (notificationId) => {
      if (!socket) return;
      socket.emit("notification:read", { notificationId });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(prev - 1, 0));
    },
    [socket]
  );

  // Delete notification
  const deleteNotification = useCallback(
    (notificationId) => {
      if (!socket) return;
      socket.emit("notification:delete", { notificationId });
    },
    [socket]
  );

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const value = {
    notifications,
    unreadCount,
    markAsRead,
    deleteNotification,
    clearAll,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
};
