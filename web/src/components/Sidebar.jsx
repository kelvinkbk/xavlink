import { useAuth } from "../context/AuthContext";
import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const { isAuthenticated, logout, user } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  if (!isAuthenticated) {
    return null;
  }

  return (
    <aside className="w-64 bg-secondary text-white shadow-lg min-h-screen p-6">
      <button
        className="text-2xl font-bold text-primary mb-8 text-left"
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
            isActive("/profile") ? "bg-primary text-white" : "hover:bg-gray-700"
          }`}
        >
          Profile
        </Link>
        <Link
          to="/skills"
          className={`block px-4 py-2 rounded transition ${
            isActive("/skills") ? "bg-primary text-white" : "hover:bg-gray-700"
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
          className={`block px-4 py-2 rounded transition ${
            isActive("/chats") || location.pathname.startsWith("/chat")
              ? "bg-primary text-white"
              : "hover:bg-gray-700"
          }`}
        >
          💬 Messages
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
              isActive("/admin") ? "bg-primary text-white" : "hover:bg-gray-700"
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
  );
}
