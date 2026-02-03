import "react-native-gesture-handler";
import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { SafeAreaProvider } from "react-native-safe-area-context";
import RootNavigator from "./src/navigation/RootNavigator";
import { AuthProvider } from "./src/context/AuthContext";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import UpdateService from "./src/services/UpdateService";
import { FABVisibilityProvider } from "./src/context/FABVisibilityContext";
import { SyncProvider } from "./src/context/SyncContext";
import ErrorBoundary from "./src/components/ErrorBoundary";

// Request notification permission on app startup
const requestNotificationPermission = async () => {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === "granted") {
      console.log("✅ Notification permission granted");
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
