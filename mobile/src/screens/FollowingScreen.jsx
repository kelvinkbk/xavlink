import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { userService } from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

const FollowingScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const userId = route?.params?.userId;
  const userName = route?.params?.userName;

  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [followStatuses, setFollowStatuses] = useState({});
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    resetAndLoad();
  }, [userId]);

  const resetAndLoad = async () => {
    setFollowing([]);
    setFollowStatuses({});
    setNextCursor(null);
    setHasMore(false);
    await loadFollowing(true);
  };

  const loadFollowing = async (reset = false) => {
    try {
      setLoading(true);
      setError("");
      // Get following list via dedicated endpoint with cursor pagination
      const params = reset || !nextCursor ? {} : { cursor: nextCursor };
      const { data } = await userService.getFollowing(userId, params);
      const batch = data.following || [];
      setFollowing((prev) => (reset ? batch : [...prev, ...batch]));
      setNextCursor(data.nextCursor || null);
      setHasMore(!!data.hasMore);

      // Load follow status for each following
      if (batch.length && user?.id) {
        const results = await Promise.allSettled(
          batch.map((u) => userService.getFollowStatus(u.id))
        );
        const merged = {};
        results.forEach((res, idx) => {
          const id = batch[idx].id;
          if (res.status === "fulfilled") merged[id] = res.value;
        });
        setFollowStatuses((prev) => ({ ...prev, ...merged }));
      }
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load following");
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!hasMore || loadingMore || loading) return;
    try {
      setLoadingMore(true);
      await loadFollowing(false);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleFollowToggle = async (followedUserId) => {
    try {
      const isFollowing = followStatuses[followedUserId]?.isFollowing;
      setFollowStatuses((prev) => ({
        ...prev,
        [followedUserId]: {
          ...prev[followedUserId],
          isFollowing: !isFollowing,
        },
      }));

      if (isFollowing) {
        await userService.unfollow(followedUserId);
      } else {
        await userService.follow(followedUserId);
      }
    } catch (e) {
      setFollowStatuses((prev) => ({
        ...prev,
        [followedUserId]: {
          ...prev[followedUserId],
          isFollowing: !followStatuses[followedUserId]?.isFollowing,
        },
      }));
      Alert.alert(
        "Error",
        e?.response?.data?.message || "Failed to update follow status"
      );
    }
  };

  const renderFollowingUser = ({ item }) => {
    const isFollowing = followStatuses[item.id]?.isFollowing;
    const isOwnProfile = item.id === user?.id;

    return (
      <View style={[styles.userItem, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => {
            if (item.id !== user?.id) {
              navigation.push("ProfileMain", { userId: item.id });
            }
          }}
          style={styles.userContent}
        >
          <Image
            source={{
              uri: item.profilePic || "https://placehold.co/64x64?text=User",
            }}
            style={styles.avatar}
          />
          <View style={styles.info}>
            <Text style={[styles.name, { color: colors.textPrimary }]}>
              {item.name}
            </Text>
            <Text style={[styles.email, { color: colors.textMuted }]}>
              {item.email}
            </Text>
          </View>
        </TouchableOpacity>

        {!isOwnProfile && (
          <TouchableOpacity
            onPress={() => handleFollowToggle(item.id)}
            style={[
              styles.followBtn,
              isFollowing
                ? {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: 1,
                  }
                : { backgroundColor: colors.primary },
            ]}
          >
            <Text
              style={[
                styles.followBtnText,
                { color: isFollowing ? colors.textPrimary : "#fff" },
              ]}
            >
              {isFollowing ? "Following" : "Follow"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backBtn, { color: colors.primary }]}>
            ← Back
          </Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {userName}'s Following
        </Text>
      </View>

      {error && (
        <View style={[styles.error, { backgroundColor: "#fee" }]}>
          <Text style={{ color: "#c00" }}>{error}</Text>
        </View>
      )}

      {following.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Not following anyone yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={following}
          keyExtractor={(item) => item.id}
          renderItem={renderFollowingUser}
          scrollEnabled={true}
          refreshing={loading}
          onRefresh={loadFollowing}
          onEndReached={loadMore}
          onEndReachedThreshold={0.6}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ padding: 16 }}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backBtn: {
    fontSize: 16,
    fontWeight: "600",
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
  },
  error: {
    padding: 12,
    backgroundColor: "#fee",
    borderRadius: 8,
    margin: 12,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  userContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
    backgroundColor: "#e5e7eb",
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1e293b",
  },
  email: {
    fontSize: 13,
    color: "#94a3b8",
    marginTop: 2,
  },
  followBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#3b82f6",
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#94a3b8",
  },
});

export default FollowingScreen;
