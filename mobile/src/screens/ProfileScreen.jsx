// Render a single post in the grid
const renderPostItem = ({ item }) => {
  const source = item.image
    ? { uri: item.image }
    : { uri: "https://placehold.co/300x300?text=Post" };
  return (
    <TouchableOpacity style={styles.gridItem} activeOpacity={0.8}>
      <Image source={source} style={styles.gridImage} />
    </TouchableOpacity>
  );
};
import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  Alert,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import * as ImagePicker from "expo-image-picker";
import { userService, uploadService, postService } from "../services/api";
import { ReviewSection } from "../components/ReviewSection";
import ReportModal from "../components/ReportModal";
import PhotoGallery from "../components/PhotoGallery";
import ActivityTimeline from "../components/ActivityTimeline";
import SocialLinks from "../components/SocialLinks";
import Achievements from "../components/Achievements";

const ProfileScreen = ({ route, navigation }) => {
  // Save profile changes
  const handleSave = async () => {
    if (!isOwnProfile) return;
    try {
      setSaving(true);
      const { data } = await userService.updateProfile(user.id, {
        name: name.trim(),
        bio: bio.trim(),
        profilePic: avatar.trim(),
      });
      await updateUser(data);
      Alert.alert("Saved", "Profile updated");
    } catch (e) {
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };
  // State for report modal
  const [reportModal, setReportModal] = useState({
    visible: false,
    targetType: "",
    targetId: null,
    targetName: "",
  });
  const { user, logout, updateUser } = useAuth();
  const { colors } = useTheme();
  const viewedUserId = route?.params?.userId;
  const isOwnProfile = !viewedUserId || viewedUserId === user?.id;

  const [viewedUser, setViewedUser] = useState(null);
  const [loading, setLoading] = useState(!isOwnProfile);
  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [avatar, setAvatar] = useState(user?.profilePic || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [followStatus, setFollowStatus] = useState({
    isFollowing: false,
  });
  const [activeTab, setActiveTab] = useState("Posts");
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Use user for own profile, viewedUser for others
  const displayUser = isOwnProfile ? user : viewedUser;

  // Fetch viewed user profile when viewing someone else's profile
  useEffect(() => {
    const fetchViewedUser = async () => {
      if (isOwnProfile || !viewedUserId) return;

      try {
        setLoading(true);
        const { data } = await userService.getProfile(viewedUserId);
        setViewedUser(data);

        // Also fetch follow status
        const followRes = await userService.getFollowStatus(viewedUserId);
        setFollowStatus({
          isFollowing:
            followRes.data?.isFollowing || followRes?.isFollowing || false,
        });
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        Alert.alert("Error", "Failed to load user profile");
      } finally {
        setLoading(false);
      }
    };

    fetchViewedUser();
  }, [viewedUserId, isOwnProfile]);

  // Fetch posts for the profile
  useEffect(() => {
    const fetchPosts = async () => {
      if (!displayUser?.id) return;
      try {
        setPostsLoading(true);
        setPostsError("");
        const { data } = await postService.getAllPosts("all");
        const mine = (data || []).filter((p) => p?.user?.id === displayUser.id);
        setPosts(mine);
      } catch (e) {
        setPostsError(e?.response?.data?.message || "Failed to load posts");
      } finally {
        setPostsLoading(false);
      }
    };
    fetchPosts();
  }, [displayUser?.id]);

  const handleFollowToggle = useCallback(async () => {
    if (isOwnProfile) return;
    try {
      setUpdating(true);
      const wasFollowing = followStatus.isFollowing;
      setFollowStatus((prev) => ({
        ...prev,
        isFollowing: !wasFollowing,
      }));
      setViewedUser((prev) => ({
        ...prev,
        followersCount: prev.followersCount + (wasFollowing ? -1 : 1),
      }));

      if (wasFollowing) {
        await userService.unfollow(viewedUserId);
      } else {
        await userService.follow(viewedUserId);
      }
    } catch (e) {
      setFollowStatus((prev) => ({
        ...prev,
        isFollowing: !followStatus.isFollowing,
      }));
      setViewedUser((prev) => ({
        ...prev,
      }));
      Alert.alert(
        "Error",
        e?.response?.data?.message || "Failed to update follow status"
      );
    } finally {
      setUpdating(false);
    }
  }, [isOwnProfile, viewedUserId, followStatus.isFollowing]);

  // Header for FlatList: profile info, stats, bio, tabs
  const ListHeaderComponent = useMemo(
    () => (
      <>
        {/* Top username bar */}
        {displayUser && (
          <View style={styles.topBar}>
            <Text style={[styles.topBarTitle, { color: colors.textPrimary }]}>
              {displayUser?.name || "Profile"}
            </Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => navigation.getParent()?.navigate("Settings")}
              >
                <Text style={{ color: colors.textPrimary }}>☰</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        <Image
          source={{
            uri:
              avatar ||
              displayUser?.profilePic ||
              "https://placehold.co/128x128?text=User",
          }}
          style={styles.avatar}
        />
        {/* Stats */}
        {displayUser && (
          <View style={styles.statsContainer}>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => {
                if (displayUser?.followersCount > 0) {
                  navigation.navigate("Followers", {
                    userId: displayUser.id,
                    userName: displayUser.name,
                  });
                }
              }}
            >
              <Text style={[styles.statCount, { color: colors.textPrimary }]}>
                {displayUser?.followersCount || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                Followers
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => {
                if (displayUser?.followingCount > 0) {
                  navigation.navigate("Following", {
                    userId: displayUser.id,
                    userName: displayUser.name,
                  });
                }
              }}
            >
              <Text style={[styles.statCount, { color: colors.textPrimary }]}>
                {displayUser?.followingCount || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                Following
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem}>
              <Text style={[styles.statCount, { color: colors.textPrimary }]}>
                {displayUser?.postsCount || posts.length || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                Posts
              </Text>
            </TouchableOpacity>
          </View>
        )}
        {/* Bio */}
        {!!bio && (
          <View style={{ width: "100%", marginTop: 4 }}>
            <Text style={{ color: colors.textPrimary }}>{bio}</Text>
          </View>
        )}
        {/* Tabs */}
        <View style={[styles.tabs, { borderColor: colors.border }]}>
          {["Posts", "About"].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabButton,
                activeTab === tab && styles.tabButtonActive,
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={{
                  color:
                    activeTab === tab ? colors.textPrimary : colors.textMuted,
                  fontWeight: "600",
                }}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* Action buttons (follow/report) */}
        {!isOwnProfile && displayUser && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={handleFollowToggle}
              disabled={updating}
              style={[
                styles.followButton,
                {
                  backgroundColor: followStatus.isFollowing
                    ? colors.surface
                    : colors.primary,
                  borderColor: colors.border,
                  borderWidth: followStatus.isFollowing ? 1 : 0,
                },
              ]}
            >
              <Text
                style={[
                  styles.followButtonText,
                  {
                    color: followStatus.isFollowing
                      ? colors.textPrimary
                      : "#fff",
                  },
                ]}
              >
                {updating
                  ? "Updating..."
                  : followStatus.isFollowing
                  ? "Following"
                  : "Follow"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.reportButton, { borderColor: colors.border }]}
              onPress={() =>
                setReportModal({
                  visible: true,
                  targetType: "User",
                  targetId: displayUser.id,
                  targetName: displayUser.name || "User",
                })
              }
            >
              <Text style={{ color: colors.textSecondary }}>🚩</Text>
            </TouchableOpacity>
          </View>
        )}
      </>
    ),
    [
      displayUser,
      avatar,
      bio,
      colors,
      activeTab,
      followStatus,
      updating,
      isOwnProfile,
      posts.length,
      navigation,
      handleFollowToggle,
    ]
  );

  // Footer for FlatList: About tab content and reviews
  const ListFooterComponent = useMemo(
    () =>
      activeTab === "About" ? (
        <>
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Name
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  color: colors.textPrimary,
                },
              ]}
              placeholderTextColor={colors.textMuted}
              editable={isOwnProfile}
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Bio
            </Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Tell something about you"
              style={[
                styles.input,
                styles.textarea,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  color: colors.textPrimary,
                },
              ]}
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              editable={isOwnProfile}
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Avatar URL
            </Text>
            <TextInput
              value={avatar}
              onChangeText={setAvatar}
              placeholder="https://..."
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  color: colors.textPrimary,
                },
              ]}
              placeholderTextColor={colors.textMuted}
              editable={isOwnProfile}
            />
          </View>
          {isOwnProfile && (
            <>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleSave}
                disabled={saving || uploading}
              >
                <Text style={[styles.buttonText, { color: "#fff" }]}>
                  {saving || uploading ? "Saving..." : "Save Profile"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.logoutButton,
                  { backgroundColor: colors.danger },
                ]}
                onPress={logout}
              >
                <Text style={[styles.buttonText, { color: "#fff" }]}>
                  Logout
                </Text>
              </TouchableOpacity>
            </>
          )}
          {displayUser && (
            <>
              <PhotoGallery 
                userId={displayUser.id} 
                isOwnProfile={isOwnProfile} 
              />
              <SocialLinks 
                userId={displayUser.id} 
                isOwnProfile={isOwnProfile} 
              />
              <Achievements userId={displayUser.id} />
              <ActivityTimeline activities={[]} />
              <ReviewSection
                userId={displayUser.id}
                currentUserId={user?.id}
                canReview={!!user?.id && user.id !== displayUser.id}
              />
            </>
          )}
        </>
      ) : null,
    [
      activeTab,
      name,
      bio,
      avatar,
      isOwnProfile,
      saving,
      uploading,
      colors,
      displayUser,
      user,
    ]
  );

  // FlatList data: posts for Posts tab, empty for About tab
  const flatListData = activeTab === "Posts" ? posts : [];

  const onRefresh = async () => {
    setRefreshing(true);
    if (!isOwnProfile && viewedUserId) {
      try {
        const { data } = await userService.getProfile(viewedUserId);
        setViewedUser(data);
        const followRes = await userService.getFollowStatus(viewedUserId);
        setFollowStatus({
          isFollowing:
            followRes.data?.isFollowing || followRes?.isFollowing || false,
        });
      } catch (error) {
        console.error("Failed to refresh profile:", error);
      }
    }
    if (activeTab === "Posts") {
      await fetchUserPosts();
    }
    setRefreshing(false);
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, flex: 1 },
      ]}
    >
      {!isOwnProfile && loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator color={colors.primary} size="large" />
          <Text
            style={[styles.title, { color: colors.textPrimary, marginTop: 16 }]}
          >
            Loading...
          </Text>
        </View>
      ) : postsLoading && activeTab === "Posts" ? (
        <View style={{ padding: 24 }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : postsError && activeTab === "Posts" ? (
        <View style={{ padding: 24 }}>
          <Text style={{ color: colors.danger }}>{postsError}</Text>
        </View>
      ) : (
        <FlatList
          data={flatListData}
          keyExtractor={(item) => item.id}
          numColumns={3}
          renderItem={renderPostItem}
          contentContainerStyle={{ paddingVertical: 8 }}
          ListHeaderComponent={ListHeaderComponent}
          ListFooterComponent={ListFooterComponent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}
      <ReportModal
        visible={reportModal.visible}
        onClose={() =>
          setReportModal({
            visible: false,
            targetType: "",
            targetId: null,
            targetName: "",
          })
        }
        targetType={reportModal.targetType}
        targetId={reportModal.targetId}
        targetName={reportModal.targetName}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 24,
  },
  topBar: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  avatar: { width: 140, height: 140, borderRadius: 70, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "700", color: "#1e293b" },
  sub: { fontSize: 14, color: "#475569", marginTop: 4 },
  formGroup: { width: "100%", marginTop: 12 },
  label: { fontSize: 14, fontWeight: "600", color: "#1f2937", marginBottom: 6 },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    color: "#111827",
  },
  textarea: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  uploadButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
    width: "100%",
  },
  followButton: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  followButtonText: {
    fontWeight: "600",
    fontSize: 14,
  },
  reportButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    paddingVertical: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  statItem: {
    alignItems: "center",
  },
  statCount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
  },
  statLabel: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 4,
  },
  saveButton: {
    marginTop: 20,
    backgroundColor: "#3b82f6",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
  },
  logoutButton: {
    marginTop: 12,
    backgroundColor: "#ef4444",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
  },
  tabs: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-around",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: "#eef2ff",
  },
  gridItem: {
    flex: 1,
    aspectRatio: 1,
    margin: 2,
    borderRadius: 8,
    overflow: "hidden",
  },
  gridImage: {
    width: "100%",
    height: "100%",
  },
  buttonText: { color: "#fff", fontWeight: "700" },
});

export default ProfileScreen;
