import React, { useState } from "react";
import { useNotifications } from "../context/NotificationContext";
import { Trash2, CheckCircle } from "lucide-react";

export default function NotificationsPage() {
  const { notifications, markAsRead, deleteNotification } = useNotifications();
  const [filter, setFilter] = useState("all"); // all, unread, read
  const [sortBy, setSortBy] = useState("newest"); // newest, oldest

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "read") return n.read;
    return true;
  });

  const sortedNotifications = [...filteredNotifications].sort((a, b) => {
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);
    return sortBy === "newest" ? dateB - dateA : dateA - dateB;
  });

  const notificationTypeColors = {
    post_liked: "bg-red-50 border-red-200",
    post_commented: "bg-blue-50 border-blue-200",
    follow: "bg-green-50 border-green-200",
    message_received: "bg-purple-50 border-purple-200",
    request_received: "bg-orange-50 border-orange-200",
    request_accepted: "bg-green-50 border-green-200",
    request_rejected: "bg-red-50 border-red-200",
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
        <p className="text-gray-600">
          Stay updated with your latest activities and interactions
        </p>
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-wrap gap-3">
        {/* Filter Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === "unread"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Unread ({notifications.filter((n) => !n.read).length})
          </button>
          <button
            onClick={() => setFilter("read")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === "read"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Read ({notifications.filter((n) => n.read).length})
          </button>
        </div>

        {/* Sort Dropdown */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:border-gray-400 transition"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {sortedNotifications.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500 text-lg">
              {filter === "unread"
                ? "All caught up! No unread notifications"
                : "No notifications to display"}
            </p>
          </div>
        ) : (
          sortedNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border ${
                notificationTypeColors[notification.type] ||
                "bg-gray-50 border-gray-200"
              } hover:shadow-md transition group`}
            >
              <div className="flex gap-4">
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {notification.title}
                      </h3>
                      <p className="text-gray-700 mt-1">
                        {notification.message}
                      </p>
                    </div>
                    {!notification.read && (
                      <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-1"></span>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                    <span>
                      {new Date(notification.createdAt).toLocaleString()}
                    </span>
                    {notification.actionUrl && (
                      <a
                        href={notification.actionUrl}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View
                      </a>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 flex gap-2">
                  {!notification.read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-white rounded transition"
                      title="Mark as read"
                    >
                      <CheckCircle size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-white rounded transition"
                    title="Delete notification"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
