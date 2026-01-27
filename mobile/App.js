import "react-native-gesture-handler";
import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import RootNavigator from "./src/navigation/RootNavigator";
import { AuthProvider } from "./src/context/AuthContext";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
<<<<<<< HEAD
import UpdateService from "./src/services/UpdateService";
=======
import { FABVisibilityProvider } from "./src/context/FABVisibilityContext";
import { SyncProvider } from "./src/context/SyncContext";
>>>>>>> 25f49fba1d25c31039d8b77ea5e1a7b7d6cf698c

function AppInner() {
  const { isDark } = useTheme();

  useEffect(() => {
    // Check for updates on app startup
    UpdateService.checkOnStartup();
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
  );
}
