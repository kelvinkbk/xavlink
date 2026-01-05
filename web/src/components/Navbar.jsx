import { useAuth } from "../context/AuthContext";
import { useModal } from "../context/ModalContext";
import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../services/api";
import { socket, joinUserRoom, markUserOnline } from "../services/socket";

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const { setShowCreatePostModal, setShowAddSkillModal } = useModal();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      // Connect socket if not already connected
      if (!socket.connected) {
        socket.connect();
      }

      // Join user's notification room and mark as online
      joinUserRoom(user.id);
      markUserOnline(user.id);

      const fetchUnreadCount = async () => {
        try {
          const { data } = await api.get(
            `/notifications/${user.id}/unread-count`
          );
          setUnreadCount(data.unreadCount);
        } catch (error) {
          console.error("Failed to fetch unread count:", error);
        }
      };

      fetchUnreadCount();

      // Listen for real-time notifications
      const handleNewNotification = (notification) => {
        console.log("New notification received:", notification);
        setUnreadCount((prev) => prev + 1);
        // Show toast or notification UI
        window.dispatchEvent(
          new CustomEvent("new-notification", { detail: notification })
        );
      };

      socket.on("new_notification", handleNewNotification);

      // Listen for immediate unread badge updates
      const onUnreadUpdated = (e) => {
        const val = e?.detail?.unread;
        if (typeof val === "number") setUnreadCount(val);
      };
      window.addEventListener("unread-updated", onUnreadUpdated);

      return () => {
        socket.off("new_notification", handleNewNotification);
        window.removeEventListener("unread-updated", onUnreadUpdated);
      };
    }
  }, [isAuthenticated, user?.id]);

  return (
    <nav className="bg-secondary text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-2xl font-bold text-primary">
            XavLink
          </Link>

          <div className="flex gap-4 items-center">
            {isAuthenticated ? (
              <>
                <Link
                  to="/home"
                  className={`px-2 py-1 rounded transition ${
                    location.pathname === "/home"
                      ? "text-primary font-semibold bg-white/10"
                      : "hover:text-primary"
                  }`}
                >
                  Home
                </Link>
                <Link
                  to="/discover"
                  className={`px-2 py-1 rounded transition ${
                    location.pathname === "/discover"
                      ? "text-primary font-semibold bg-white/10"
                      : "hover:text-primary"
                  }`}
                >
                  Discover
                </Link>
                <Link
                  to="/skills"
                  className={`px-2 py-1 rounded transition ${
                    location.pathname === "/skills"
                      ? "text-primary font-semibold bg-white/10"
                      : "hover:text-primary"
                  }`}
                >
                  Skills
                </Link>
                <Link
                  to="/requests"
                  className={`px-2 py-1 rounded transition ${
                    location.pathname === "/requests"
                      ? "text-primary font-semibold bg-white/10"
                      : "hover:text-primary"
                  }`}
                >
                  Requests
                </Link>
                <Link
                  to="/notifications"
                  className={`relative px-2 py-1 rounded transition group ${
                    location.pathname === "/notifications"
                      ? "text-primary font-semibold bg-white/10"
                      : "hover:text-primary"
                  }`}
                >
                  <span className="text-xl">🔔</span>
                  {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center group-hover:bg-red-700">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>
                <button
                  onClick={() => setShowCreatePostModal(true)}
                  className="px-3 py-1 rounded bg-green-600 hover:bg-green-700 transition font-medium text-sm"
                >
                  + Post
                </button>
                <button
                  onClick={() => setShowAddSkillModal(true)}
                  className="px-3 py-1 rounded bg-purple-600 hover:bg-purple-700 transition font-medium text-sm"
                >
                  + Skill
                </button>
                <Link to="/profile" className="hover:text-primary transition">
                  {user?.name}
                </Link>
                {(user?.role === "admin" || user?.role === "moderator") && (
                  <Link
                    to="/moderation"
                    className="hover:text-primary transition"
                  >
                    🛡️ Moderation
                  </Link>
                )}
                {user?.role === "admin" && (
                  <Link to="/admin" className="hover:text-primary transition">
                    🧰 Admin
                  </Link>
                )}
                <Link to="/settings" className="hover:text-primary transition">
                  ⚙️
                </Link>
                <button
                  onClick={logout}
                  className="bg-red-600 px-4 py-2 rounded hover:bg-red-700 transition"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="hover:text-primary transition">
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-primary px-4 py-2 rounded hover:bg-blue-600 transition"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
