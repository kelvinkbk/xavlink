import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "../context/ThemeContext";
import NotificationSettings from "../components/NotificationSettings";

const NotificationSettingsScreen = ({ navigation }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <NotificationSettings />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default NotificationSettingsScreen;
