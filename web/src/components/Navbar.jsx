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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            `/notifications/${user.id}/unread-count`,
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
          new CustomEvent("new-notification", { detail: notification }),
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
    <nav className="bg-secondary text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo */}
          <Link
            to="/"
            className="text-lg sm:text-2xl font-bold text-primary flex-shrink-0"
          >
            XavLink
          </Link>

          {/* Desktop menu */}
          <div className="hidden md:flex gap-2 lg:gap-4 items-center">
            {isAuthenticated ? (
              <>
                <NavLink
                  to="/home"
                  label="Home"
                  isActive={location.pathname === "/home"}
                />
                <NavLink
                  to="/discover"
                  label="Discover"
                  isActive={location.pathname === "/discover"}
                />
                <NavLink
                  to="/skills"
                  label="Skills"
                  isActive={location.pathname === "/skills"}
                />
                <NavLink
                  to="/requests"
                  label="Requests"
                  isActive={location.pathname === "/requests"}
                />
                <NotificationLink
                  to="/notifications"
                  unreadCount={unreadCount}
                  isActive={location.pathname === "/notifications"}
                />
                <button
                  onClick={() => setShowCreatePostModal(true)}
                  className="px-2 lg:px-3 py-1.5 rounded bg-green-600 hover:bg-green-700 transition font-medium text-xs lg:text-sm whitespace-nowrap"
                >
                  + Post
                </button>
                <button
                  onClick={() => setShowAddSkillModal(true)}
                  className="px-2 lg:px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-700 transition font-medium text-xs lg:text-sm whitespace-nowrap"
                >
                  + Skill
                </button>
                <NavLink
                  to="/profile"
                  label={user?.name || "Profile"}
                  isActive={location.pathname === "/profile"}
                />
                {(user?.role === "admin" || user?.role === "moderator") && (
                  <NavLink
                    to="/moderation"
                    label="🛡️ Mod"
                    isActive={location.pathname === "/moderation"}
                  />
                )}
                {user?.role === "admin" && (
                  <NavLink
                    to="/admin"
                    label="🧰 Admin"
                    isActive={location.pathname === "/admin"}
                  />
                )}
                <NavLink
                  to="/settings"
                  label="⚙️"
                  isActive={location.pathname === "/settings"}
                />
                <button
                  onClick={logout}
                  className="bg-red-600 px-3 py-1.5 rounded hover:bg-red-700 transition text-sm"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  label="Login"
                  isActive={location.pathname === "/login"}
                />
                <button className="bg-primary px-4 py-2 rounded hover:bg-blue-600 transition text-sm">
                  <Link to="/register">Register</Link>
                </button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded hover:bg-white/10 transition flex-shrink-0"
            aria-label="Toggle menu"
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
                d={
                  mobileMenuOpen
                    ? "M6 18L18 6M6 6l12 12"
                    : "M4 6h16M4 12h16M4 18h16"
                }
              />
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && isAuthenticated && (
          <div className="md:hidden border-t border-white/10 py-2 space-y-1">
            <MobileNavLink
              to="/home"
              label="Home"
              isActive={location.pathname === "/home"}
              onClick={() => setMobileMenuOpen(false)}
            />
            <MobileNavLink
              to="/discover"
              label="Discover"
              isActive={location.pathname === "/discover"}
              onClick={() => setMobileMenuOpen(false)}
            />
            <MobileNavLink
              to="/skills"
              label="Skills"
              isActive={location.pathname === "/skills"}
              onClick={() => setMobileMenuOpen(false)}
            />
            <MobileNavLink
              to="/requests"
              label="Requests"
              isActive={location.pathname === "/requests"}
              onClick={() => setMobileMenuOpen(false)}
            />
            <MobileNavLink
              to="/notifications"
              label={`Notifications ${unreadCount > 0 ? `(${unreadCount})` : ""}`}
              isActive={location.pathname === "/notifications"}
              onClick={() => setMobileMenuOpen(false)}
            />
            <MobileNavLink
              to="/profile"
              label="Profile"
              isActive={location.pathname === "/profile"}
              onClick={() => setMobileMenuOpen(false)}
            />
            {(user?.role === "admin" || user?.role === "moderator") && (
              <MobileNavLink
                to="/moderation"
                label="🛡️ Moderation"
                isActive={location.pathname === "/moderation"}
                onClick={() => setMobileMenuOpen(false)}
              />
            )}
            {user?.role === "admin" && (
              <MobileNavLink
                to="/admin"
                label="🧰 Admin"
                isActive={location.pathname === "/admin"}
                onClick={() => setMobileMenuOpen(false)}
              />
            )}
            <MobileNavLink
              to="/settings"
              label="Settings"
              isActive={location.pathname === "/settings"}
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="pt-2 border-t border-white/10 space-y-2">
              <button
                onClick={() => {
                  setShowCreatePostModal(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full px-3 py-2 rounded bg-green-600 hover:bg-green-700 transition font-medium text-sm text-left"
              >
                + Create Post
              </button>
              <button
                onClick={() => {
                  setShowAddSkillModal(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full px-3 py-2 rounded bg-purple-600 hover:bg-purple-700 transition font-medium text-sm text-left"
              >
                + Add Skill
              </button>
              <button
                onClick={logout}
                className="w-full bg-red-600 px-3 py-2 rounded hover:bg-red-700 transition font-medium text-sm text-left"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

// Helper components
function NavLink({ to, label, isActive }) {
  return (
    <Link
      to={to}
      className={`px-2 py-1.5 rounded transition text-sm whitespace-nowrap ${
        isActive
          ? "text-primary font-semibold bg-white/10"
          : "hover:text-primary"
      }`}
    >
      {label}
    </Link>
  );
}

function NotificationLink({ to, unreadCount, isActive }) {
  return (
    <Link
      to={to}
      className={`relative px-2 py-1.5 rounded transition group ${
        isActive
          ? "text-primary font-semibold bg-white/10"
          : "hover:text-primary"
      }`}
    >
      <span className="text-lg">🔔</span>
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center group-hover:bg-red-700">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}

function MobileNavLink({ to, label, isActive, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`block px-3 py-2 rounded transition text-sm ${
        isActive ? "text-primary font-semibold bg-white/10" : "hover:bg-white/5"
      }`}
    >
      {label}
    </Link>
  );
}
