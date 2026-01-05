import React from "react";
import { View, Text, StyleSheet, Switch, TouchableOpacity } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const SettingsScreen = () => {
  const { logout } = useAuth();
  const { isDark, colors, toggleTheme } = useTheme();
  const [notifications, setNotifications] = React.useState(true);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        Settings
      </Text>

      <View style={[styles.row, { backgroundColor: colors.surface }]}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          Appearance (dark mode)
        </Text>
        <Switch value={isDark} onValueChange={toggleTheme} />
      </View>

      <View style={[styles.row, { backgroundColor: colors.surface }]}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          Notifications
        </Text>
        <Switch value={notifications} onValueChange={setNotifications} />
      </View>

      <TouchableOpacity
        style={[styles.logoutBtn, { backgroundColor: colors.danger }]}
        onPress={logout}
      >
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 16 },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
  },
  row: {
    padding: 14,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  label: { fontSize: 15, fontWeight: "600" },
  logoutBtn: {
    marginTop: 24,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  logoutText: { color: "#fff", fontWeight: "700" },
});

export default SettingsScreen;
