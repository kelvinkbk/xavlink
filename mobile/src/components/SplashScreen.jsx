import React, { useState, useEffect } from "react";
import { View, StyleSheet, ActivityIndicator, Text } from "react-native";
import { Video } from "expo-av";

const SplashScreen = () => {
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isVideoError, setIsVideoError] = useState(false);
  const [videoAttempted, setVideoAttempted] = useState(false);

  useEffect(() => {
    console.log("🎬 SplashScreen mounted - showing loading animation");
    setVideoAttempted(true);

    // Keep splash screen visible for minimum 2 seconds
    const timer = setTimeout(() => {
      console.log("⏱️ Splash screen timer completed");
    }, 8000);

    return () => clearTimeout(timer);
  }, []);

  const handleVideoLoad = () => {
    console.log("✅ Video loaded successfully");
    setIsVideoReady(true);
  };

  const handleVideoError = (error) => {
    console.error("❌ Video error:", error);
    setIsVideoError(true);
  };

  return (
    <View style={styles.container}>
      {videoAttempted && !isVideoError ? (
        <>
          <View style={styles.videoContainer}>
            <Video
              source={require("../../assets/startup.mp4")}
              rate={1.0}
              volume={0.0}
              isMuted={true}
              resizeMode="cover"
              shouldPlay
              isLooping
              style={styles.video}
              onLoad={handleVideoLoad}
              onError={handleVideoError}
              progressUpdateIntervalMillis={500}
            />
          </View>
          {!isVideoReady && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          )}
        </>
      ) : (
        <View style={styles.fallback}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.fallbackText}>Initializing XavLink</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  videoContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  loadingOverlay: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#fff",
    marginTop: 12,
    fontSize: 14,
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackText: {
    color: "#fff",
    marginTop: 12,
    fontSize: 16,
  },
});

export default SplashScreen;
