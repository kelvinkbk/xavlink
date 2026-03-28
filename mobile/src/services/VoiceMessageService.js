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
      console.log("[VoiceMsg] Starting recording...");
      
      // Request audio recording permission
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== "granted") {
        throw new Error("Audio recording permission not granted");
      }

      console.log("[VoiceMsg] Permission granted");

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpiece: false,
      });

      // Create and start recording
      recordingObject = new Audio.Recording();
      console.log("[VoiceMsg] Recording object created");
      
      await recordingObject.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      console.log("[VoiceMsg] Recording prepared");
      
      await recordingObject.startAsync();
      console.log("[VoiceMsg] Recording started");

      return recordingObject;
    } catch (error) {
      console.error("[VoiceMsg] Failed to start recording:", error);
      recordingObject = null;
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

      console.log("[VoiceMsg] Stopping recording...");
      
      // Add timeout to prevent hanging
      const stopPromise = recordingObject.stopAndUnloadAsync();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Recording stop timeout")), 5000)
      );

      await Promise.race([stopPromise, timeoutPromise]);
      
      const uri = recordingObject.getURI();
      console.log("[VoiceMsg] Recording stopped, URI:", uri);

      // Get file size
      const fileInfo = await FileSystem.getInfoAsync(uri);
      const fileSizeInBytes = fileInfo.size || 0;
      const durationMillis = recordingObject._finalDurationMillis || 0;
      const durationSeconds = Math.round(durationMillis / 1000);

      console.log("[VoiceMsg] Duration:", durationSeconds, "seconds");

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
      console.error("[VoiceMsg] Failed to stop recording:", error);
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
        console.log("[VoiceMsg] Cancelling recording...");
        
        // Add timeout to prevent hanging
        const cancelPromise = recordingObject.stopAndUnloadAsync();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Recording cancel timeout")), 5000)
        );

        await Promise.race([cancelPromise, timeoutPromise]);
        
        const uri = recordingObject.getURI();
        if (uri) {
          await FileSystem.deleteAsync(uri, { idempotent: true });
          console.log("[VoiceMsg] Recording cancelled and deleted");
        }
        recordingObject = null;
      }
    } catch (error) {
      console.error("[VoiceMsg] Failed to cancel recording:", error);
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
