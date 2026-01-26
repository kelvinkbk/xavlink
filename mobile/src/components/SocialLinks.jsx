import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { enhancementService } from "../services/api";

const SocialLinks = ({ userId, isOwnProfile = false }) => {
  const { colors } = useTheme();
  const [links, setLinks] = useState({
    github: "",
    linkedin: "",
    twitter: "",
    website: "",
  });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userId) {
      // Load social links from API
    }
  }, [userId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await enhancementService.updateSocialLinks(links);
      setEditing(false);
      Alert.alert("Success", "Social links updated");
    } catch (error) {
      Alert.alert("Error", "Failed to update social links");
    } finally {
      setSaving(false);
    }
  };

  const openLink = (url) => {
    if (url) {
      Linking.openURL(url.startsWith("http") ? url : `https://${url}`);
    }
  };

  const getPlatformIcon = (platform) => {
    const icons = {
      github: "💻",
      linkedin: "💼",
      twitter: "🐦",
      website: "🌐",
    };
    return icons[platform] || "🔗";
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          🔗 Social Links
        </Text>
        {isOwnProfile && (
          <TouchableOpacity
            onPress={() => (editing ? handleSave() : setEditing(true))}
            disabled={saving}
            style={[styles.editButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.editButtonText}>
              {editing ? (saving ? "Saving..." : "Save") : "Edit"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.linksContainer}>
        {Object.entries(links).map(([platform, url]) => (
          <View key={platform} style={styles.linkItem}>
            <Text style={styles.icon}>{getPlatformIcon(platform)}</Text>
            <View style={styles.linkContent}>
              <Text style={[styles.platformName, { color: colors.textSecondary }]}>
                {platform.charAt(0).toUpperCase() + platform.slice(1)}
              </Text>
              {editing ? (
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      color: colors.textPrimary,
                      borderColor: colors.border,
                    },
                  ]}
                  value={url}
                  onChangeText={(text) =>
                    setLinks((prev) => ({ ...prev, [platform]: text }))
                  }
                  placeholder={`Your ${platform} URL`}
                  placeholderTextColor={colors.textSecondary}
                />
              ) : url ? (
                <TouchableOpacity onPress={() => openLink(url)}>
                  <Text style={[styles.link, { color: colors.primary }]}>
                    {url}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={[styles.noLink, { color: colors.textSecondary }]}>
                  Not set
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  linksContainer: {
    gap: 16,
  },
  linkItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  icon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 4,
  },
  linkContent: {
    flex: 1,
  },
  platformName: {
    fontSize: 12,
    marginBottom: 4,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  link: {
    fontSize: 14,
    textDecorationLine: "underline",
  },
  noLink: {
    fontSize: 14,
    fontStyle: "italic",
  },
});

export default SocialLinks;
