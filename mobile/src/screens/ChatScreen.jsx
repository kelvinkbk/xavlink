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
  const { setIsVisible } = useFABVisibility();
  const {
    scaleAnim: sendScale,
    onPressIn: onSendPressIn,
    onPressOut: onSendPressOut,
  } = useScalePressAnimation();
  const [messages, setMessages] = useState([]);
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

    // Load existing messages
    const loadMessages = async () => {
      try {
        const { data } = await chatService.getChatMessages(chatId);
        setMessages(Array.isArray(data) ? data : []);
        setError("");
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

    loadMessages();
    joinRoom(chatId).catch(console.error);

    // Listen for incoming messages
    const off = onMessage((msg) => {
      if (msg.chatId !== chatId) return;
      const keyOf = (m) =>
        m?.id ??
        `${m?.senderId}-${m?.text}-${m?.createdAt ?? m?.timestamp ?? ""}`;
      setMessages((prev) => {
        if (prev.some((p) => keyOf(p) === keyOf(msg))) return prev;
        return [...prev, msg];
      });
      requestAnimationFrame(() =>
        listRef.current?.scrollToEnd({ animated: true }),
      );
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
          renderItem={({ item }) => (
            <Animated.View
              style={[
                styles.bubble,
                item.senderId === user?.id
                  ? { backgroundColor: colors.primary, alignSelf: "flex-end" }
                  : {
                      backgroundColor: colors.surface,
                      alignSelf: "flex-start",
                    },
                { opacity: new Animated.Value(0.5) },
              ]}
            >
              {item.attachmentUrl && (
                <Image
                  source={{ uri: toAbsoluteUrl(item.attachmentUrl) }}
                  style={styles.attachmentImage}
                />
              )}
              <Text
                style={
                  item.senderId === user?.id
                    ? { color: "#fff" }
                    : { color: colors.textPrimary }
                }
              >
                {item.text}
              </Text>
            </Animated.View>
          )}
          contentContainerStyle={{ padding: 16 }}
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
  attachmentImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
    resizeMode: "cover",
  },
  bubble: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    maxWidth: "75%",
  },
  mine: { backgroundColor: "#3b82f6", alignSelf: "flex-end" },
  theirs: { backgroundColor: "#e2e8f0", alignSelf: "flex-start" },
  msgText: { color: "#0f172a" },
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
    borderRadius: 10,
    paddingHorizontal: 12,
    marginRight: 8,
    height: 44,
    backgroundColor: "#fff",
  },
  sendBtn: {
    backgroundColor: "#3b82f6",
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  sendText: { color: "#fff", fontWeight: "700" },
  typingIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
});

export default ChatScreen;
