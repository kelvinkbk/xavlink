import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useTheme } from "../context/ThemeContext";

const LoadingSpinner = ({ size = "large", fullscreen = false }) => {
  const { colors } = useTheme();

  if (fullscreen) {
    return (
      <View style={[styles.fullscreen, { backgroundColor: colors.background }]}>
        <ActivityIndicator size={size} color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.centered}>
      <ActivityIndicator size={size} color={colors.primary} />
    </View>
  );
};

const styles = StyleSheet.create({
  centered: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  fullscreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default LoadingSpinner;
