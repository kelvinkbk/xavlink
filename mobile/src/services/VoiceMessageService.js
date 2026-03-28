import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";

let recordingObject;

const VoiceMessageService = {
  /**
   * Start recording a voice message
   */
  startRecording: async () => {
    try {
      // Request audio recording permission
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== "granted") {
        throw new Error("Audio recording permission not granted");
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpiece: false,
      });

      // Create and start recording
      recordingObject = new Audio.Recording();
      await recordingObject.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      await recordingObject.startAsync();

      return recordingObject;
    } catch (error) {
      console.error("Failed to start recording:", error);
      throw error;
    }
  },

  /**
   * Stop recording and get the audio file
   */
  stopRecording: async () => {
    try {
      if (!recordingObject) {
        throw new Error("No active recording");
      }

      await recordingObject.stopAndUnloadAsync();
      const uri = recordingObject.getURI();

      // Get file size
      const fileInfo = await FileSystem.getInfoAsync(uri);
      const fileSizeInBytes = fileInfo.size || 0;
      const durationMillis = recordingObject._finalDurationMillis || 0;
      const durationSeconds = Math.round(durationMillis / 1000);

      // Only allow recordings longer than 1 second
      if (durationSeconds < 1) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
        throw new Error("Recording too short - minimum 1 second required");
      }

      recordingObject = null;

      return {
        uri,
        durationSeconds,
        fileSizeInBytes,
      };
    } catch (error) {
      console.error("Failed to stop recording:", error);
      recordingObject = null;
      throw error;
    }
  },

  /**
   * Cancel the current recording
   */
  cancelRecording: async () => {
    try {
      if (recordingObject) {
        await recordingObject.stopAndUnloadAsync();
        const uri = recordingObject.getURI();
        if (uri) {
          await FileSystem.deleteAsync(uri, { idempotent: true });
        }
        recordingObject = null;
      }
    } catch (error) {
      console.error("Failed to cancel recording:", error);
      recordingObject = null;
      throw error;
    }
  },

  /**
   * Check if currently recording
   */
  isRecording: () => {
    return recordingObject && recordingObject._canRecord;
  },
};

export default VoiceMessageService;
