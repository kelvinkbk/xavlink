import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Image,
  Animated,
  ActionSheetIOS,
  Platform,
  Alert,
} from "react-native";
import { postService } from "../services/api";
import { useTheme } from "../context/ThemeContext";
import {
  useFadeInAnimation,
  useScalePressAnimation,
} from "../utils/animations";
import ReportModal from "../components/ReportModal";

const PostCard = ({ post, onLike, onComment, onReport, onReportComment }) => {
  const { colors } = useTheme();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const fadeAnim = useFadeInAnimation(400);
  const {
    scaleAnim: likeScale,
    onPressIn: onLikePressIn,
    onPressOut: onLikePressOut,
  } = useScalePressAnimation();

  const handleToggleComments = async () => {
    if (!showComments) {
      setLoadingComments(true);
      try {
        const { data } = await postService.getComments(post.id);
        setComments(data);
      } catch (e) {
        console.warn("Error loading comments:", e);
      } finally {
        setLoadingComments(false);
      }
    }
    setShowComments(!showComments);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      const { data } = await postService.addComment(post.id, newComment.trim());
      setComments([...comments, data]);
      setNewComment("");
      onComment(post.id);
    } catch (e) {
      console.warn("Error adding comment:", e);
    }
  };

  const handlePostMenu = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Report Post"],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 1,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            onReport(post);
          }
        }
      );
    } else {
      Alert.alert("Post Options", "What would you like to do?", [
        {
          text: "Report Post",
          onPress: () => onReport(post),
          style: "destructive",
        },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  return (
    <Animated.View
      style={[
        styles.card,
        { backgroundColor: colors.surface, opacity: fadeAnim },
      ]}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            {post.user?.name || "Student"}
          </Text>
          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
            {post.user?.course}
          </Text>
        </View>
        <TouchableOpacity onPress={handlePostMenu}>
          <Text style={[styles.menuDots, { color: colors.textSecondary }]}>
            ⋮
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.cardBody, { color: colors.textPrimary }]}>
        {post.content}
      </Text>
      {post.image && (
        <Image
          source={{ uri: post.image }}
          style={styles.postImage}
          resizeMode="cover"
        />
      )}
      {post.createdAt && (
        <Text style={[styles.cardFoot, { color: colors.textMuted }]}>
          {new Date(post.createdAt).toLocaleString()}
        </Text>
      )}

      <View style={[styles.actions, { borderTopColor: colors.border }]}>
        <Animated.View style={[{ transform: [{ scale: likeScale }] }]}>
          <TouchableOpacity
            onPress={() => onLike(post.id)}
            onPressIn={onLikePressIn}
            onPressOut={onLikePressOut}
            style={styles.actionBtn}
          >
            <Text style={[styles.actionText, { color: colors.textSecondary }]}>
              {post.isLiked ? "❤️" : "🤍"} {post.likesCount || 0}
            </Text>
          </TouchableOpacity>
        </Animated.View>
        <TouchableOpacity
          onPress={handleToggleComments}
          style={styles.actionBtn}
        >
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>
            💬 {post.commentsCount || 0}
          </Text>
        </TouchableOpacity>
      </View>

      {showComments && (
        <View style={styles.commentsSection}>
          {loadingComments ? (
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading...
            </Text>
          ) : (
            comments.map((comment) => (
              <View key={comment.id} style={styles.comment}>
                <View style={styles.commentHeader}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.commentUser,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {comment.user?.name}
                    </Text>
                    <Text
                      style={[
                        styles.commentText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {comment.text}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => onReportComment(comment, post)}
                  >
                    <Text
                      style={[styles.reportFlag, { color: colors.textMuted }]}
                    >
                      🚩
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
          <View style={styles.commentInput}>
            <TextInput
              value={newComment}
              onChangeText={setNewComment}
              placeholder="Add a comment..."
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  color: colors.textPrimary,
                },
              ]}
              placeholderTextColor={colors.textMuted}
            />
            <TouchableOpacity
              onPress={handleAddComment}
              style={[styles.sendBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.sendText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Animated.View>
  );
};

const HomeScreen = () => {
  const { colors } = useTheme();
  const [posts, setPosts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [feedFilter, setFeedFilter] = useState("all");
  const [reportModal, setReportModal] = useState({
    visible: false,
    targetType: "",
    targetId: null,
    targetName: "",
  });
  const fadeAnim = useFadeInAnimation(500);

  const load = async () => {
    setRefreshing(true);
    try {
      const { data } = await postService.getAllPosts(feedFilter);
      setPosts(data);
    } catch (e) {
      console.warn("Failed to load posts", e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, [feedFilter]);

  const handleLike = async (postId) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const wasLiked = post.isLiked;
    setPosts(
      posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              isLiked: !wasLiked,
              likesCount: p.likesCount + (wasLiked ? -1 : 1),
            }
          : p
      )
    );

    try {
      if (wasLiked) {
        await postService.unlikePost(postId);
      } else {
        await postService.likePost(postId);
      }
    } catch (e) {
      setPosts(
        posts.map((p) =>
          p.id === postId
            ? {
                ...p,
                isLiked: wasLiked,
                likesCount: p.likesCount + (wasLiked ? 1 : -1),
              }
            : p
        )
      );
    }
  };

  const handleComment = (postId) => {
    setPosts(
      posts.map((p) =>
        p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p
      )
    );
  };

  const handleReportPost = (post) => {
    setReportModal({
      visible: true,
      targetType: "Post",
      targetId: post.id,
      targetName: post.content.substring(0, 50) + "...",
    });
  };

  const handleReportComment = (comment, post) => {
    setReportModal({
      visible: true,
      targetType: "Comment",
      targetId: comment.id,
      targetName: `Comment by ${comment.user?.name || "User"}`,
    });
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: colors.background, opacity: fadeAnim },
      ]}
    >
      <View
        style={[styles.filterContainer, { backgroundColor: colors.surface }]}
      >
        <TouchableOpacity
          onPress={() => setFeedFilter("all")}
          style={[
            styles.filterBtn,
            { backgroundColor: colors.surface },
            feedFilter === "all" && { backgroundColor: colors.primary },
          ]}
        >
          <Text
            style={[
              styles.filterText,
              { color: colors.textSecondary },
              feedFilter === "all" && { color: "#fff" },
            ]}
          >
            All Posts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setFeedFilter("following")}
          style={[
            styles.filterBtn,
            { backgroundColor: colors.surface },
            feedFilter === "following" && { backgroundColor: colors.primary },
          ]}
        >
          <Text
            style={[
              styles.filterText,
              { color: colors.textSecondary },
              feedFilter === "following" && { color: "#fff" },
            ]}
          >
            Following
          </Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={posts}
        keyExtractor={(item, index) => item.id || `post-${index}`}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onLike={handleLike}
            onComment={handleComment}
            onReport={handleReportPost}
            onReportComment={handleReportComment}
          />
        )}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={load} />
        }
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            No posts yet.
          </Text>
        }
      />
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
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  filterContainer: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: "#fff",
    gap: 8,
  },
  filterBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
  },
  filterBtnActive: {
    backgroundColor: "#3b82f6",
  },
  filterText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  filterTextActive: {
    color: "#fff",
  },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  menuDots: {
    fontSize: 20,
    fontWeight: "700",
    paddingHorizontal: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  cardSub: { fontSize: 12, color: "#64748b", marginBottom: 4 },
  cardBody: { fontSize: 14, color: "#334155", marginBottom: 8 },
  cardFoot: { fontSize: 12, color: "#94a3b8", marginBottom: 8 },
  actions: {
    flexDirection: "row",
    gap: 16,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  postImage: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    marginTop: 8,
    backgroundColor: "#e5e7eb",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionText: {
    fontSize: 14,
    color: "#64748b",
  },
  commentsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  comment: {
    marginBottom: 8,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  reportFlag: {
    fontSize: 16,
    paddingLeft: 8,
  },
  commentUser: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1e293b",
  },
  commentText: {
    fontSize: 13,
    color: "#334155",
  },
  commentInput: {
    flexDirection: "row",
    marginTop: 8,
    gap: 8,
  },
  input: {
    flex: 1,
    padding: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    fontSize: 13,
  },
  sendBtn: {
    padding: 8,
    backgroundColor: "#3b82f6",
    borderRadius: 8,
    justifyContent: "center",
  },
  sendText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  loadingText: {
    textAlign: "center",
    color: "#64748b",
    fontSize: 13,
  },
  empty: { textAlign: "center", marginTop: 32, color: "#64748b" },
});

export default HomeScreen;
