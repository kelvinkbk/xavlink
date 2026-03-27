import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { notificationService } from "../services/api";
import LoadingSpinner from "./LoadingSpinner";

const NotificationSettings = () => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    postLikes: true,
    postComments: true,
    follows: true,
    messages: true,
    skillRequests: true,
    skillRequestUpdates: true,
    emailNotifications: false,
    pushNotifications: true,
  });

  const settingDescriptions = {
    postLikes: "Post likes and reactions",
    postComments: "Comments on your posts",
    follows: "New follow requests",
    messages: "Direct messages",
    skillRequests: "Skill request notifications",
    skillRequestUpdates: "Updates on sent requests",
    emailNotifications: "Email notifications",
    pushNotifications: "Push notifications",
  };

  const handleToggle = async (key) => {
    const newValue = !settings[key];
    setSettings((prev) => ({ ...prev, [key]: newValue }));

    try {
      setLoading(true);
      // API call to save settings would go here
      // await notificationPreferencesService.update(key, newValue);
    } catch (error) {
      console.error("Failed to update setting:", error);
      setSettings((prev) => ({ ...prev, [key]: !newValue }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        Notification Preferences
      </Text>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          In-App Notifications
        </Text>

        {["postLikes", "postComments", "follows", "messages"].map((key) => (
          <View
            key={key}
            style={[styles.settingRow, { borderBottomColor: colors.border }]}
          >
            <View style={styles.settingInfo}>
              <Text
                style={[styles.settingLabel, { color: colors.textPrimary }]}
              >
                {settingDescriptions[key]}
              </Text>
            </View>
            <Switch
              value={settings[key]}
              onValueChange={() => handleToggle(key)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={settings[key] ? colors.primary : colors.textMuted}
            />
          </View>
        ))}
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Request Notifications
        </Text>

        {["skillRequests", "skillRequestUpdates"].map((key) => (
          <View
            key={key}
            style={[styles.settingRow, { borderBottomColor: colors.border }]}
          >
            <View style={styles.settingInfo}>
              <Text
                style={[styles.settingLabel, { color: colors.textPrimary }]}
              >
                {settingDescriptions[key]}
              </Text>
            </View>
            <Switch
              value={settings[key]}
              onValueChange={() => handleToggle(key)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={settings[key] ? colors.primary : colors.textMuted}
            />
          </View>
        ))}
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Delivery Methods
        </Text>

        {["pushNotifications", "emailNotifications"].map((key) => (
          <View
            key={key}
            style={[styles.settingRow, { borderBottomColor: colors.border }]}
          >
            <View style={styles.settingInfo}>
              <Text
                style={[styles.settingLabel, { color: colors.textPrimary }]}
              >
                {settingDescriptions[key]}
              </Text>
            </View>
            <Switch
              value={settings[key]}
              onValueChange={() => handleToggle(key)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={settings[key] ? colors.primary : colors.textMuted}
            />
          </View>
        ))}
      </View>

      {loading && <LoadingSpinner />}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 20,
  },
  section: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
});

export default NotificationSettings;
