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

const FollowersScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const userId = route?.params?.userId;
  const userName = route?.params?.userName;

  const [followers, setFollowers] = useState([]);
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
    setFollowers([]);
    setFollowStatuses({});
    setNextCursor(null);
    setHasMore(false);
    await loadFollowers(true);
  };

  const loadFollowers = async (reset = false) => {
    try {
      setLoading(true);
      setError("");
      // Get followers list via dedicated endpoint, with cursor pagination
      const params = reset || !nextCursor ? {} : { cursor: nextCursor };
      const { data } = await userService.getFollowers(userId, params);
      const batch = data.followers || [];
      setFollowers((prev) => (reset ? batch : [...prev, ...batch]));
      setNextCursor(data.nextCursor || null);
      setHasMore(!!data.hasMore);

      // Load follow status for each follower
      if (batch.length && user?.id) {
        const results = await Promise.allSettled(
          batch.map((f) => userService.getFollowStatus(f.id))
        );
        const merged = {};
        results.forEach((res, idx) => {
          const id = batch[idx].id;
          if (res.status === "fulfilled") merged[id] = res.value;
        });
        setFollowStatuses((prev) => ({ ...prev, ...merged }));
      }
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load followers");
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!hasMore || loadingMore || loading) return;
    try {
      setLoadingMore(true);
      await loadFollowers(false);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleFollowToggle = async (followerId) => {
    try {
      const isFollowing = followStatuses[followerId]?.isFollowing;
      setFollowStatuses((prev) => ({
        ...prev,
        [followerId]: { ...prev[followerId], isFollowing: !isFollowing },
      }));

      if (isFollowing) {
        await userService.unfollow(followerId);
      } else {
        await userService.follow(followerId);
      }
    } catch (e) {
      setFollowStatuses((prev) => ({
        ...prev,
        [followerId]: {
          ...prev[followerId],
          isFollowing: !followStatuses[followerId]?.isFollowing,
        },
      }));
      Alert.alert(
        "Error",
        e?.response?.data?.message || "Failed to update follow status"
      );
    }
  };

  const renderFollower = ({ item }) => {
    const isFollowing = followStatuses[item.id]?.isFollowing;
    const isOwnProfile = item.id === user?.id;

    return (
      <View style={[styles.followerItem, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => {
            if (item.id !== user?.id) {
              navigation.push("ProfileMain", { userId: item.id });
            }
          }}
          style={styles.followerContent}
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
          {userName}'s Followers
        </Text>
      </View>

      {error && (
        <View style={[styles.error, { backgroundColor: "#fee" }]}>
          <Text style={{ color: "#c00" }}>{error}</Text>
        </View>
      )}

      {followers.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No followers yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={followers}
          keyExtractor={(item) => item.id}
          renderItem={renderFollower}
          scrollEnabled={true}
          refreshing={loading}
          onRefresh={loadFollowers}
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
  followerItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  followerContent: {
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

export default FollowersScreen;
