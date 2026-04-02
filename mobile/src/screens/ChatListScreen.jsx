import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Image,
  TextInput,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useSyncContext } from "../context/SyncContext";
import { chatService, API_BASE } from "../services/api";
import { getSocket } from "../services/socket";

const toAbsoluteUrl = (url) => {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  const baseUrl = API_BASE.replace(/\/api$/, "");
  return `${baseUrl}${url}`;
};

const ChatListScreen = () => {
  const navigation = useNavigation();
  const { user, token, loading: authLoading, isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

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

  // Update sender avatars/names in chat list when profile changes elsewhere.
  useEffect(() => {
    const event = syncEvents?.userUpdated;
    if (!event?.userId || !event?.updates) return;

    const userId = event.userId;
    const updates = event.updates;

    setChats((prev) =>
      prev.map((chat) => {
        const participants = (chat.participants || []).map((p) => {
          if (p?.user?.id !== userId) return p;
          return { ...p, user: { ...p.user, ...updates } };
        });

        const messages = Array.isArray(chat.messages)
          ? chat.messages.map((msg) => {
              if (msg?.sender?.id !== userId) return msg;
              return { ...msg, sender: { ...msg.sender, ...updates } };
            })
          : chat.messages;

        return { ...chat, participants, messages };
      }),
    );
  }, [syncEvents?.userUpdated]);

  // Listen for real-time chat events
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user?.id) {
      // Will retry when socket connects or user loads
      return;
    }

    // Wait a bit for socket to be connected if it's not already
    const checkConnection = async () => {
      const s = await socket.connectedPromise?.catch(() => null);
      if (!s?.connected) {
        console.warn("⚠️ Socket not fully connected for chat listeners");
      }
    };
    checkConnection();

    // Listen for new messages
    const handleReceiveMessage = (message) => {
      console.log("📨 New message received in chat list:", message);
      loadChats(); // Reload to update last message and unread count
    };

    const handleChatUpdateReload = () => {
      // Reload to keep last message preview consistent (edit/delete).
      loadChats();
    };

    // Listen for unread count updates
    const handleUnreadCountUpdate = ({ chatId, userId, unreadCount }) => {
      console.log("🔢 Unread count update:", { chatId, userId, unreadCount });
      if (userId === user.id) {
        setChats((prevChats) =>
          prevChats.map((chat) =>
            chat.id === chatId ? { ...chat, unreadCount } : chat,
          ),
        );
      }
    };

    // Listen for chat read events
    const handleChatRead = ({ chatId, userId }) => {
      console.log("✅ Chat read:", { chatId, userId });
      if (userId === user.id) {
        setChats((prevChats) =>
          prevChats.map((chat) =>
            chat.id === chatId ? { ...chat, unreadCount: 0 } : chat,
          ),
        );
      }
    };

    socket.on("receive_message", handleReceiveMessage);
    socket.on("unread_count_update", handleUnreadCountUpdate);
    socket.on("chat_read", handleChatRead);
    socket.on("message_deleted", handleChatUpdateReload);
    socket.on("message_edited", handleChatUpdateReload);
    socket.on("message_pinned", handleChatUpdateReload);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("unread_count_update", handleUnreadCountUpdate);
      socket.off("chat_read", handleChatRead);
      socket.off("message_deleted", handleChatUpdateReload);
      socket.off("message_edited", handleChatUpdateReload);
      socket.off("message_pinned", handleChatUpdateReload);
    };
  }, [user?.id]);

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

  const renderChat = ({ item }) => {
    const otherParticipant = item.participants.find(
      (p) => p.user.id !== user.id,
    );
    const profilePic = otherParticipant?.user?.profilePic;
    const avatarText =
      otherParticipant?.user?.name?.charAt(0).toUpperCase() || "?";
    const unreadCount = item.unreadCount || 0;

    return (
      <TouchableOpacity
        style={[styles.chatItem, { backgroundColor: colors.surface }]}
        onPress={() => navigation.navigate("Chat", { chatId: item.id })}
      >
        {profilePic ? (
          <Image
            source={{ uri: toAbsoluteUrl(profilePic) }}
            style={[styles.avatar, { backgroundColor: colors.primary }]}
          />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{avatarText}</Text>
          </View>
        )}
        {unreadCount > 0 && (
          <View
            style={[styles.unreadBadge, { backgroundColor: colors.danger }]}
          >
            <Text style={styles.unreadBadgeText}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </Text>
          </View>
        )}
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text
              style={[
                styles.chatName,
                {
                  color: colors.textPrimary,
                  fontWeight: unreadCount > 0 ? "600" : "500",
                },
              ]}
            >
              {getChatName(item)}
            </Text>
            {item.messages[0] && (
              <Text style={[styles.time, { color: colors.textMuted }]}>
                {formatTime(item.messages[0].timestamp)}
              </Text>
            )}
          </View>
          <Text
            style={[
              styles.lastMessage,
              {
                color:
                  unreadCount > 0 ? colors.textPrimary : colors.textSecondary,
                fontWeight: unreadCount > 0 ? "500" : "400",
              },
            ]}
            numberOfLines={1}
          >
            {getLastMessage(item)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

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
        <TextInput
          style={[
            styles.searchInput,
            {
              borderColor: colors.border,
              backgroundColor: colors.background,
              color: colors.textPrimary,
            },
          ]}
          placeholder="🔍 Search chats..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      {!!error && (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.danger }]}>
            {error}
          </Text>
        </View>
      )}
      <FlatList
        data={chats.filter((chat) => {
          const chatName = getChatName(chat).toLowerCase();
          const lastMessage = getLastMessage(chat).toLowerCase();
          const query = searchQuery.toLowerCase();
          return chatName.includes(query) || lastMessage.includes(query);
        })}
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
              {searchQuery
                ? "No chats match your search"
                : "No chats yet. Start a conversation!"}
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
    marginBottom: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
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
  unreadBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
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
