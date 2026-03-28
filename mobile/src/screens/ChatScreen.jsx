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
import { Audio } from "expo-av";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useScalePressAnimation } from "../utils/animations";
import VoiceMessageService from "../services/VoiceMessageService";
import {
  getSocket,
  joinRoom,
  sendMessage,
  onMessage,
  sendTyping,
  sendStopTyping,
  sendReaction,
  onReaction,
  onReactionRemoved,
  removeMessageReaction,
} from "../services/socket";
import { chatService, uploadService, API_BASE } from "../services/api";
import { useFABVisibility } from "../context/FABVisibilityContext";
import { MessageReactions } from "../components/MessageReactions";

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
  const [selectedMessageForReaction, setSelectedMessageForReaction] =
    useState(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playingMessageId, setPlayingMessageId] = useState(null);
  const [currentSound, setCurrentSound] = useState(null);
  const listRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const recordingDurationRef = useRef(null);
  const recordingPressRef = useRef(false);
  const recordingTimeoutRef = useRef(null);

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

    // Listen for reactions from other users
    const handleReactionAdded = ({ messageId, emoji, userId }) => {
      console.log("📥 Reaction added by user:", { messageId, emoji, userId });
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId) {
            return {
              ...msg,
              reactions: [...(msg.reactions || []), { emoji, userId }],
            };
          }
          return msg;
        }),
      );
    };

    const handleReactionRemoved = ({ messageId, emoji, userId }) => {
      console.log("📥 Reaction removed by user:", { messageId, emoji, userId });
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId) {
            return {
              ...msg,
              reactions: (msg.reactions || []).filter(
                (r) => !(r.emoji === emoji && r.userId === userId),
              ),
            };
          }
          return msg;
        }),
      );
    };

    socket.on("user_typing", handleUserTyping);
    socket.on("user_stopped_typing", handleUserStoppedTyping);
    socket.on("reaction_added", handleReactionAdded);
    socket.on("reaction_removed", handleReactionRemoved);

    // Mark chat as read when entering
    chatService.markChatAsRead(chatId).catch(console.error);

    return () => {
      off();
      socket.off("user_typing", handleUserTyping);
      socket.off("user_stopped_typing", handleUserStoppedTyping);
      socket.off("reaction_added", handleReactionAdded);
      socket.off("reaction_removed", handleReactionRemoved);
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

  const handleMessageReaction = async (emoji) => {
    console.log(
      "Reaction pressed:",
      emoji,
      "Message:",
      selectedMessageForReaction,
    );
    if (!selectedMessageForReaction) {
      console.warn("No message selected for reaction");
      return;
    }

    const messageId = selectedMessageForReaction.id;

    // Optimistic update - add reaction to local state immediately
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId) {
          console.log("Adding reaction to message:", msg.id);
          return {
            ...msg,
            reactions: [...(msg.reactions || []), { emoji, userId: user?.id }],
          };
        }
        return msg;
      }),
    );

    // Clear selection
    setSelectedMessageForReaction(null);
    setShowReactionPicker(false);

    // Persist to backend
    try {
      console.log("📤 Saving reaction to backend:", {
        chatId,
        messageId,
        emoji,
      });
      await chatService.addReaction(chatId, messageId, emoji);
      console.log("✅ Reaction saved to backend");
    } catch (error) {
      console.error("❌ Failed to save reaction:", error);
      // Revert optimistic update on error
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId) {
            return {
              ...msg,
              reactions: (msg.reactions || []).filter(
                (r) => r.emoji !== emoji || r.userId !== user?.id,
              ),
            };
          }
          return msg;
        }),
      );
      Alert.alert("Error", "Failed to add reaction. Please try again.");
    }

    // Broadcast to other users via socket
    sendReaction(chatId, messageId, emoji);
  };

  const startVoiceRecording = async () => {
    try {
      console.log("[Chat] Starting voice recording...");
      recordingPressRef.current = true;

      await VoiceMessageService.startRecording();
      setIsRecording(true);
      setRecordingDuration(0);

      // Update recording duration every second
      recordingDurationRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      // Auto-cancel after 60 seconds max
      recordingTimeoutRef.current = setTimeout(() => {
        console.log("[Chat] Recording exceeded 60 seconds, auto-stopping...");
        if (recordingPressRef.current) {
          recordingPressRef.current = false;
          handleStopRecording();
        }
      }, 60000);
    } catch (error) {
      console.error("[Chat] Error starting recording:", error);
      recordingPressRef.current = false;
      setIsRecording(false);
      Alert.alert("Error", error.message || "Failed to start recording");
    }
  };

  const handleStopRecording = async () => {
    try {
      console.log("[Chat] User released mic button, stopping recording...");

      if (recordingDurationRef.current) {
        clearInterval(recordingDurationRef.current);
      }
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }

      setIsRecording(false);
      recordingPressRef.current = false;

      const voiceData = await VoiceMessageService.stopRecording();
      console.log(
        "[Chat] Voice recording stopped, duration:",
        voiceData.durationSeconds,
      );

      // Show uploading indicator
      setUploadingAttachment(true);

      try {
        // Upload voice message file to server
        console.log("[Chat] Uploading voice message file...");

        // Create FormData with proper file structure for React Native
        const formData = new FormData();
        const fileName = `voice-message-${Date.now()}.m4a`;

        // Append file with explicit URI
        formData.append("file", {
          uri: voiceData.uri,
          type: "audio/m4a",
          name: fileName,
        });

        console.log("[Chat] FormData created, uploading to server");

        // Upload using chat attachment endpoint
        const uploadResponse =
          await uploadService.uploadChatAttachment(formData);
        const uploadedUrl =
          uploadResponse.url ||
          uploadResponse?.attachmentUrl ||
          uploadResponse?.media_url;

        if (!uploadedUrl) {
          console.error("[Chat] No URL in upload response:", uploadResponse);
          throw new Error("Upload succeeded but no URL returned");
        }

        console.log("[Chat] Voice message uploaded to:", uploadedUrl);
        setUploadingAttachment(false);

        // Send voice message with server URL
        const tempId = Date.now().toString();
        const tempMessage = {
          id: tempId,
          chatId,
          senderId: user?.id,
          text: `🎙️ Voice message (${voiceData.durationSeconds}s)`,
          attachmentUrl: uploadedUrl,
          voiceMessage: true,
          voiceDuration: voiceData.durationSeconds,
          createdAt: new Date().toISOString(),
          pending: true,
        };

        setMessages((prev) => [...prev, tempMessage]);
        setRecordingDuration(0);

        const payload = {
          chatId,
          senderId: user?.id,
          text: `🎙️ Voice message (${voiceData.durationSeconds}s)`,
          attachmentUrl: uploadedUrl,
          voiceMessage: true,
          voiceDuration: voiceData.durationSeconds,
        };

        sendMessage(payload, (response) => {
          if (response?.success && response?.message) {
            setMessages((prev) =>
              prev.map((m) => (m.id === tempId ? response.message : m)),
            );
            setTimeout(() => {
              listRef.current?.scrollToEnd({ animated: true });
            }, 100);
          } else {
            Alert.alert("Error", "Failed to send voice message");
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
          }
        });
      } catch (uploadError) {
        console.error("[Chat] Failed to upload voice message:", uploadError);
        setUploadingAttachment(false);
        Alert.alert(
          "Upload Error",
          uploadError.message ||
            "Failed to upload voice message. Please try again.",
        );
      }
    } catch (error) {
      console.error("[Chat] Error stopping recording:", error);
      setIsRecording(false);
      setRecordingDuration(0);
      recordingPressRef.current = false;
      setUploadingAttachment(false);

      // Don't alert on timeout - it's expected
      if (!error.message?.includes("timeout")) {
        Alert.alert(
          "Recording Error",
          error.message || "Failed to stop recording. Please try again.",
        );
      }
    }
  };

  const stopVoiceRecording = async () => {
    if (recordingPressRef.current) {
      recordingPressRef.current = false;
      await handleStopRecording();
    }
  };

  const cancelVoiceRecording = async () => {
    try {
      if (recordingDurationRef.current) {
        clearInterval(recordingDurationRef.current);
      }
      await VoiceMessageService.cancelRecording();
      setIsRecording(false);
      setRecordingDuration(0);
    } catch (error) {
      console.error("Failed to cancel recording:", error);
      setIsRecording(false);
      setRecordingDuration(0);
    }
  };

  const playVoiceMessage = async (messageId, audioUrl) => {
    try {
      console.log("[Chat] Playing voice message:", audioUrl);

      // Stop currently playing sound
      if (currentSound) {
        await currentSound.stopAsync();
        await currentSound.unloadAsync();
      }

      // Create and play new sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: toAbsoluteUrl(audioUrl) },
        { shouldPlay: true },
      );

      setCurrentSound(sound);
      setPlayingMessageId(messageId);

      // Handle sound finished playing
      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.didJustFinish) {
          setPlayingMessageId(null);
          await sound.unloadAsync();
          setCurrentSound(null);
        }
      });
    } catch (error) {
      console.error("[Chat] Failed to play voice message:", error);
      Alert.alert("Error", "Failed to play voice message");
      setPlayingMessageId(null);
    }
  };

  const stopVoicePlayback = async () => {
    try {
      if (currentSound) {
        await currentSound.stopAsync();
        await currentSound.unloadAsync();
        setCurrentSound(null);
        setPlayingMessageId(null);
      }
    } catch (error) {
      console.error("[Chat] Failed to stop playback:", error);
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
            const senderData = isOwn
              ? user
              : item.sender ||
                chat?.participants?.find((p) => p.user?.id === item.senderId)
                  ?.user;
            const senderName = senderData?.name || (isOwn ? "You" : "Unknown");
            const senderProfilePic = senderData?.profilePic;
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
                  isOwn
                    ? styles.messageContainerOwn
                    : styles.messageContainerOther,
                ]}
              >
                {!isOwn && (
                  <View style={styles.senderSection}>
                    {senderProfilePic && (
                      <Image
                        source={{ uri: toAbsoluteUrl(senderProfilePic) }}
                        style={styles.senderAvatar}
                      />
                    )}
                    <Text
                      style={[
                        styles.senderName,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {senderName}
                    </Text>
                  </View>
                )}
                <View style={styles.messageWithReaction}>
                  <View
                    style={[
                      styles.bubble,
                      isOwn
                        ? {
                            backgroundColor: colors.primary,
                            alignSelf: "flex-end",
                          }
                        : {
                            backgroundColor: colors.surface,
                            alignSelf: "flex-start",
                          },
                    ]}
                    onLongPress={() => {
                      setSelectedMessageForReaction(item);
                      setShowReactionPicker(true);
                    }}
                  >
                    {item.voiceMessage && item.attachmentUrl ? (
                      <TouchableOpacity
                        style={styles.voiceMessageButton}
                        onPress={() => {
                          if (playingMessageId === item.id) {
                            stopVoicePlayback();
                          } else {
                            playVoiceMessage(item.id, item.attachmentUrl);
                          }
                        }}
                      >
                        <Text style={styles.voicePlayIcon}>
                          {playingMessageId === item.id ? "⏸️" : "▶️"}
                        </Text>
                        <Text
                          style={[
                            styles.messageText,
                            isOwn
                              ? { color: "#fff" }
                              : { color: colors.textPrimary },
                            { marginLeft: 8 },
                          ]}
                        >
                          {item.text}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <>
                        {item.attachmentUrl && !item.voiceMessage && (
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
                      </>
                    )}
                    {formattedTime && (
                      <View style={styles.timelineSection}>
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
                        {isOwn && item.readAt && (
                          <Text
                            style={[
                              styles.seenStatus,
                              { color: "rgba(255,255,255,0.7)" },
                            ]}
                          >
                            ✓✓ Seen{" "}
                            {new Date(item.readAt).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </Text>
                        )}
                        {isOwn && !item.readAt && (
                          <Text
                            style={[
                              styles.deliveredStatus,
                              { color: "rgba(255,255,255,0.6)" },
                            ]}
                          >
                            ✓ Delivered
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.reactionButton,
                      isOwn
                        ? styles.reactionButtonOwn
                        : styles.reactionButtonOther,
                    ]}
                    onPress={() => {
                      console.log(
                        "Reaction button pressed for message:",
                        item.id,
                      );
                      setSelectedMessageForReaction(item);
                      setShowReactionPicker(true);
                    }}
                  >
                    <Text style={styles.reactionButtonText}>😊</Text>
                  </TouchableOpacity>
                </View>
                {/* Display reactions if they exist */}
                {item.reactions && item.reactions.length > 0 && (
                  <View style={styles.reactionsContainer}>
                    <View style={styles.reactionsList}>
                      {item.reactions.map((reaction, idx) => (
                        <View key={idx} style={styles.reactionBubble}>
                          <Text style={styles.reactionEmoji}>
                            {reaction.emoji}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
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
          {isRecording && (
            <View style={styles.recordingIndicator}>
              <Text style={{ color: colors.danger, fontSize: 12 }}>
                🔴 Recording... {recordingDuration}s
              </Text>
            </View>
          )}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity
              onPress={pickAttachment}
              disabled={uploadingAttachment || isRecording}
              style={[
                styles.attachBtn,
                { opacity: uploadingAttachment || isRecording ? 0.5 : 1 },
              ]}
            >
              <Text style={{ fontSize: 20 }}>
                {uploadingAttachment ? "⏳" : "📎"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPressIn={startVoiceRecording}
              onPressOut={stopVoiceRecording}
              disabled={!!text.trim() || isRecording}
              style={[
                styles.attachBtn,
                { opacity: text.trim() || isRecording ? 0.5 : 1 },
              ]}
            >
              <Text style={{ fontSize: 20 }}>{isRecording ? "🎙️" : "🎤"}</Text>
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
              editable={!isRecording}
            />
            <Animated.View style={{ transform: [{ scale: sendScale }] }}>
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: colors.primary }]}
                onPress={handleSend}
                onPressIn={onSendPressIn}
                onPressOut={onSendPressOut}
                disabled={(!text.trim() && !attachmentUrl) || isRecording}
              >
                <Text style={[styles.sendText, { color: "#fff" }]}>Send</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>

        {/* Message Reactions Modal */}
        <MessageReactions
          visible={showReactionPicker}
          onSelectReaction={handleMessageReaction}
          onClose={() => {
            setShowReactionPicker(false);
            setSelectedMessageForReaction(null);
          }}
          message={selectedMessageForReaction}
        />
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
  senderSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  senderAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 6,
    backgroundColor: "#e2e8f0",
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
  messageWithReaction: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginHorizontal: 4,
  },
  reactionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 6,
    marginVertical: 4,
  },
  reactionButtonOwn: {
    marginLeft: 8,
  },
  reactionButtonOther: {
    marginRight: 8,
  },
  reactionButtonText: {
    fontSize: 16,
  },
  reactionsContainer: {
    marginTop: 4,
    marginHorizontal: 12,
  },
  reactionsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  reactionBubble: {
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  reactionEmoji: {
    fontSize: 14,
  },
  timelineSection: {
    marginTop: 4,
    alignSelf: "flex-end",
  },
  seenStatus: {
    fontSize: 10,
    marginTop: 2,
  },
  deliveredStatus: {
    fontSize: 10,
    marginTop: 2,
  },
  recordingIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    alignItems: "center",
  },
  voiceMessageButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  voicePlayIcon: {
    fontSize: 18,
    marginRight: 4,
  },
});

export default ChatScreen;
