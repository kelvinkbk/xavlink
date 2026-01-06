import { useState, useEffect } from "react";
import PageTransition from "../components/PageTransition";
import LoadingSpinner from "../components/LoadingSpinner";
import SkeletonLoader from "../components/SkeletonLoader";
import ReportModal from "../components/ReportModal";
import { postService } from "../services/api";
import api from "../services/api";
import socket from "../services/socket";
// Removed direct Toast component usage; using useToast hook instead
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

function PostCard({ post, onLike, onComment, onReport, onDelete, onEdit }) {
  const { isAuthenticated, user } = useAuth();
  const { showToast } = useToast();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editPostContent, setEditPostContent] = useState(post.content);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState("");

  const defaultAvatar =
    "https://ui-avatars.com/api/?name=" +
    encodeURIComponent(post.user?.name || "User") +
    "&background=3b82f6&color=fff";

  const handleToggleComments = async () => {
    if (!showComments) {
      setLoadingComments(true);
      try {
        const { data } = await postService.getComments(post.id);
        setComments(data);
      } catch (e) {
        console.error("Error loading comments:", e);
      } finally {
        setLoadingComments(false);
      }
    }
    setShowComments(!showComments);
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const { data } = await postService.addComment(post.id, newComment.trim());
      setComments([...comments, data]);
      setNewComment("");
      onComment(post.id);
    } catch (e) {
      console.error("Error adding comment:", e);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <img
            src={post.user?.profilePic || defaultAvatar}
            alt={post.user?.name || "User"}
            className="w-12 h-12 rounded-full mr-3"
          />
          <div>
            <h3 className="font-semibold text-secondary">
              {post.user?.name || "Anonymous"}
            </h3>
            <p className="text-sm text-gray-500">{post.user?.course || ""}</p>
          </div>
        </div>
        {user && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="text-gray-500 hover:text-gray-700 text-xl px-2"
            >
              ⋮
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                {user.id === post.user?.id ? (
                  <>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setIsEditingPost(true);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-gray-50"
                    >
                      ✏️ Edit Post
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        if (
                          window.confirm(
                            "Are you sure you want to delete this post?"
                          )
                        ) {
                          onDelete(post.id);
                        }
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 border-t border-gray-100"
                    >
                      🗑️ Delete Post
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onReport(
                        post.id,
                        post.content?.substring(0, 50) + "..." || "Post"
                      );
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                  >
                    🚩 Report Post
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {post.image && (
        <img
          src={post.image}
          alt="post"
          className="w-full h-64 object-cover rounded-lg mb-3"
        />
      )}

      {isEditingPost ? (
        <div className="mb-3">
          <textarea
            value={editPostContent}
            onChange={(e) => setEditPostContent(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-900"
            rows="3"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={async () => {
                try {
                  await postService.updatePost(post.id, { content: editPostContent });
                  onEdit(post.id, editPostContent);
                  setIsEditingPost(false);
                  showToast("Post updated", "success");
                } catch (e) {
                  console.error("Error updating post:", e);
                  showToast("Failed to update post", "error");
                }
              }}
              className="px-4 py-1 bg-primary text-white rounded-lg hover:bg-blue-600"
            >
              Save
            </button>
            <button
              onClick={() => {
                setIsEditingPost(false);
                setEditPostContent(post.content);
              }}
              className="px-4 py-1 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-gray-700 mb-3">{post.content}</p>
      )}

      <div className="flex items-center gap-6 py-2 border-t border-gray-200">
        <button
          onClick={() => onLike(post.id)}
          disabled={!isAuthenticated}
          className={`flex items-center gap-2 ${
            post.isLiked ? "text-red-500" : "text-gray-600"
          } hover:text-red-500 transition ${
            !isAuthenticated ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <span className="text-xl">{post.isLiked ? "❤️" : "🤍"}</span>
          <span className="font-semibold">{post.likesCount || 0}</span>
        </button>

        <button
          onClick={handleToggleComments}
          className="flex items-center gap-2 text-gray-600 hover:text-primary transition"
        >
          <span className="text-xl">💬</span>
          <span className="font-semibold">{post.commentsCount || 0}</span>
        </button>
      </div>

      {showComments && (
        <div className="mt-4 border-t border-gray-200 pt-4">
          {loadingComments ? (
            <div className="flex justify-center py-4">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-2">
                    <img
                      src={
                        comment.user?.profilePic ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          comment.user?.name || "User"
                        )}&background=3b82f6&color=fff&size=32`
                      }
                      alt={comment.user?.name}
                      className="w-8 h-8 rounded-full flex-shrink-0"
                    />
                    <div className="flex-1">
                      {editingCommentId === comment.id ? (
                        <div>
                          <textarea
                            value={editCommentText}
                            onChange={(e) => setEditCommentText(e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            rows="2"
                          />
                          <div className="flex gap-2 mt-1">
                            <button
                              onClick={async () => {
                                try {
                                  await postService.updateComment(comment.id, { text: editCommentText });
                                  setComments(comments.map(c => 
                                    c.id === comment.id ? { ...c, text: editCommentText } : c
                                  ));
                                  setEditingCommentId(null);
                                  showToast("Comment updated", "success");
                                } catch (e) {
                                  console.error("Error updating comment:", e);
                                  showToast("Failed to update comment", "error");
                                }
                              }}
                              className="px-2 py-1 bg-primary text-white rounded text-xs hover:bg-blue-600"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingCommentId(null)}
                              className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm">
                            <span className="font-semibold text-secondary">
                              {comment.user?.name}
                            </span>{" "}
                            {comment.text}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </p>
                        </>
                      )}
                    </div>
                    {user && user.id === comment.user?.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setEditingCommentId(comment.id);
                            setEditCommentText(comment.text);
                          }}
                          className="text-gray-400 hover:text-blue-500 text-sm"
                          title="Edit comment"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={async () => {
                            if (window.confirm("Delete this comment?")) {
                              try {
                                await postService.deleteComment(comment.id);
                                setComments(comments.filter(c => c.id !== comment.id));
                                onComment(post.id, -1);
                                showToast("Comment deleted", "success");
                              } catch (e) {
                                console.error("Error deleting comment:", e);
                                showToast("Failed to delete comment", "error");
                              }
                            }
                          }}
                          className="text-gray-400 hover:text-red-500 text-sm"
                          title="Delete comment"
                        >
                          🗑️
                        </button>
                      </div>
                    ) : (
                      user && (
                        <button
                          onClick={() =>
                            onReport(
                              comment.id,
                              `Comment by ${comment.user?.name}`,
                              "Comment"
                            )
                          }
                          className="text-gray-400 hover:text-red-500 text-sm"
                          title="Report comment"
                        >
                          🚩
                        </button>
                      )
                    )}
                  </div>
                ))}
                {comments.length === 0 && (
                  <p className="text-center text-gray-500 text-sm">
                    No comments yet
                  </p>
                )}
              </div>

              {isAuthenticated && (
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-900"
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim()}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
                  >
                    Post
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-2">
        {new Date(post.createdAt).toLocaleDateString()}
      </p>
    </div>
  );
}

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newPost, setNewPost] = useState({ content: "", image: "" });
  const [posting, setPosting] = useState(false);
  const [likingPosts, setLikingPosts] = useState(new Set()); // Track which posts are being liked
  const [feedFilter, setFeedFilter] = useState("all");
  const { showToast } = useToast();
  const [reportModal, setReportModal] = useState({
    isOpen: false,
    targetId: "",
    targetName: "",
    targetType: "Post",
  });

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const { data } = await postService.getAllPosts(feedFilter);
        setPosts(data);
      } catch (e) {
        console.error("Error fetching posts:", e);
        setError("Failed to load posts");
        showToast("Failed to load posts", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedFilter]);

  // Listen for real-time like/unlike events
  useEffect(() => {
    // Ensure socket is connected
    if (!socket.connected) {
      console.log("🔌 Connecting socket for real-time updates");
      socket.connect();
    } else {
      console.log("✅ Socket already connected");
    }

    const handlePostLiked = ({ postId, likesCount }) => {
      console.log("❤️ Post liked real-time:", { postId, likesCount });
      setPosts((prevPosts) =>
        prevPosts.map((p) => (p.id === postId ? { ...p, likesCount } : p))
      );
    };

    const handlePostUnliked = ({ postId, likesCount }) => {
      console.log("🤍 Post unliked real-time:", { postId, likesCount });
      setPosts((prevPosts) =>
        prevPosts.map((p) => (p.id === postId ? { ...p, likesCount } : p))
      );
    };

    const handlePostDeleted = ({ postId }) => {
      console.log("🗑️ Post deleted real-time:", { postId });
      setPosts((prevPosts) => prevPosts.filter((p) => p.id !== postId));
    };

    socket.on("post_liked", handlePostLiked);
    socket.on("post_unliked", handlePostUnliked);
    socket.on("post_deleted", handlePostDeleted);

    console.log("📡 Real-time listeners registered");

    return () => {
      socket.off("post_liked", handlePostLiked);
      socket.off("post_unliked", handlePostUnliked);
      socket.off("post_deleted", handlePostDeleted);
    };
  }, []);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPost.content.trim()) return;

    setPosting(true);
    try {
      const { data } = await postService.createPost(newPost);
      setPosts([
        { ...data, likesCount: 0, commentsCount: 0, isLiked: false },
        ...posts,
      ]);
      setNewPost({ content: "", image: "" });
      setError("");
      showToast("Post created", "success");
    } catch (e) {
      console.error("Error creating post:", e);
      setError("Failed to create post");
      showToast("Failed to create post", "error");
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId) => {
    // Prevent duplicate requests
    if (likingPosts.has(postId)) return;

    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const wasLiked = post.isLiked;

    // Mark as liking in progress
    setLikingPosts(new Set(likingPosts).add(postId));

    // Optimistic update
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
        showToast("Unliked post", "success");
      } else {
        await postService.likePost(postId);
        showToast("Liked post", "success");
      }
      // Fire unread badge update event (best-effort)
      try {
        const userId = JSON.parse(localStorage.getItem("user"))?.id;
        if (userId) {
          const { data } = await api.get(
            `/notifications/${userId}/unread-count`
          );
          window.dispatchEvent(
            new CustomEvent("unread-updated", {
              detail: { unread: data.unreadCount },
            })
          );
        }
      } catch {
        // Silently ignore notification update errors
      }
    } catch (e) {
      console.error("Error toggling like:", e);
      showToast("Failed to update like", "error");
      // Revert on error
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
    } finally {
      // Remove from liking set
      setLikingPosts((prev) => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    }
  };

  const handleCommentAdded = (postId, countChange = 1) => {
    setPosts(
      posts.map((p) =>
        p.id === postId ? { ...p, commentsCount: p.commentsCount + countChange } : p
      )
    );
    if (countChange > 0) {
      showToast("Comment posted", "success");
    }
    // Update unread badge
    try {
      const userId = JSON.parse(localStorage.getItem("user"))?.id;
      if (userId) {
        api.get(`/notifications/${userId}/unread-count`).then(({ data }) =>
          window.dispatchEvent(
            new CustomEvent("unread-updated", {
              detail: { unread: data.unreadCount },
            })
          )
        );
      }
    } catch {
      // Silently ignore notification update errors
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      await postService.deletePost(postId);
      setPosts(posts.filter((p) => p.id !== postId));
      showToast("Post deleted", "success");
    } catch (e) {
      console.error("Error deleting post:", e);
      showToast("Failed to delete post", "error");
    }
  };

  const handleEditPost = (postId, newContent) => {
    setPosts(
      posts.map((p) => (p.id === postId ? { ...p, content: newContent } : p))
    );
  };

  if (loading)
    return (
      <PageTransition>
        <div className="max-w-2xl mx-auto py-8 px-4">
          <SkeletonLoader type="card" />
          <SkeletonLoader type="card" />
          <div className="flex justify-center py-6">
            <LoadingSpinner />
          </div>
        </div>
      </PageTransition>
    );

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto py-8 px-4">
        {/* Toasts are handled globally via ToastProvider/useToast */}
        <h1 className="text-3xl font-bold text-secondary mb-6">Campus Feed</h1>

        {/* Feed Filter Toggle */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFeedFilter("all")}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                feedFilter === "all"
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All Posts
            </button>
            <button
              onClick={() => setFeedFilter("following")}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                feedFilter === "following"
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Following
            </button>
          </div>
        </div>

        {/* Create Post Form */}
        <div
          className="bg-white rounded-lg shadow p-6 mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-lg font-semibold text-secondary mb-4">
            Create a Post
          </h2>
          <form onSubmit={handleCreatePost} className="space-y-4">
            <textarea
              value={newPost.content}
              onChange={(e) =>
                setNewPost({ ...newPost, content: e.target.value })
              }
              placeholder="What's on your mind?"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
              rows="3"
            />
            <input
              type="url"
              value={newPost.image}
              onChange={(e) =>
                setNewPost({ ...newPost, image: e.target.value })
              }
              placeholder="Image URL (optional)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <button
              type="submit"
              disabled={posting || !newPost.content.trim()}
              className="w-full bg-primary text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
            >
              {posting ? "Posting..." : "Post"}
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded mb-4 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => {
                setError("");
                setLoading(true);
                // re-run fetch for current filter
                (async () => {
                  try {
                    const { data } = await postService.getAllPosts(feedFilter);
                    setPosts(data);
                    showToast("Feed refreshed", "success");
                  } catch (e) {
                    console.error("Retry failed:", e);
                    setError("Failed to load posts");
                    showToast("Failed to load posts", "error");
                  } finally {
                    setLoading(false);
                  }
                })();
              }}
              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

        {posts.length === 0 ? (
          <div
            className="bg-white p-8 rounded-lg shadow text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="text-gray-500">
              No posts yet. Be the first to share!
            </p>
          </div>
        ) : (
          <div
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.1,
                },
              },
            }}
          >
            {posts.map((post) => (
              <div
                key={post.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
              >
                <PostCard
                  post={post}
                  onLike={handleLike}
                  onComment={handleCommentAdded}
                  onDelete={handleDeletePost}
                  onEdit={handleEditPost}
                  onReport={(postId, postName, type = "Post") =>
                    setReportModal({
                      isOpen: true,
                      targetId: postId,
                      targetName: postName,
                      targetType: type,
                    })
                  }
                />
              </div>
            ))}
          </div>
        )}

        <ReportModal
          isOpen={reportModal.isOpen}
          onClose={() =>
            setReportModal({
              isOpen: false,
              targetId: "",
              targetName: "",
              targetType: "Post",
            })
          }
          targetType={reportModal.targetType}
          targetId={reportModal.targetId}
          targetName={reportModal.targetName}
        />
      </div>
    </PageTransition>
  );
}
