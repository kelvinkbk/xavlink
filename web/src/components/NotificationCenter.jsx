import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
} from "react";
import { useNotifications } from "../context/NotificationContext";
import {
  Bell,
  X,
  Trash2,
  Heart,
  MessageCircle,
  UserPlus,
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

// Notification icons based on type
const NotificationIcon = ({ type }) => {
  const iconProps = { size: 16, className: "text-gray-600" };

  const icons = {
    post_liked: <Heart {...iconProps} className="text-red-500" />,
    post_commented: <MessageCircle {...iconProps} className="text-blue-500" />,
    follow: <UserPlus {...iconProps} className="text-green-500" />,
    message_received: <Mail {...iconProps} className="text-purple-500" />,
    request_received: (
      <AlertCircle {...iconProps} className="text-orange-500" />
    ),
    request_accepted: <CheckCircle {...iconProps} className="text-green-500" />,
    request_rejected: <XCircle {...iconProps} className="text-red-500" />,
  };

  return icons[type] || <AlertCircle {...iconProps} />;
};

// Single notification item
const NotificationItem = ({ notification, onRead, onDelete }) => {
  const handleRead = () => {
    if (!notification.read) {
      onRead(notification.id);
    }
  };

  return (
    <div
      className={`flex gap-3 p-3 border-b hover:bg-gray-50 cursor-pointer transition ${
        notification.read ? "bg-white" : "bg-blue-50"
      }`}
      onClick={handleRead}
    >
      <div className="flex-shrink-0 mt-1">
        <NotificationIcon type={notification.type} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-gray-900">
          {notification.title}
        </p>
        <p className="text-sm text-gray-600 truncate">{notification.message}</p>
        <p className="text-xs text-gray-500 mt-1">
          {new Date(notification.createdAt).toLocaleDateString()}{" "}
          {new Date(notification.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(notification.id);
        }}
        className="flex-shrink-0 text-gray-400 hover:text-red-500"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
};

const DROPDOWN_WIDTH = 384;
const VIEW_MARGIN = 8;

export default function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, deleteNotification } =
    useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({
    top: 0,
    left: 0,
    width: DROPDOWN_WIDTH,
  });

  const updateDropdownPosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const width = Math.min(
      DROPDOWN_WIDTH,
      window.innerWidth - VIEW_MARGIN * 2
    );
    let left = rect.right - width;
    left = Math.max(
      VIEW_MARGIN,
      Math.min(left, window.innerWidth - width - VIEW_MARGIN)
    );
    setDropdownPos({
      top: rect.bottom + VIEW_MARGIN,
      left,
      width,
    });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updateDropdownPosition();
    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("scroll", updateDropdownPosition, true);
    return () => {
      window.removeEventListener("resize", updateDropdownPosition);
      window.removeEventListener("scroll", updateDropdownPosition, true);
    };
  }, [isOpen, updateDropdownPosition]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
        title="Notifications"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full w-5 h-5">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="fixed z-50 flex max-h-[min(36rem,calc(100dvh-1rem))] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl"
          style={{
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: dropdownPos.width,
          }}
        >
          {/* Header */}
          <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
            <h3 className="text-lg font-bold text-gray-900">Notifications</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>

          {/* Notifications List */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <Bell size={32} className="mx-auto mb-2 opacity-50" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={markAsRead}
                  onDelete={deleteNotification}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="flex-shrink-0 border-t border-gray-200 px-4 py-3 text-center">
              <a
                href="/notifications"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View All Notifications
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
