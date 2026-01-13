import { useAuth } from "../context/AuthContext";
import { Link, useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { chatService } from "../services/chatService";
import { socket } from "../services/socket";

export default function Sidebar({ isOpen, onToggle }) {
  const { isAuthenticated, logout, user } = useAuth();
  const location = useLocation();
  const [unreadTotal, setUnreadTotal] = useState(0);
  const unreadByChat = useRef({}); // { chatId: count }

  const isActive = (path) => location.pathname === path;

  // Real-time unread updates: track locally on message events
  useEffect(() => {
    // Initial load of unread counts
    const loadInitial = async () => {
      try {
        const chats = await chatService.getUserChats();
        const byChat = {};
        chats.forEach((c) => {
          byChat[c.id] = c.unreadCount || 0;
        });
        unreadByChat.current = byChat;
        const total = Object.values(byChat).reduce((sum, c) => sum + c, 0);
        setUnreadTotal(total);
        console.log("📊 Initial unread counts loaded:", byChat);
      } catch {
        // noop
      }
    };
    loadInitial();

    // On receive_message: increment unread for that chat if not viewing it
    const onReceiveMessage = (message) => {
      if (!message || !message.chatId) return;
      const isViewingChat = location.pathname === `/chat/${message.chatId}`;
      if (!isViewingChat) {
        unreadByChat.current[message.chatId] =
          (unreadByChat.current[message.chatId] || 0) + 1;
        const total = Object.values(unreadByChat.current).reduce(
          (sum, c) => sum + c,
          0
        );
        setUnreadTotal(total);
        console.log(
          `📬 New message in chat ${message.chatId}, unread now:`,
          unreadByChat.current
        );
      }
    };

    // On chat_read_by_user: clear unread for that chat
    const onChatRead = ({ chatId }) => {
      if (chatId) {
        unreadByChat.current[chatId] = 0;
        const total = Object.values(unreadByChat.current).reduce(
          (sum, c) => sum + c,
          0
        );
        setUnreadTotal(total);
        console.log(
          `✓ Chat ${chatId} marked read, unread now:`,
          unreadByChat.current
        );
      }
    };

    socket.on("receive_message", onReceiveMessage);
    socket.on("chat_read_by_user", onChatRead);

    return () => {
      socket.off("receive_message", onReceiveMessage);
      socket.off("chat_read_by_user", onChatRead);
    };
  }, [location.pathname]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const chats = await chatService.getUserChats();
        const byChat = {};
        chats.forEach((c) => {
          byChat[c.id] = c.unreadCount || 0;
        });
        unreadByChat.current = byChat;
        const total = Object.values(byChat).reduce((sum, c) => sum + c, 0);
        setUnreadTotal(total);
      } catch {
        // ignore background refresh failures
      }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 md:hidden z-30"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static w-64 shadow-lg min-h-screen p-6 transform transition-transform duration-300 z-40 ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
        style={{
          backgroundColor: "var(--card)",
          color: "var(--text)",
        }}
      >
        <div className="flex items-center justify-between mb-8">
          <button
            className="text-2xl font-bold text-primary text-left flex-1"
            onClick={() => {
              // Navigate to home and force refresh
              if (window?.location?.pathname === "/home") {
                window.location.reload();
              } else {
                window.location.href = "/home";
              }
            }}
          >
            XavLink
          </button>
          <button
            onClick={onToggle}
            className="md:hidden p-1 hover:opacity-80 transition"
            style={{ color: "var(--muted)" }}
            title="Close sidebar"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <nav className="space-y-3">
          <Link
            to="/home"
            className={`block px-4 py-2 rounded transition ${
              isActive("/home") ? "bg-primary" : "hover:opacity-80"
            }`}
            style={{
              backgroundColor: isActive("/home") ? "var(--primary)" : "transparent",
              color: isActive("/home") ? "var(--text)" : "var(--text)",
            }}
          >
            Home
          </Link>
          <Link
            to="/discover"
            className={`block px-4 py-2 rounded transition ${
              isActive("/discover") ? "bg-primary" : "hover:opacity-80"
            }`}
            style={{
              backgroundColor: isActive("/discover") ? "var(--primary)" : "transparent",
              color: isActive("/discover") ? "var(--text)" : "var(--text)",
            }}
          >
            🔍 Discover
          </Link>
          <Link
            to="/profile"
            className={`block px-4 py-2 rounded transition ${
              isActive("/profile") ? "bg-primary" : "hover:opacity-80"
            }`}
            style={{
              backgroundColor: isActive("/profile") ? "var(--primary)" : "transparent",
              color: isActive("/profile") ? "var(--text)" : "var(--text)",
            }}
          >
            Profile
          </Link>
          <Link
            to="/skills"
            className={`block px-4 py-2 rounded transition ${
              isActive("/skills") ? "bg-primary" : "hover:opacity-80"
            }`}
            style={{
              backgroundColor: isActive("/skills") ? "var(--primary)" : "transparent",
              color: isActive("/skills") ? "var(--text)" : "var(--text)",
            }}
          >
            Skills
          </Link>
          <Link
            to="/requests"
            className={`block px-4 py-2 rounded transition ${
              isActive("/requests") ? "bg-primary" : "hover:opacity-80"
            }`}
            style={{
              backgroundColor: isActive("/requests") ? "var(--primary)" : "transparent",
              color: isActive("/requests") ? "var(--text)" : "var(--text)",
            }}
          >
            Requests
          </Link>
          <Link
            to="/chats"
            className={`flex items-center justify-between px-4 py-2 rounded transition ${
              isActive("/chats") || location.pathname.startsWith("/chat")
                ? "bg-primary"
                : "hover:opacity-80"
            }`}
            style={{
              backgroundColor:
                isActive("/chats") || location.pathname.startsWith("/chat")
                  ? "var(--primary)"
                  : "transparent",
              color: "var(--text)",
            }}
          >
            <span>💬 Messages</span>
            {unreadTotal > 0 && (
              <span className="ml-2 text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">
                {unreadTotal}
              </span>
            )}
          </Link>
          <Link
            to="/notifications"
            className={`block px-4 py-2 rounded transition ${
              isActive("/notifications") ? "bg-primary" : "hover:opacity-80"
            }`}
            style={{
              backgroundColor: isActive("/notifications") ? "var(--primary)" : "transparent",
              color: "var(--text)",
            }}
          >
            🔔 Notifications
          </Link>
          {(user?.role === "admin" || user?.role === "moderator") && (
            <Link
              to="/moderation"
              className={`block px-4 py-2 rounded transition ${
                isActive("/moderation") ? "bg-primary" : "hover:opacity-80"
              }`}
              style={{
                backgroundColor: isActive("/moderation") ? "var(--primary)" : "transparent",
                color: "var(--text)",
              }}
            >
              🛡️ Moderation
            </Link>
          )}
          {user?.role === "admin" && (
            <Link
              to="/admin"
              className={`block px-4 py-2 rounded transition ${
                isActive("/admin") ? "bg-primary" : "hover:opacity-80"
              }`}
              style={{
                backgroundColor: isActive("/admin") ? "var(--primary)" : "transparent",
                color: "var(--text)",
              }}
            >
              🧰 Admin
            </Link>
          )}
          <Link
            to="/settings"
            className={`block px-4 py-2 rounded transition ${
              isActive("/settings") ? "bg-primary" : "hover:opacity-80"
            }`}
            style={{
              backgroundColor: isActive("/settings") ? "var(--primary)" : "transparent",
              color: "var(--text)",
            }}
          >
            ⚙️ Settings
          </Link>
        </nav>

        <div
          className="pt-8 border-t mt-8"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            onClick={logout}
            className="w-full px-4 py-2 rounded transition hover:opacity-90"
            style={{
              backgroundColor: "#DC2626",
              color: "#FAFAFA",
            }}
          >
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
