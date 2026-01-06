import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { chatService } from "../services/chatService";
import { socket } from "../services/socket";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "../components/LoadingSpinner";
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
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const upsertMessage = useCallback((message) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === message.id)) return prev;
      return [...prev, message];
    });
  }, []);

  const handleReceiveMessage = useCallback(
    (message) => {
      if (message.chatId === chatId) {
        upsertMessage(message);
      }
    },
    [chatId, upsertMessage]
  );

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      const data = await chatService.getChatMessages(chatId);
      setMessages(data);
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
      socket.off("user_typing");
      socket.off("user_stopped_typing");
    };
  }, [chatId, handleReceiveMessage, loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

    setSending(true);
    const messageText = newMessage.trim();
    // Sanitize attachment URL by removing whitespace/newlines
    const attachment = attachmentUrl ? attachmentUrl.trim() : null;
    setNewMessage("");
    setAttachmentUrl("");

    console.log("📤 Sending message via REST API:", {
      chatId,
      text: messageText || "(attachment)",
      attachmentUrl: attachment,
    });

    try {
      // Use REST API to send message (more reliable than Socket.io on Render)
      const response = await chatService.sendMessage(
        chatId,
        messageText,
        attachment
      );
      console.log("✅ Message sent successfully:", response);

      // Add message to local state immediately
      if (response) {
        upsertMessage(response);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to send message";
      alert(`Error: ${errorMsg}`);
      setNewMessage(messageText);
      setAttachmentUrl(attachment);
    } finally {
      setSending(false);
    }
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

  const handleReportMessage = async (message) => {
    try {
      await reportService.createReport({
        // Valid reasons per backend: spam, harassment, inappropriate_content, misinformation, copyright, other
        reason: "harassment",
        description: `Reported message\nChat ID: ${
          activeChat?.id
        }\nMessage ID: ${message.id}\nText: ${
          message.text?.slice(0, 200) || "(no text)"
        }`,
        reportedUserId: message.sender?.id,
        reportedMessageId: message.id,
      });
      alert("Message reported to moderators.");
    } catch (error) {
      console.error("Failed to report message:", error);
      alert("Failed to report message");
    }
  };

  const handleTyping = (value) => {
    setNewMessage(value);
    socket.emit("typing", { chatId, userId: user?.id, userName: user?.name });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", { chatId, userId: user?.id });
    }, 1500);
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

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-4xl mx-auto bg-white dark:bg-gray-800">
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
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isOwn = message.sender.id === user.id;
          return (
            <div
              key={message.id}
              className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
            >
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
                <div>
                  {!isOwn && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 px-3">
                      {message.sender.name}
                    </p>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-2 ${
                      isOwn
                        ? "bg-blue-500 text-white rounded-br-sm"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-sm"
                    }`}
                  >
                    {message.attachmentUrl && (
                      <div className="mb-2">
                        <img
                          src={message.attachmentUrl}
                          alt="attachment"
                          className="max-w-sm rounded-lg max-h-64 object-cover cursor-pointer"
                          onClick={() =>
                            window.open(message.attachmentUrl, "_blank")
                          }
                        />
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.text}
                    </p>
                    <div className="flex items-center gap-2 text-xs mt-1">
                      <span
                        className={
                          isOwn
                            ? "text-blue-100"
                            : "text-gray-500 dark:text-gray-400"
                        }
                      >
                        {formatTimestamp(message.timestamp)}
                      </span>
                      {isOwn && <span className="text-blue-100">✓</span>}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1 px-1">
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
            </div>
          );
        })}
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
    </div>
  );
}
