import { useState } from "react";
import {
  requestNotificationPermission,
  getNotificationPermission,
  notificationsSupported,
} from "../services/notificationService";

export default function NotificationSettings() {
  const [permission, setPermission] = useState(() =>
    notificationsSupported() ? getNotificationPermission() : "denied"
  );
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem("notification_sound_enabled");
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  // Avoid setting state synchronously in effects; initialize via state initializer above.

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    setPermission(granted ? "granted" : "denied");
  };

  const handleSoundToggle = (enabled) => {
    setSoundEnabled(enabled);
    localStorage.setItem("notification_sound_enabled", JSON.stringify(enabled));
  };

  if (!notificationsSupported()) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          ⚠️ Desktop notifications are not supported in your browser.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">
              🔔 Desktop Notifications
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Get notified when you receive new messages.
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
              Status:{" "}
              <span
                className={`font-semibold ${
                  permission === "granted"
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {permission === "granted"
                  ? "✓ Enabled"
                  : permission === "denied"
                  ? "✗ Blocked"
                  : "⋯ Default"}
              </span>
            </p>
          </div>
          {permission !== "granted" && (
            <button
              onClick={handleRequestPermission}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium whitespace-nowrap"
            >
              Enable Notifications
            </button>
          )}
        </div>
      </div>

      {permission === "granted" && (
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => handleSoundToggle(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              🔊 Play notification sound
            </span>
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Note: Browser mute settings override this preference.
          </p>
        </div>
      )}
    </div>
  );
}
