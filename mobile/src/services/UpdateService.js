import * as Updates from "expo-updates";
import { Alert, Platform } from "react-native";

const UpdateService = {
  /**
   * Check for updates manually
   * @param {boolean} showNoUpdateAlert - Whether to show an alert if no update is available
   */
  checkForUpdate: async (showNoUpdateAlert = true) => {
    if (__DEV__) {
      if (showNoUpdateAlert) {
        Alert.alert(
          "Development Mode",
          "Updates are not available in development mode.",
        );
      }
      return;
    }

    try {
      // Check if updates are enabled
      if (!Updates.isEnabled) {
        if (showNoUpdateAlert) {
          Alert.alert(
            "Updates Disabled",
            "Updates are not enabled for this build. This may be a development build or updates were disabled during build.",
          );
        }
        return;
      }

      // Check if we're using an embedded update
      const updateId = Updates.updateId;
      const isEmbeddedLaunch = Updates.isEmbeddedLaunch;
      
      console.log("Update check info:", {
        updateId,
        isEmbeddedLaunch,
        isEnabled: Updates.isEnabled,
        channel: Updates.channel,
        runtimeVersion: Updates.runtimeVersion,
      });

      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        Alert.alert(
          "Update Available",
          "A new version of the app is available. Would you like to download and install it now?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Download & Install",
              onPress: () => UpdateService.downloadAndInstallUpdate(),
            },
          ],
        );
      } else if (showNoUpdateAlert) {
        Alert.alert(
          "No Updates",
          "You are using the latest version of the app.",
        );
      }
    } catch (error) {
      console.error("Error checking for updates:", error);
      const errorMessage = error?.message || "Unknown error";
      if (showNoUpdateAlert) {
        Alert.alert(
          "Error",
          `Failed to check for updates: ${errorMessage}\n\nPlease ensure:\n- You're using a production/preview build\n- The app has network access\n- Updates are enabled for your build`,
        );
      }
    }
  },

  /**
   * Download and install the update
   */
  downloadAndInstallUpdate: async () => {
    try {
      await Updates.fetchUpdateAsync();

      Alert.alert(
        "Update Ready",
        "The update has been downloaded. The app will restart now to apply the changes.",
        [
          {
            text: "OK",
            onPress: () => Updates.reloadAsync(),
          },
        ],
      );
    } catch (error) {
      console.error("Error downloading update:", error);
      Alert.alert("Error", "Failed to download the update.");
    }
  },

  /**
   * Check for updates silently on startup (if not handled by auto-check)
   */
  checkOnStartup: async () => {
    if (__DEV__) return;

    // expo-updates checkAutomatically: 'ON_LOAD' logic handles this mostly,
    // but we can add custom logic here if needed.
    // For now, we rely on the config, but we could log it.
    console.log(
      "UpdateService: App started, checking for updates handled by config",
    );
  },
};

export default UpdateService;
