// Desktop notification service

export const requestNotificationPermission = async () => {
  if (typeof window === "undefined" || !("Notification" in window)) {
    console.log("⚠️ Notifications not supported");
    return false;
  }

  if (Notification.permission === "granted") {
    console.log("✅ Notification permission already granted");
    return true;
  }

  if (Notification.permission !== "denied") {
    try {
      const permission = await Notification.requestPermission();
      console.log(`🔔 Notification permission: ${permission}`);
      return permission === "granted";
    } catch (error) {
      console.error("❌ Failed to request notification permission:", error);
      return false;
    }
  }

  return false;
};

export const sendMessageNotification = (senderName, messageText, chatId, onClickNavigate) => {
  if (typeof window === "undefined" || !("Notification" in window)) return;

  if (Notification.permission !== "granted") {
    console.log("⚠️ Notification permission not granted");
    return;
  }

  // Don't notify if focused on the same chat
  if (document.hasFocus() && window.location.pathname.includes(`/chat/${chatId}`)) {
    console.log("📵 Skipping notification: already viewing this chat");
    return;
  }

  const title = `New message from ${senderName}`;
  const options = {
    body: messageText?.substring(0, 100) || "(attachment)",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: `chat-${chatId}`, // Replace if similar notification exists
    requireInteraction: false,
    silent: false, // Enable sound (if not muted in browser settings)
  };

  try {
    const notification = new Notification(title, options);

    notification.addEventListener("click", () => {
      window.focus();
      onClickNavigate(`/chat/${chatId}`);
      notification.close();
    });

    console.log(`🔔 Notification sent: ${senderName}`);
  } catch (error) {
    console.error("❌ Failed to send notification:", error);
  }
};

// Check if notifications are supported
export const notificationsSupported = () => {
  return typeof window !== "undefined" && "Notification" in window;
};

// Get current notification permission
export const getNotificationPermission = () => {
  if (!notificationsSupported()) return "denied";
  return Notification.permission;
};

export default {
  requestNotificationPermission,
  sendMessageNotification,
  notificationsSupported,
  getNotificationPermission,
};
