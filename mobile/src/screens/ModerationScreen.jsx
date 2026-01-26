import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import {
  moderationService,
  adminService,
  reportService,
} from "../services/api";
const ModerationScreen = () => {
  const { colors } = useTheme();
  const [tab, setTab] = useState("users");
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const loadStats = async () => {
    try {
      const data = await adminService.getStats();
      setStats(data);
    } catch (e) {
      console.error("Failed to load stats:", e);
    }
  };
  useEffect(() => {
    loadStats();
  }, []);
  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Moderation
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Manage users, content, and reports
          </Text>
        </View>
        {stats && (
          <View style={styles.statsGrid}>
            <View
              style={[styles.statCard, { backgroundColor: colors.surface }]}
            >
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {stats.totalUsers}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Total Users
              </Text>
            </View>
            <View
              style={[styles.statCard, { backgroundColor: colors.surface }]}
            >
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {stats.verifiedUsers}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Verified
              </Text>
            </View>
            <View
              style={[styles.statCard, { backgroundColor: colors.surface }]}
            >
              <Text style={[styles.statValue, { color: "#ef4444" }]}>
                {stats.suspendedUsers}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Suspended
              </Text>
            </View>
            <View
              style={[styles.statCard, { backgroundColor: colors.surface }]}
            >
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {stats.totalPosts}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Total Posts
              </Text>
            </View>
          </View>
        )}
        <View style={styles.tabs}>
          {["users", "reports"].map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={[
                styles.tab,
                tab === t && {
                  borderBottomWidth: 2,
                  borderBottomColor: colors.primary,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: tab === t ? colors.primary : colors.textSecondary,
                    fontWeight: tab === t ? "bold" : "normal",
                  },
                ]}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {tab === "users" && <UsersSection colors={colors} />}
        {tab === "reports" && <ReportsSection colors={colors} />}
      </ScrollView>
    </View>
  );
};
const UsersSection = ({ colors }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [suspended, setSuspended] = useState("");
  const [users, setUsers] = useState([]);
  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await moderationService.listUsers({
        search: search || undefined,
        suspended: suspended || undefined,
      });
      setUsers(data.users || []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [suspended]);
  const toggleSuspend = async (id, isSuspended, userName) => {
    Alert.alert(
      isSuspended ? "Unsuspend User" : "Suspend User",
      `Are you sure you want to ${
        isSuspended ? "unsuspend" : "suspend"
      } ${userName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isSuspended ? "Unsuspend" : "Suspend",
          style: isSuspended ? "default" : "destructive",
          onPress: async () => {
            try {
              await moderationService.setSuspended(id, !isSuspended);
              await load();
            } catch (e) {
              Alert.alert(
                "Error",
                e?.response?.data?.message || "Failed to update suspension",
              );
            }
          },
        },
      ],
    );
  };
  return (
    <View style={styles.section}>
      <View style={styles.filters}>
        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: colors.surface,
              color: colors.textPrimary,
              borderColor: colors.border,
            },
          ]}
          placeholder="Search name or email"
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={load}
        />
        <View style={styles.filterRow}>
          <TouchableOpacity
            onPress={() => setSuspended("")}
            style={[
              styles.filterBtn,
              {
                backgroundColor:
                  suspended === "" ? colors.primary : colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.filterBtnText,
                { color: suspended === "" ? "#fff" : colors.textPrimary },
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSuspended("false")}
            style={[
              styles.filterBtn,
              {
                backgroundColor:
                  suspended === "false" ? colors.primary : colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.filterBtnText,
                { color: suspended === "false" ? "#fff" : colors.textPrimary },
              ]}
            >
              Active
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSuspended("true")}
            style={[
              styles.filterBtn,
              {
                backgroundColor:
                  suspended === "true" ? colors.primary : colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.filterBtnText,
                { color: suspended === "true" ? "#fff" : colors.textPrimary },
              ]}
            >
              Suspended
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={load}
          style={[styles.refreshBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.refreshBtnText}>Refresh</Text>
        </TouchableOpacity>
      </View>
      {error ? (
        <Text style={[styles.errorText, { color: "#ef4444" }]}>{error}</Text>
      ) : null}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : users.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No users found
        </Text>
      ) : (
        <View style={styles.usersList}>
          {users.map((u) => (
            <View
              key={u.id}
              style={[
                styles.userCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.textPrimary }]}>
                  {u.name}
                </Text>
                <Text
                  style={[styles.userEmail, { color: colors.textSecondary }]}
                >
                  {u.email}
                </Text>
                <View style={styles.userMeta}>
                  <Text
                    style={[styles.userRole, { color: colors.textSecondary }]}
                  >
                    Role: {u.role}
                  </Text>
                  <Text
                    style={[
                      styles.userStatus,
                      { color: u.isSuspended ? "#ef4444" : "#10b981" },
                    ]}
                  >
                    {u.isSuspended ? "Suspended" : "Active"}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => toggleSuspend(u.id, u.isSuspended, u.name)}
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: u.isSuspended ? "#10b981" : "#ef4444",
                  },
                ]}
              >
                <Text style={styles.actionBtnText}>
                  {u.isSuspended ? "Unsuspend" : "Suspend"}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};
const ReportsSection = ({ colors }) => {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState("pending");
  const load = async () => {
    try {
      setLoading(true);
      const data = await reportService.getAll();
      let filtered = data.reports || [];
      if (filter === "pending") {
        filtered = filtered.filter((r) => r.status === "pending");
      } else if (filter === "resolved") {
        filtered = filtered.filter((r) => r.status === "resolved");
      }
      setReports(filtered);
    } catch (e) {
      console.error("Failed to load reports:", e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [filter]);
  const updateReport = async (id, status) => {
    try {
      await reportService.updateStatus(id, status);
      await load();
    } catch (e) {
      Alert.alert("Error", "Failed to update report");
    }
  };
  return (
    <View style={styles.section}>
      <View style={styles.filterRow}>
        <TouchableOpacity
          onPress={() => setFilter("all")}
          style={[
            styles.filterBtn,
            {
              backgroundColor:
                filter === "all" ? colors.primary : colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.filterBtnText,
              { color: filter === "all" ? "#fff" : colors.textPrimary },
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setFilter("pending")}
          style={[
            styles.filterBtn,
            {
              backgroundColor:
                filter === "pending" ? colors.primary : colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.filterBtnText,
              { color: filter === "pending" ? "#fff" : colors.textPrimary },
            ]}
          >
            Pending
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setFilter("resolved")}
          style={[
            styles.filterBtn,
            {
              backgroundColor:
                filter === "resolved" ? colors.primary : colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.filterBtnText,
              { color: filter === "resolved" ? "#fff" : colors.textPrimary },
            ]}
          >
            Resolved
          </Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : reports.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No reports found
        </Text>
      ) : (
        <View style={styles.reportsList}>
          {reports.map((r) => (
            <View
              key={r.id}
              style={[
                styles.reportCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.reportType, { color: colors.primary }]}>
                {r.type}
              </Text>
              <Text
                style={[styles.reportReason, { color: colors.textPrimary }]}
              >
                {r.reason}
              </Text>
              <Text
                style={[styles.reportMeta, { color: colors.textSecondary }]}
              >
                Reported by: {r.reporter?.name || "Unknown"}
              </Text>
              <Text
                style={[styles.reportMeta, { color: colors.textSecondary }]}
              >
                Status: {r.status}
              </Text>
              {r.status === "pending" && (
                <View style={styles.reportActions}>
                  <TouchableOpacity
                    onPress={() => updateReport(r.id, "resolved")}
                    style={[styles.reportBtn, { backgroundColor: "#10b981" }]}
                  >
                    <Text style={styles.reportBtnText}>Resolve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => updateReport(r.id, "dismissed")}
                    style={[
                      styles.reportBtn,
                      { backgroundColor: colors.textSecondary },
                    ]}
                  >
                    <Text style={styles.reportBtnText}>Dismiss</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 8,
    gap: 8,
  },
  statCard: {
    flex: 1,
    minWidth: "47%",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    marginTop: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  tabText: {
    fontSize: 16,
  },
  section: {
    padding: 16,
  },
  filters: {
    marginBottom: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
  },
  filterBtnText: {
    fontSize: 14,
  },
  refreshBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  refreshBtnText: {
    color: "#fff",
    fontWeight: "bold",
  },
  errorText: {
    marginBottom: 12,
    fontSize: 14,
  },
  emptyText: {
    textAlign: "center",
    marginVertical: 32,
    fontSize: 14,
  },
  usersList: {
    gap: 12,
  },
  userCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  userInfo: {
    marginBottom: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 8,
  },
  userMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  userRole: {
    fontSize: 12,
  },
  userStatus: {
    fontSize: 12,
    fontWeight: "bold",
  },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
  },
  actionBtnText: {
    color: "#fff",
    fontWeight: "bold",
  },
  reportsList: {
    gap: 12,
  },
  reportCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  reportType: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  reportReason: {
    fontSize: 14,
    marginBottom: 8,
  },
  reportMeta: {
    fontSize: 12,
    marginBottom: 4,
  },
  reportActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  reportBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  reportBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
});
export default ModerationScreen;
