import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PageTransition from "../components/PageTransition";
import api from "../services/api";
import { enhancementService } from "../services/api";
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
  const [groupByType, setGroupByType] = useState(false);
  const [timeFilter, setTimeFilter] = useState("all"); // "today", "week", "month", "all"
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const fetchNotifications = async () => {
      try {
        setLoading(true);
        if (showArchived) {
          const { notifications: archivedData } =
            await enhancementService.getArchivedNotifications();
          setNotifications(archivedData || []);
        } else if (groupByType) {
          const { notifications: groupedData } =
            await enhancementService.getGroupedNotifications(timeFilter);
          setNotifications(groupedData || []);
        } else {
          const { data } = await api.get(`/notifications`);
          // Backend returns { notifications: [...] }
          let fetchedNotifications = data.notifications || data || [];
          // Apply time filter client-side if not using grouped endpoint
          if (timeFilter !== "all") {
            const filterDate = new Date();
            if (timeFilter === "today") {
              filterDate.setHours(0, 0, 0, 0);
            } else if (timeFilter === "week") {
              filterDate.setDate(filterDate.getDate() - 7);
            } else if (timeFilter === "month") {
              filterDate.setMonth(filterDate.getMonth() - 1);
            }
            fetchedNotifications = fetchedNotifications.filter(
              (n) => new Date(n.createdAt) >= filterDate
            );
          }
          setNotifications(fetchedNotifications);
        }
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
        showToast("Failed to load notifications", "error");
        setLoading(false);
      }
    };

    const fetchUnreadCount = async () => {
      try {
        const { data } = await api.get(`/notifications/unread-count`);
        // Backend returns { unreadCount: number } or { count: number }
        setUnreadCount(data.unreadCount ?? data.count ?? 0);
      } catch (error) {
        console.error("Failed to fetch unread count:", error);
        // Non-blocking, so just toast for visibility
        // Don't show toast for 404s as it's not critical
        if (error.response?.status !== 404) {
          showToast("Failed to update unread count", "error");
        }
      }
    };

    fetchNotifications();
    if (!showArchived) {
      fetchUnreadCount();
    }

    const interval = setInterval(() => {
      fetchNotifications();
      if (!showArchived) {
        fetchUnreadCount();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, groupByType, timeFilter, showArchived]);

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark as read:", error);
      showToast("Failed to mark as read", "error");
    }
  };

  const handlePin = async (id) => {
    try {
      await enhancementService.pinNotification(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n))
      );
    } catch (error) {
      console.error("Failed to pin notification:", error);
      showToast("Failed to pin notification", "error");
    }
  };

  const handleArchive = async (id) => {
    try {
      await enhancementService.archiveNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      showToast("Notification archived", "success");
    } catch (error) {
      console.error("Failed to archive notification:", error);
      showToast("Failed to archive notification", "error");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put(`/notifications/read-all`);
      const { data } = await api.get(`/notifications`);
      setNotifications(data?.notifications || data || []);
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
      setNotifications((prev) => prev.filter((n) => n.id !== id));
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

  // Group notifications by type if enabled
  const groupedNotifications = groupByType
    ? notifications.reduce((acc, notif) => {
        if (!acc[notif.type]) {
          acc[notif.type] = [];
        }
        acc[notif.type].push(notif);
        return acc;
      }, {})
    : null;

  // Sort notifications: pinned first, then by date
  const sortedNotifications = [...notifications].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-secondary">
            {showArchived ? "Archived Notifications" : "Notifications"}
            {!showArchived && unreadCount > 0 && (
              <span className="ml-2 text-lg text-primary">
                ({unreadCount} unread)
              </span>
            )}
          </h1>
          {!showArchived && unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition text-sm"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Time:</label>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={groupByType}
              onChange={(e) => setGroupByType(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Group by type</span>
          </label>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-3 py-1 rounded-lg text-sm ${
              showArchived
                ? "bg-gray-200 text-gray-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {showArchived ? "Show Active" : "Show Archived"}
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            <SkeletonLoader type="card" />
            <SkeletonLoader type="card" />
            <div className="flex justify-center py-6">
              <LoadingSpinner />
            </div>
          </div>
        ) : sortedNotifications.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-2xl mb-2">🔔</p>
            <p className="text-gray-500">
              {showArchived
                ? "No archived notifications"
                : "No notifications yet"}
            </p>
          </div>
        ) : groupByType && groupedNotifications ? (
          <div className="space-y-6">
            {Object.entries(groupedNotifications).map(
              ([type, typeNotifications]) => (
                <div key={type}>
                  <h2 className="text-lg font-semibold text-secondary mb-3 capitalize">
                    {type.replace(/_/g, " ")} ({typeNotifications.length})
                  </h2>
                  <div className="space-y-3">
                    {typeNotifications
                      .sort((a, b) => {
                        if (a.isPinned && !b.isPinned) return -1;
                        if (!a.isPinned && b.isPinned) return 1;
                        return new Date(b.createdAt) - new Date(a.createdAt);
                      })
                      .map((notification) => (
                        <NotificationCard
                          key={notification.id}
                          notification={notification}
                          onMarkAsRead={handleMarkAsRead}
                          onDelete={handleDelete}
                          onPin={handlePin}
                          onArchive={handleArchive}
                          onClick={handleNotificationClick}
                          getIcon={getNotificationIcon}
                        />
                      ))}
                  </div>
                </div>
              )
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                onDelete={handleDelete}
                onPin={handlePin}
                onArchive={handleArchive}
                onClick={handleNotificationClick}
                getIcon={getNotificationIcon}
              />
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
};

// Notification Card Component
function NotificationCard({
  notification,
  onMarkAsRead,
  onDelete,
  onPin,
  onArchive,
  onClick,
  getIcon,
}) {
  return (
    <div
      className={`p-4 rounded-lg border-l-4 transition cursor-pointer hover:shadow-md ${
        notification.read
          ? "bg-gray-50 border-gray-300"
          : "bg-blue-50 border-primary"
      } ${notification.isPinned ? "ring-2 ring-yellow-400" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div
          className="flex items-start space-x-3 flex-1"
          onClick={() => onClick(notification)}
        >
          <span className="text-2xl">{getIcon(notification.type)}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-secondary">
                {notification.title}
              </h3>
              {notification.isPinned && (
                <span className="text-yellow-500" title="Pinned">
                  📌
                </span>
              )}
            </div>
            <p className="text-gray-600 text-sm mt-1">{notification.message}</p>
            <p className="text-xs text-gray-400 mt-2">
              {new Date(notification.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1 ml-2">
          {!notification.read && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead(notification.id);
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
              onPin(notification.id);
            }}
            className={`p-2 rounded-full transition ${
              notification.isPinned
                ? "bg-yellow-100 text-yellow-600"
                : "hover:bg-gray-200"
            }`}
            title={notification.isPinned ? "Unpin" : "Pin"}
          >
            📌
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onArchive(notification.id);
            }}
            className="p-2 hover:bg-gray-200 rounded-full transition"
            title="Archive"
          >
            📦
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(notification.id);
            }}
            className="p-2 hover:bg-red-200 rounded-full transition text-red-600"
            title="Delete"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

export default Notifications;
