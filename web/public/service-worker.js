/**
 * Service Worker for Web Push Notifications
 * Handles push events and notification interactions
 */

/* global clients */

// Handle push events
self.addEventListener("push", (event) => {
  console.log("🔔 Push notification received:", event);

  if (!event.data) {
    console.warn("⚠️ No data in push event");
    return;
  }

  try {
    const data = event.data.json();
    const { title, body, icon, badge, tag, data: notificationData = {} } = data;

    const options = {
      body,
      icon: icon || "/icon-192.png",
      badge: badge || "/badge-72.png",
      tag: tag || "notification",
      data: notificationData,
      requireInteraction: false,
    };

    event.waitUntil(
      self.registration.showNotification(title || "XavLink", options),
    );
  } catch (error) {
    console.error("❌ Error handling push:", error);
  }
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  console.log("👆 Notification clicked:", event.notification.tag);

  event.notification.close();

  const data = event.notification.data;
  let url = "/";

  if (data?.type === "message" && data?.chatId) {
    url = `/chat/${data.chatId}`;
  } else if (data?.actionUrl) {
    url = data.actionUrl;
  }

  // Open or focus existing window
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      // Look for existing window to focus
      for (let client of clientList) {
        if (client.url === url && "focus" in client) {
          return client.focus();
        }
      }

      // Open new window if not found
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    }),
  );
});

// Handle notification close
self.addEventListener("notificationclose", () => {
  // Notification closed - no action needed
});

// Handle service worker installation
self.addEventListener("install", () => {
  console.log("📦 Service Worker installing...");
  self.skipWaiting();
});

// Handle service worker activation
self.addEventListener("activate", (event) => {
  console.log("✅ Service Worker activated");
  event.waitUntil(clients.claim());
});
