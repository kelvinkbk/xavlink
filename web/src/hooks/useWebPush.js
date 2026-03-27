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
          }
        } else {
          console.log("ℹ️ User declined notification permission");
        }
      } catch (error) {
        console.error("Error initializing Web Push:", error);
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
