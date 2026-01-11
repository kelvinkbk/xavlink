import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PageTransition from "../components/PageTransition";
import api from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import SkeletonLoader from "../components/SkeletonLoader";
import { useToast } from "../context/ToastContext";

const Notifications = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;

    const fetchNotifications = async () => {
      try {
        const { data } = await api.get("/notifications");
        setNotifications(data.notifications);
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
        showToast("Failed to load notifications", "error");
        setLoading(false);
      }
    };

    const fetchUnreadCount = async () => {
      try {
        const { data } = await api.get("/notifications/unread-count");
        setUnreadCount(data.unreadCount);
      } catch (error) {
        console.error("Failed to fetch unread count:", error);
        // Non-blocking, so just toast for visibility
        showToast("Failed to update unread count", "error");
      }
    };

    fetchNotifications();
    fetchUnreadCount();

    const interval = setInterval(() => {
      fetchNotifications();
      fetchUnreadCount();
    }, 10000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      // Refresh list
      const { data } = await api.get("/notifications");
      setNotifications(data.notifications);
      showToast("Marked as read", "success");
    } catch (error) {
      console.error("Failed to mark as read:", error);
      showToast("Failed to mark as read", "error");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put("/notifications/read-all");
      const { data } = await api.get("/notifications");
      setNotifications(data.notifications);
      setUnreadCount(0);
      showToast("All notifications marked as read", "success");
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      showToast("Failed to mark all as read", "error");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      const { data } = await api.get("/notifications");
      setNotifications(data.notifications);
      showToast("Notification deleted", "success");
    } catch (error) {
      console.error("Failed to delete notification:", error);
      showToast("Failed to delete notification", "error");
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read
    if (!notification.read) {
      await handleMarkAsRead(notification.id);
    }

    // Navigate based on type
    if (
      notification.type === "post_liked" ||
      notification.type === "post_commented"
    ) {
      navigate("/"); // Navigate to home feed (where posts are displayed)
    } else if (notification.type === "follow") {
      navigate("/profile"); // Navigate to profile
    } else if (notification.type.includes("request")) {
      navigate("/requests"); // Navigate to requests
    } else if (notification.type === "message_received") {
      navigate("/chat"); // Navigate to chat (when implemented)
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      request_received: "📨",
      request_accepted: "✅",
      request_rejected: "❌",
      login_alert: "🔐",
      post_liked: "❤️",
      post_commented: "💬",
      message_received: "📩",
      follow: "👥",
    };
    return icons[type] || "🔔";
  };

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-secondary">Notifications</h1>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition text-sm"
            >
              Mark all as read ({unreadCount})
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            <SkeletonLoader type="card" />
            <SkeletonLoader type="card" />
            <div className="flex justify-center py-6">
              <LoadingSpinner />
            </div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-2xl mb-2">🔔</p>
            <p className="text-gray-500">No notifications yet</p>
            <button
              onClick={async () => {
                setLoading(true);
                try {
                  const { data } = await api.get("/notifications");
                  setNotifications(data.notifications);
                  showToast("Notifications refreshed", "success");
                } catch (e) {
                  console.error("Refresh notifications failed:", e);
                  showToast("Failed to load notifications", "error");
                } finally {
                  setLoading(false);
                }
              }}
              className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border-l-4 transition cursor-pointer hover:shadow-md ${
                  notification.read
                    ? "bg-gray-50 border-gray-300"
                    : "bg-blue-50 border-primary"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div
                    className="flex items-start space-x-3 flex-1"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <span className="text-2xl">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-secondary">
                        {notification.title}
                      </h3>
                      <p className="text-gray-600 text-sm mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-2">
                    {!notification.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notification.id);
                        }}
                        className="p-2 hover:bg-gray-200 rounded-full transition"
                        title="Mark as read"
                      >
                        ✓
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(notification.id);
                      }}
                      className="p-2 hover:bg-red-200 rounded-full transition text-red-600"
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
};

export default Notifications;
