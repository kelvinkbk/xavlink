import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { enhancementService } from "../services/api";

const EnhancementsScreen = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const TABS = [
    { id: "scheduled", label: "Scheduled Posts" },
    { id: "activity", label: "Activity Timeline" },
    { id: "skills", label: "Skill Recommendations" },
    ...(isAdmin ? [{ id: "health", label: "System Health" }] : []),
  ];

  const [activeTab, setActiveTab] = useState("scheduled");
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    // Refresh based on active tab
    setTimeout(() => setRefreshing(false), 1000);
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Enhancements</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabContainer}
        contentContainerStyle={styles.tabContent}
      >
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.id && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.content}>
        {activeTab === "scheduled" && (
          <ScheduledPostsSection colors={colors} onRefresh={onRefresh} />
        )}
        {activeTab === "activity" && (
          <ActivityTimelineSection colors={colors} onRefresh={onRefresh} />
        )}
        {activeTab === "skills" && (
          <SkillRecommendationsSection colors={colors} onRefresh={onRefresh} />
        )}
        {activeTab === "health" && (
          <SystemHealthSection colors={colors} onRefresh={onRefresh} />
        )}
      </View>
    </View>
  );
};

// Scheduled Posts Section
const ScheduledPostsSection = ({ colors, onRefresh }) => {
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadScheduledPosts();
  }, []);

  const loadScheduledPosts = async () => {
    try {
      setLoading(true);
      const data = await enhancementService.getScheduledPosts();
      setScheduledPosts(data.posts || []);
    } catch (error) {
      console.error("Failed to load scheduled posts:", error);
      Alert.alert("Error", "Failed to load scheduled posts");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPost = (postId) => {
    Alert.alert(
      "Cancel Scheduled Post",
      "Are you sure you want to cancel this scheduled post?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          style: "destructive",
          onPress: async () => {
            try {
              await enhancementService.cancelScheduledPost(postId);
              loadScheduledPosts();
            } catch (error) {
              Alert.alert("Error", "Failed to cancel scheduled post");
            }
          },
        },
      ],
    );
  };

  const formatScheduledTime = (date) => {
    const d = new Date(date);
    return (
      d.toLocaleDateString() +
      " at " +
      d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  };

  const styles = createStyles(colors);

  const onRefreshHandler = async () => {
    setRefreshing(true);
    await loadScheduledPosts();
    setRefreshing(false);
    onRefresh();
  };

  return (
    <View style={styles.section}>
      {loading ? (
        <Text style={styles.loadingText}>Loading scheduled posts...</Text>
      ) : scheduledPosts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No scheduled posts</Text>
          <Text style={styles.emptySubtext}>
            Schedule posts to be published automatically
          </Text>
        </View>
      ) : (
        <FlatList
          data={scheduledPosts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle} numberOfLines={3}>
                {item.content || "No content"}
              </Text>
              {item.image && <Text style={styles.cardSub}>📷 Has image</Text>}
              <Text style={styles.cardSub}>
                Scheduled for: {formatScheduledTime(item.scheduledAt)}
              </Text>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.danger }]}
                onPress={() => handleCancelPost(item.id)}
              >
                <Text style={styles.actionBtnText}>Cancel Post</Text>
              </TouchableOpacity>
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefreshHandler}
            />
          }
        />
      )}
    </View>
  );
};

// Activity Timeline Section
const ActivityTimelineSection = ({ colors, onRefresh }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const data = await enhancementService.getActivityTimeline(20, 0);
      setActivities(data.activities || []);
    } catch (error) {
      console.error("Failed to load activities:", error);
      Alert.alert("Error", "Failed to load activity timeline");
    } finally {
      setLoading(false);
    }
  };

  const styles = createStyles(colors);

  const onRefreshHandler = async () => {
    setRefreshing(true);
    await loadActivities();
    setRefreshing(false);
    onRefresh();
  };

  const formatActivityDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <View style={styles.section}>
      {loading ? (
        <Text style={styles.loadingText}>Loading activity...</Text>
      ) : activities.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No activity yet</Text>
        </View>
      ) : (
        <FlatList
          data={activities}
          keyExtractor={(item, index) => item.id || index.toString()}
          renderItem={({ item }) => (
            <View style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>{item.type}</Text>
                {item.description && (
                  <Text style={styles.timelineDescription}>
                    {item.description}
                  </Text>
                )}
                <Text style={styles.timelineDate}>
                  {formatActivityDate(item.createdAt)}
                </Text>
              </View>
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefreshHandler}
            />
          }
        />
      )}
    </View>
  );
};

// Skill Recommendations Section
const SkillRecommendationsSection = ({ colors, onRefresh }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      const data = await enhancementService.getSkillRecommendations();
      setRecommendations(data.recommendations || []);
    } catch (error) {
      console.error("Failed to load recommendations:", error);
      // Try to generate recommendations
      try {
        await enhancementService.generateSkillRecommendations();
        const data = await enhancementService.getSkillRecommendations();
        setRecommendations(data.recommendations || []);
      } catch (genError) {
        Alert.alert("Error", "Failed to load skill recommendations");
      }
    } finally {
      setLoading(false);
    }
  };

  const styles = createStyles(colors);

  const onRefreshHandler = async () => {
    setRefreshing(true);
    await loadRecommendations();
    setRefreshing(false);
    onRefresh();
  };

  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.generateBtn}
        onPress={async () => {
          try {
            setLoading(true);
            await enhancementService.generateSkillRecommendations();
            await loadRecommendations();
          } catch (error) {
            Alert.alert("Error", "Failed to generate recommendations");
          } finally {
            setLoading(false);
          }
        }}
        disabled={loading}
      >
        <Text style={styles.generateBtnText}>
          {loading ? "Generating..." : "Generate Recommendations"}
        </Text>
      </TouchableOpacity>

      {loading && recommendations.length === 0 ? (
        <Text style={styles.loadingText}>Loading recommendations...</Text>
      ) : recommendations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No recommendations yet</Text>
          <Text style={styles.emptySubtext}>
            Generate skill recommendations based on your profile
          </Text>
        </View>
      ) : (
        <FlatList
          data={recommendations}
          keyExtractor={(item, index) => item.skillName || index.toString()}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.skillName}</Text>
              {item.reason && (
                <Text style={styles.cardSub}>Reason: {item.reason}</Text>
              )}
              {item.score && (
                <Text style={styles.cardSub}>
                  Relevance: {Math.round(item.score * 100)}%
                </Text>
              )}
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefreshHandler}
            />
          }
        />
      )}
    </View>
  );
};

// System Health Section
const SystemHealthSection = ({ colors, onRefresh }) => {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadHealth();
  }, []);

  const loadHealth = async () => {
    try {
      setLoading(true);
      const data = await enhancementService.getSystemHealth();
      setHealth(data);
    } catch (error) {
      console.error("Failed to load system health:", error);
      // Only show alert for non-403 errors (403 means not authorized, which is expected for non-admins)
      if (error?.response?.status !== 403) {
        Alert.alert("Error", "Failed to load system health");
      } else {
        // Set health to null to show unauthorized message
        setHealth(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const styles = createStyles(colors);

  const onRefreshHandler = async () => {
    setRefreshing(true);
    await loadHealth();
    setRefreshing(false);
    onRefresh();
  };

  if (loading && !health) {
    return (
      <View style={styles.section}>
        <Text style={styles.loadingText}>Loading system health...</Text>
      </View>
    );
  }

  if (!health && !loading) {
    return (
      <View style={styles.section}>
        <Text style={styles.loadingText}>
          System health is only available to administrators.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.section}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefreshHandler} />
      }
    >
      {health && (
        <View style={styles.healthContainer}>
          <View style={styles.healthCard}>
            <Text style={styles.healthLabel}>Database Status</Text>
            <Text
              style={[
                styles.healthValue,
                health.database === "connected"
                  ? { color: colors.success }
                  : { color: colors.danger },
              ]}
            >
              {String(health.database || "Unknown")}
            </Text>
          </View>

          <View style={styles.healthCard}>
            <Text style={styles.healthLabel}>Environment</Text>
            <Text style={styles.healthValue}>
              {String(health.environment || "Unknown")}
            </Text>
          </View>

          {health.uptime && (
            <View style={styles.healthCard}>
              <Text style={styles.healthLabel}>Uptime</Text>
              <Text style={styles.healthValue}>
                {Math.floor(health.uptime / 3600)}h{" "}
                {Math.floor((health.uptime % 3600) / 60)}m
              </Text>
            </View>
          )}

          {health.timestamp && (
            <View style={styles.healthCard}>
              <Text style={styles.healthLabel}>Last Checked</Text>
              <Text style={styles.healthValue}>
                {new Date(health.timestamp).toLocaleString()}
              </Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.textPrimary,
    },
    tabContainer: {
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tabContent: {
      paddingHorizontal: 8,
    },
    tab: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginHorizontal: 4,
      borderBottomWidth: 2,
      borderBottomColor: "transparent",
    },
    tabActive: {
      borderBottomColor: colors.primary,
    },
    tabText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: colors.primary,
    },
    content: {
      flex: 1,
    },
    section: {
      flex: 1,
      padding: 16,
    },
    card: {
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: 8,
    },
    cardSub: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    actionBtn: {
      backgroundColor: colors.danger,
      padding: 12,
      borderRadius: 8,
      alignItems: "center",
      marginTop: 8,
    },
    actionBtnText: {
      color: "#fff",
      fontWeight: "600",
    },
    generateBtn: {
      backgroundColor: colors.primary,
      padding: 16,
      borderRadius: 8,
      alignItems: "center",
      marginBottom: 16,
    },
    generateBtnText: {
      color: "#fff",
      fontWeight: "600",
      fontSize: 16,
    },
    loadingText: {
      textAlign: "center",
      color: colors.textSecondary,
      marginTop: 32,
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 64,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: "center",
    },
    timelineItem: {
      flexDirection: "row",
      marginBottom: 16,
    },
    timelineDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.primary,
      marginRight: 12,
      marginTop: 4,
    },
    timelineContent: {
      flex: 1,
    },
    timelineTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: 4,
    },
    timelineDescription: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    timelineDate: {
      fontSize: 12,
      color: colors.textMuted,
    },
    healthContainer: {
      gap: 12,
    },
    healthCard: {
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    healthLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    healthValue: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.textPrimary,
    },
  });

export default EnhancementsScreen;
