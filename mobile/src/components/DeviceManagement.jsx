import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SectionList,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { enhancementService } from "../services/api";
import LoadingSpinner from "./LoadingSpinner";
import ConfirmModal from "./ConfirmModal";

const DeviceManagement = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(new Set());
  const [currentDeviceId, setCurrentDeviceId] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    sessionId: null,
    isDangerous: true,
  });

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const data = await enhancementService.getDeviceSessions();
      setSessions(data.sessions || []);
      setCurrentDeviceId(data.currentDeviceId);
    } catch (error) {
      console.error("Failed to fetch device sessions:", error);
      Alert.alert("Error", "Failed to load device sessions");
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    try {
      setRevoking((prev) => new Set(prev).add(sessionId));
      await enhancementService.revokeDeviceSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      Alert.alert("Success", "Session revoked");
      setConfirmModal({ visible: false, sessionId: null, isDangerous: true });
    } catch (error) {
      console.error("Failed to revoke session:", error);
      Alert.alert("Error", "Failed to revoke session");
    } finally {
      setRevoking((prev) => {
        const newSet = new Set(prev);
        newSet.delete(sessionId);
        return newSet;
      });
    }
  };

  const handleRevokeAllOther = async () => {
    try {
      if (!currentDeviceId) {
        Alert.alert("Error", "Unable to identify current device");
        return;
      }

      setRevoking((prev) => new Set([...prev, "all"]));
      await enhancementService.revokeAllOtherSessions(currentDeviceId);
      setSessions((prev) =>
        prev.filter((s) => s.deviceId === currentDeviceId)
      );
      Alert.alert("Success", "All other sessions revoked");
    } catch (error) {
      console.error("Failed to revoke all sessions:", error);
      Alert.alert("Error", "Failed to revoke sessions");
    } finally {
      setRevoking((prev) => {
        const newSet = new Set(prev);
        newSet.delete("all");
        return newSet;
      });
    }
  };

  const getDeviceEmoji = (userAgent) => {
    if (!userAgent) return "📱";
    if (userAgent.includes("Mobile")) {
      if (userAgent.includes("iPhone")) return "📱";
      if (userAgent.includes("Android")) return "📱";
      return "📱";
    }
    if (userAgent.includes("Windows")) return "💻";
    if (userAgent.includes("Mac")) return "🍎";
    if (userAgent.includes("Linux")) return "🐧";
    return "💻";
  };

  const getDeviceName = (userAgent) => {
    if (!userAgent) return "Unknown Device";
    if (userAgent.includes("Mobile")) {
      if (userAgent.includes("iPhone")) return "iPhone";
      if (userAgent.includes("Android")) return "Android Phone";
      return "Mobile Device";
    }
    if (userAgent.includes("Windows")) return "Windows PC";
    if (userAgent.includes("Mac")) return "Mac";
    if (userAgent.includes("Linux")) return "Linux";
    return "Desktop";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const currentSession = sessions.find((s) => s.deviceId === currentDeviceId);
  const otherSessions = sessions.filter((s) => s.deviceId !== currentDeviceId);

  const sections = [];

  if (currentSession) {
    sections.push({
      title: "Current Device",
      data: [currentSession],
    });
  }

  if (otherSessions.length > 0) {
    sections.push({
      title: "Other Devices",
      data: otherSessions,
    });
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {sessions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No active sessions
          </Text>
        </View>
      ) : (
        <>
          {otherSessions.length > 1 && (
            <TouchableOpacity
              style={[
                styles.revokeAllButton,
                { backgroundColor: "#ef4444" },
              ]}
              onPress={handleRevokeAllOther}
              disabled={revoking.has("all")}
            >
              <Text style={styles.revokeAllButtonText}>
                {revoking.has("all")
                  ? "Revoking..."
                  : "Revoke All Other Sessions"}
              </Text>
            </TouchableOpacity>
          )}

          <SectionList
            sections={sections}
            keyExtractor={(item, index) => item.id || index.toString()}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.sessionCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.sessionHeader}>
                  <Text style={styles.deviceEmoji}>
                    {getDeviceEmoji(item.userAgent)}
                  </Text>
                  <View style={styles.deviceInfo}>
                    <Text
                      style={[
                        styles.deviceName,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {item.deviceName || getDeviceName(item.userAgent)}
                    </Text>
                    {item.ipAddress && (
                      <Text
                        style={[
                          styles.ipAddress,
                          { color: colors.textSecondary },
                        ]}
                      >
                        IP: {item.ipAddress}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.sessionMeta}>
                  <Text
                    style={[styles.metaText, { color: colors.textMuted }]}
                  >
                    Last active: {formatDate(item.lastActiveAt)}
                  </Text>
                  {item.deviceId && (
                    <Text
                      style={[styles.metaText, { color: colors.textMuted }]}
                    >
                      ID: {item.deviceId.substring(0, 8)}...
                    </Text>
                  )}
                </View>

                {item.deviceId !== currentDeviceId && (
                  <TouchableOpacity
                    style={[
                      styles.revokeButton,
                      {
                        backgroundColor: "#ef4444",
                        opacity: revoking.has(item.id) ? 0.6 : 1,
                      },
                    ]}
                    onPress={() =>
                      setConfirmModal({
                        visible: true,
                        sessionId: item.id,
                        isDangerous: true,
                      })
                    }
                    disabled={revoking.has(item.id)}
                  >
                    <Text style={styles.revokeButtonText}>
                      {revoking.has(item.id) ? "Revoking..." : "Revoke"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            renderSectionHeader={({ section: { title } }) => (
              <Text
                style={[
                  styles.sectionTitle,
                  { color: colors.textPrimary },
                ]}
              >
                {title}
              </Text>
            )}
            contentContainerStyle={styles.listContent}
          />
        </>
      )}

      <ConfirmModal
        visible={confirmModal.visible}
        title="Revoke Device Session?"
        message="You'll need to log in again on that device."
        confirmText="Revoke"
        cancelText="Cancel"
        isDangerous={confirmModal.isDangerous}
        onConfirm={() => {
          handleRevokeSession(confirmModal.sessionId);
        }}
        onCancel={() =>
          setConfirmModal({ visible: false, sessionId: null, isDangerous: true })
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
  },
  revokeAllButton: {
    margin: 16,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  revokeAllButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginHorizontal: 4,
    marginVertical: 12,
    marginTop: 20,
  },
  sessionCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  deviceEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  ipAddress: {
    fontSize: 13,
  },
  sessionMeta: {
    marginBottom: 12,
  },
  metaText: {
    fontSize: 12,
    marginVertical: 2,
  },
  revokeButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  revokeButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default DeviceManagement;
