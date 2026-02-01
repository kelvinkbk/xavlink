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
import { useSyncContext } from "../context/SyncContext";
import {
  userService,
  uploadService,
  postService,
  skillService,
  enhancementService,
} from "../services/api";
import { ReviewSection } from "../components/ReviewSection";
import ReportModal from "../components/ReportModal";
import PhotoGallery from "../components/PhotoGallery";
import ActivityTimeline from "../components/ActivityTimeline";
import SocialLinks from "../components/SocialLinks";
import Achievements from "../components/Achievements";

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

const ProfileScreen = ({ route, navigation }) => {
  const { user, logout, updateUser } = useAuth();
  const { colors } = useTheme();
  const viewedUserId = route?.params?.userId;
  const isOwnProfile = !viewedUserId || viewedUserId === user?.id;
  // State for report modal
  const [reportModal, setReportModal] = useState({
    visible: false,
    targetType: "",
    targetId: null,
    targetName: "",
  });

  const [viewedUser, setViewedUser] = useState(null);
  const [loading, setLoading] = useState(!isOwnProfile);
  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [course, setCourse] = useState(user?.course || "");
  const [year, setYear] = useState(user?.year || "");
  const [avatar, setAvatar] = useState(user?.profilePic || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [followStatus, setFollowStatus] = useState({
    isFollowing: false,
    followsYou: false,
  });
  const [skills, setSkills] = useState([]);
  const [activeTab, setActiveTab] = useState("Posts");
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Use user for own profile, viewedUser for others
  const displayUser = isOwnProfile ? user : viewedUser;

  // Real-time sync
  const { syncEvents } = useSyncContext();

  useEffect(() => {
    if (
      syncEvents.userUpdated &&
      syncEvents.userUpdated.userId === displayUser?.id
    ) {
      if (isOwnProfile) {
        updateUser({ ...user, ...syncEvents.userUpdated.updates });
      } else {
        setViewedUser((prev) => ({
          ...prev,
          ...syncEvents.userUpdated.updates,
        }));
      }
    }
  }, [syncEvents.userUpdated]);

  useEffect(() => {
    if (!displayUser?.id) return;

    if (syncEvents.userFollowed) {
      if (syncEvents.userFollowed.followingId === displayUser.id) {
        // Person being viewed gained a follower
        setViewedUser((prev) =>
          prev
            ? { ...prev, followersCount: (prev.followersCount || 0) + 1 }
            : prev,
        );
        if (isOwnProfile)
          updateUser({
            ...user,
            followersCount: (user.followersCount || 0) + 1,
          });
      }
      if (syncEvents.userFollowed.followerId === displayUser.id) {
        // Person being viewed followed someone
        setViewedUser((prev) =>
          prev
            ? { ...prev, followingCount: (prev.followingCount || 0) + 1 }
            : prev,
        );
        if (isOwnProfile)
          updateUser({
            ...user,
            followingCount: (user.followingCount || 0) + 1,
          });
      }
    }
  }, [syncEvents.userFollowed]);

  useEffect(() => {
    if (!displayUser?.id) return;

    if (syncEvents.userUnfollowed) {
      if (syncEvents.userUnfollowed.followingId === displayUser.id) {
        // Person being viewed lost a follower
        setViewedUser((prev) =>
          prev
            ? {
                ...prev,
                followersCount: Math.max(0, (prev.followersCount || 0) - 1),
              }
            : prev,
        );
        if (isOwnProfile)
          updateUser({
            ...user,
            followersCount: Math.max(0, (user.followersCount || 0) - 1),
          });
      }
      if (syncEvents.userUnfollowed.followerId === displayUser.id) {
        // Person being viewed unfollowed someone
        setViewedUser((prev) =>
          prev
            ? {
                ...prev,
                followingCount: Math.max(0, (prev.followingCount || 0) - 1),
              }
            : prev,
        );
        if (isOwnProfile)
          updateUser({
            ...user,
            followingCount: Math.max(0, (user.followingCount || 0) - 1),
          });
      }
    }
  }, [syncEvents.userUnfollowed]);

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
          followsYou:
            followRes.data?.followsYou || followRes?.followsYou || false,
        });

        // Track profile view
        if (user?.id && user.id !== viewedUserId) {
          try {
            await enhancementService.trackProfileView(viewedUserId);
          } catch (err) {
            console.error("Failed to track profile view:", err);
          }
        }

        // Fetch user's skills
        try {
          const { data: skillsData } =
            await skillService.getSkillsByUser(viewedUserId);
          setSkills(skillsData || []);
        } catch (err) {
          console.error("Failed to fetch skills:", err);
        }
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
  const fetchUserPosts = async () => {
    if (!displayUser?.id) return;
    try {
      setPostsLoading(true);
      setPostsError("");
      const { data } = await postService.getAllPosts("all");
      // Handle both array and object with posts property
      const postsList = Array.isArray(data) ? data : data?.posts || [];
      const mine = postsList.filter((p) => p?.user?.id === displayUser.id);
      setPosts(mine);
    } catch (e) {
      console.error("Failed to fetch posts:", e);
      setPostsError(e?.response?.data?.message || "Failed to load posts");
    } finally {
      setPostsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserPosts();
  }, [displayUser?.id]);

  // Fetch skills for own profile
  useEffect(() => {
    const fetchSkills = async () => {
      if (isOwnProfile && user?.id) {
        try {
          const { data: skillsData } = await skillService.getSkillsByUser(
            user.id,
          );
          setSkills(skillsData || []);
        } catch (err) {
          console.error("Failed to fetch skills:", err);
        }
      }
    };
    fetchSkills();
  }, [isOwnProfile, user?.id]);

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
        e?.response?.data?.message || "Failed to update follow status",
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
              <TouchableOpacity onPress={() => navigation.navigate("Menu")}>
                <Text style={{ color: colors.textPrimary, fontSize: 20 }}>
                  ☰
                </Text>
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
                {String(displayUser?.followersCount || 0)}
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
                {String(displayUser?.followingCount || 0)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                Following
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem}>
              <Text style={[styles.statCount, { color: colors.textPrimary }]}>
                {String(displayUser?.postsCount || posts.length || 0)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                Posts
              </Text>
            </TouchableOpacity>
          </View>
        )}
        {/* Email and verification */}
        {displayUser?.email && (
          <Text style={[styles.email, { color: colors.textMuted }]}>
            {displayUser.email}
          </Text>
        )}
        {displayUser?.emailVerified && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>✓ Verified Account</Text>
          </View>
        )}
        {/* Course and Year */}
        {(displayUser?.course || displayUser?.year) && (
          <View style={{ width: "100%", marginTop: 4 }}>
            {displayUser?.course && (
              <Text style={{ color: colors.textSecondary }}>
                {displayUser.course}
              </Text>
            )}
            {displayUser?.year && (
              <Text style={{ color: colors.textSecondary }}>
                Year {displayUser.year}
              </Text>
            )}
          </View>
        )}
        {/* Follows you indicator */}
        {!isOwnProfile && followStatus.followsYou && (
          <View style={styles.followsYouBadge}>
            <Text style={styles.followsYouText}>Follows you</Text>
          </View>
        )}
        {/* Bio */}
        {!!(bio || displayUser?.bio) && (
          <View style={{ width: "100%", marginTop: 8 }}>
            <Text style={{ color: colors.textPrimary }}>
              {bio || displayUser?.bio}
            </Text>
          </View>
        )}
        {/* Skills Section */}
        {skills.length > 0 && (
          <View style={styles.skillsContainer}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              💼 Skills
            </Text>
            <View style={styles.skillsList}>
              {skills.map((skill) => (
                <View
                  key={skill.id}
                  style={[
                    styles.skillTag,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={{ color: colors.textPrimary }}>
                    {skill.title}
                  </Text>
                </View>
              ))}
            </View>
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
      skills,
      navigation,
      handleFollowToggle,
    ],
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
              Course
            </Text>
            <TextInput
              value={course}
              onChangeText={setCourse}
              placeholder="Your course"
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
              Year
            </Text>
            <TextInput
              value={year}
              onChangeText={setYear}
              placeholder="Your year"
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
      course,
      year,
      avatar,
      isOwnProfile,
      saving,
      uploading,
      colors,
      displayUser,
      user,
    ],
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
          followsYou:
            followRes.data?.followsYou || followRes?.followsYou || false,
        });
        // Refresh skills
        try {
          const { data: skillsData } =
            await skillService.getSkillsByUser(viewedUserId);
          setSkills(skillsData || []);
        } catch (err) {
          console.error("Failed to refresh skills:", err);
        }
      } catch (error) {
        console.error("Failed to refresh profile:", error);
      }
    } else if (isOwnProfile && user?.id) {
      // Refresh own skills
      try {
        const { data: skillsData } = await skillService.getSkillsByUser(
          user.id,
        );
        setSkills(skillsData || []);
      } catch (err) {
        console.error("Failed to refresh skills:", err);
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
      ) : isOwnProfile && !user ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <Text
            style={[
              styles.title,
              {
                color: colors.textPrimary,
                textAlign: "center",
                marginBottom: 12,
              },
            ]}
          >
            Session Expired or Corrupted
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              textAlign: "center",
              marginBottom: 24,
            }}
          >
            We couldn't load your profile data. Please login again.
          </Text>
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: colors.danger, width: "100%" },
            ]}
            onPress={logout}
          >
            <Text style={[styles.buttonText, { color: "#fff" }]}>Logout</Text>
          </TouchableOpacity>
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
  email: {
    fontSize: 14,
    color: "#94a3b8",
    marginTop: 4,
  },
  verifiedBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#dcfce7",
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  verifiedText: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "600",
  },
  followsYouBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#e5e7eb",
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  followsYouText: {
    color: "#374151",
    fontSize: 12,
    fontWeight: "600",
  },
  skillsContainer: {
    width: "100%",
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  skillsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  skillTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: "#e0e7ff",
  },
});

export default ProfileScreen;
