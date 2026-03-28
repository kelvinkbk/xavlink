import "react-native-gesture-handler";
import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { SafeAreaProvider } from "react-native-safe-area-context";
import RootNavigator from "./src/navigation/RootNavigator";
import { AuthProvider } from "./src/context/AuthContext";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import UpdateService from "./src/services/UpdateService";
import { FABVisibilityProvider } from "./src/context/FABVisibilityContext";
import { SyncProvider } from "./src/context/SyncContext";
import ErrorBoundary from "./src/components/ErrorBoundary";

// Initialize Firebase for push notifications
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  projectId: "xavlink-6182e",
  appId: "1:752157502087:android:7e8c6b9aaf4d1a0c9dcd3f",
  messagingSenderId: "752157502087",
};

// Initialize Firebase - required for Expo push notifications on Android
try {
  initializeApp(firebaseConfig);
  console.log("✅ Firebase initialized for mobile push notifications");
} catch (error) {
  console.warn("⚠️ Firebase initialization status:", error.message);
}

// Create Android notification channel for high-priority notifications
const createNotificationChannel = async () => {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
      sound: "default",
    });

    // High priority channel for urgent notifications
    await Notifications.setNotificationChannelAsync("urgent", {
      name: "Urgent",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
      sound: "default",
    });
  }
};

// Configure notification behavior - show alerts both in foreground AND background
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Always show notifications, even when app is in background
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
});

// Request notification permission on app startup and get device token
const requestNotificationPermission = async () => {
  try {
    // Create notification channels for Android
    await createNotificationChannel();

    // Request permissions
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    if (status === "granted") {
      console.log("✅ Notification permission granted");

      // Get the device push token for backend push notifications
      try {
        const token = await Notifications.getExpoPushTokenAsync();
        console.log("📱 Expo Push Token:", token.data);
        // In a real app, you'd send this token to your backend
        // to enable server-side push notifications
      } catch (error) {
        console.error("Error getting push token:", error);
      }
    } else {
      console.log("⚠️ Notification permission denied");
    }
  } catch (error) {
    console.error("Error requesting notification permission:", error);
  }
};

function AppInner() {
  const { isDark } = useTheme();

  useEffect(() => {
    // Check for updates on app startup
    UpdateService.checkOnStartup();
    // Request notification permission
    requestNotificationPermission();

    // Handle notification that caused app to open from background
    const getInitialNotification = async () => {
      const response = await Notifications.getLastNotificationResponseAsync();
      if (response?.notification) {
        console.log("📲 App opened from notification:", response.notification);
        // Here you could navigate to relevant screen based on notification data
      }
    };
    getInitialNotification();

    // Listen for notifications when app is in foreground
    const subscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("🔔 Notification received (foreground):", notification);
      },
    );

    // Listen for notification interactions (when user taps on notification)
    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("👆 Notification tapped:", response);
        // Handle navigation based on notification data here
      });

    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  }, []);

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <RootNavigator />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <FABVisibilityProvider>
              <SyncProvider>
                <AppInner />
              </SyncProvider>
            </FABVisibilityProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
