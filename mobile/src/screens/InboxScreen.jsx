import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Animated,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { notificationService, requestService } from "../services/api";
import { useFadeInAnimation } from "../utils/animations";

const InboxScreen = () => {
  const { user } = useAuth();
  const [mode, setMode] = useState("notifications"); // 'notifications' | 'requests'
  const [notifications, setNotifications] = useState([]);
  const [requests, setRequests] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const { colors } = useTheme();

  const loadNotifications = async () => {
    if (!user?.id) return;
    try {
      const { data } = await notificationService.getAll(user.id);
      setNotifications(data);
    } catch (_) {}
  };

  const loadRequests = async () => {
    if (!user?.id) return;
    try {
      const { data } = await requestService.getReceived(user.id);
      setRequests(data);
    } catch (_) {}
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadNotifications(), loadRequests()]);
    setRefreshing(false);
  };

  useEffect(() => {
    onRefresh();
    const interval = setInterval(onRefresh, 15000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const markRead = async (id) => {
    try {
      await notificationService.markRead(id);
      await loadNotifications();
    } catch (_) {}
  };

  const removeNotification = async (id) => {
    try {
      await notificationService.remove(id);
      await loadNotifications();
    } catch (_) {}
  };

  const updateRequest = async (id, status) => {
    try {
      await requestService.updateStatus(id, status);
      await loadRequests();
    } catch (_) {}
  };

  const renderNotification = ({ item }) => (
    <Animated.View
      style={[
        styles.card,
        { backgroundColor: colors.surface },
        item.read && { backgroundColor: colors.background },
      ]}
    >
      <Text style={[styles.icon, { color: colors.textPrimary }]}>
        {icons[item.type] || "🔔"}
      </Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {item.title}
        </Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>
          {item.message}
        </Text>
        <Text style={[styles.time, { color: colors.textMuted }]}>
          {new Date(item.createdAt).toLocaleString()}
        </Text>
      </View>
      <View style={styles.row}>
        {!item.read && (
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.border }]}
            onPress={() => markRead(item.id)}
          >
            <Text style={[styles.btnText, { color: colors.textPrimary }]}>
              ✓
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.danger }]}
          onPress={() => removeNotification(item.id)}
        >
          <Text style={[styles.btnText, { color: "#fff" }]}>✕</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderRequest = ({ item }) => (
    <Animated.View style={[styles.card, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {item.fromUser?.name || "Unknown requester"}
      </Text>
      {item.skill?.title && (
        <Text style={[styles.sub, { color: colors.textSecondary }]}>
          Skill: {item.skill.title}
        </Text>
      )}
      <Text style={[styles.sub, { color: colors.textSecondary }]}>
        Status: {item.status}
      </Text>
      <Text style={[styles.time, { color: colors.textMuted }]}>
        {new Date(item.createdAt).toLocaleString()}
      </Text>
      {item.status === "pending" && (
        <View style={[styles.row, { marginTop: 8 }]}>
          <TouchableOpacity
            style={[styles.action, { backgroundColor: colors.success }]}
            onPress={() => updateRequest(item.id, "accepted")}
          >
            <Text style={[styles.actionText, { color: "#fff" }]}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.action, { backgroundColor: colors.danger }]}
            onPress={() => updateRequest(item.id, "rejected")}
          >
            <Text style={[styles.actionText, { color: "#fff" }]}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );

  return (
    <Animated.View
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={[styles.segmented, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          onPress={() => setMode("notifications")}
          style={[
            styles.segmentBtn,
            { backgroundColor: colors.surface },
            mode === "notifications" && { backgroundColor: colors.primary },
          ]}
        >
          <Text
            style={[
              styles.segmentText,
              { color: colors.textSecondary },
              mode === "notifications" && { color: "#fff" },
            ]}
          >
            Notifications
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setMode("requests")}
          style={[
            styles.segmentBtn,
            { backgroundColor: colors.surface },
            mode === "requests" && { backgroundColor: colors.primary },
          ]}
        >
          <Text
            style={[
              styles.segmentText,
              { color: colors.textSecondary },
              mode === "requests" && { color: "#fff" },
            ]}
          >
            Requests
          </Text>
        </TouchableOpacity>
      </View>

      {mode === "notifications" ? (
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
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.textSecondary }]}>
              No notifications
            </Text>
          }
        />
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequest}
          keyExtractor={(item, index) =>
            `request-${item?.id ?? index}-${item?.createdAt ?? index}`
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.textSecondary }]}>
              No requests
            </Text>
          }
        />
      )}
    </Animated.View>
  );
};

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  segmented: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    backgroundColor: "#fff",
  },
  segmentBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
  },
  segmentActive: { backgroundColor: "#3b82f6" },
  segmentText: { fontSize: 14, fontWeight: "600", color: "#334155" },
  segmentTextActive: { color: "#fff" },

  listContent: { paddingHorizontal: 16, paddingVertical: 8 },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginVertical: 6,
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  readCard: { backgroundColor: "#f3f4f6" },
  icon: { fontSize: 22, marginRight: 12 },
  title: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  sub: { fontSize: 13, color: "#475569", marginTop: 2 },
  time: { fontSize: 12, color: "#94a3b8", marginTop: 4 },
  row: { flexDirection: "row", gap: 8, alignItems: "center" },
  btn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#e5e7eb",
    borderRadius: 8,
  },
  btnDanger: { backgroundColor: "#fecaca" },
  btnText: { fontWeight: "700", color: "#0f172a" },

  action: { flex: 1, padding: 10, borderRadius: 8, alignItems: "center" },
  accept: { backgroundColor: "#10b981" },
  reject: { backgroundColor: "#ef4444" },
  actionText: { color: "#fff", fontWeight: "700" },
  empty: { textAlign: "center", color: "#94a3b8", marginTop: 24 },
});

export default InboxScreen;
