import React, { useState, useEffect } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { Video } from "expo-av";

const SplashScreen = () => {
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isVideoError, setIsVideoError] = useState(false);

  useEffect(() => {
    console.log("🎬 SplashScreen mounted - showing loading animation");
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
      {!isVideoError ? (
        <Video
          source={require("../../assets/Loading_Animation_with_Floral_Swirls.mp4")}
          rate={1.0}
          volume={0.0}
          isMuted={true}
          resizeMode="cover"
          shouldPlay
          isLooping
          style={styles.video}
          onLoad={handleVideoLoad}
          onError={handleVideoError}
        />
      ) : (
        <ActivityIndicator size="large" color="#fff" />
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
  video: {
    width: "100%",
    height: "100%",
  },
});

export default SplashScreen;
