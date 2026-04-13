import { useAuth } from "../context/AuthContext";
import { Link, useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { chatService } from "../services/chatService";
import { socket } from "../services/socket";
import NotificationCenter from "./NotificationCenter";

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
          0,
        );
        setUnreadTotal(total);
        console.log(
          `📬 New message in chat ${message.chatId}, unread now:`,
          unreadByChat.current,
        );
      }
    };

    // On chat_read_by_user: clear unread for that chat
    const onChatRead = ({ chatId }) => {
      if (chatId) {
        unreadByChat.current[chatId] = 0;
        const total = Object.values(unreadByChat.current).reduce(
          (sum, c) => sum + c,
          0,
        );
        setUnreadTotal(total);
        console.log(
          `✓ Chat ${chatId} marked read, unread now:`,
          unreadByChat.current,
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
          className="fixed inset-0 bg-black/50 sm:hidden z-30"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed sm:static w-56 sm:w-64 md:w-72 shadow-lg h-screen sm:h-auto sm:min-h-screen p-3 sm:p-4 md:p-6 transform transition-transform duration-300 z-40 flex flex-col overflow-hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
        }`}
        style={{
          backgroundColor: "var(--card)",
          color: "var(--text)",
        }}
      >
        <div className="flex items-center justify-between mb-4 sm:mb-6 flex-shrink-0">
          <button
            className="text-xl sm:text-2xl font-bold text-primary flex-1 text-left"
            onClick={() => {
              if (window?.location?.pathname === "/home") {
                window.location.reload();
              } else {
                window.location.href = "/home";
              }
            }}
            title="Go to home"
          >
            XavLink
          </button>
          <NotificationCenter />
          <button
            onClick={onToggle}
            className="sm:hidden p-1 hover:opacity-80 transition ml-1"
            style={{ color: "var(--muted)" }}
            title="Close sidebar"
            aria-label="Close sidebar"
          >
            <svg
              className="w-5 h-5"
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

        <nav className="space-y-2 flex-1 overflow-y-auto scrollbar-hide pb-4">
          <SidebarLink
            to="/home"
            label="🏠 Home"
            isActive={isActive("/home")}
          />
          <SidebarLink
            to="/discover"
            label="🔍 Discover"
            isActive={isActive("/discover")}
          />
          <SidebarLink
            to="/profile"
            label="👤 Profile"
            isActive={isActive("/profile")}
          />
          <SidebarLink
            to="/skills"
            label="🎯 Skills"
            isActive={isActive("/skills")}
          />
          <SidebarLink
            to="/requests"
            label="📨 Requests"
            isActive={isActive("/requests")}
          />

          <SidebarLinkWithBadge
            to="/chats"
            label="💬 Messages"
            badge={unreadTotal}
            isActive={
              isActive("/chats") || location.pathname.startsWith("/chat")
            }
          />

          <SidebarLink
            to="/notifications"
            label="🔔 Notifications"
            isActive={isActive("/notifications")}
          />

          {(user?.role === "admin" || user?.role === "moderator") && (
            <SidebarLink
              to="/moderation"
              label="🛡️ Moderation"
              isActive={isActive("/moderation")}
            />
          )}

          {user?.role === "admin" && (
            <SidebarLink
              to="/admin"
              label="🧰 Admin"
              isActive={isActive("/admin")}
            />
          )}

          <SidebarLink
            to="/enhancements"
            label="✨ Enhancements"
            isActive={isActive("/enhancements")}
          />
          <SidebarLink
            to="/settings"
            label="⚙️ Settings"
            isActive={isActive("/settings")}
          />
        </nav>

        <div
          className="pt-3 sm:pt-4 border-t flex-shrink-0"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            onClick={logout}
            className="w-full px-3 sm:px-4 py-2.5 rounded transition hover:opacity-90 font-medium text-sm sm:text-base mt-3 sm:mt-4"
            style={{
              backgroundColor: "#DC2626",
              color: "#FAFAFA",
            }}
          >
            🚪 Logout
          </button>
        </div>
      </aside>
    </>
  );
}

// Helper component for sidebar links
function SidebarLink({ to, label, isActive }) {
  return (
    <Link
      to={to}
      className={`block px-3 sm:px-4 py-2 rounded transition text-sm sm:text-base ${
        isActive ? "font-semibold" : "hover:opacity-80"
      }`}
      style={{
        backgroundColor: isActive ? "var(--primary)" : "transparent",
        color: "var(--text)",
      }}
    >
      {label}
    </Link>
  );
}

// Helper component for sidebar links with badge
function SidebarLinkWithBadge({ to, label, badge, isActive }) {
  return (
    <Link
      to={to}
      className={`flex items-center justify-between px-3 sm:px-4 py-2 rounded transition text-sm sm:text-base ${
        isActive ? "font-semibold" : "hover:opacity-80"
      }`}
      style={{
        backgroundColor: isActive ? "var(--primary)" : "transparent",
        color: "var(--text)",
      }}
    >
      <span>{label}</span>
      {badge > 0 && (
        <span className="ml-2 text-xs bg-red-600 text-white px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}
