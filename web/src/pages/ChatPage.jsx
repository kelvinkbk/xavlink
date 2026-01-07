import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
  useMemo,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { chatService } from "../services/chatService";
import {
  socket,
  reconcileMissedMessages,
  updateLastMessageTimestamp,
} from "../services/socket";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "../components/LoadingSpinner";
import ReportModal from "../components/ReportModal";
import MessageReactions from "../components/MessageReactions";
import { uploadService, reportService } from "../services/api";
import {
  getCachedMessages,
  cacheMessages,
  initMessageCache,
  clearChatCache,
} from "../services/messageCache";
import {
  sendMessageNotification,
  requestNotificationPermission,
  getNotificationPermission,
  notificationsSupported,
} from "../services/notificationService";
import * as ReactWindow from "react-window";

export default function ChatPage() {
  const { VariableSizeList: VList } = ReactWindow;
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [attachmentFileName, setAttachmentFileName] = useState("");
  const [attachmentType, setAttachmentType] = useState(null);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [messageToReport, setMessageToReport] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [messageReactions, setMessageReactions] = useState({});
  const [pendingMessages, setPendingMessages] = useState([]);
  const [toast, setToast] = useState(null);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState(new Set());
  const [listHeight, setListHeight] = useState(0);
  const [notifPermission, setNotifPermission] = useState(() =>
    notificationsSupported() ? getNotificationPermission() : "denied"
  );
  const [zoomImageUrl, setZoomImageUrl] = useState(null);
  const [blockedUsers, setBlockedUsers] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("blocked_users") || "[]");
      // Normalize to strings to avoid number/string mismatches
      return Array.isArray(raw) ? raw.map((id) => String(id)) : [];
    } catch {
      return [];
    }
  });
  const [showBlockedUsersModal, setShowBlockedUsersModal] = useState(false);
  const [readReceiptsModal, setReadReceiptsModal] = useState(null); // { messageId, readReceipts }
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showPinnedMessagesModal, setShowPinnedMessagesModal] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null); // { id, text }
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const uploadAbortControllerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const readTimeoutRef = useRef(null);
  const markChatReadTimeoutRef = useRef(null);
  const pendingTimersRef = useRef({});
  const toastTimerRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const cacheWriteTimeoutRef = useRef(null);
  const listInnerRef = useRef(null);
  const vListRef = useRef(null);
  const sizeMapRef = useRef({});

  // Sync blocked users from backend on mount
  useEffect(() => {
    const syncBlockedUsers = async () => {
      try {
        const { blockService } = await import("../services/blockService");
        const data = await blockService.getBlockedUsers();
        const blockedIds = data.blockedUsers || [];
        setBlockedUsers(blockedIds.map((id) => String(id)));
      } catch (error) {
        console.error("Failed to sync blocked users:", error);
        // Keep using localStorage data as fallback
      }
    };
    syncBlockedUsers();
  }, []);

  // Persist blocked users locally for quick checks
  useEffect(() => {
    try {
      localStorage.setItem("blocked_users", JSON.stringify(blockedUsers));
    } catch {
      // ignore
    }
  }, [blockedUsers]);

  // Toast helper (define early so callbacks can reference it)
  const showToast = useCallback((message, type = "info", duration = 3000) => {
    const allowToast = type === "error" || type === "warning";
    if (!allowToast) return;
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), duration);
  }, []);

  const visibleMessages = useMemo(() => {
    if (!blockedUsers.length) return messages;
    return messages.filter(
      (m) =>
        m.sender.id === user?.id || !blockedUsers.includes(String(m.sender.id))
    );
  }, [messages, blockedUsers, user?.id]);

  const pinnedMessages = useMemo(() => {
    return messages.filter((m) => m.isPinned);
  }, [messages]);

  const primaryPeer = useMemo(() => {
    // First try to get from chat participants (works even with no messages)
    if (chat?.participants) {
      const otherParticipant = chat.participants.find(
        (p) => p.user?.id !== user?.id
      );
      if (otherParticipant?.user) return otherParticipant.user;
    }
    // Fallback to messages if chat not loaded yet
    return messages.find((m) => m.sender.id !== user?.id)?.sender || null;
  }, [chat?.participants, messages, user?.id]);

  // Load pending messages from localStorage on mount or chatId change
  useEffect(() => {
    if (typeof window === "undefined" || !chatId) return;
    try {
      const stored = localStorage.getItem(`pending_${chatId}`);
      const pending = stored ? JSON.parse(stored) : [];
      setPendingMessages(pending);
      if (pending.length > 0) {
        console.log(
          `📂 Loaded ${pending.length} pending messages from localStorage`
        );
      }
    } catch (e) {
      console.error("Failed to load pending messages from localStorage:", e);
      setPendingMessages([]);
    }
  }, [chatId]);

  // Persist pending messages to localStorage whenever they change
  useEffect(() => {
    if (typeof window === "undefined" || !chatId) return;
    try {
      if (pendingMessages.length > 0) {
        localStorage.setItem(
          `pending_${chatId}`,
          JSON.stringify(pendingMessages)
        );
        console.log(
          `💾 Saved ${pendingMessages.length} pending messages to localStorage`
        );
      } else {
        localStorage.removeItem(`pending_${chatId}`);
      }
    } catch (e) {
      console.error("Failed to save pending messages to localStorage:", e);
    }
  }, [pendingMessages, chatId]);

  // Handle search with debounce
  useEffect(() => {
    const updateHeight = () => {
      const h = messagesContainerRef.current?.clientHeight || 0;
      setListHeight(h);
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  // Lightweight beep honoring notification sound toggle
  const playNotificationSound = useCallback(() => {
    try {
      const enabled = JSON.parse(
        (typeof window !== "undefined" &&
          localStorage.getItem("notification_sound_enabled")) ||
          "true"
      );
      if (!enabled) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } catch (e) {
      console.log("Notification sound failed:", e);
    }
  }, []);

  // (Removed) dynamic height estimator pending VariableSizeList integration
  const handleSearch = useCallback(
    (query) => {
      setSearchQuery(query);

      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      // Debounce search
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

      setSearchLoading(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const results = await chatService.searchMessages(chatId, query);
          setSearchResults(results);
        } catch (error) {
          console.error("Search failed:", error);
          showToast("Search failed", "error", 3000);
        } finally {
          setSearchLoading(false);
        }
      }, 300); // Wait 300ms after user stops typing
    },
    [chatId, showToast]
  );

  // Auto-mark messages as read when viewed
  const markVisibleMessagesAsRead = useCallback(() => {
    if (!user?.id || !chatId) return;
    // Check socket connection
    if (!socket.connected) {
      console.log("⚠️ Socket not connected, skipping mark as read");
      return;
    }

    // Get all visible messages that don't belong to current user
    const otherUsersMessages = visibleMessages.filter(
      (m) => m.sender.id !== user.id
    );

    if (otherUsersMessages.length === 0) {
      console.log("📖 No other users' messages to mark as read");
      return;
    }

    console.log(
      `📖 markVisibleMessagesAsRead called with ${otherUsersMessages.length} messages`
    );

    // Debounce to avoid too many API calls
    if (readTimeoutRef.current) clearTimeout(readTimeoutRef.current);

    readTimeoutRef.current = setTimeout(async () => {
      for (const message of otherUsersMessages) {
        // Skip if already read
        if (message.readReceipts?.some((r) => r.userId === user.id)) {
          console.log(`⏭️ Message ${message.id} already read by current user`);
          continue;
        }

        try {
          console.log(`📤 Marking message ${message.id} as read (API call)`);
          await chatService.markAsRead(chatId, message.id);
          console.log(`✅ Message ${message.id} marked as read successfully`);
        } catch (error) {
          console.error(
            `❌ Failed to mark message ${message.id} as read:`,
            error
          );
        }
      }
    }, 500); // Wait 500ms before marking to reduce API calls
  }, [visibleMessages, user?.id, chatId]);
  const upsertMessage = useCallback((message) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === message.id)) return prev;
      return [...prev, message];
    });
  }, []);

  // Send a pending message with retry/backoff
  const sendPendingMessage = useCallback(
    async (pending) => {
      // offline -> keep queued
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        setPendingMessages((prev) =>
          prev.map((m) =>
            m.tempId === pending.tempId ? { ...m, status: "queued" } : m
          )
        );
        return;
      }

      setPendingMessages((prev) =>
        prev.map((m) =>
          m.tempId === pending.tempId ? { ...m, status: "sending" } : m
        )
      );

      try {
        const response = await chatService.sendMessage(
          chatId,
          pending.text,
          pending.attachmentUrl
        );
        // Remove pending and insert real message
        setPendingMessages((prev) =>
          prev.filter((m) => m.tempId !== pending.tempId)
        );
        upsertMessage(response);
      } catch (error) {
        console.error("Send message failed:", error);
        const attempts = (pending.attempts || 0) + 1;
        const willRetry = attempts < 4;
        setPendingMessages((prev) =>
          prev.map((m) =>
            m.tempId === pending.tempId
              ? {
                  ...m,
                  attempts,
                  status: willRetry ? "retrying" : "failed",
                }
              : m
          )
        );

        if (willRetry) {
          const backoffMs = Math.min(5000, 500 * Math.pow(2, attempts));
          showToast(`Retrying... (attempt ${attempts}/3)`, "info", 2000);
          if (pendingTimersRef.current[pending.tempId]) {
            clearTimeout(pendingTimersRef.current[pending.tempId]);
          }
          pendingTimersRef.current[pending.tempId] = setTimeout(() => {
            sendPendingMessage({ ...pending, attempts });
          }, backoffMs);
        }

        if (!willRetry) {
          showToast("❌ Message failed to send. Tap retry.", "error", 5000);
        }
      }
    },
    [chatId, upsertMessage, showToast]
  );

  const handleReceiveMessage = useCallback(
    (message) => {
      if (!user?.id || !chatId) return;
      if (
        blockedUsers.includes(String(message.sender?.id)) &&
        message.sender?.id !== user.id
      ) {
        return; // Drop messages from blocked senders
      }
      if (message.chatId === chatId) {
        upsertMessage(message);

        // Update last message timestamp for reconciliation
        updateLastMessageTimestamp(message.timestamp);

        // Send desktop notification for incoming messages from others
        if (message.sender?.id && message.sender.id !== user.id) {
          try {
            sendMessageNotification(
              message.sender.name || "Someone",
              message.text,
              chatId,
              navigate
            );
            playNotificationSound();
          } catch (err) {
            console.error("Failed to send notification:", err);
          }
        }

        // Remove matching pending if same sender and text
        setPendingMessages((prev) => {
          const filtered = prev.filter(
            (m) =>
              !(
                m.sender.id === user.id &&
                m.text === message.text &&
                m.attachmentUrl === message.attachmentUrl
              )
          );
          // Update localStorage immediately
          if (typeof window !== "undefined") {
            if (filtered.length > 0) {
              localStorage.setItem(
                `pending_${chatId}`,
                JSON.stringify(filtered)
              );
            } else {
              localStorage.removeItem(`pending_${chatId}`);
            }
          }
          return filtered;
        });

        // If user is viewing this chat, clear unread count quickly
        if (markChatReadTimeoutRef.current) {
          clearTimeout(markChatReadTimeoutRef.current);
        }
        markChatReadTimeoutRef.current = setTimeout(async () => {
          try {
            await chatService.markChatAsRead(chatId);
            // Emit event for sidebar to update
            socket.emit("chat_read_by_user", { chatId });
          } catch (error) {
            console.error("Failed to mark chat as read:", error);
          }
        }, 150);
      }
    },
    [
      chatId,
      upsertMessage,
      user?.id,
      navigate,
      playNotificationSound,
      blockedUsers,
    ]
  );

  const handleRetryPending = useCallback(
    (tempId) => {
      if (!user?.id || !chatId) return;
      const pending = pendingMessages.find((m) => m.tempId === tempId);
      if (pending) {
        sendPendingMessage({ ...pending, attempts: 0, status: "sending" });
      }
    },
    [pendingMessages, sendPendingMessage, user?.id, chatId]
  );

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);

      // Load chat details for participants (needed for block button even with no messages)
      const chatDetails = await chatService.getChatDetails(chatId);
      setChat(chatDetails);

      // Load the latest 50 messages
      const data = await chatService.getChatMessages(chatId, 50, null);
      console.log(
        `📚 Loaded ${data.length} messages:`,
        data.map((m) => ({
          id: m.id,
          sender: m.sender.id,
          readReceiptsCount: m.readReceipts?.length || 0,
          readReceipts: m.readReceipts,
        }))
      );
      setMessages(data);
      setHasMoreMessages(data.length >= 50);

      // Update last message timestamp for reconciliation
      if (data.length > 0) {
        const latestTimestamp = data[data.length - 1].timestamp;
        updateLastMessageTimestamp(latestTimestamp);
      }

      // Load reactions from server data
      const reactionsMap = {};
      data.forEach((msg) => {
        if (msg.reactionCounts && Object.keys(msg.reactionCounts).length > 0) {
          reactionsMap[msg.id] = msg.reactionCounts;
        }
      });
      setMessageReactions(reactionsMap);

      // Mark chat as read when opening (debounced)
      if (markChatReadTimeoutRef.current) {
        clearTimeout(markChatReadTimeoutRef.current);
      }
      markChatReadTimeoutRef.current = setTimeout(async () => {
        try {
          await chatService.markChatAsRead(chatId);
          // Emit event for sidebar to update
          socket.emit("chat_read_by_user", { chatId });
          // Also broadcast to update other clients
          socket.emit("chat_marked_read", { chatId });
        } catch (error) {
          console.error("Failed to mark chat as read:", error);
        }
      }, 200);
    } catch (error) {
      console.error("Failed to load messages:", error);
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  // Load older messages when scrolling to top
  const loadOlderMessages = useCallback(async () => {
    if (loadingOlder || !hasMoreMessages || messages.length === 0) return;

    try {
      setLoadingOlder(true);
      const oldestMessage = messages[0];
      const olderData = await chatService.getChatMessages(
        chatId,
        50,
        oldestMessage.id
      );

      if (olderData.length === 0) {
        setHasMoreMessages(false);
        return;
      }

      console.log(`📚 Loaded ${olderData.length} older messages`);
      setMessages((prev) => [...olderData, ...prev]);
      setHasMoreMessages(olderData.length >= 50);

      // Load reactions for older messages
      olderData.forEach((msg) => {
        if (msg.reactionCounts && Object.keys(msg.reactionCounts).length > 0) {
          setMessageReactions((prev) => ({
            ...prev,
            [msg.id]: msg.reactionCounts,
          }));
        }
      });
    } catch (error) {
      console.error("Failed to load older messages:", error);
    } finally {
      setLoadingOlder(false);
    }
  }, [chatId, messages, loadingOlder, hasMoreMessages]);

  useEffect(() => {
    // Ensure socket is connected
    if (!chatId) return;
    if (!socket.connected) {
      console.log("🔌 Connecting socket for chat...");
      socket.connect();
    }

    // Hydrate from local cache first for faster initial render
    // Hydrate from local cache first for faster initial render
    (async () => {
      try {
        await initMessageCache().catch(() => {});
        const cached = await getCachedMessages(chatId);
        if (cached && cached.length > 0) {
          setMessages(cached);
          setHasMoreMessages(cached.length >= 50);
          const reactionsMap = {};
          cached.forEach((msg) => {
            if (
              msg.reactionCounts &&
              Object.keys(msg.reactionCounts).length > 0
            ) {
              reactionsMap[msg.id] = msg.reactionCounts;
            }
          });
          setMessageReactions(reactionsMap);
        }
      } catch (err) {
        console.error("Cache hydration failed:", err);
      } finally {
        // Always fetch latest from server
        loadMessages();
      }
    })();

    // Join chat room
    console.log("📨 Joining chat room:", chatId);
    socket.emit("join_room", { chatId });

    socket.on("receive_message", handleReceiveMessage);
    socket.on("message_deleted", ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      clearChatCache(chatId).catch(() => {});
    });
    socket.on("reaction_added", ({ messageId, emoji }) => {
      setMessageReactions((prev) => {
        const current = prev[messageId] || {};
        const count = current[emoji] || 0;
        return {
          ...prev,
          [messageId]: { ...current, [emoji]: count + 1 },
        };
      });
      clearChatCache(chatId).catch(() => {});
    });
    socket.on("reaction_removed", ({ messageId, emoji }) => {
      setMessageReactions((prev) => {
        const current = prev[messageId] || {};
        const newCount = (current[emoji] || 1) - 1;
        const updated = { ...current };
        if (newCount <= 0) {
          delete updated[emoji];
        } else {
          updated[emoji] = newCount;
        }
        return { ...prev, [messageId]: updated };
      });
      clearChatCache(chatId).catch(() => {});
    });
    socket.on("message_pinned", ({ messageId, isPinned }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, isPinned } : m))
      );
      clearChatCache(chatId).catch(() => {});
    });
    socket.on("message_read", ({ messageId, userId, readAt }) => {
      console.log(
        `📖 Socket received message_read: messageId=${messageId}, userId=${userId}`
      );
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === messageId) {
            const existingReceipts = m.readReceipts || [];
            const alreadyRead = existingReceipts.some(
              (r) => r.userId === userId
            );
            if (!alreadyRead) {
              console.log(
                `✅ Adding read receipt to message ${messageId} for user ${userId}`
              );
              return {
                ...m,
                readReceipts: [...existingReceipts, { userId, readAt }],
              };
            } else {
              console.log(
                `⏭️ Message ${messageId} already marked as read by user ${userId}`
              );
            }
          }
          return m;
        })
      );
      clearChatCache(chatId).catch(() => {});
    });
    socket.on("user_typing", ({ userName }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.add(userName || "Someone");
        return next;
      });
    });
    socket.on("user_stopped_typing", () => {
      setTypingUsers(new Set());
    });

    // Handle reconnection - reconcile missed messages
    socket.on("reconnect", async () => {
      console.log("🔄 Reconnected! Checking for missed messages...");
      showToast("✓ Reconnected", "success", 2000);
      const missedMessages = await reconcileMissedMessages(chatId);
      if (missedMessages.length > 0) {
        console.log(`📬 Inserting ${missedMessages.length} missed message(s)`);
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newMessages = missedMessages.filter(
            (m) => !existingIds.has(m.id)
          );
          const combined = [...prev, ...newMessages];
          // Cache reconciled set
          cacheMessages(
            chatId,
            combined.filter((m) => !m.tempId)
          ).catch(() => {});
          return combined;
        });
        showToast(
          `📬 Caught up ${missedMessages.length} message(s)`,
          "info",
          2500
        );
      }
    });

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("message_deleted");
      socket.off("reaction_added");
      socket.off("reaction_removed");
      socket.off("message_pinned");
      socket.off("message_read");
      socket.off("user_typing");
      socket.off("user_stopped_typing");
      socket.off("reconnect");
    };
  }, [chatId, handleReceiveMessage, loadMessages, showToast]);

  // Keep cache in sync with real messages (exclude optimistic pending)
  // Keep cache in sync with real messages, throttled (exclude optimistic pending)
  useEffect(() => {
    if (!chatId) return;
    const realMessages = messages.filter((m) => !m.tempId);
    if (cacheWriteTimeoutRef.current) {
      clearTimeout(cacheWriteTimeoutRef.current);
    }
    if (realMessages.length > 0) {
      cacheWriteTimeoutRef.current = setTimeout(() => {
        cacheMessages(chatId, realMessages).catch(() => {});
      }, 500);
    }
    return () => {
      if (cacheWriteTimeoutRef.current) {
        clearTimeout(cacheWriteTimeoutRef.current);
      }
    };
  }, [messages, chatId]);

  // Cleanup pending timers on unmount
  useEffect(() => {
    return () => {
      Object.values(pendingTimersRef.current || {}).forEach((t) =>
        clearTimeout(t)
      );
      pendingTimersRef.current = {};
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Flush queued/failed messages when coming online
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast("✓ You're back online", "success", 2000);
      setPendingMessages((prev) => {
        const toSend = prev.filter(
          (m) => m.status === "queued" || m.status === "failed"
        );
        toSend.forEach((m) =>
          sendPendingMessage({ ...m, attempts: 0, status: "sending" })
        );
        return prev.map((m) =>
          m.status === "queued" || m.status === "failed"
            ? { ...m, status: "sending" }
            : m
        );
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast("⚠ You're offline", "warning", 2000);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [sendPendingMessage, showToast]);

  const scrollToBottom = useCallback(() => {
    if (vListRef.current && visibleMessages.length > 0) {
      vListRef.current.scrollToItem(visibleMessages.length - 1, "end");
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [visibleMessages.length]);

  useEffect(() => {
    scrollToBottom();
    markVisibleMessagesAsRead();
  }, [visibleMessages, markVisibleMessagesAsRead, scrollToBottom]);

  const getFileType = (mimeType) => {
    if (mimeType?.startsWith("image/")) return "Image";
    if (mimeType?.startsWith("video/")) return "Video";
    if (mimeType === "application/pdf") return "PDF";
    return null;
  };

  const isImageUrl = (url = "") => {
    return /(\.png|\.jpe?g|\.gif|\.webp|\.bmp)$/i.test(url.split("?")[0]);
  };

  const getFileTypeColor = (type) => {
    switch (type) {
      case "Image":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      case "Video":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
      case "PDF":
        return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const handleAttachmentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type & size (images/videos up to 50MB, PDF up to 10MB)
    const MAX_BYTES_MEDIA = 50 * 1024 * 1024;
    const MAX_BYTES_PDF = 10 * 1024 * 1024;
    const fileType = getFileType(file.type);
    const MAX_SIZE =
      file.type === "application/pdf" ? MAX_BYTES_PDF : MAX_BYTES_MEDIA;

    if (!fileType) {
      showToast("Only images, videos, and PDFs are allowed", "error", 3000);
      e.target.value = "";
      return;
    }
    if (file.size > MAX_SIZE) {
      const maxMB = file.type === "application/pdf" ? "10" : "50";
      showToast(`${fileType} too large (max ${maxMB}MB)`, "error", 3000);
      e.target.value = "";
      return;
    }

    // Generate preview for images
    if (fileType === "Image") {
      const reader = new FileReader();
      reader.onload = (evt) => setAttachmentPreview(evt.target.result);
      reader.readAsDataURL(file);
    }

    setAttachmentFileName(file.name);
    setAttachmentType(fileType);
    setUploadingAttachment(true);
    setUploadProgress(0);
    uploadAbortControllerRef.current = new AbortController();

    try {
      const { url } = await uploadService.uploadChatAttachment(
        file,
        (percent) => setUploadProgress(percent),
        uploadAbortControllerRef.current.signal
      );
      setAttachmentUrl(url);
      showToast("Attachment ready", "success", 1500);
    } catch (error) {
      if (error?.name === "AbortError") {
        showToast("Upload cancelled", "info", 2000);
        setAttachmentPreview(null);
      } else {
        console.error("Failed to upload attachment:", error);
        const errorMsg =
          error?.response?.data?.message || error?.message || "Upload failed";
        showToast(errorMsg, "error", 3500);
        setAttachmentPreview(null);
      }
      e.target.value = "";
    } finally {
      setUploadingAttachment(false);
      setTimeout(() => setUploadProgress(0), 500);
      uploadAbortControllerRef.current = null;
    }
  };

  const handleCancelUpload = () => {
    if (uploadAbortControllerRef.current) {
      uploadAbortControllerRef.current.abort();
    }
  };

  const handleClearAttachment = () => {
    setAttachmentUrl("");
    setAttachmentPreview(null);
    setAttachmentFileName("");
    setAttachmentType(null);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !attachmentUrl) || sending) return;
    if (!user?.id || !chatId) {
      showToast("Please wait, chat is still initializing", "warning", 2000);
      return;
    }

    socket.emit("stop_typing", { chatId, userId: user?.id });

    const messageText = newMessage.trim();
    const attachment = attachmentUrl ? attachmentUrl.trim() : null;
    setNewMessage("");
    handleClearAttachment();

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      tempId,
      id: tempId,
      chatId,
      text: messageText,
      attachmentUrl: attachment,
      sender: { id: user.id, name: user.name || "You" },
      timestamp: new Date().toISOString(),
      status: "sending",
      attempts: 0,
      readReceipts: [],
    };

    setPendingMessages((prev) => [...prev, optimisticMessage]);
    setSending(false);

    // Kick off send with retry/backoff
    sendPendingMessage(optimisticMessage);
  };

  const handleBulkDelete = async () => {
    if (selectedMessages.size === 0) return;
    if (
      !window.confirm(
        `Delete ${selectedMessages.size} message${
          selectedMessages.size > 1 ? "s" : ""
        }?`
      )
    )
      return;

    const messagesToDelete = Array.from(selectedMessages);
    let successCount = 0;

    for (const messageId of messagesToDelete) {
      try {
        await chatService.deleteMessage(chatId, messageId);
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        successCount++;
      } catch (error) {
        console.error(`Failed to delete message ${messageId}:`, error);
      }
    }

    setSelectedMessages(new Set());
    setSelectionMode(false);
    alert(
      `Deleted ${successCount} of ${messagesToDelete.length} message${
        messagesToDelete.length > 1 ? "s" : ""
      }`
    );
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm("Delete this message for everyone?")) return;
    try {
      await chatService.deleteMessage(chatId, messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (error) {
      console.error("Failed to delete message:", error);
      alert("Failed to delete message");
    }
  };

  const handleEditMessage = async (messageId, newText) => {
    if (!newText.trim()) {
      showToast("Message cannot be empty", "warning", 2000);
      return;
    }
    try {
      await chatService.editMessage(chatId, messageId, newText);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, text: newText, edited: true } : m
        )
      );
      setEditingMessage(null);
      showToast("Message edited", "success", 2000);
    } catch (error) {
      console.error("Failed to edit message:", error);
      showToast("Failed to edit message", "error", 2500);
    }
  };

  const handleReportMessage = (message) => {
    setMessageToReport(message);
    setReportModalOpen(true);
  };

  const handleUnsendStub = useCallback(
    async (messageId) => {
      if (
        !window.confirm("Unsend this message? It will be deleted for everyone.")
      )
        return;

      try {
        await chatService.deleteMessage(chatId, messageId);
        // Socket will broadcast deletion, UI updates automatically
        showToast("Message deleted", "warning", 2000);
      } catch (error) {
        console.error("Failed to delete message:", error);
        showToast("Failed to delete message", "error", 2500);
      }
    },
    [chatId, showToast]
  );

  const toggleBlockPeer = useCallback(async () => {
    if (!primaryPeer?.id) return;
    const peerId = String(primaryPeer.id);
    const isCurrentlyBlocked = blockedUsers.includes(peerId);

    const confirmAction = isCurrentlyBlocked
      ? `Unblock ${primaryPeer.name}? You'll see their messages again.`
      : `Block ${primaryPeer.name}? You won't see their messages in this chat.`;

    if (!window.confirm(confirmAction)) return;

    try {
      // Update backend
      const { blockService } = await import("../services/blockService");
      if (isCurrentlyBlocked) {
        await blockService.unblockUser(peerId);
      } else {
        await blockService.blockUser(peerId);
      }

      // Update local state
      setBlockedUsers((prev) => {
        const next = isCurrentlyBlocked
          ? prev.filter((id) => id !== peerId)
          : [...prev, peerId];
        showToast(
          isCurrentlyBlocked
            ? `Unblocked ${primaryPeer.name}`
            : `Blocked ${primaryPeer.name}`,
          "warning",
          2500
        );
        return next;
      });
    } catch (error) {
      console.error("Failed to block/unblock user:", error);
      showToast("Failed to update block status", "error", 3000);
    }
  }, [primaryPeer?.id, primaryPeer?.name, blockedUsers, showToast]);

  const scrollToMessage = useCallback(
    (messageId) => {
      // Find message in full messages array
      const message = messages.find((m) => m.id === messageId);
      if (!message) {
        showToast("Message not found", "warning", 2000);
        return;
      }

      // Check if message is blocked
      if (
        blockedUsers.length > 0 &&
        message.sender.id !== user?.id &&
        blockedUsers.includes(String(message.sender.id))
      ) {
        showToast("Cannot jump to blocked user message", "warning", 2000);
        return;
      }

      // Get the display list to find the correct index
      const displayMessages = [...visibleMessages, ...pendingMessages];
      const displayIndex = displayMessages.findIndex((m) => m.id === messageId);

      if (displayIndex === -1) {
        showToast("Message not visible in current view", "warning", 2000);
        return;
      }

      console.log(
        `Scrolling to message ${messageId} at display index ${displayIndex}`
      );

      // Scroll the virtual list to the message index
      if (vListRef.current) {
        vListRef.current.scrollToItem(displayIndex, "center");

        // Highlight the message temporarily
        setTimeout(() => {
          const messageElement = document.querySelector(
            `[data-message-id="${messageId}"]`
          );
          if (messageElement) {
            messageElement.classList.add(
              "bg-yellow-200",
              "dark:bg-yellow-800",
              "transition-colors"
            );
            setTimeout(() => {
              messageElement.classList.remove(
                "bg-yellow-200",
                "dark:bg-yellow-800"
              );
            }, 2000);
          }
        }, 100);
      }
    },
    [
      messages,
      visibleMessages,
      pendingMessages,
      blockedUsers,
      user?.id,
      showToast,
    ]
  );

  const handleTyping = (value) => {
    setNewMessage(value);
    socket.emit("typing", { chatId, userId: user?.id, userName: user?.name });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", { chatId, userId: user?.id });
    }, 5000); // Clear typing indicator after 5 seconds of inactivity
  };

  const handleReactToMessage = async (messageId, emoji) => {
    try {
      await chatService.toggleReaction(chatId, messageId, emoji);
      // Socket will update UI when server broadcasts
    } catch (error) {
      console.error("Failed to toggle reaction:", error);
    }
  };

  const handleTogglePin = async (messageId) => {
    try {
      await chatService.togglePin(chatId, messageId);
      // Socket will update UI when server broadcasts
    } catch (error) {
      console.error("Failed to toggle pin:", error);
      alert("Failed to pin/unpin message");
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // All hooks must be unconditional
  const handleItemsRendered = useCallback(
    ({ visibleStartIndex }) => {
      if (
        visibleStartIndex === 0 &&
        hasMoreMessages &&
        !loadingOlder &&
        !searchQuery
      ) {
        loadOlderMessages();
      }
    },
    [hasMoreMessages, loadingOlder, loadOlderMessages, searchQuery]
  );

  useLayoutEffect(() => {
    if (vListRef.current) {
      vListRef.current.resetAfterIndex(0, true);
    }
  }, [visibleMessages.length, listHeight]);

  if (loading) return <LoadingSpinner />;

  const highlightText = (text, query) => {
    if (!query || !text) return text;
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark
          key={i}
          className="bg-yellow-300 dark:bg-yellow-600 font-semibold"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const renderMessageBubble = (message) => {
    const isOwn = message.sender.id === user.id;
    const isPending = Boolean(message.tempId);
    const hasReadReceipts =
      message.readReceipts && message.readReceipts.length > 0;

    return (
      <div
        data-message-id={message.id}
        className={`flex ${isOwn ? "justify-end" : "justify-start"} gap-2 ${
          message.isPinned
            ? "bg-yellow-50 dark:bg-yellow-900/10 p-2 rounded"
            : ""
        }`}
      >
        {selectionMode && isOwn && (
          <input
            type="checkbox"
            checked={selectedMessages.has(message.id)}
            onChange={(e) => {
              const newSet = new Set(selectedMessages);
              if (e.target.checked) {
                newSet.add(message.id);
              } else {
                newSet.delete(message.id);
              }
              setSelectedMessages(newSet);
            }}
            className="w-5 h-5 mt-2 cursor-pointer accent-blue-600"
          />
        )}
        <div
          className={`flex items-end gap-2 max-w-[70%] ${
            isOwn ? "flex-row-reverse" : "flex-row"
          }`}
        >
          {!isOwn && (
            <div className="flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  console.log("Navigating to profile:", message.sender.id);
                  navigate(`/profile/${message.sender.id}`);
                }}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-bold hover:from-blue-600 hover:to-blue-800 hover:shadow-lg hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer border-2 border-blue-300 dark:border-blue-400"
                title={`Click to view ${message.sender.name}'s profile`}
                style={{ pointerEvents: "auto" }}
              >
                {message.sender.name.charAt(0).toUpperCase()}
              </button>
            </div>
          )}
          <div className="flex-1">
            <div
              className={`rounded-2xl px-4 py-2 ${
                isOwn
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
              }`}
            >
              {!isOwn && (
                <button
                  type="button"
                  onClick={() => {
                    console.log("Navigating to profile:", message.sender.id);
                    navigate(`/profile/${message.sender.id}`);
                  }}
                  className="text-sm font-bold mb-1 text-blue-600 dark:text-blue-400 cursor-pointer transition-all duration-150 px-2 py-1 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/30 hover:text-blue-800 dark:hover:text-blue-200 hover:underline inline-block"
                  title={`Click to view ${message.sender.name}'s profile`}
                  style={{ pointerEvents: "auto" }}
                >
                  👤 {message.sender.name}
                </button>
              )}
              {message.isPinned && (
                <div className="text-xs opacity-75 mb-1">📌 Pinned</div>
              )}
              <div className="break-words">
                {searchQuery && message.text
                  ? highlightText(message.text, searchQuery)
                  : message.text ||
                    (message.attachmentUrl ? "(attachment)" : "")}
              </div>
              {message.attachmentUrl && (
                <div className="mt-2 space-y-2">
                  {isImageUrl(message.attachmentUrl) ? (
                    <img
                      src={message.attachmentUrl}
                      alt="Attachment"
                      className="max-h-64 rounded-lg cursor-zoom-in"
                      onClick={() => setZoomImageUrl(message.attachmentUrl)}
                    />
                  ) : null}
                  <a
                    href={message.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-sm underline"
                  >
                    📎 View Attachment
                  </a>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 px-2 mt-1">
              <span
                className={`text-xs ${
                  isOwn ? "text-blue-100" : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {formatTimestamp(message.timestamp)}
              </span>
              {isOwn && (
                <span
                  className="text-xs text-blue-100"
                  title={
                    isPending
                      ? "Sending..."
                      : hasReadReceipts
                      ? "Delivered and read"
                      : "Delivered"
                  }
                >
                  {isPending ? "⏳" : hasReadReceipts ? "✓✓" : "✓"}
                </span>
              )}
              {isOwn && !isPending && hasReadReceipts && (
                <button
                  type="button"
                  onClick={() =>
                    setReadReceiptsModal({
                      messageId: message.id,
                      readReceipts: message.readReceipts,
                    })
                  }
                  className="text-xs text-blue-100 cursor-pointer hover:opacity-80 hover:underline"
                  title={`Read by ${message.readReceipts?.length || 0}`}
                >
                  ({message.readReceipts?.length || 0})
                </button>
              )}
              {isPending && (
                <span className="text-xs text-gray-300 flex items-center gap-2">
                  {message.status === "failed"
                    ? "Failed"
                    : message.status === "retrying"
                    ? "Retrying..."
                    : message.status === "queued"
                    ? "Queued (offline)"
                    : "Sending..."}
                  {message.status === "failed" && (
                    <button
                      type="button"
                      onClick={() => handleRetryPending(message.tempId)}
                      className="underline"
                    >
                      Retry
                    </button>
                  )}
                </span>
              )}
            </div>
            <MessageReactions
              messageId={message.id}
              onReact={handleReactToMessage}
              reactions={messageReactions[message.id] || {}}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1 px-1">
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 text-lg p-1"
            onClick={() => handleTogglePin(message.id)}
            title={message.isPinned ? "Unpin" : "Pin"}
          >
            {message.isPinned ? "📌" : "📄"}
          </button>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 text-lg"
            onClick={(e) => {
              e.stopPropagation();
              if (isOwn) {
                handleDeleteMessage(message.id);
              } else {
                handleReportMessage(message);
              }
            }}
            title={isOwn ? "Delete" : "Report"}
          >
            ⋮
          </button>
          {isOwn && (
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600 text-xs"
              onClick={() =>
                setEditingMessage({ id: message.id, text: message.text })
              }
              title="Edit message"
            >
              ✏️ Edit
            </button>
          )}
          {isOwn && (
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600 text-xs"
              onClick={() => handleUnsendStub(message.id)}
            >
              Unsend
            </button>
          )}
        </div>
      </div>
    );
  };

  const VirtualRow = ({ index, style, data }) => {
    const message = data.items[index];
    const rowRef = useRef(null);

    useLayoutEffect(() => {
      if (!rowRef.current || !message) return;
      const measure = () => {
        const height = rowRef.current.getBoundingClientRect().height;
        if (height && sizeMapRef.current[message.id] !== height) {
          sizeMapRef.current[message.id] = height;
          vListRef.current?.resetAfterIndex(index);
        }
      };

      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(rowRef.current);
      return () => observer.disconnect();
    }, [index, message]);

    if (!message) return null;

    return (
      <div style={style} className="px-1">
        <div ref={rowRef} className="pb-4">
          {renderMessageBubble(message)}
        </div>
      </div>
    );
  };

  const _renderMessage = renderMessageBubble; // Alias for consistency, renderMessageBubble is the primary renderer

  return (
    <>
      {!chatId || !user ? (
        <LoadingSpinner />
      ) : (
        <div className="flex flex-col h-[calc(100vh-64px)] max-w-4xl mx-auto bg-white dark:bg-gray-800">
          {!isOnline && (
            <div className="bg-red-500 text-white px-4 py-2 text-sm font-semibold text-center flex items-center justify-center gap-2">
              <span className="animate-pulse">⚠</span>
              <span>Offline – Messages will be sent when you reconnect</span>
              <span className="text-xs bg-red-600 px-2 py-1 rounded">
                No Internet
              </span>
            </div>
          )}
          {toast && (
            <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-2 rounded shadow-lg text-sm z-50">
              {toast.message}
            </div>
          )}
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => navigate("/chats")}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Chat
            </h2>
            {chat?.participants && chat.participants.length > 2 && (
              <button
                type="button"
                onClick={() => setShowMembersModal(true)}
                className="ml-2 px-3 py-1 rounded text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors"
                title="View group members"
              >
                👥 Members ({chat.participants.length})
              </button>
            )}
            {primaryPeer && (
              <div className="flex items-center gap-2 ml-2">
                <button
                  type="button"
                  onClick={toggleBlockPeer}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    blockedUsers.includes(String(primaryPeer.id))
                      ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
                      : "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                  }`}
                  title={`${
                    blockedUsers.includes(String(primaryPeer.id))
                      ? "Unblock"
                      : "Block"
                  } ${primaryPeer.name}`}
                  aria-label={`${
                    blockedUsers.includes(String(primaryPeer.id))
                      ? "Unblock"
                      : "Block"
                  } ${primaryPeer.name}`}
                >
                  <span className="text-base">
                    {blockedUsers.includes(String(primaryPeer.id))
                      ? "🔓"
                      : "🚫"}
                  </span>
                  <span>
                    {blockedUsers.includes(String(primaryPeer.id))
                      ? "Unblock"
                      : "Block"}
                  </span>
                </button>
              </div>
            )}
            {blockedUsers.length > 0 && (
              <button
                type="button"
                onClick={() => setShowBlockedUsersModal(true)}
                className="ml-2 px-3 py-1 rounded text-sm font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50 transition-colors"
                title="View blocked users"
              >
                🚫 Blocked ({blockedUsers.length})
              </button>
            )}
            {pinnedMessages.length > 0 && (
              <button
                type="button"
                onClick={() => setShowPinnedMessagesModal(true)}
                className="ml-2 px-3 py-1 rounded text-sm font-medium bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50 transition-colors"
                title="View pinned messages"
              >
                📌 Pinned ({pinnedMessages.length})
              </button>
            )}
            {notificationsSupported() && notifPermission !== "granted" && (
              <div className="ml-auto flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-2 py-1 rounded">
                <span className="text-xs text-blue-800 dark:text-blue-300">
                  Enable desktop notifications?
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    const granted = await requestNotificationPermission();
                    setNotifPermission(granted ? "granted" : "denied");
                  }}
                  className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                >
                  Enable
                </button>
              </div>
            )}
            <input
              type="text"
              placeholder="🔍 Search messages..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded text-sm dark:bg-gray-700 dark:border-gray-600"
            />
            {!selectionMode ? (
              <button
                onClick={() => setSelectionMode(true)}
                className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                title="Select messages to delete"
              >
                Select
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const myMessages = messages
                      .filter((m) => m.sender.id === user.id)
                      .map((m) => m.id);
                    setSelectedMessages(new Set(myMessages));
                  }}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  ✓ All Mine
                </button>
                {selectedMessages.size > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm font-semibold hover:bg-red-700"
                  >
                    🗑️ Delete ({selectedMessages.size})
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectionMode(false);
                    setSelectedMessages(new Set());
                  }}
                  className="px-3 py-1 bg-gray-400 text-white rounded text-sm hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Messages */}
          <div ref={messagesContainerRef} className="flex-1 overflow-hidden">
            {(() => {
              const isSearching = searchQuery.trim().length > 0;
              const displayMessages = isSearching
                ? searchResults
                : [...visibleMessages, ...pendingMessages];

              const filteredMessages = displayMessages.filter((msg) => {
                if (!searchQuery) return true;
                return (
                  msg.text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  msg.sender?.name
                    ?.toLowerCase()
                    .includes(searchQuery.toLowerCase())
                );
              });

              const pinnedMessages = isSearching
                ? []
                : filteredMessages.filter((m) => m.isPinned);
              const unpinnedMessages = isSearching
                ? filteredMessages
                : filteredMessages.filter((m) => !m.isPinned);
              const listItems = isSearching
                ? filteredMessages
                : [...pinnedMessages, ...unpinnedMessages];

              const shouldVirtualize =
                !isSearching && listItems.length > 40 && listHeight > 0;

              return (
                <div className="h-full flex flex-col overflow-hidden">
                  {loadingOlder && (
                    <div className="text-center py-2">
                      <div className="inline-block">
                        <svg
                          className="w-6 h-6 animate-spin text-gray-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                      </div>
                    </div>
                  )}

                  {isSearching && (
                    <div className="text-center py-2 mb-2 border-b border-gray-300 dark:border-gray-600">
                      <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                        {searchLoading ? (
                          "Searching..."
                        ) : (
                          <>
                            {filteredMessages.length} result
                            {filteredMessages.length !== 1 ? "s" : ""} for "
                            {searchQuery}"
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {primaryPeer &&
                    blockedUsers.includes(String(primaryPeer.id)) && (
                      <div className="px-4 py-3 mb-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded flex items-start gap-2">
                        <span className="text-lg flex-shrink-0 mt-0.5">🚫</span>
                        <div>
                          <div className="text-sm font-semibold text-red-700 dark:text-red-400">
                            You have blocked {primaryPeer.name}
                          </div>
                          <div className="text-xs text-red-600 dark:text-red-300 mt-0.5">
                            You won't receive messages from them
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={toggleBlockPeer}
                          className="ml-auto text-sm underline text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 whitespace-nowrap"
                        >
                          Unblock
                        </button>
                      </div>
                    )}

                  {isSearching &&
                    !searchLoading &&
                    filteredMessages.length === 0 && (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No messages found
                      </div>
                    )}

                  <div className="flex-1 overflow-hidden">
                    {shouldVirtualize ? (
                      <VList
                        height={listHeight || 400}
                        width="100%"
                        itemCount={listItems.length}
                        itemSize={(index) =>
                          sizeMapRef.current[listItems[index]?.id] || 140
                        }
                        estimatedItemSize={140}
                        itemKey={(index, data) => data.items[index]?.id}
                        onItemsRendered={handleItemsRendered}
                        ref={vListRef}
                        innerRef={listInnerRef}
                        itemData={{ items: listItems }}
                      >
                        {VirtualRow}
                      </VList>
                    ) : (
                      <div className="p-4 space-y-4 overflow-y-auto h-full">
                        {listItems.map((message) => (
                          <div key={message.id}>
                            {renderMessageBubble(message)}
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Input */}
          <form
            onSubmit={handleSend}
            className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
          >
            {uploadingAttachment && (
              <div className="mb-3 p-3 bg-gray-100 dark:bg-gray-700 rounded">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Uploading {attachmentType && `(${attachmentType})`}...
                  </span>
                  <button
                    type="button"
                    onClick={handleCancelUpload}
                    className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
                  >
                    Cancel
                  </button>
                </div>
                <div className="w-full bg-gray-300 dark:bg-gray-600 rounded h-2 overflow-hidden">
                  <div
                    className="bg-blue-500 h-2 transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                  {uploadProgress}%
                </div>
              </div>
            )}
            {attachmentUrl && (
              <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                <div className="flex items-start gap-3">
                  {attachmentPreview && (
                    <img
                      src={attachmentPreview}
                      alt="preview"
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                        {attachmentFileName || "Attachment"}
                      </span>
                      {attachmentType && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${getFileTypeColor(
                            attachmentType
                          )}`}
                        >
                          {attachmentType}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      Ready to send
                    </p>
                    <button
                      type="button"
                      onClick={handleClearAttachment}
                      className="text-xs text-red-500 hover:text-red-600 font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,.pdf"
                onChange={handleAttachmentUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAttachment || sending}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                title="Attach image, video, or PDF"
              >
                {uploadingAttachment ? (
                  <svg
                    className="w-6 h-6 animate-spin"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    />
                  </svg>
                )}
              </button>
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => handleTyping(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={sending || uploadingAttachment}
              />
              <button
                type="submit"
                disabled={
                  (!newMessage.trim() && !attachmentUrl) ||
                  sending ||
                  uploadingAttachment
                }
                className="p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-full transition-colors disabled:cursor-not-allowed"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </div>
            {typingUsers.size > 0 && (
              <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mt-2">
                <span>
                  {Array.from(typingUsers).join(", ")}{" "}
                  {typingUsers.size === 1 ? "is" : "are"} typing
                </span>
                <span className="flex gap-0.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </span>
              </div>
            )}
          </form>

          {showBlockedUsersModal && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-2xl max-w-md w-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Blocked Users ({blockedUsers.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowBlockedUsersModal(false)}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xl"
                  >
                    ×
                  </button>
                </div>

                {blockedUsers.length === 0 ? (
                  <p className="text-gray-600 dark:text-gray-400 text-sm text-center py-4">
                    You haven't blocked anyone
                  </p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {blockedUsers.map((userId) => (
                      <div
                        key={userId}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded"
                      >
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          User ID: {userId}
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const { blockService } = await import(
                                "../services/blockService"
                              );
                              await blockService.unblockUser(userId);
                              setBlockedUsers((prev) =>
                                prev.filter((id) => id !== userId)
                              );
                              showToast(
                                `Unblocked user ${userId}`,
                                "warning",
                                2000
                              );
                            } catch (error) {
                              console.error("Failed to unblock:", error);
                              showToast(
                                "Failed to unblock user",
                                "error",
                                3000
                              );
                            }
                          }}
                          className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                        >
                          Unblock
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowBlockedUsersModal(false)}
                  className="w-full mt-4 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {readReceiptsModal && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-2xl max-w-md w-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Read by ({readReceiptsModal.readReceipts?.length || 0})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setReadReceiptsModal(null)}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xl"
                  >
                    ×
                  </button>
                </div>

                {readReceiptsModal.readReceipts?.length === 0 ? (
                  <p className="text-gray-600 dark:text-gray-400 text-sm text-center py-4">
                    No one has read this yet
                  </p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {readReceiptsModal.readReceipts?.map((receipt) => (
                      <div
                        key={receipt.userId}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded"
                      >
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          User {receipt.userId}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(receipt.readAt).toLocaleTimeString(
                            "en-US",
                            {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            }
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setReadReceiptsModal(null)}
                  className="w-full mt-4 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {showMembersModal && chat?.participants && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-2xl max-w-md w-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Group Members ({chat.participants.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowMembersModal(false)}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xl"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {chat.participants.map((participant) => (
                    <div
                      key={participant.user.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded"
                    >
                      <div className="flex items-center gap-3">
                        {participant.user.profilePic && (
                          <img
                            src={participant.user.profilePic}
                            alt={participant.user.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {participant.user.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {participant.user.id === user?.id && "(You)"}
                          </div>
                        </div>
                      </div>
                      {participant.user.id !== user?.id && (
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/profile/${participant.user.id}`)
                          }
                          className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          View
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setShowMembersModal(false)}
                  className="w-full mt-4 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {showPinnedMessagesModal && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-2xl max-w-md w-full max-h-96 overflow-y-auto">
                <div className="flex items-center justify-between mb-4 sticky top-0 bg-white dark:bg-gray-800 pb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Pinned Messages ({pinnedMessages.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowPinnedMessagesModal(false)}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xl"
                  >
                    ×
                  </button>
                </div>

                {pinnedMessages.length === 0 ? (
                  <p className="text-gray-600 dark:text-gray-400 text-sm text-center py-4">
                    No pinned messages
                  </p>
                ) : (
                  <div className="space-y-3">
                    {pinnedMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-semibold text-sm text-gray-900 dark:text-white">
                            {msg.sender.name}
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(msg.timestamp).toLocaleTimeString(
                              "en-US",
                              {
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                              }
                            )}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 break-words">
                          {msg.text || "(attachment)"}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setShowPinnedMessagesModal(false);
                            scrollToMessage(msg.id);
                          }}
                          className="text-xs mt-2 text-yellow-700 dark:text-yellow-400 hover:underline"
                        >
                          Jump to message
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowPinnedMessagesModal(false)}
                  className="w-full mt-4 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {editingMessage && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-2xl max-w-md w-full">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Edit Message
                </h3>
                <textarea
                  value={editingMessage.text}
                  onChange={(e) =>
                    setEditingMessage({
                      ...editingMessage,
                      text: e.target.value,
                    })
                  }
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                />
                <div className="flex gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() =>
                      handleEditMessage(editingMessage.id, editingMessage.text)
                    }
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingMessage(null)}
                    className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white rounded hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {zoomImageUrl && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="relative bg-white dark:bg-gray-800 p-4 rounded shadow-2xl max-w-4xl w-full">
                <button
                  type="button"
                  className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
                  onClick={() => setZoomImageUrl(null)}
                >
                  ✕
                </button>
                <img
                  src={zoomImageUrl}
                  alt="Zoomed attachment"
                  className="max-h-[70vh] w-full object-contain rounded"
                />
              </div>
            </div>
          )}

          <ReportModal
            isOpen={reportModalOpen}
            onClose={() => {
              setReportModalOpen(false);
              setMessageToReport(null);
            }}
            targetType="Message"
            targetId={messageToReport?.id}
            targetName={`from ${messageToReport?.sender?.name || "Unknown"}`}
            onSubmit={(reason, description) => {
              reportService.createReport({
                reason,
                description: `${description}\n\n---\nMessage by: ${messageToReport?.sender?.name}\nChat ID: ${chatId}\nMessage ID: ${messageToReport?.id}`,
                reportedUserId: messageToReport?.sender?.id,
                reportedMessageId: messageToReport?.id,
              });
              setReportModalOpen(false);
              setMessageToReport(null);
            }}
          />
        </div>
      )}
    </>
  );
}
