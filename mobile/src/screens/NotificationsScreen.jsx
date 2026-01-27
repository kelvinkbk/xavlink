import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useSyncContext } from "../context/SyncContext";
import api from "../services/api";

const NotificationsScreen = () => {
  const { user } = useAuth();
  const { syncEvents } = useSyncContext();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Real-time new notification
  useEffect(() => {
    if (syncEvents.newNotification) {
      setNotifications((prev) => [syncEvents.newNotification, ...prev]);
    }
  }, [syncEvents.newNotification]);

  useEffect(() => {
    fetchNotifications();
    // Keep polling as backup but reduce frequency if needed
    // const interval = setInterval(fetchNotifications, 30000);
    // return () => clearInterval(interval);
  }, [user?.id]);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get(`/notifications/${user?.id}`);
      setNotifications(data);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put(`/notifications/${user?.id}/read-all`);
      fetchNotifications();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      fetchNotifications();
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const getNotificationIcon = (type) => {
    const icons = {
      request_received: "📨",
      request_accepted: "✅",
      request_rejected: "❌",
      login_alert: "🔐",
      post_liked: "❤️",
      post_commented: "💬",
      follow: "🤝",
      message_received: "💬",
    };
    return icons[type] || "🔔";
  };

  const renderNotification = ({ item }) => (
    <View
      style={[styles.notificationCard, item.read && styles.readNotification]}
    >
      <Text style={styles.icon}>{getNotificationIcon(item.type)}</Text>
      <View style={styles.content}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.message}>{item.message}</Text>
        <Text style={styles.time}>
          {new Date(item.createdAt).toLocaleString()}
        </Text>
      </View>
      <View style={styles.actions}>
        {!item.read && (
          <TouchableOpacity
            onPress={() => handleMarkAsRead(item.id)}
            style={styles.actionButton}
          >
            <Text style={styles.actionText}>✓</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => handleDelete(item.id)}
          style={[styles.actionButton, styles.deleteButton]}
        >
          <Text style={styles.deleteText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      {notifications.length > 0 && (
        <TouchableOpacity
          style={styles.markAllButton}
          onPress={handleMarkAllAsRead}
        >
          <Text style={styles.markAllText}>Mark all as read</Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Loading notifications...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item, index) =>
            `notif-${item?.id ?? index}-${item?.createdAt ?? index}`
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    backgroundColor: "#1e293b",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
  },
  markAllButton: {
    backgroundColor: "#3b82f6",
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  markAllText: {
    color: "#ffffff",
    fontWeight: "600",
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  notificationCard: {
    flexDirection: "row",
    backgroundColor: "#dbeafe",
    borderLeftWidth: 4,
    borderLeftColor: "#3b82f6",
    borderRadius: 8,
    padding: 12,
    marginVertical: 6,
    alignItems: "flex-start",
  },
  readNotification: {
    backgroundColor: "#f3f4f6",
    borderLeftColor: "#d1d5db",
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
  },
  message: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 4,
  },
  time: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 6,
  },
  actions: {
    flexDirection: "row",
    marginRight: 8,
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  actionText: {
    color: "#3b82f6",
    fontWeight: "bold",
    fontSize: 16,
  },
  deleteButton: {
    marginLeft: 8,
  },
  deleteText: {
    color: "#ef4444",
    fontWeight: "bold",
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: "#94a3b8",
  },
});

export default NotificationsScreen;
