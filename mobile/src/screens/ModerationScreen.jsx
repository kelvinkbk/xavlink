import React, { useState, useEffect } from "react";

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  RefreshControl,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useTheme } from "../context/ThemeContext";
import {
  moderationService,
  adminService,
  reportService,
} from "../services/api";

const TABS = [
  { key: "users", label: "Users" },
  { key: "posts", label: "Posts" },
  { key: "comments", label: "Comments" },
  { key: "reviews", label: "Reviews" },
  { key: "reports", label: "Reports" },
  { key: "logs", label: "Logs" },
];

const ModerationScreen = () => {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState("users");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await adminService.getStats();
      setStats(data);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Moderation</Text>
        <Text style={styles.headerSubtitle}>
          Suspend users, remove content, review reports
        </Text>
      </View>

      {stats && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statsContainer}
        >
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalUsers || 0}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.verifiedUsers || 0}</Text>
            <Text style={styles.statLabel}>Verified</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.suspendedUsers || 0}</Text>
            <Text style={styles.statLabel}>Suspended</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalPosts || 0}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.pendingReports || 0}</Text>
            <Text style={styles.statLabel}>Pending Reports</Text>
          </View>
        </ScrollView>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabContainer}
        contentContainerStyle={styles.tabContent}
      >
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.content}>
        {activeTab === "users" && (
          <UsersSection colors={colors} onRefresh={onRefresh} />
        )}
        {activeTab === "posts" && (
          <PostsSection colors={colors} onRefresh={onRefresh} />
        )}
        {activeTab === "comments" && (
          <CommentsSection colors={colors} onRefresh={onRefresh} />
        )}
        {activeTab === "reviews" && (
          <ReviewsSection colors={colors} onRefresh={onRefresh} />
        )}
        {activeTab === "reports" && (
          <ReportsSection colors={colors} onRefresh={onRefresh} />
        )}
        {activeTab === "logs" && (
          <LogsSection colors={colors} onRefresh={onRefresh} />
        )}
      </View>
    </View>
  );
};

// Users Section
const UsersSection = ({ colors, onRefresh }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [suspended, setSuspended] = useState("");

  useEffect(() => {
    loadUsers();
  }, [suspended]);

  const loadUsers = async () => {
    try {
      setLoading(true);

      const data = await moderationService.listUsers({
        search: search || undefined,
        suspended: suspended || undefined,
      });
      setUsers(data.users || []);
    } catch (error) {
      Alert.alert("Error", "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const toggleSuspend = async (id, isSuspended) => {
    Alert.alert(
      "Confirm",
      `Are you sure you want to ${isSuspended ? "unsuspend" : "suspend"} this user?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              await moderationService.setSuspended(id, !isSuspended);
              loadUsers();
            } catch (error) {
              Alert.alert("Error", "Failed to update user");
            }
          },
        },
      ],
    );
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.section}>
      <View style={styles.filterContainer}>
        <TextInput
          style={styles.input}
          placeholder="Search name or email"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={loadUsers}
        />
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={suspended}
            onValueChange={setSuspended}
            style={styles.picker}
            dropdownIconColor={colors.textPrimary}
          >
            <Picker.Item label="All statuses" value="" />
            <Picker.Item label="Active" value="false" />
            <Picker.Item label="Suspended" value="true" />
          </Picker>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={loadUsers}
          disabled={loading}
        >
          <Text style={styles.refreshBtnText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <Text style={styles.loadingText}>Loading...</Text>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardSub}>{item.email}</Text>
                  <Text style={styles.cardSub}>Role: {item.role}</Text>
                </View>
                <View>
                  <Text
                    style={[
                      styles.statusBadge,
                      item.isSuspended && styles.statusBadgeSuspended,
                    ]}
                  >
                    {item.isSuspended ? "Suspended" : "Active"}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  item.isSuspended && styles.actionBtnActive,
                ]}
                onPress={() => toggleSuspend(item.id, item.isSuspended)}
              >
                <Text style={styles.actionBtnText}>
                  {item.isSuspended ? "Unsuspend" : "Suspend"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No users found</Text>
          }
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadUsers} />
          }
        />
      )}
    </View>
  );
};

// Posts Section
const PostsSection = ({ colors, onRefresh }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const data = await adminService.listPosts();
      setPosts(data.posts || []);
    } catch (error) {
      Alert.alert("Error", "Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    Alert.alert("Confirm", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await adminService.deletePost(id);
            loadPosts();
          } catch (error) {
            Alert.alert("Error", "Failed to delete post");
          }
        },
      },
    ]);
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.section}>
      {loading ? (
        <Text style={styles.loadingText}>Loading...</Text>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.content || "No content"}
              </Text>
              <Text style={styles.cardSub}>
                By: {item.user?.name || "Unknown"} •{" "}
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.danger }]}
                onPress={() => handleDelete(item.id)}
              >
                <Text style={styles.actionBtnText}>Delete Post</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No posts found</Text>
          }
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadPosts} />
          }
        />
      )}
    </View>
  );
};

// Comments Section
const CommentsSection = ({ colors, onRefresh }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComments();
  }, []);

  const loadComments = async () => {
    try {
      setLoading(true);
      const data = await adminService.listComments();
      setComments(data.comments || []);
    } catch (error) {
      Alert.alert("Error", "Failed to load comments");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    Alert.alert("Confirm", "Are you sure you want to delete this comment?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await adminService.deleteComment(id);
            loadComments();
          } catch (error) {
            Alert.alert("Error", "Failed to delete comment");
          }
        },
      },
    ]);
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.section}>
      {loading ? (
        <Text style={styles.loadingText}>Loading...</Text>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardBody}>{item.text}</Text>
              <Text style={styles.cardSub}>
                By: {item.user?.name || "Unknown"} •{" "}
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.danger }]}
                onPress={() => handleDelete(item.id)}
              >
                <Text style={styles.actionBtnText}>Delete Comment</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No comments found</Text>
          }
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadComments} />
          }
        />
      )}
    </View>
  );
};

// Reviews Section
const ReviewsSection = ({ colors, onRefresh }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const data = await adminService.listReviews();
      setReviews(data.reviews || []);
    } catch (error) {
      Alert.alert("Error", "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    Alert.alert("Confirm", "Are you sure you want to delete this review?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await adminService.deleteReview(id);
            loadReviews();
          } catch (error) {
            Alert.alert("Error", "Failed to delete review");
          }
        },
      },
    ]);
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.section}>
      {loading ? (
        <Text style={styles.loadingText}>Loading...</Text>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Rating: {item.rating}/5</Text>
              {item.comment && (
                <Text style={styles.cardBody} numberOfLines={3}>
                  {item.comment}
                </Text>
              )}
              <Text style={styles.cardSub}>
                By: {item.author?.name || "Unknown"} •{" "}
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.danger }]}
                onPress={() => handleDelete(item.id)}
              >
                <Text style={styles.actionBtnText}>Delete Review</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No reviews found</Text>
          }
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadReviews} />
          }
        />
      )}
    </View>
  );
};

// Reports Section
const ReportsSection = ({ colors, onRefresh }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await reportService.listReports();
      setReports(data.reports || []);
    } catch (error) {
      Alert.alert("Error", "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await reportService.updateReportStatus(id, status);
      loadReports();
    } catch (error) {
      Alert.alert("Error", "Failed to update report");
    }
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.section}>
      {loading ? (
        <Text style={styles.loadingText}>Loading...</Text>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.reason}</Text>
              <Text style={styles.cardBody} numberOfLines={3}>
                {item.description}
              </Text>
              <Text style={styles.cardSub}>
                Status: {item.status} •{" "}
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
              {item.status === "pending" && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      { backgroundColor: colors.success },
                    ]}
                    onPress={() => handleUpdateStatus(item.id, "resolved")}
                  >
                    <Text style={styles.actionBtnText}>Resolve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      { backgroundColor: colors.danger },
                    ]}
                    onPress={() => handleUpdateStatus(item.id, "dismissed")}
                  >
                    <Text style={styles.actionBtnText}>Dismiss</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No reports found</Text>
          }
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadReports} />
          }
        />
      )}
    </View>
  );
};

// Logs Section
const LogsSection = ({ colors, onRefresh }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await adminService.listLogs();
      setLogs(data.logs || []);
    } catch (error) {
      Alert.alert("Error", "Failed to load logs");
    } finally {
      setLoading(false);
    }
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.section}>
      {loading ? (
        <Text style={styles.loadingText}>Loading...</Text>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item, index) => item.id || index.toString()}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.action}</Text>
              {item.details && (
                <Text style={styles.cardBody}>{item.details}</Text>
              )}
              <Text style={styles.cardSub}>
                {new Date(item.createdAt).toLocaleString()}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No logs found</Text>
          }
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadLogs} />
          }
        />
      )}
    </View>
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
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    statsContainer: {
      paddingVertical: 12,
      paddingHorizontal: 8,
    },
    statCard: {
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 12,
      marginHorizontal: 8,
      minWidth: 100,
      alignItems: "center",
    },
    statValue: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.primary,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
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
    filterContainer: {
      flexDirection: "row",
      marginBottom: 16,
      gap: 8,
    },
    input: {
      flex: 1,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      color: colors.textPrimary,
    },
    pickerContainer: {
      flex: 1,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
    },
    picker: {
      color: colors.textPrimary,
    },
    refreshBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
      justifyContent: "center",
    },
    refreshBtnText: {
      color: "#fff",
      fontWeight: "600",
    },
    card: {
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 8,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: 4,
    },
    cardSub: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    cardBody: {
      fontSize: 14,
      color: colors.textPrimary,
      marginBottom: 8,
    },
    statusBadge: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.success,
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: colors.success + "20",
      borderRadius: 6,
    },
    statusBadgeSuspended: {
      color: colors.danger,
      backgroundColor: colors.danger + "20",
    },
    actionBtn: {
      backgroundColor: colors.primary,
      padding: 12,
      borderRadius: 8,
      alignItems: "center",
      marginTop: 8,
    },
    actionBtnActive: {
      backgroundColor: colors.success,
    },
    actionBtnText: {
      color: "#fff",
      fontWeight: "600",
    },
    actionRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 8,
    },
    loadingText: {
      textAlign: "center",
      color: colors.textSecondary,
      marginTop: 32,
    },
    emptyText: {
      textAlign: "center",
      color: colors.textSecondary,
      marginTop: 32,
    },
  });

export default ModerationScreen;
