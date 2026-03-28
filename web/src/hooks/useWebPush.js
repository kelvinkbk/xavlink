import { useEffect } from "react";
import webPushService from "../services/webPushService";

/**
 * Hook to initialize web push notifications
 */
export const useWebPush = () => {
  useEffect(() => {
    const initializePush = async () => {
      // Check if browser supports web push
      if (!webPushService.constructor.isSupported()) {
        console.warn("⚠️ Web Push not supported in this browser");
        return;
      }

      try {
        // Register service worker
        await webPushService.registerServiceWorker();

        // Request permission and subscribe
        const permission = await webPushService.requestPermission();
        if (permission === "granted") {
          const subscription = await webPushService.subscribe();
          if (subscription) {
            console.log("✅ Web Push initialized successfully");
          } else {
            console.warn(
              "⚠️ Web Push subscription failed - notifications won't work in this browser"
            );
          }
        } else {
          console.log("ℹ️ User declined notification permission");
        }
      } catch (error) {
        // Web push failures are not critical
        console.warn(
          "⚠️ Web Push initialization failed, but app will continue working:",
          error.message
        );
        console.warn("💡 Tip: Mobile notifications will still work");
      }
    };

    // Only initialize on client side
    if (typeof window !== "undefined") {
      // Give the page a moment to fully load
      const timeout = setTimeout(initializePush, 1000);
      return () => clearTimeout(timeout);
    }
  }, []);
};

export default useWebPush;
