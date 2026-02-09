import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useScalePressAnimation } from "../utils/animations";
import {
  getSocket,
  joinRoom,
  sendMessage,
  onMessage,
  sendTyping,
  sendStopTyping,
} from "../services/socket";
import { chatService, uploadService, API_BASE } from "../services/api";
import { useFABVisibility } from "../context/FABVisibilityContext";

const toAbsoluteUrl = (url) => {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  // Remove /api suffix if present and append the url
  const baseUrl = API_BASE.replace(/\/api$/, "");
  return `${baseUrl}${url}`;
};

const ChatScreen = ({ route }) => {
  const { chatId } = route.params || {};
  const { user } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { setIsVisible } = useFABVisibility();
  const {
    scaleAnim: sendScale,
    onPressIn: onSendPressIn,
    onPressOut: onSendPressOut,
  } = useScalePressAnimation();
  const [messages, setMessages] = useState([]);
  const [chat, setChat] = useState(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [typingUsers, setTypingUsers] = useState([]);
  const listRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Hide FAB when this screen is active
  useEffect(() => {
    setIsVisible(false);
    return () => {
      setIsVisible(true);
    };
  }, [setIsVisible]);

  useEffect(() => {
    if (!chatId) {
      setError("No chat ID provided");
      setLoading(false);
      return;
    }

    // Load chat details and messages
    const loadChatData = async () => {
      try {
        // Try to get chat details (participants) if available
        try {
          const chats = await chatService.getUserChats();
          const currentChat = chats.data?.find((c) => c.id === chatId);
          if (currentChat) {
            setChat(currentChat);
            // Update navigation header with participant name
            const otherParticipant = currentChat.participants?.find(
              (p) => p.user?.id !== user?.id,
            );
            if (otherParticipant?.user?.name) {
              navigation.setOptions({
                title: otherParticipant.user.name,
              });
            }
          }
        } catch (e) {
          console.log("Could not load chat details:", e);
        }

        // Load messages
        const { data } = await chatService.getChatMessages(chatId);
        const sortedMessages = Array.isArray(data)
          ? [...data].sort((a, b) => {
              const timeA = new Date(a.createdAt || a.timestamp || 0).getTime();
              const timeB = new Date(b.createdAt || b.timestamp || 0).getTime();
              return timeA - timeB;
            })
          : [];
        setMessages(sortedMessages);
        setError("");

        // Scroll to bottom after messages load
        setTimeout(() => {
          if (sortedMessages.length > 0) {
            listRef.current?.scrollToEnd({ animated: false });
          }
        }, 200);
      } catch (error) {
        console.error("Failed to load messages:", error);
        setError(
          error?.response?.data?.message ||
            error?.message ||
            "Failed to load messages",
        );
      } finally {
        setLoading(false);
      }
    };

    loadChatData();
    joinRoom(chatId);

    // Listen for incoming messages
    const off = onMessage((msg) => {
      if (msg.chatId !== chatId) return;
      const keyOf = (m) =>
        m?.id ??
        `${m?.senderId}-${m?.text}-${m?.createdAt ?? m?.timestamp ?? ""}`;
      setMessages((prev) => {
        if (prev.some((p) => keyOf(p) === keyOf(msg))) return prev;
        const updated = [...prev, msg].sort((a, b) => {
          const timeA = new Date(a.createdAt || a.timestamp || 0).getTime();
          const timeB = new Date(b.createdAt || b.timestamp || 0).getTime();
          return timeA - timeB;
        });
        return updated;
      });
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    // Listen for typing indicators
    const socket = getSocket();
    const handleUserTyping = ({ userId, userName }) => {
      if (userId === user?.id) return; // Don't show own typing
      setTypingUsers((prev) => {
        if (prev.find((u) => u.userId === userId)) return prev;
        return [...prev, { userId, userName }];
      });
    };

    const handleUserStoppedTyping = ({ userId }) => {
      setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
    };

    socket.on("user_typing", handleUserTyping);
    socket.on("user_stopped_typing", handleUserStoppedTyping);

    // Mark chat as read when entering
    chatService.markChatAsRead(chatId).catch(console.error);

    return () => {
      off();
      socket.off("user_typing", handleUserTyping);
      socket.off("user_stopped_typing", handleUserStoppedTyping);
    };
  }, [chatId, user?.id]);

  const pickAttachment = async () => {
    try {
      console.log("pickAttachment: Starting...");
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log("pickAttachment: Permission status:", status);

      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Please grant media library access to upload images",
        );
        return;
      }

      console.log("pickAttachment: Launching image library...");
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        quality: 0.8,
      });

      console.log("pickAttachment: Result:", result);

      if (!result.canceled && result.assets?.[0]) {
        setUploadingAttachment(true);
        try {
          const asset = result.assets[0];
          console.log("pickAttachment: Asset:", asset);

          // Create FormData for React Native
          const formData = new FormData();
          formData.append("file", {
            uri: asset.uri,
            name: asset.fileName || "attachment.jpg",
            type: asset.type || "image/jpeg",
          });

          console.log("pickAttachment: Uploading...");
          const { url } = await uploadService.uploadChatAttachment(formData);
          console.log("pickAttachment: Upload success, URL:", url);
          setAttachmentUrl(url);
          Alert.alert("Success", "Image uploaded!");
        } catch (error) {
          console.error("pickAttachment: Upload error:", error);
          Alert.alert(
            "Upload failed",
            error.message || "Could not upload the attachment",
          );
        } finally {
          setUploadingAttachment(false);
        }
      } else {
        console.log("pickAttachment: User canceled or no asset");
      }
    } catch (error) {
      console.error("pickAttachment: Outer error:", error);
      Alert.alert("Error", error.message || "Failed to pick image");
    }
  };

  const handleTextChange = (newText) => {
    setText(newText);

    // Send typing indicator
    if (newText.trim() && chatId && user?.id) {
      sendTyping(chatId, user.id, user.name);

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 2 seconds of no input
      typingTimeoutRef.current = setTimeout(() => {
        sendStopTyping(chatId, user.id);
      }, 2000);
    } else if (!newText.trim() && chatId && user?.id) {
      sendStopTyping(chatId, user.id);
    }
  };

  const handleSend = () => {
    if ((!text.trim() && !attachmentUrl) || !chatId) return;

    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    sendStopTyping(chatId, user?.id);

    const tempId = Date.now().toString();
    const tempMessage = {
      id: tempId,
      chatId,
      senderId: user?.id,
      text: text.trim() || "(attachment)",
      attachmentUrl: attachmentUrl || undefined,
      createdAt: new Date().toISOString(),
      pending: true,
    };

    // 1. Optimistic Update
    setMessages((prev) => [...prev, tempMessage]);
    requestAnimationFrame(() =>
      listRef.current?.scrollToEnd({ animated: true }),
    );

    const payload = {
      chatId,
      senderId: user?.id,
      text: text.trim() || "(attachment)",
      attachmentUrl: attachmentUrl || undefined,
    };

    setText("");
    setAttachmentUrl("");

    // 2. Send with Acknowledgement
    sendMessage(payload, (response) => {
      if (response?.success && response?.message) {
        // Replace temp message with real one
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? response.message : m)),
        );
        // Scroll to bottom after sending
        setTimeout(() => {
          listRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        // Handle failure
        Alert.alert("Error", "Failed to send message");
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    });
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textSecondary, marginTop: 12 }}>
          Loading chat...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          },
        ]}
      >
        <Text style={{ color: "red", marginBottom: 12, textAlign: "center" }}>
          {error}
        </Text>
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            setError("");
            setLoading(true);
            chatService
              .getChatMessages(chatId)
              .then(({ data }) => {
                setMessages(Array.isArray(data) ? data : []);
                setError("");
              })
              .catch((e) => setError(e?.message || "Failed to load"))
              .finally(() => setLoading(false));
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "bold" }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item, idx) =>
            item?.id ? `msg-${item.id}-${idx}` : `msg-${idx}`
          }
          renderItem={({ item }) => {
            const isOwn = item.senderId === user?.id;
            const senderName =
              item.sender?.name ||
              (isOwn ? "You" : chat?.participants?.find((p) => p.user?.id === item.senderId)?.user?.name || "Unknown");
            const timestamp = item.createdAt || item.timestamp;
            const formattedTime = timestamp
              ? new Date(timestamp).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })
              : "";

            return (
              <View
                style={[
                  styles.messageContainer,
                  isOwn ? styles.messageContainerOwn : styles.messageContainerOther,
                ]}
              >
                {!isOwn && (
                  <Text style={[styles.senderName, { color: colors.textSecondary }]}>
                    {senderName}
                  </Text>
                )}
                <View
                  style={[
                    styles.bubble,
                    isOwn
                      ? { backgroundColor: colors.primary, alignSelf: "flex-end" }
                      : {
                          backgroundColor: colors.surface,
                          alignSelf: "flex-start",
                        },
                  ]}
                >
                  {item.attachmentUrl && (
                    <Image
                      source={{ uri: toAbsoluteUrl(item.attachmentUrl) }}
                      style={styles.attachmentImage}
                    />
                  )}
                  <Text
                    style={[
                      styles.messageText,
                      isOwn
                        ? { color: "#fff" }
                        : { color: colors.textPrimary },
                    ]}
                  >
                    {item.text}
                  </Text>
                  {formattedTime && (
                    <Text
                      style={[
                        styles.timestamp,
                        isOwn
                          ? { color: "rgba(255,255,255,0.7)" }
                          : { color: colors.textMuted },
                      ]}
                    >
                      {formattedTime}
                    </Text>
                  )}
                </View>
              </View>
            );
          }}
          contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 8 }}
          onContentSizeChange={() => {
            listRef.current?.scrollToEnd({ animated: false });
          }}
          onLayout={() => {
            if (messages.length > 0) {
              listRef.current?.scrollToEnd({ animated: false });
            }
          }}
        />

        {typingUsers.length > 0 && (
          <View
            style={[
              styles.typingIndicator,
              { backgroundColor: colors.surface },
            ]}
          >
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 12,
                fontStyle: "italic",
              }}
            >
              {typingUsers.map((u) => u.userName).join(", ")}{" "}
              {typingUsers.length === 1 ? "is" : "are"} typing...
            </Text>
          </View>
        )}

        <View
          style={[
            styles.inputRow,
            { backgroundColor: colors.surface, borderTopColor: colors.border },
          ]}
        >
          {attachmentUrl && (
            <View style={styles.attachmentPreview}>
              <Text style={{ color: colors.textPrimary, fontSize: 12 }}>
                📎 Attachment ready
              </Text>
              <TouchableOpacity onPress={() => setAttachmentUrl("")}>
                <Text style={{ color: "red", marginLeft: 8 }}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity
              onPress={pickAttachment}
              disabled={uploadingAttachment}
              style={[
                styles.attachBtn,
                { opacity: uploadingAttachment ? 0.5 : 1 },
              ]}
            >
              <Text style={{ fontSize: 20 }}>
                {uploadingAttachment ? "⏳" : "📎"}
              </Text>
            </TouchableOpacity>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  color: colors.textPrimary,
                },
              ]}
              placeholder="Type a message"
              value={text}
              onChangeText={handleTextChange}
              placeholderTextColor={colors.textMuted}
            />
            <Animated.View style={{ transform: [{ scale: sendScale }] }}>
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: colors.primary }]}
                onPress={handleSend}
                onPressIn={onSendPressIn}
                onPressOut={onSendPressOut}
                disabled={!text.trim() && !attachmentUrl}
              >
                <Text style={[styles.sendText, { color: "#fff" }]}>Send</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  messageContainer: {
    marginVertical: 4,
    marginHorizontal: 12,
    maxWidth: "80%",
  },
  messageContainerOwn: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  messageContainerOther: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  senderName: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
    marginLeft: 4,
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    maxWidth: "100%",
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  attachmentImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
    resizeMode: "cover",
  },
  inputRow: {
    padding: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  attachmentPreview: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  attachBtn: {
    width: 40,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 20,
    paddingHorizontal: 16,
    marginRight: 8,
    height: 44,
    backgroundColor: "#fff",
    fontSize: 15,
  },
  sendBtn: {
    backgroundColor: "#3b82f6",
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: "center",
    minHeight: 44,
  },
  sendText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  typingIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
});

export default ChatScreen;
