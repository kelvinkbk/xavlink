import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { chatService } from "../services/chatService";
import { socket } from "../services/socket";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "../components/LoadingSpinner";
import ReportModal from "../components/ReportModal";
import MessageReactions from "../components/MessageReactions";
import { uploadService, reportService } from "../services/api";

export default function ChatPage() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [messageToReport, setMessageToReport] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageReactions, setMessageReactions] = useState({});
  const [pendingMessages, setPendingMessages] = useState([]); // optimistic queue
  const [toast, setToast] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState(new Set());
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const readTimeoutRef = useRef(null);
  const markChatReadTimeoutRef = useRef(null);
  const pendingTimersRef = useRef({});
  const toastTimerRef = useRef(null);

  // Auto-mark messages as read when viewed
  const markVisibleMessagesAsRead = useCallback(() => {
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
  }, [messages, user.id, chatId]);

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
          if (pendingTimersRef.current[pending.tempId]) {
            clearTimeout(pendingTimersRef.current[pending.tempId]);
          }
          pendingTimersRef.current[pending.tempId] = setTimeout(() => {
            sendPendingMessage({ ...pending, attempts });
          }, backoffMs);
        }

        if (!willRetry) {
          showToast("Message failed to send. Tap retry.", "error", 4000);
        }
      }
    },
    [chatId, upsertMessage, showToast]
  );

  const handleReceiveMessage = useCallback(
    (message) => {
      if (message.chatId === chatId) {
        upsertMessage(message);

        // Remove matching pending if same sender and text
        setPendingMessages((prev) =>
          prev.filter(
            (m) =>
              !(
                m.sender.id === user.id &&
                m.text === message.text &&
                m.attachmentUrl === message.attachmentUrl
              )
          )
        );

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
    [chatId, upsertMessage, user.id]
  );

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      const data = await chatService.getChatMessages(chatId);
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

  useEffect(() => {
    // Ensure socket is connected
    if (!socket.connected) {
      console.log("🔌 Connecting socket for chat...");
      socket.connect();
    }

    loadMessages();

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

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("message_deleted");
      socket.off("reaction_added");
      socket.off("reaction_removed");
      socket.off("message_pinned");
      socket.off("message_read");
      socket.off("user_typing");
      socket.off("user_stopped_typing");
    };
  }, [chatId, handleReceiveMessage, loadMessages]);

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

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [sendPendingMessage]);

  useEffect(() => {
    scrollToBottom();
    markVisibleMessagesAsRead();
  }, [messages, markVisibleMessagesAsRead]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleAttachmentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAttachment(true);
    try {
      const { url } = await uploadService.uploadChatAttachment(file);
      setAttachmentUrl(url);
    } catch (error) {
      console.error("Failed to upload attachment:", error);
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to upload attachment";
      alert(`Upload failed: ${errorMsg}`);
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !attachmentUrl) || sending) return;

    socket.emit("stop_typing", { chatId, userId: user?.id });

    const messageText = newMessage.trim();
    const attachment = attachmentUrl ? attachmentUrl.trim() : null;
    setNewMessage("");
    setAttachmentUrl("");

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

  const handleRetryPending = useCallback(
    (tempId) => {
      const pending = pendingMessages.find((m) => m.tempId === tempId);
      if (pending) {
        sendPendingMessage({ ...pending, attempts: 0, status: "sending" });
      }
    },
    [pendingMessages, sendPendingMessage]
  );

  const showToast = useCallback((message, type = "info", duration = 3000) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), duration);
  }, []);

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
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-4xl mx-auto bg-white dark:bg-gray-800">
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
        <input
          type="text"
          placeholder="🔍 Search messages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {(() => {
          const filteredMessages = [...messages, ...pendingMessages].filter(
            (msg) =>
              !searchQuery ||
              msg.text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              msg.sender?.name
                ?.toLowerCase()
                .includes(searchQuery.toLowerCase())
          );

          const pinnedMessages = filteredMessages.filter((m) => m.isPinned);
          const unpinnedMessages = filteredMessages.filter((m) => !m.isPinned);

          return (
            <>
              {/* Pinned Messages Section */}
              {pinnedMessages.length > 0 && (
                <div className="pb-4 border-b-2 border-yellow-200 dark:border-yellow-800">
                  <div className="text-xs text-yellow-700 dark:text-yellow-400 font-semibold mb-2 flex items-center gap-1">
                    📌 PINNED MESSAGES
                  </div>
                  {pinnedMessages.map((message) => renderMessage(message))}
                </div>
              )}

              {/* Regular Messages */}
              {unpinnedMessages.map((message) => renderMessage(message))}
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
        {attachmentUrl && (
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span>📎 Attachment ready</span>
            <button
              type="button"
              onClick={() => setAttachmentUrl("")}
              className="text-red-500 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAttachmentUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAttachment || sending}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            title="Attach image"
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
            disabled={sending}
          />
          <button
            type="submit"
            disabled={(!newMessage.trim() && !attachmentUrl) || sending}
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
  );
}
