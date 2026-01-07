import { useState, useEffect, useRef, useCallback } from "react";
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
} from "../services/messageCache";
import {
  sendMessageNotification,
  requestNotificationPermission,
  getNotificationPermission,
  notificationsSupported,
} from "../services/notificationService";
import * as ReactWindow from "react-window";

export default function ChatPage() {
  const { FixedSizeList: List } = ReactWindow;
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
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
  const messagesEndRef = useRef(null);
  const messagesStartRef = useRef(null);
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

  // Toast helper (define early so callbacks can reference it)
  const showToast = useCallback((message, type = "info", duration = 3000) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), duration);
  }, []);

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
            localStorage.getItem("notification_sound_enabled")) || "true"
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

    // Get all messages that don't belong to current user
    const otherUsersMessages = messages.filter((m) => m.sender.id !== user.id);

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
  }, [messages, user?.id, chatId]);

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
          } catch (error) {
            console.error("Failed to mark chat as read:", error);
          }
        }, 150);
      }
    },
    [chatId, upsertMessage, user?.id, navigate, playNotificationSound]
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
    });
    socket.on("message_pinned", ({ messageId, isPinned }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, isPinned } : m))
      );
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
          cacheMessages(chatId, combined.filter((m) => !m.tempId)).catch(
            () => {}
          );
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

  // Intersection Observer to load older messages when scrolling to top
  useEffect(() => {
    if (!messagesStartRef.current || !chatId) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreMessages && !loadingOlder) {
          loadOlderMessages();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(messagesStartRef.current);
    return () => observer.disconnect();
  }, [loadOlderMessages, hasMoreMessages, loadingOlder, chatId]);

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

  useEffect(() => {
    scrollToBottom();
    markVisibleMessagesAsRead();
  }, [messages, markVisibleMessagesAsRead]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getFileType = (mimeType) => {
    if (mimeType?.startsWith("image/")) return "Image";
    if (mimeType?.startsWith("video/")) return "Video";
    if (mimeType === "application/pdf") return "PDF";
    return null;
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

  const handleReportMessage = (message) => {
    setMessageToReport(message);
    setReportModalOpen(true);
  };

  const handleTyping = (value) => {
    setNewMessage(value);
    socket.emit("typing", { chatId, userId: user?.id, userName: user?.name });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", { chatId, userId: user?.id });
    }, 1500);
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

  if (loading) return <LoadingSpinner />;

  const renderMessage = (message) => {
    const isOwn = message.sender.id === user.id;
    const isPending = Boolean(message.tempId);
    return (
      <div
        key={message.id}
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
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
              {message.sender.name.charAt(0).toUpperCase()}
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
                <div className="text-sm font-semibold mb-1">
                  {message.sender.name}
                </div>
              )}
              {message.isPinned && (
                <div className="text-xs opacity-75 mb-1">📌 Pinned</div>
              )}
              <div className="break-words">
                {message.text || (message.attachmentUrl ? "(attachment)" : "")}
              </div>
              {message.attachmentUrl && (
                <a
                  href={message.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm underline"
                >
                  📎 View Attachment
                </a>
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
              {isOwn && !isPending && (
                <span className="text-blue-100 text-xs">
                  {(() => {
                    const hasReadReceipts =
                      message.readReceipts && message.readReceipts.length > 0;
                    console.log(
                      `📧 Message ${message.id} check status: ${
                        hasReadReceipts ? "✓✓" : "✓"
                      } (readReceipts: ${message.readReceipts?.length || 0})`
                    );
                    return hasReadReceipts ? `✓✓` : `✓`;
                  })()}{" "}
                  {/* Single check for sent */}
                </span>
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
        </div>
      </div>
    );
  };

  return (
    <>
      {!chatId || !user ? (
        <LoadingSpinner />
      ) : (
        <div className="flex flex-col h-[calc(100vh-64px)] max-w-4xl mx-auto bg-white dark:bg-gray-800">
          {!isOnline && (
            <div className="bg-red-500 text-white px-4 py-2 text-sm font-semibold text-center">
              ⚠ Offline – Messages will be sent when you reconnect
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
                  \u2713 All Mine
                </button>
                {selectedMessages.size > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm font-semibold hover:bg-red-700"
                  >
                    \ud83d\uddd1\ufe0f Delete ({selectedMessages.size})
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
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4"
          >
            {loadingOlder && (
              <div className="text-center py-4">
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
            <div ref={messagesStartRef} className="h-1" />
            {(() => {
              // Use search results if search is active
              const isSearching = searchQuery.trim().length > 0;
              const displayMessages = isSearching
                ? searchResults
                : [...messages, ...pendingMessages];

              const filteredMessages = isSearching
                ? displayMessages // Already filtered by backend
                : displayMessages.filter(
                    (msg) =>
                      !searchQuery ||
                      msg.text
                        ?.toLowerCase()
                        .includes(searchQuery.toLowerCase()) ||
                      msg.sender?.name
                        ?.toLowerCase()
                        .includes(searchQuery.toLowerCase())
                  );

              const pinnedMessages = filteredMessages.filter((m) => m.isPinned);
              const unpinnedMessages = filteredMessages.filter(
                (m) => !m.isPinned
              );

              return (
                <>
                  {/* Search Results Header */}
                  {isSearching && (
                    <div className="text-center py-2 mb-4 border-b border-gray-300 dark:border-gray-600">
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

                  {/* No Results */}
                  {isSearching &&
                    !searchLoading &&
                    filteredMessages.length === 0 && (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No messages found
                      </div>
                    )}

                  {/* Pinned Messages Section */}
                  {!isSearching && pinnedMessages.length > 0 && (
                    <div className="pb-4 border-b-2 border-yellow-200 dark:border-yellow-800">
                      <div className="text-xs text-yellow-700 dark:text-yellow-400 font-semibold mb-2 flex items-center gap-1">
                        📌 PINNED MESSAGES
                      </div>
                      {pinnedMessages.map((message) => renderMessage(message))}
                    </div>
                  )}

                  {/* Regular Messages */}
                  {(() => {
                    const shouldVirtualize =
                      !isSearching && unpinnedMessages.length > 200 && listHeight > 0;
                    if (shouldVirtualize) {
                      const Row = ({ index, style }) => (
                        <div style={style}>{renderMessage(unpinnedMessages[index])}</div>
                      );
                      return (
                        <div className="w-full" style={{ height: listHeight }}>
                          <List
                            height={listHeight}
                            itemCount={unpinnedMessages.length}
                            itemSize={96}
                            width={"100%"}
                          >
                            {Row}
                          </List>
                        </div>
                      );
                    }
                    return unpinnedMessages.map((message) => renderMessage(message));
                  })()}
                </>
              );
            })()}
            <div ref={messagesEndRef} />
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
              <p className="text-xs text-gray-500 mt-2">
                {Array.from(typingUsers).join(", ")} typing...
              </p>
            )}
          </form>

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
