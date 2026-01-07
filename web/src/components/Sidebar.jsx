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
      } catch {
        // noop
      }
    };
    loadInitial();

    // On receive_message: increment unread if not viewing that chat
    const onReceiveMessage = ({ chatId }) => {
      const isViewingChat =
        location.pathname === `/chat/${chatId}` || location.pathname === "/chats";
      if (!isViewingChat && chatId) {
        unreadByChat.current[chatId] = (unreadByChat.current[chatId] || 0) + 1;
        const total = Object.values(unreadByChat.current).reduce(
          (sum, c) => sum + c,
          0
        );
        setUnreadTotal(total);
      }
    };

    // On message_read: decrement unread for that chat
    const onMessageRead = ({ chatId }) => {
      if (chatId && unreadByChat.current[chatId] > 0) {
        unreadByChat.current[chatId] -= 1;
        const total = Object.values(unreadByChat.current).reduce(
          (sum, c) => sum + c,
          0
        );
        setUnreadTotal(total);
      }
    };

    // On mark_chat_as_read: clear unread for that chat
    const onChatRead = ({ chatId }) => {
      if (chatId) {
        unreadByChat.current[chatId] = 0;
        const total = Object.values(unreadByChat.current).reduce(
          (sum, c) => sum + c,
          0
        );
        setUnreadTotal(total);
      }
    };

    socket.on("receive_message", onReceiveMessage);
    socket.on("message_read", onMessageRead);
    socket.on("mark_chat_as_read", onChatRead);

    return () => {
      socket.off("receive_message", onReceiveMessage);
      socket.off("message_read", onMessageRead);
      socket.off("mark_chat_as_read", onChatRead);
    };
  }, [location.pathname]);

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
        className={`fixed md:static w-64 bg-secondary text-white shadow-lg min-h-screen p-6 transform transition-transform duration-300 z-40 ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
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
            className="md:hidden p-1 text-gray-300 hover:text-white"
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
              isActive("/home") ? "bg-primary text-white" : "hover:bg-gray-700"
            }`}
          >
            Home
          </Link>
          <Link
            to="/discover"
            className={`block px-4 py-2 rounded transition ${
              isActive("/discover")
                ? "bg-primary text-white"
                : "hover:bg-gray-700"
            }`}
          >
            🔍 Discover
          </Link>
          <Link
            to="/profile"
            className={`block px-4 py-2 rounded transition ${
              isActive("/profile")
                ? "bg-primary text-white"
                : "hover:bg-gray-700"
            }`}
          >
            Profile
          </Link>
          <Link
            to="/skills"
            className={`block px-4 py-2 rounded transition ${
              isActive("/skills")
                ? "bg-primary text-white"
                : "hover:bg-gray-700"
            }`}
          >
            Skills
          </Link>
          <Link
            to="/requests"
            className={`block px-4 py-2 rounded transition ${
              isActive("/requests")
                ? "bg-primary text-white"
                : "hover:bg-gray-700"
            }`}
          >
            Requests
          </Link>
          <Link
            to="/chats"
            className={`flex items-center justify-between px-4 py-2 rounded transition ${
              isActive("/chats") || location.pathname.startsWith("/chat")
                ? "bg-primary text-white"
                : "hover:bg-gray-700"
            }`}
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
              isActive("/notifications")
                ? "bg-primary text-white"
                : "hover:bg-gray-700"
            }`}
          >
            🔔 Notifications
          </Link>
          {(user?.role === "admin" || user?.role === "moderator") && (
            <Link
              to="/moderation"
              className={`block px-4 py-2 rounded transition ${
                isActive("/moderation")
                  ? "bg-primary text-white"
                  : "hover:bg-gray-700"
              }`}
            >
              🛡️ Moderation
            </Link>
          )}
          {user?.role === "admin" && (
            <Link
              to="/admin"
              className={`block px-4 py-2 rounded transition ${
                isActive("/admin")
                  ? "bg-primary text-white"
                  : "hover:bg-gray-700"
              }`}
            >
              🧰 Admin
            </Link>
          )}
          <Link
            to="/settings"
            className={`block px-4 py-2 rounded transition ${
              isActive("/settings")
                ? "bg-primary text-white"
                : "hover:bg-gray-700"
            }`}
          >
            ⚙️ Settings
          </Link>
        </nav>

        <div className="pt-8 border-t border-gray-700 mt-8">
          <button
            onClick={logout}
            className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
