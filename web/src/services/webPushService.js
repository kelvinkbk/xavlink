/**
 * Web Push Notification Service for Web App
 * Handles subscribing to push notifications and managing service worker
 */

const API_BASE =
  import.meta.env.VITE_API_URL || "https://xavlink-backend.onrender.com/api";

class WebPushService {
  constructor() {
    this.registration = null;
    this.subscription = null;
  }

  /**
   * Check if browser supports web push
   */
  static isSupported() {
    return (
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    );
  }

  /**
   * Register service worker
   */
  async registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      console.warn("⚠️ Service Workers not supported");
      return null;
    }

    try {
      this.registration = await navigator.serviceWorker.register(
        "/service-worker.js",
        { scope: "/" },
      );
      console.log("✅ Service Worker registered");
      return this.registration;
    } catch (error) {
      console.error("❌ Service Worker registration failed:", error);
      return null;
    }
  }

  /**
   * Request notification permission
   */
  async requestPermission() {
    if (!("Notification" in window)) {
      console.warn("⚠️ Notifications not supported");
      return null;
    }

    if (Notification.permission === "granted") {
      return "granted";
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission;
    }

    return null;
  }

  /**
   * Get VAPID public key from backend
   */
  async getVapidPublicKey() {
    try {
      const response = await fetch(`${API_BASE}/notifications/vapid-key`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        console.warn(
          `⚠️ Could not fetch VAPID key (${response.status} ${response.statusText})`,
        );
        return null;
      }

      const data = await response.json();
      if (data.vapidPublicKey) {
        console.log(
          `✅ VAPID key received from backend (length: ${data.vapidPublicKey.length})`,
        );
        return data.vapidPublicKey;
      }

      console.warn("⚠️ No vapidPublicKey in response");
      return null;
    } catch (error) {
      console.error("Error fetching VAPID key:", error);
      return null;
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe() {
    try {
      // Ensure service worker is registered
      if (!this.registration) {
        await this.registerServiceWorker();
      }

      // Request permission
      const permission = await this.requestPermission();
      if (permission !== "granted") {
        console.warn("⚠️ Notification permission not granted");
        return null;
      }

      // Get VAPID key
      const vapidPublicKey = await this.getVapidPublicKey();
      if (!vapidPublicKey) {
        console.warn("⚠️ Web Push not available");
        return null;
      }

      console.log(
        `🔑 VAPID key fetched: ${vapidPublicKey.substring(0, 20)}... (length: ${vapidPublicKey.length})`,
      );

      // Subscribe to push
      try {
        const keyArray = this.urlBase64ToUint8Array(vapidPublicKey);
        console.log(
          `🔑 VAPID key converted to Uint8Array (length: ${keyArray.length})`,
        );

        this.subscription = await this.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyArray,
        });

        console.log(
          `✅ Push subscription created: ${this.subscription.endpoint.substring(0, 50)}...`,
        );
      } catch (subError) {
        console.error("❌ PushManager subscription error:", {
          message: subError.message,
          code: subError.code,
          name: subError.name,
        });
        throw subError;
      }

      // Send subscription to backend
      await this.sendSubscriptionToServer(this.subscription);

      console.log("✅ Push subscription created");
      return this.subscription;
    } catch (error) {
      console.error("❌ Failed to subscribe to push:", error);
      console.error("⚠️  Push subscription error details:", {
        name: error.name,
        message: error.message,
        code: error.code,
      });
      return null;
    }
  }

  /**
   * Send subscription to backend
   */
  async sendSubscriptionToServer(subscription) {
    try {
      const response = await fetch(`${API_BASE}/notifications/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ subscription }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusCode}`);
      }

      console.log("✅ Subscription sent to server");
      return true;
    } catch (error) {
      console.error("Error sending subscription to server:", error);
      return false;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe() {
    try {
      if (!this.subscription) {
        this.subscription =
          await this.registration?.pushManager.getSubscription();
      }

      if (this.subscription) {
        await this.subscription.unsubscribe();
        console.log("✅ Unsubscribed from push");
        return true;
      }
    } catch (error) {
      console.error("Error unsubscribing from push:", error);
      return false;
    }
  }

  /**
   * Get current subscription status
   */
  async getSubscriptionStatus() {
    try {
      if (!this.registration) {
        this.registration = await navigator.serviceWorker.ready;
      }

      this.subscription = await this.registration.pushManager.getSubscription();
      return this.subscription ? "subscribed" : "not-subscribed";
    } catch (error) {
      console.error("Error getting subscription status:", error);
      return "error";
    }
  }

  /**
   * Convert VAPID key from base64 to Uint8Array
   */
  urlBase64ToUint8Array(base64String) {
    try {
      const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
      const base64 = (base64String + padding)
        .replace(/\-/g, "+")
        .replace(/_/g, "/");

      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);

      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }

      console.log(
        `✅ Base64 converted successfully: ${rawData.length} bytes → Uint8Array of length ${outputArray.length}`,
      );
      return outputArray;
    } catch (error) {
      console.error("❌ Error converting VAPID key from base64:", {
        message: error.message,
        inputLength: base64String.length,
      });
      throw error;
    }
  }

  /**
   * Handle notification click
   */
  handleNotificationClick(event) {
    event.notification.close();
    const data = event.notification.data;

    if (data?.actionUrl) {
      window.open(data.actionUrl, "_blank");
    }
  }
}

export default new WebPushService();
