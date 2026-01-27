import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ScrollView,
  Dimensions,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { adminService } from "../services/api";

const SECTIONS = [
  { key: "users", label: "Users" },
  { key: "posts", label: "Posts" },
  { key: "comments", label: "Comments" },
  { key: "reviews", label: "Reviews" },
  { key: "reports", label: "Reports" },
  { key: "logs", label: "Logs" },
];

const AdminDashboardScreen = () => {
  const { user } = useAuth();
  const { colors } = useTheme();

  const [activeSection, setActiveSection] = useState("users");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [suspendedFilter, setSuspendedFilter] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("");

  // Posts section state
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);

  // Comments section state
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  // Reviews section state
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Reports section state
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportStatusFilter, setReportStatusFilter] = useState("");

  // Logs section state
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [selectedIds, setSelectedIds] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "user",
  });
  const [verifyingId, setVerifyingId] = useState(null);

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const displayUser = (u, ...extra) => {
    const candidates = [
      u?.name,
      u?.username,
      u?.fullName,
      u?.displayName,
      u?.profile?.name,
      u?.user?.name,
      u?.user?.username,
      typeof u === "string" ? u : null,
      ...extra,
      u?.email,
      u?.id,
    ];
    const found = candidates.find(
      (val) => typeof val === "string" && val.trim().length > 0,
    );
    return String(found || "—");
  };

  const displayTitle = (p, fallbackContent) =>
    p?.title ||
    (typeof fallbackContent === "string" && fallbackContent.length > 0
      ? fallbackContent
      : "—");

  const displayDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
  };

  // Dashboard stats
  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const data = await adminService.getStats();
      setStats(data);
    } catch (e) {
      // Optionally handle error
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminService.listUsers({
        search,
        role: roleFilter,
        suspended: suspendedFilter,
        verified: verifiedFilter,
      });
      console.log("API Response:", data);
      // Handle different response formats
      if (Array.isArray(data)) {
        setUsers(data);
      } else if (data?.users && Array.isArray(data.users)) {
        setUsers(data.users);
      } else {
        setUsers([]);
        setError("Unexpected response format from server");
      }
    } catch (e) {
      console.error("Error fetching users:", e);
      setError(
        e?.response?.data?.message || e?.message || "Failed to load users",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchPosts = async () => {
    setPostsLoading(true);
    try {
      const data = await adminService.listPosts();
      setPosts(Array.isArray(data) ? data : data?.posts || []);
    } catch (e) {
      console.error("Error fetching posts:", e);
      setError(e?.response?.data?.message || "Failed to load posts");
    } finally {
      setPostsLoading(false);
    }
  };

  const fetchComments = async () => {
    setCommentsLoading(true);
    try {
      const data = await adminService.listComments();
      setComments(Array.isArray(data) ? data : data?.comments || []);
    } catch (e) {
      console.error("Error fetching comments:", e);
      setError(e?.response?.data?.message || "Failed to load comments");
    } finally {
      setCommentsLoading(false);
    }
  };

  const fetchReviews = async () => {
    setReviewsLoading(true);
    try {
      const data = await adminService.listReviews();
      setReviews(Array.isArray(data) ? data : data?.reviews || []);
    } catch (e) {
      console.error("Error fetching reviews:", e);
      setError(e?.response?.data?.message || "Failed to load reviews");
    } finally {
      setReviewsLoading(false);
    }
  };

  const fetchReports = async () => {
    setReportsLoading(true);
    try {
      const data = await adminService.listReports({
        status: reportStatusFilter,
      });
      setReports(Array.isArray(data) ? data : data?.reports || []);
    } catch (e) {
      console.error("Error fetching reports:", e);
      setError(e?.response?.data?.message || "Failed to load reports");
    } finally {
      setReportsLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const data = await adminService.listLogs();
      setLogs(Array.isArray(data) ? data : data?.logs || []);
    } catch (e) {
      console.error("Error fetching logs:", e);
      setError(e?.response?.data?.message || "Failed to load logs");
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    if (activeSection === "users") fetchUsers();
    if (activeSection === "posts") fetchPosts();
    if (activeSection === "comments") fetchComments();
    if (activeSection === "reviews") fetchReviews();
    if (activeSection === "reports") fetchReports();
    if (activeSection === "logs") fetchLogs();
  }, [activeSection]);

  const handleEditStart = (item) => {
    setEditingId(item.id);
    setEditForm({
      name: item.name || "",
      email: item.email || "",
      role: item.role || "user",
    });
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditForm({ name: "", email: "", role: "user" });
  };

  const handleEditSave = async (id) => {
    const existing = users.find((u) => u.id === id);
    const roleChanged = existing && existing.role !== editForm.role;
    const { role, ...rest } = editForm;

    try {
      if (roleChanged) {
        await adminService.setRole(id, editForm.role);
      }
      await adminService.updateUser(id, rest);
      setEditingId(null);
      fetchUsers();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to update user");
    }
  };

  const handleSetRole = async (id, role) => {
    const current = users.find((u) => u.id === id);
    if (!current || current.role === role) return;

    // Optimistic update for snappier UI
    const prevUsers = users;
    setUsers((list) => list.map((u) => (u.id === id ? { ...u, role } : u)));

    try {
      await adminService.setRole(id, role);
      fetchUsers();
    } catch (e) {
      setUsers(prevUsers); // revert on failure
      setError(e?.response?.data?.message || "Failed to update role");
    }
  };

  const handleSetVerified = async (id, verified) => {
    setVerifyingId(id);
    try {
      await adminService.setVerified(id, verified);
      fetchUsers();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to update verification");
    } finally {
      setVerifyingId(null);
    }
  };

  const handleSetSuspended = async (id, isSuspended) => {
    try {
      await adminService.setSuspended(id, { isSuspended });
      fetchUsers();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to update suspension");
    }
  };

  const handleResendVerification = async (email) => {
    setVerifyingId(email);
    try {
      await adminService.resendVerification(email);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to resend verification");
    } finally {
      setVerifyingId(null);
    }
  };
  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === users.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(users.map((u) => u.id));
    }
  };

  /* =========================
     BULK ACTIONS
  ========================== */
  const handleBulkSuspend = async () => {
    if (selectedIds.length === 0) return;
    try {
      // Only suspend users who are not already suspended
      const toSuspend = users
        .filter((u) => selectedIds.includes(u.id) && !u.isSuspended)
        .map((u) => u.id);
      if (toSuspend.length === 0) return;
      await adminService.bulkSuspend(toSuspend, true);
      setSelectedIds([]);
      fetchUsers();
    } catch (e) {
      setError(e?.response?.data?.message || "Bulk suspend failed");
    }
  };

  const handleBulkUnsuspend = async () => {
    if (selectedIds.length === 0) return;
    try {
      // Only unsuspend users who are currently suspended
      const toUnsuspend = users
        .filter((u) => selectedIds.includes(u.id) && u.isSuspended)
        .map((u) => u.id);
      if (toUnsuspend.length === 0) return;
      await adminService.bulkSuspend(toUnsuspend, false);
      setSelectedIds([]);
      fetchUsers();
    } catch (e) {
      setError(e?.response?.data?.message || "Bulk unsuspend failed");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      await adminService.bulkDelete(selectedIds);
      setSelectedIds([]);
      fetchUsers();
    } catch (e) {
      setError(e?.response?.data?.message || "Bulk delete failed");
    }
  };

  // Posts handlers
  const [editingPostId, setEditingPostId] = useState(null);
  const [editPostForm, setEditPostForm] = useState({ content: "" });

  const handleEditPostStart = (post) => {
    setEditingPostId(post.id);
    setEditPostForm({ content: post.content || "" });
  };

  const handleEditPostCancel = () => {
    setEditingPostId(null);
    setEditPostForm({ content: "" });
  };

  const handleEditPostSave = async (id) => {
    try {
      await adminService.editPost(id, editPostForm);
      handleEditPostCancel();
      fetchPosts();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to update post");
    }
  };

  const handleDeletePost = async (id) => {
    try {
      await adminService.deletePost(id);
      fetchPosts();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to delete post");
    }
  };

  // Comments handlers
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentForm, setEditCommentForm] = useState({ content: "" });

  const handleEditCommentStart = (comment) => {
    setEditingCommentId(comment.id);
    setEditCommentForm({ content: comment.content || "" });
  };

  const handleEditCommentCancel = () => {
    setEditingCommentId(null);
    setEditCommentForm({ content: "" });
  };

  const handleEditCommentSave = async (id) => {
    try {
      await adminService.editComment(id, editCommentForm);
      handleEditCommentCancel();
      fetchComments();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to update comment");
    }
  };

  const handleDeleteComment = async (id) => {
    try {
      await adminService.deleteComment(id);
      fetchComments();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to delete comment");
    }
  };

  // Reviews handlers
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editReviewForm, setEditReviewForm] = useState({
    review: "",
    rating: 5,
  });

  const handleEditReviewStart = (review) => {
    setEditingReviewId(review.id);
    setEditReviewForm({
      review: review.review || "",
      rating: review.rating || 5,
    });
  };

  const handleEditReviewCancel = () => {
    setEditingReviewId(null);
    setEditReviewForm({ review: "", rating: 5 });
  };

  const handleEditReviewSave = async (id) => {
    try {
      await adminService.editReview(id, editReviewForm);
      handleEditReviewCancel();
      fetchReviews();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to update review");
    }
  };

  const handleDeleteReview = async (id) => {
    try {
      await adminService.deleteReview(id);
      fetchReviews();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to delete review");
    }
  };

  // Reports handlers
  const handleResolveReport = async (id) => {
    try {
      await adminService.updateReport(id, { status: "resolved" });
      fetchReports();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to resolve report");
    }
  };

  const handleDismissReport = async (id) => {
    try {
      await adminService.updateReport(id, { status: "dismissed" });
      fetchReports();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to dismiss report");
    }
  };

  /* =========================
     RENDER
  ========================== */
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>Admin / Moderator Dashboard</Text>

        {/* Tab Navigation */}
        <View style={styles.tabRow}>
          {SECTIONS.map((section) => (
            <TouchableOpacity
              key={section.key}
              style={[
                styles.tabButton,
                activeSection === section.key && styles.activeTab,
              ]}
              onPress={() => setActiveSection(section.key)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeSection === section.key && styles.activeTabText,
                ]}
              >
                {section.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Dashboard Stats - Only show on Users tab */}
        {activeSection === "users" && stats && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {String(stats.totalUsers || 0)}
              </Text>
              <Text style={styles.statLabel}>Total Users</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {String(stats.verifiedUsers || 0)}
              </Text>
              <Text style={styles.statLabel}>Verified</Text>
            </View>
            <View
              style={[
                styles.statCard,
                { backgroundColor: colors.errorBackground },
              ]}
            >
              <Text style={styles.statValue}>
                {String(stats.suspendedUsers || 0)}
              </Text>
              <Text style={styles.statLabel}>Suspended</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {String(stats.totalPosts || 0)}
              </Text>
              <Text style={styles.statLabel}>Total Posts</Text>
            </View>
          </View>
        )}

        {/* USERS SECTION */}
        {activeSection === "users" && (
          <View>
            <Text style={styles.sectionTitle}>Users</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {/* Filters */}
            <View
              style={{
                backgroundColor: colors.surface,
                padding: 8,
                borderRadius: 8,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={styles.filterLabel}>Search</Text>
              <View style={styles.inputBox}>
                <TextInput
                  placeholder="Name or email"
                  value={search}
                  onChangeText={setSearch}
                  onSubmitEditing={fetchUsers}
                  returnKeyType="search"
                />
              </View>

              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.filterLabel}>Role</Text>
                  <Picker
                    selectedValue={roleFilter}
                    onValueChange={setRoleFilter}
                  >
                    <Picker.Item label="All" value="" />
                    <Picker.Item label="User" value="user" />
                    <Picker.Item label="Moderator" value="moderator" />
                    <Picker.Item label="Admin" value="admin" />
                  </Picker>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.filterLabel}>Status</Text>
                  <Picker
                    selectedValue={suspendedFilter}
                    onValueChange={setSuspendedFilter}
                  >
                    <Picker.Item label="All" value="" />
                    <Picker.Item label="Active" value="false" />
                    <Picker.Item label="Suspended" value="true" />
                  </Picker>
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.filterLabel}>Verified</Text>
                  <Picker
                    selectedValue={verifiedFilter}
                    onValueChange={setVerifiedFilter}
                  >
                    <Picker.Item label="All" value="" />
                    <Picker.Item label="Verified" value="true" />
                    <Picker.Item label="Unverified" value="false" />
                  </Picker>
                </View>
              </View>

              <TouchableOpacity style={styles.filterBtn} onPress={fetchUsers}>
                <Text style={{ color: "#fff", fontWeight: "bold" }}>Apply</Text>
              </TouchableOpacity>
              {users.length > 0 && (
                <TouchableOpacity
                  style={[styles.filterBtn, { backgroundColor: "#0ea5e9" }]}
                  onPress={toggleSelectAll}
                >
                  <Text style={{ color: "#fff", fontWeight: "bold" }}>
                    {selectedIds.length === users.length
                      ? "Clear All"
                      : "Select All"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* User List */}
            {loading ? (
              <Text style={{ padding: 20, textAlign: "center" }}>
                Loading users...
              </Text>
            ) : users.length === 0 ? (
              <Text style={{ padding: 20, textAlign: "center" }}>
                No users found
              </Text>
            ) : (
              <>
                {users.map((item, index) => {
                  const isEditing = editingId === item.id;
                  const itemKey = item.id || String(index);

                  return (
                    <View
                      key={itemKey}
                      style={[
                        styles.userRow,
                        selectedIds.includes(item.id) && styles.userRowSelected,
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.checkbox}
                        onPress={() => toggleSelect(item.id)}
                      >
                        {selectedIds.includes(item.id) && (
                          <Text
                            style={{
                              color: colors.primary,
                              fontWeight: "bold",
                            }}
                          >
                            ✓
                          </Text>
                        )}
                      </TouchableOpacity>
                      <View style={{ flex: 1 }}>
                        {isEditing ? (
                          <>
                            <TextInput
                              style={{
                                fontWeight: "bold",
                                marginBottom: 2,
                                borderWidth: 1,
                                borderColor: colors.border,
                                padding: 4,
                                borderRadius: 4,
                                backgroundColor: colors.surface,
                                color: colors.textPrimary,
                              }}
                              value={String(editForm.name || "")}
                              onChangeText={(v) =>
                                setEditForm((f) => ({ ...f, name: v }))
                              }
                              placeholder="Name"
                            />
                            <TextInput
                              style={{
                                marginBottom: 2,
                                borderWidth: 1,
                                borderColor: colors.border,
                                padding: 4,
                                borderRadius: 4,
                                backgroundColor: colors.surface,
                                color: colors.textPrimary,
                              }}
                              value={String(editForm.email || "")}
                              onChangeText={(v) =>
                                setEditForm((f) => ({ ...f, email: v }))
                              }
                              placeholder="Email"
                            />
                            <Picker
                              selectedValue={String(editForm.role || "user")}
                              onValueChange={(v) =>
                                setEditForm((f) => ({ ...f, role: v }))
                              }
                            >
                              <Picker.Item label="User" value="user" />
                              <Picker.Item
                                label="Moderator"
                                value="moderator"
                              />
                              <Picker.Item label="Admin" value="admin" />
                            </Picker>
                            <View
                              style={{
                                flexDirection: "row",
                                marginTop: 4,
                                gap: 4,
                              }}
                            >
                              <TouchableOpacity
                                style={[
                                  styles.actionBtn,
                                  { backgroundColor: "#3b82f6" },
                                ]}
                                onPress={() => handleEditSave(item.id)}
                              >
                                <Text style={styles.actionText}>Save</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[
                                  styles.actionBtn,
                                  { backgroundColor: "#64748b" },
                                ]}
                                onPress={handleEditCancel}
                              >
                                <Text style={styles.actionText}>Cancel</Text>
                              </TouchableOpacity>
                            </View>
                          </>
                        ) : (
                          <>
                            <Text style={{ fontWeight: "bold" }}>
                              {String(displayUser(item))}
                            </Text>
                            <Text style={{ fontSize: 12, color: "#64748b" }}>
                              {String(item.email || "")}
                            </Text>
                            <Text style={{ fontSize: 12 }}>
                              Role: {String(item.role || "user")}
                            </Text>
                            <Text
                              style={{
                                fontSize: 12,
                                color: item.isSuspended ? "#dc2626" : "#16a34a",
                              }}
                            >
                              {item.isSuspended ? "Suspended" : "Active"}
                            </Text>
                            {!item.emailVerified && (
                              <Text
                                style={{
                                  fontSize: 11,
                                  color: "#f59e0b",
                                }}
                              >
                                Unverified
                              </Text>
                            )}
                          </>
                        )}
                      </View>

                      {!isEditing && (
                        <View style={{ gap: 4 }}>
                          <TouchableOpacity
                            style={[
                              styles.actionBtn,
                              { backgroundColor: "#3b82f6", padding: 6 },
                            ]}
                            onPress={() => handleEditStart(item)}
                          >
                            <Text style={[styles.actionText, { fontSize: 11 }]}>
                              Edit
                            </Text>
                          </TouchableOpacity>
                          {!item.emailVerified && (
                            <TouchableOpacity
                              style={[
                                styles.actionBtn,
                                { backgroundColor: "#f59e0b", padding: 6 },
                              ]}
                              onPress={() =>
                                handleResendVerification(item.email)
                              }
                            >
                              <Text
                                style={[styles.actionText, { fontSize: 10 }]}
                              >
                                Resend
                              </Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={[
                              styles.actionBtn,
                              { backgroundColor: "#0ea5e9", padding: 6 },
                            ]}
                            onPress={() =>
                              handleSetVerified(item.id, !item.emailVerified)
                            }
                          >
                            <Text style={[styles.actionText, { fontSize: 10 }]}>
                              {item.emailVerified ? "Unverify" : "Verify"}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.actionBtn,
                              {
                                backgroundColor: item.isSuspended
                                  ? "#16a34a"
                                  : "#fbbf24",
                                padding: 6,
                              },
                            ]}
                            onPress={() =>
                              handleSetSuspended(item.id, !item.isSuspended)
                            }
                          >
                            <Text style={[styles.actionText, { fontSize: 10 }]}>
                              {item.isSuspended ? "Unsuspend" : "Suspend"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}
              </>
            )}

            {/* Bulk Actions */}
            {selectedIds.length > 0 && (
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    { backgroundColor: "#fbbf24", flex: 1 },
                  ]}
                  onPress={handleBulkSuspend}
                >
                  <Text style={styles.actionText}>
                    Suspend ({selectedIds.length})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    { backgroundColor: colors.success, flex: 1 },
                  ]}
                  onPress={handleBulkUnsuspend}
                >
                  <Text style={styles.actionText}>Unsuspend</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    { backgroundColor: colors.danger, flex: 1 },
                  ]}
                  onPress={handleBulkDelete}
                >
                  <Text style={styles.actionText}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* POSTS SECTION */}
        {activeSection === "posts" && (
          <View>
            <Text style={styles.sectionTitle}>Posts</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {postsLoading ? (
              <Text
                style={{
                  padding: 20,
                  textAlign: "center",
                  color: colors.textSecondary,
                }}
              >
                Loading posts...
              </Text>
            ) : posts.length === 0 ? (
              <Text style={{ padding: 20, textAlign: "center" }}>
                No posts found
              </Text>
            ) : (
              posts.map((item) => {
                const isEditing = editingPostId === item.id;
                return (
                  <View
                    key={item.id}
                    style={{
                      borderWidth: 1,
                      borderColor: "#e5e7eb",
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#64748b",
                        marginBottom: 4,
                      }}
                    >
                      {displayUser(item.author || item.user)} •{" "}
                      {displayDate(item.createdAt)}
                    </Text>
                    {isEditing ? (
                      <>
                        <TextInput
                          style={{
                            borderWidth: 1,
                            borderColor: "#e5e7eb",
                            padding: 8,
                            borderRadius: 4,
                            marginBottom: 8,
                            height: 80,
                          }}
                          value={editPostForm.content}
                          onChangeText={(v) =>
                            setEditPostForm((f) => ({ ...f, content: v }))
                          }
                          placeholder="Post content"
                          multiline
                        />
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <TouchableOpacity
                            style={[
                              styles.actionBtn,
                              { backgroundColor: "#3b82f6", flex: 1 },
                            ]}
                            onPress={() => handleEditPostSave(item.id)}
                          >
                            <Text style={styles.actionText}>Save</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.actionBtn,
                              { backgroundColor: "#64748b", flex: 1 },
                            ]}
                            onPress={handleEditPostCancel}
                          >
                            <Text style={styles.actionText}>Cancel</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    ) : (
                      <>
                        <Text style={{ marginBottom: 8 }}>
                          {String(item.content || "")}
                        </Text>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <TouchableOpacity
                            style={[
                              styles.actionBtn,
                              { backgroundColor: "#3b82f6", flex: 1 },
                            ]}
                            onPress={() => handleEditPostStart(item)}
                          >
                            <Text style={styles.actionText}>Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.actionBtn,
                              { backgroundColor: "#dc2626", flex: 1 },
                            ]}
                            onPress={() => handleDeletePost(item.id)}
                          >
                            <Text style={styles.actionText}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* COMMENTS SECTION */}
        {activeSection === "comments" && (
          <View>
            <Text style={styles.sectionTitle}>Comments</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {commentsLoading ? (
              <Text style={{ padding: 20, textAlign: "center" }}>
                Loading comments...
              </Text>
            ) : comments.length === 0 ? (
              <Text style={{ padding: 20, textAlign: "center" }}>
                No comments found
              </Text>
            ) : (
              comments.map((item) => {
                const isEditing = editingCommentId === item.id;
                return (
                  <View
                    key={item.id}
                    style={{
                      borderWidth: 1,
                      borderColor: "#e5e7eb",
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#64748b",
                        marginBottom: 4,
                      }}
                    >
                      {displayUser(item.author || item.user)} •{" "}
                      {displayDate(item.createdAt)}
                    </Text>
                    {isEditing ? (
                      <>
                        <TextInput
                          style={{
                            borderWidth: 1,
                            borderColor: "#e5e7eb",
                            padding: 8,
                            borderRadius: 4,
                            marginBottom: 8,
                            height: 60,
                          }}
                          value={editCommentForm.content}
                          onChangeText={(v) =>
                            setEditCommentForm((f) => ({ ...f, content: v }))
                          }
                          placeholder="Comment"
                          multiline
                        />
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <TouchableOpacity
                            style={[
                              styles.actionBtn,
                              { backgroundColor: "#3b82f6", flex: 1 },
                            ]}
                            onPress={() => handleEditCommentSave(item.id)}
                          >
                            <Text style={styles.actionText}>Save</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.actionBtn,
                              { backgroundColor: "#64748b", flex: 1 },
                            ]}
                            onPress={handleEditCommentCancel}
                          >
                            <Text style={styles.actionText}>Cancel</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    ) : (
                      <>
                        <Text style={{ marginBottom: 8 }}>
                          {String(item.content || "")}
                        </Text>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <TouchableOpacity
                            style={[
                              styles.actionBtn,
                              { backgroundColor: "#3b82f6", flex: 1 },
                            ]}
                            onPress={() => handleEditCommentStart(item)}
                          >
                            <Text style={styles.actionText}>Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.actionBtn,
                              { backgroundColor: "#dc2626", flex: 1 },
                            ]}
                            onPress={() => handleDeleteComment(item.id)}
                          >
                            <Text style={styles.actionText}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* REVIEWS SECTION */}
        {activeSection === "reviews" && (
          <View>
            <Text style={styles.sectionTitle}>Reviews</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {reviewsLoading ? (
              <Text style={{ padding: 20, textAlign: "center" }}>
                Loading reviews...
              </Text>
            ) : reviews.length === 0 ? (
              <Text style={{ padding: 20, textAlign: "center" }}>
                No reviews found
              </Text>
            ) : (
              reviews.map((item) => {
                const isEditing = editingReviewId === item.id;
                return (
                  <View
                    key={item.id}
                    style={{
                      borderWidth: 1,
                      borderColor: "#e5e7eb",
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 8,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}
                    >
                      <Text style={{ fontWeight: "bold" }}>
                        ⭐ {item.rating}
                      </Text>
                      <Text style={{ fontSize: 12, color: "#64748b" }}>
                        {displayDate(item.createdAt)}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#64748b",
                        marginBottom: 4,
                      }}
                    >
                      {displayUser(item.author || item.user)}
                    </Text>
                    {isEditing ? (
                      <>
                        <TextInput
                          style={{
                            borderWidth: 1,
                            borderColor: "#e5e7eb",
                            padding: 8,
                            borderRadius: 4,
                            marginBottom: 8,
                            height: 60,
                          }}
                          value={editReviewForm.review}
                          onChangeText={(v) =>
                            setEditReviewForm((f) => ({ ...f, review: v }))
                          }
                          placeholder="Review"
                          multiline
                        />
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <TouchableOpacity
                            style={[
                              styles.actionBtn,
                              { backgroundColor: "#3b82f6", flex: 1 },
                            ]}
                            onPress={() => handleEditReviewSave(item.id)}
                          >
                            <Text style={styles.actionText}>Save</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.actionBtn,
                              { backgroundColor: "#64748b", flex: 1 },
                            ]}
                            onPress={handleEditReviewCancel}
                          >
                            <Text style={styles.actionText}>Cancel</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    ) : (
                      <>
                        <Text style={{ marginBottom: 8 }}>
                          {String(item.review || item.content || "")}
                        </Text>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <TouchableOpacity
                            style={[
                              styles.actionBtn,
                              { backgroundColor: "#3b82f6", flex: 1 },
                            ]}
                            onPress={() => handleEditReviewStart(item)}
                          >
                            <Text style={styles.actionText}>Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.actionBtn,
                              { backgroundColor: "#dc2626", flex: 1 },
                            ]}
                            onPress={() => handleDeleteReview(item.id)}
                          >
                            <Text style={styles.actionText}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* REPORTS SECTION */}
        {activeSection === "reports" && (
          <View>
            <Text style={styles.sectionTitle}>Reports</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View
              style={{
                backgroundColor: "#f8fafc",
                padding: 8,
                borderRadius: 8,
                marginBottom: 8,
              }}
            >
              <Text style={styles.filterLabel}>Status</Text>
              <Picker
                selectedValue={reportStatusFilter}
                onValueChange={setReportStatusFilter}
              >
                <Picker.Item label="All" value="" />
                <Picker.Item label="Pending" value="pending" />
                <Picker.Item label="Resolved" value="resolved" />
                <Picker.Item label="Dismissed" value="dismissed" />
              </Picker>
              <TouchableOpacity style={styles.filterBtn} onPress={fetchReports}>
                <Text style={{ color: "#fff", fontWeight: "bold" }}>Apply</Text>
              </TouchableOpacity>
            </View>

            {reportsLoading ? (
              <Text style={{ padding: 20, textAlign: "center" }}>
                Loading reports...
              </Text>
            ) : reports.length === 0 ? (
              <Text style={{ padding: 20, textAlign: "center" }}>
                No reports found
              </Text>
            ) : (
              reports.map((item) => (
                <View
                  key={item.id}
                  style={{
                    borderWidth: 1,
                    borderColor: "#e5e7eb",
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 8,
                  }}
                >
                  <View style={{ marginBottom: 8 }}>
                    <Text style={{ fontWeight: "bold" }}>
                      Reason: {String(item.reason || "")}
                    </Text>
                    <Text style={{ fontSize: 12, color: "#64748b" }}>
                      Reported by:{" "}
                      {String(displayUser(item.reporter || item.reportedBy))}
                    </Text>
                    <Text style={{ fontSize: 12, color: "#64748b" }}>
                      Status:{" "}
                      <Text
                        style={{
                          color:
                            item.status === "resolved" ? "#16a34a" : "#f59e0b",
                        }}
                      >
                        {item.status}
                      </Text>
                    </Text>
                  </View>
                  {item.status === "pending" && (
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TouchableOpacity
                        style={[
                          styles.actionBtn,
                          { backgroundColor: "#16a34a", flex: 1 },
                        ]}
                        onPress={() => handleResolveReport(item.id)}
                      >
                        <Text style={styles.actionText}>Resolve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.actionBtn,
                          { backgroundColor: "#64748b", flex: 1 },
                        ]}
                        onPress={() => handleDismissReport(item.id)}
                      >
                        <Text style={styles.actionText}>Dismiss</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* LOGS SECTION */}
        {activeSection === "logs" && (
          <View>
            <Text style={styles.sectionTitle}>Activity Logs</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {logsLoading ? (
              <Text style={{ padding: 20, textAlign: "center" }}>
                Loading logs...
              </Text>
            ) : logs.length === 0 ? (
              <Text style={{ padding: 20, textAlign: "center" }}>
                No logs found
              </Text>
            ) : (
              logs.map((item) => (
                <View
                  key={item.id}
                  style={{
                    borderWidth: 1,
                    borderColor: "#e5e7eb",
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ fontWeight: "bold", marginBottom: 4 }}>
                    {String(item.action || "Unknown Action")}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#475569",
                      marginBottom: 4,
                    }}
                  >
                    {String(item.description || item.details || "")}
                  </Text>
                  <Text
                    style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}
                  >
                    By:{" "}
                    {item.admin ? String(displayUser(item.admin)) : "System"}
                  </Text>
                  <Text style={{ fontSize: 11, color: "#94a3b8" }}>
                    {new Date(
                      item.timestamp || item.createdAt,
                    ).toLocaleString()}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const { width } = Dimensions.get("window");

const createStyles = (colors) =>
  StyleSheet.create({
    scrollContainer: { flex: 1, backgroundColor: colors.background },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      fontSize: 22,
      fontWeight: "bold",
      marginBottom: 12,
      paddingHorizontal: 16,
      paddingTop: 16,
      color: colors.textPrimary,
    },

    statsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginBottom: 12,
      gap: 8,
      paddingHorizontal: 16,
    },
    statCard: {
      flexBasis: width > 500 ? "18%" : "48%",
      minWidth: 100,
      borderRadius: 12,
      padding: 12,
      alignItems: "center",
      justifyContent: "center",
      elevation: 2,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statValue: { fontSize: 18, fontWeight: "bold", color: colors.primary },
    statLabel: { fontSize: 11, color: colors.textMuted },

    tabRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginBottom: 12,
      justifyContent: "flex-start",
      gap: 4,
      paddingHorizontal: 16,
    },
    tabButton: {
      flexGrow: 1,
      minWidth: 80,
      paddingVertical: 10,
      backgroundColor: colors.surface,
      borderRadius: 6,
      marginHorizontal: 2,
      marginBottom: 4,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    activeTab: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    tabText: { fontWeight: "600", fontSize: 12, color: colors.textSecondary },
    activeTabText: { color: "#fff" },

    sectionContainer: { flex: 1 },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "bold",
      marginBottom: 8,
      paddingHorizontal: 16,
      color: colors.textPrimary,
    },

    filterRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 8,
      flexWrap: "wrap",
    },
    filterLabel: { fontSize: 12, color: colors.textSecondary },
    inputBox: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      paddingHorizontal: 8,
      backgroundColor: colors.surface,
      color: colors.textPrimary,
    },
    filterBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 6,
      marginTop: 8,
      alignItems: "center",
    },

    userRow: {
      flexDirection: "row",
      padding: 12,
      borderBottomWidth: 1,
      borderColor: colors.border,
      marginHorizontal: 16,
      backgroundColor: colors.surface,
    },
    userRowSelected: { backgroundColor: colors.primary + "20" },
    checkbox: {
      width: 24,
      height: 24,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 12,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 4,
      backgroundColor: colors.surface,
    },

    bulkRow: { flexDirection: "row", marginTop: 8 },
    actionBtn: {
      padding: 12,
      borderRadius: 8,
      alignItems: "center",
      marginHorizontal: 4,
      marginBottom: 4,
    },
    actionText: { color: "#fff", fontWeight: "bold", fontSize: 12 },

    centered: { flex: 1, alignItems: "center", justifyContent: "center" },
    error: {
      color: colors.danger,
      fontWeight: "bold",
      marginBottom: 8,
      paddingHorizontal: 16,
    },
  });

export default AdminDashboardScreen;
