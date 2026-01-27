import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useSyncContext } from "../context/SyncContext";
import { chatService } from "../services/api";

const ChatListScreen = () => {
  const navigation = useNavigation();
  const { user, token, loading: authLoading, isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadChats = async () => {
    try {
      setError("");
      const { data } = await chatService.getUserChats();
      setChats(data);
    } catch (error) {
      console.error("Failed to load chats:", error);
      if (error?.response?.status === 401) {
        setChats([]);
        setError("Sign in to view chats.");
      } else if (
        error?.code === "ECONNABORTED" ||
        error?.message?.includes("timeout")
      ) {
        setError(
          "Connection timeout. Please check your network and try again.",
        );
      } else {
        setError(error?.response?.data?.message || "Failed to load chats");
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChats();
    setRefreshing(false);
  };

  useEffect(() => {
    if (authLoading) return; // wait for auth bootstrap
    if (!isAuthenticated || !token) {
      setLoading(false);
      return; // avoid 401 before login
    }
    loadChats();
  }, [authLoading, isAuthenticated, token]);

  // Real-time updates via SyncContext
  const { syncEvents } = useSyncContext();
  useEffect(() => {
    if (
      syncEvents.newNotification &&
      syncEvents.newNotification.type === "message_received"
    ) {
      loadChats();
    }
  }, [syncEvents.newNotification]);

  const getChatName = (chat) => {
    if (chat.name) return chat.name;
    const otherParticipant = chat.participants.find(
      (p) => p.user.id !== user.id,
    );
    return otherParticipant?.user.name || "Unknown";
  };

  const getChatAvatar = (chat) => {
    const otherParticipant = chat.participants.find(
      (p) => p.user.id !== user.id,
    );
    return otherParticipant?.user.name?.charAt(0).toUpperCase() || "?";
  };

  const getLastMessage = (chat) => {
    return chat.messages[0]?.text || "No messages yet";
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    return "now";
  };

  const renderChat = ({ item }) => (
    <TouchableOpacity
      style={[styles.chatItem, { backgroundColor: colors.surface }]}
      onPress={() => navigation.navigate("Chat", { chatId: item.id })}
    >
      <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
        <Text style={styles.avatarText}>{getChatAvatar(item)}</Text>
      </View>
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={[styles.chatName, { color: colors.textPrimary }]}>
            {getChatName(item)}
          </Text>
          {item.messages[0] && (
            <Text style={[styles.time, { color: colors.textMuted }]}>
              {formatTime(item.messages[0].timestamp)}
            </Text>
          )}
        </View>
        <Text
          style={[styles.lastMessage, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {getLastMessage(item)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Messages
        </Text>
      </View>
      {!!error && (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.danger }]}>
            {error}
          </Text>
        </View>
      )}
      <FlatList
        data={chats}
        renderItem={renderChat}
        keyExtractor={(item, index) => `chat-${item?.id ?? index}-${index}`}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No chats yet. Start a conversation!
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  chatItem: {
    flexDirection: "row",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  chatInfo: {
    flex: 1,
    justifyContent: "center",
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: "600",
  },
  time: {
    fontSize: 12,
  },
  lastMessage: {
    fontSize: 14,
  },
  empty: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
  },
});

export default ChatListScreen;
