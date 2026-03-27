import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "../context/ThemeContext";
import DeviceManagement from "../components/DeviceManagement";

const DeviceManagementScreen = ({ navigation }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DeviceManagement />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default DeviceManagementScreen;
