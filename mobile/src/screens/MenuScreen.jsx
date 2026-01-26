import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const MenuItem = ({ icon, label, onPress, color, textColor }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <View style={[styles.iconContainer, { backgroundColor: color + "20" }]}>
      <Text style={{ fontSize: 24 }}>{icon}</Text>
    </View>
    <Text style={[styles.menuLabel, { color: textColor }]}>{label}</Text>
    <Text style={[styles.chevron, { color: textColor + "80" }]}>›</Text>
  </TouchableOpacity>
);

const MenuScreen = () => {
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const { colors, isDark } = useTheme();

  const isAdmin = user?.role === "admin";
  const isModerator = user?.role === "moderator";
  const isAdminOrMod = isAdmin || isModerator;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.header, { color: colors.textPrimary }]}>Menu</Text>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Account
        </Text>
        <MenuItem
          icon="🧰"
          label="Skills"
          onPress={() => navigation.navigate("Skills")}
          color={colors.primary}
          textColor={colors.textPrimary}
        />
        <MenuItem
          icon="✨"
          label="Enhancements"
          onPress={() => navigation.navigate("Enhancements")}
          color="#8b5cf6"
          textColor={colors.textPrimary}
        />
        <MenuItem
          icon="🔧"
          label="Settings"
          onPress={() => navigation.navigate("Settings")}
          color="#64748b"
          textColor={colors.textPrimary}
        />
      </View>

      {isAdminOrMod && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Administration
          </Text>
          {isAdminOrMod && (
            <MenuItem
              icon="⚙️"
              label="Admin Dashboard"
              onPress={() => navigation.navigate("AdminDashboard")}
              color="#ef4444"
              textColor={colors.textPrimary}
            />
          )}
          {(isAdmin || isModerator) && (
            <MenuItem
              icon="🛡️"
              label="Moderation"
              onPress={() => navigation.navigate("Moderation")}
              color="#f59e0b"
              textColor={colors.textPrimary}
            />
          )}
        </View>
      )}

      <View style={styles.section}>
        <TouchableOpacity
          style={[
            styles.logoutButton,
            { backgroundColor: colors.danger + "20" },
          ]}
          onPress={logout}
        >
          <Text style={[styles.logoutText, { color: colors.danger }]}>
            Log Out
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.versionInfo}>
        <Text style={[styles.versionText, { color: colors.textMuted }]}>
          XavLink v1.0.0
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  menuLabel: {
    fontSize: 18,
    fontWeight: "500",
    flex: 1,
  },
  chevron: {
    fontSize: 24,
    fontWeight: "300",
  },
  logoutButton: {
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  versionInfo: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  versionText: {
    fontSize: 12,
  },
});

export default MenuScreen;
