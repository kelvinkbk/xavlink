import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import UpdateService from "../services/UpdateService";

const paletteNames = {
  "obsidian-blue": "1️⃣ Obsidian Blue × Silver",
  emerald: "2️⃣ Emerald × Graphite",
  "royal-purple": "3️⃣ Royal Purple × Onyx",
  champagne: "4️⃣ Champagne × Charcoal",
  crimson: "5️⃣ Crimson × Jet Black",
  "midnight-teal": "6️⃣ Midnight Teal × Platinum",
  graphite: "7️⃣ Graphite × Ice White",
  pearl: "8️⃣ Pearl × Obsidian",
  "carbon-blue": "9️⃣ Carbon × Electric Blue",
  mocha: "🔟 Mocha × Linen",
  bronze: "1️⃣1️⃣ Bronze × Ink Black",
  gold: "1️⃣2️⃣ Gold (Black × Gold)",
};

const SettingsScreen = ({ navigation }) => {
  const { logout } = useAuth();
  const { colors, colorPalette, colorPalettes, setPalette } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [showPaletteModal, setShowPaletteModal] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const handleSelectPalette = (palette) => {
    setPalette(palette);
    setShowPaletteModal(false);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        Settings
      </Text>

      {/* Color Palette Selection */}
      <View
        style={[
          styles.section,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Color Palette
        </Text>
        <TouchableOpacity
          style={[styles.paletteButton, { borderColor: colors.border }]}
          onPress={() => setShowPaletteModal(true)}
        >
          <Text
            style={[styles.paletteButtonText, { color: colors.textPrimary }]}
          >
            {paletteNames[colorPalette] || "Select Palette"}
          </Text>
          <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
        </TouchableOpacity>
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Choose a color palette that matches your style
        </Text>
      </View>

      {/* Notifications Settings */}
      <TouchableOpacity
        style={[
          styles.row,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
        onPress={() => navigation.navigate("NotificationSettings")}
      >
        <View style={styles.rowContent}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            Notification Settings
          </Text>
          <Text style={[styles.subLabel, { color: colors.textMuted }]}>
            Manage notification preferences
          </Text>
        </View>
        <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
      </TouchableOpacity>

      {/* App Updates */}
      <View
        style={[
          styles.row,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.rowContent}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            App Updates
          </Text>
          <Text style={[styles.subLabel, { color: colors.textMuted }]}>
            Check for the latest version
          </Text>
        </View>
        <TouchableOpacity
          style={{ padding: 8, minWidth: 60, alignItems: "center" }}
          onPress={async () => {
            setCheckingUpdate(true);
            try {
              await UpdateService.checkForUpdate(true);
            } finally {
              setCheckingUpdate(false);
            }
          }}
          disabled={checkingUpdate}
        >
          {checkingUpdate ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={{ color: colors.primary, fontWeight: "600" }}>
              Check
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Device Management */}
      <TouchableOpacity
        style={[
          styles.row,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
        onPress={() => navigation.navigate("DeviceManagement")}
      >
        <View style={styles.rowContent}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            Active Sessions
          </Text>
          <Text style={[styles.subLabel, { color: colors.textMuted }]}>
            Manage logged-in devices
          </Text>
        </View>
        <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
      </TouchableOpacity>

      {/* Logout */}
      <TouchableOpacity
        style={[styles.logoutBtn, { backgroundColor: colors.danger }]}
        onPress={logout}
      >
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {/* Color Palette Modal */}
      <Modal
        visible={showPaletteModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPaletteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View
              style={[styles.modalHeader, { borderBottomColor: colors.border }]}
            >
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Choose Color Palette
              </Text>
              <TouchableOpacity onPress={() => setShowPaletteModal(false)}>
                <Text
                  style={[styles.closeButton, { color: colors.textPrimary }]}
                >
                  ✕
                </Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={colorPalettes}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.paletteOption,
                    {
                      backgroundColor:
                        colorPalette === item
                          ? colors.primary + "20"
                          : "transparent",
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => handleSelectPalette(item)}
                >
                  <View style={styles.paletteOptionContent}>
                    <View
                      style={[
                        styles.paletteColorPreview,
                        { backgroundColor: colors.primary },
                      ]}
                    />
                    <Text
                      style={[
                        styles.paletteOptionText,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {paletteNames[item] || item}
                    </Text>
                  </View>
                  {colorPalette === item && (
                    <Text style={[styles.checkmark, { color: colors.primary }]}>
                      ✓
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 24,
    marginTop: 8,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  paletteButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  paletteButtonText: {
    fontSize: 15,
    flex: 1,
  },
  chevron: {
    fontSize: 20,
    marginLeft: 8,
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
  },
  row: {
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    borderWidth: 1,
  },
  rowContent: {
    flex: 1,
    marginRight: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  subLabel: {
    fontSize: 13,
  },
  logoutBtn: {
    marginTop: 24,
    marginBottom: 32,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  logoutText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  closeButton: {
    fontSize: 24,
    fontWeight: "300",
  },
  paletteOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  paletteOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  paletteColorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  paletteOptionText: {
    fontSize: 15,
    flex: 1,
  },
  checkmark: {
    fontSize: 20,
    fontWeight: "bold",
  },
});

export default SettingsScreen;
