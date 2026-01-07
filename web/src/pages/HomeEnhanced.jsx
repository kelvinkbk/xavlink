import { useState, useEffect, useCallback, useRef } from "react";
import PageTransition from "../components/PageTransition";
import LoadingSpinner from "../components/LoadingSpinner";
import SkeletonLoader from "../components/SkeletonLoader";
import ReportModal from "../components/ReportModal";
import { postService } from "../services/api";
import api from "../services/api";
import socket from "../services/socket";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

// =============== COMPONENTS ===============

// Rich text editor for enhanced post creation
function RichTextEditor({
  content,
  onChange,
  placeholder = "Write something...",
}) {
  const textareaRef = useRef(null);

  const applyFormatting = (format) => {
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    let newContent = content;
    let cursorPos = end;

    switch (format) {
      case "bold":
        newContent =
          content.substring(0, start) +
          `**${selectedText}**` +
          content.substring(end);
        cursorPos = end + 4;
        break;
      case "italic":
        newContent =
          content.substring(0, start) +
          `*${selectedText}*` +
          content.substring(end);
        cursorPos = end + 2;
        break;
      case "link":
        newContent =
          content.substring(0, start) +
          `[${selectedText}](url)` +
          content.substring(end);
        cursorPos = end + 6;
        break;
    }

    onChange(newContent);
    setTimeout(() => {
      textarea.selectionStart = cursorPos;
      textarea.selectionEnd = cursorPos;
      textarea.focus();
    }, 0);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-1 border-b pb-2">
        <button
          type="button"
          onClick={() => applyFormatting("bold")}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          title="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => applyFormatting("italic")}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          title="Italic"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => applyFormatting("link")}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          title="Link"
        >
          🔗
        </button>
      </div>
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-900 resize-none"
        rows="4"
      />
    </div>
  );
}

// Image gallery for displaying multiple images
function ImageGallery({ images, onRemove }) {
  if (!images || images.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-2">
      {images.map((img, idx) => (
        <div key={idx} className="relative group">
          <img
            src={img}
            alt={`upload-${idx}`}
            className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-80"
          />
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(idx)}
              className="absolute top-1 right-1 bg-red-500 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition"
            >
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// Tag input component
function TagInput({ tags, onTagsChange }) {
  const [inputValue, setInputValue] = useState("");

  const handleAddTag = (e) => {
    if ((e.key === "Enter" || e.key === ",") && inputValue.trim()) {
      e.preventDefault();
      const newTag = inputValue.trim().replace(/^#+/, ""); // Remove leading #
      if (!tags.includes(newTag)) {
        onTagsChange([...tags, newTag]);
      }
      setInputValue("");
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    onTagsChange(tags.filter((t) => t !== tagToRemove));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
          >
            #{tag}
            <button
              type="button"
              onClick={() => handleRemoveTag(tag)}
              className="cursor-pointer hover:text-red-600"
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleAddTag}
        placeholder="Add tags (press Enter)..."
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-900"
      />
    </div>
  );
}

// Share modal
function ShareModal({ postId, isOpen, onClose }) {
  if (!isOpen) return null;

  const shareLink = `${window.location.origin}/posts/${postId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    alert("Link copied to clipboard!");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 shadow-lg">
        <h3 className="text-lg font-semibold mb-4">Share Post</h3>
        <div className="space-y-3">
          <button
            onClick={handleCopyLink}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            📋 Copy Link
          </button>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: "XavLink Post", url: shareLink });
              }
            }}
            className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
          >
            📱 Share to App
          </button>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Post analytics view
function AnalyticsView({ analytics }) {
  if (!analytics) return null;

  return (
    <div className="grid grid-cols-4 gap-2 text-center text-sm bg-gray-50 p-3 rounded">
      <div>
        <p className="text-gray-600">Views</p>
        <p className="font-semibold">{analytics.viewsTotal || 0}</p>
      </div>
      <div>
        <p className="text-gray-600">Likes</p>
        <p className="font-semibold">{analytics.likesTotal || 0}</p>
      </div>
      <div>
        <p className="text-gray-600">Comments</p>
        <p className="font-semibold">{analytics.commentsTotal || 0}</p>
      </div>
      <div>
        <p className="text-gray-600">Shares</p>
        <p className="font-semibold">{analytics.sharesTotal || 0}</p>
      </div>
    </div>
  );
}

// Post card component (updated)
function PostCard({
  post,
  onLike,
  onComment,
  onReport,
  onDelete,
  onEdit,
  onBookmark,
  onPin,
}) {
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
  const [showShare, setShowShare] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analytics, setAnalytics] = useState(null);

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

  const handleViewAnalytics = async () => {
    if (!analytics) {
      try {
        const data = await postService.getPostAnalytics(post.id);
        setAnalytics(data);
      } catch (e) {
        console.error("Error loading analytics:", e);
      }
    }
    setShowAnalytics(!showAnalytics);
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

        <div className="flex items-center gap-2">
          {post.isPinned && <span className="text-yellow-500 text-lg">📌</span>}
          {post.viewCount > 0 && (
            <span className="text-gray-500 text-sm">👁️ {post.viewCount}</span>
          )}
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
                        className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                      >
                        ✏️ Edit
                      </button>
                      {user.role === "admin" && (
                        <button
                          onClick={() => {
                            onPin(post.id);
                            setShowMenu(false);
                          }}
                          className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                        >
                          {post.isPinned ? "📍 Unpin" : "📌 Pin"}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          onDelete(post.id);
                          setShowMenu(false);
                        }}
                        className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600"
                      >
                        🗑️ Delete
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        onReport(post.id, "Post", post.user?.name || "User");
                        setShowMenu(false);
                      }}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600"
                    >
                      🚩 Report
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Post Content */}
      {isEditingPost ? (
        <div className="mb-4 space-y-2">
          <textarea
            value={editPostContent}
            onChange={(e) => setEditPostContent(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-900"
          />
          <button
            onClick={async () => {
              try {
                await postService.updatePost(post.id, {
                  content: editPostContent,
                });
                onEdit(post.id, editPostContent);
                setIsEditingPost(false);
              } catch (e) {
                console.error("Error updating post:", e);
              }
            }}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition"
          >
            Save
          </button>
        </div>
      ) : (
        <>
          <p className="text-gray-800 mb-3">{post.content}</p>
          {post.images && post.images.length > 0 && (
            <ImageGallery images={post.images} />
          )}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {post.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs cursor-pointer hover:bg-blue-200"
                  title={`View posts tagged ${tag.tag}`}
                >
                  #{tag.tag}
                </span>
              ))}
            </div>
          )}
        </>
      )}

      {/* Analytics */}
      {showAnalytics && <AnalyticsView analytics={analytics} />}

      {/* Action Buttons */}
      <div className="flex gap-4 mt-4 py-3 border-t border-b border-gray-200">
        <button
          onClick={() => onLike(post.id)}
          className={`flex items-center gap-1 px-3 py-2 rounded-lg transition ${
            post.isLiked
              ? "bg-red-100 text-red-600"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          {post.isLiked ? "❤️" : "🤍"} {post.likesCount}
        </button>

        <button
          onClick={handleToggleComments}
          className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
        >
          💬 {post.commentsCount}
        </button>

        <button
          onClick={() => setShowShare(true)}
          className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
        >
          🔗 Share
        </button>

        {user && user.id === post.user?.id && (
          <button
            onClick={handleViewAnalytics}
            className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            📊 Analytics
          </button>
        )}

        <button
          onClick={() => onBookmark(post.id)}
          className={`flex items-center gap-1 px-3 py-2 rounded-lg transition ml-auto ${
            post.isBookmarked
              ? "bg-yellow-100 text-yellow-600"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          {post.isBookmarked ? "📑" : "📄"}
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-4 space-y-4">
          {loadingComments && (
            <p className="text-center text-gray-500">Loading comments...</p>
          )}
          {!loadingComments && (
            <>
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 pb-3 border-b">
                  <img
                    src={comment.user?.profilePic || defaultAvatar}
                    alt={comment.user?.name}
                    className="w-8 h-8 rounded-full"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">
                      {comment.user?.name}
                    </p>
                    <p className="text-gray-700 text-sm">{comment.text}</p>
                  </div>
                  {user && (
                    <button
                      onClick={() => {
                        onReport(
                          comment.id,
                          "Comment",
                          comment.user?.name || "User"
                        );
                      }}
                      className="text-gray-400 hover:text-red-500 text-sm"
                      title="Report comment"
                    >
                      🚩
                    </button>
                  )}
                </div>
              ))}
            </>
          )}

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
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        postId={post.id}
        isOpen={showShare}
        onClose={() => setShowShare(false)}
      />

      <p className="text-xs text-gray-400 mt-2">
        {new Date(post.createdAt).toLocaleDateString()}
      </p>
    </div>
  );
}

// Main Home component
export default function HomeEnhanced() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newPost, setNewPost] = useState({
    content: "",
    images: [],
    tags: [],
    templateType: "default",
  });
  const [posting, setPosting] = useState(false);
  const [likingPosts, setLikingPosts] = useState(new Set());
  const [feedFilter, setFeedFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [trendingTopics, setTrendingTopics] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [showDrafts, setShowDrafts] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [mutedKeywords, setMutedKeywords] = useState([]);
  const [newMuteKeyword, setNewMuteKeyword] = useState("");
  const { showToast } = useToast();
  const { user } = useAuth();

  const [reportModal, setReportModal] = useState({
    isOpen: false,
    targetId: "",
    targetName: "",
    targetType: "Post",
  });

  const observerRef = useRef();
  const lastPostRef = useCallback(
    (node) => {
      if (loadingMore) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !showBookmarks &&
          !showSearch &&
          !showDrafts
        ) {
          setCurrentPage((prev) => prev + 1);
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [loadingMore, hasMore, showBookmarks, showSearch, showDrafts]
  );

  // Fetch posts
  useEffect(() => {
    const fetchPosts = async () => {
      if (currentPage === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        const { data } = await postService.getAllPosts(
          feedFilter,
          sortBy,
          currentPage,
          10
        );

        // Filter out muted keywords
        const filteredPosts = data.posts.filter((post) => {
          const content = `${post.content} ${(post.tags || [])
            .map((t) => t.tag)
            .join(" ")}`.toLowerCase();
          return !mutedKeywords.some((m) =>
            content.includes(m.keyword.toLowerCase())
          );
        });

        if (currentPage === 1) {
          setPosts(filteredPosts);
        } else {
          setPosts((prev) => [...prev, ...filteredPosts]);
        }
        setHasMore(data.pagination.hasMore);
      } catch (e) {
        console.error("Error fetching posts:", e);
        setError("Failed to load posts");
        showToast("Failed to load posts", "error");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };

    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedFilter, sortBy, currentPage, mutedKeywords]);

  // Load trending topics and suggested users on mount
  useEffect(() => {
    const loadExtras = async () => {
      try {
        const trending = await postService.getTrendingTopics();
        setTrendingTopics(trending.trendingTopics || []);
      } catch (e) {
        console.error("Error loading trending topics:", e);
      }

      if (user) {
        try {
          const suggested = await postService.getSuggestedUsers(5);
          setSuggestedUsers(suggested);
        } catch (e) {
          console.error("Error loading suggested users:", e);
        }

        try {
          const mutes = await postService.getMutedKeywords();
          setMutedKeywords(mutes);
        } catch (e) {
          console.error("Error loading muted keywords:", e);
        }
      }
    };

    loadExtras();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Search
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const { data } = await postService.searchPosts(searchQuery);
      setSearchResults(data.posts);
      setShowSearch(true);
    } catch (e) {
      console.error("Error searching posts:", e);
      showToast("Search failed", "error");
    } finally {
      setLoading(false);
    }
  };

  // Load drafts
  const handleLoadDrafts = async () => {
    setLoading(true);
    try {
      const { data } = await postService.getDrafts(1, 50);
      setDrafts(data.drafts);
      setShowDrafts(true);
    } catch (e) {
      console.error("Error loading drafts:", e);
      showToast("Failed to load drafts", "error");
    } finally {
      setLoading(false);
    }
  };

  // Create post
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPost.content.trim()) return;

    setPosting(true);
    try {
      const { data } = await postService.createPost({
        content: newPost.content,
        images: newPost.images,
        templateType: newPost.templateType,
        richContent: newPost.content, // Store as richContent too
      });

      // Add tags if any
      if (newPost.tags.length > 0) {
        // Tags will be saved via the tag creation endpoint
        for (const tag of newPost.tags) {
          try {
            await api.post("/posts/tags", { postId: data.id, tag });
          } catch (e) {
            console.error("Error adding tag:", e);
          }
        }
      }

      setPosts([
        {
          ...data,
          likesCount: 0,
          commentsCount: 0,
          isLiked: false,
          tags: newPost.tags.map((t) => ({ tag: t })),
        },
        ...posts,
      ]);
      setNewPost({
        content: "",
        images: [],
        tags: [],
        templateType: "default",
      });
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

  // Like post
  const handleLike = async (postId) => {
    if (likingPosts.has(postId)) return;

    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const wasLiked = post.isLiked;

    setLikingPosts(new Set(likingPosts).add(postId));

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
    } catch (e) {
      console.error("Error toggling like:", e);
      showToast("Failed to update like", "error");
      // Revert
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
      setLikingPosts((prev) => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    }
  };

  // Handle comment
  const handleCommentAdded = (postId) => {
    setPosts(
      posts.map((p) =>
        p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p
      )
    );
    showToast("Comment posted", "success");
  };

  // Delete post
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

  // Edit post
  const handleEditPost = (postId, newContent) => {
    setPosts(
      posts.map((p) => (p.id === postId ? { ...p, content: newContent } : p))
    );
  };

  // Bookmark
  const handleBookmark = async (postId) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const wasBookmarked = post.isBookmarked;

    setPosts(
      posts.map((p) =>
        p.id === postId ? { ...p, isBookmarked: !wasBookmarked } : p
      )
    );

    try {
      if (wasBookmarked) {
        await postService.unbookmarkPost(postId);
        showToast("Bookmark removed", "success");
      } else {
        await postService.bookmarkPost(postId);
        showToast("Post bookmarked", "success");
      }
    } catch (e) {
      console.error("Error toggling bookmark:", e);
      showToast("Failed to update bookmark", "error");
      // Revert
      setPosts(
        posts.map((p) =>
          p.id === postId ? { ...p, isBookmarked: wasBookmarked } : p
        )
      );
    }
  };

  // Pin post
  const handlePin = async (postId) => {
    try {
      const post = posts.find((p) => p.id === postId);
      if (post.isPinned) {
        await postService.unpinPost(postId);
        setPosts(
          posts.map((p) => (p.id === postId ? { ...p, isPinned: false } : p))
        );
        showToast("Post unpinned", "success");
      } else {
        await postService.pinPost(postId);
        setPosts(
          posts.map((p) => (p.id === postId ? { ...p, isPinned: true } : p))
        );
        showToast("Post pinned", "success");
      }
    } catch (e) {
      console.error("Error pinning post:", e);
      showToast("Failed to pin post", "error");
    }
  };

  // Add muted keyword
  const handleAddMuteKeyword = async () => {
    if (!newMuteKeyword.trim()) return;

    try {
      await postService.addKeywordMute(newMuteKeyword);
      setMutedKeywords([...mutedKeywords, { keyword: newMuteKeyword }]);
      setNewMuteKeyword("");
      showToast("Keyword muted", "success");
    } catch (e) {
      console.error("Error muting keyword:", e);
      showToast("Failed to mute keyword", "error");
    }
  };

  if (loading && !showSearch && !showDrafts)
    return (
      <PageTransition>
        <div className="max-w-6xl mx-auto py-8 px-4">
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
      <div className="max-w-6xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold text-secondary mb-6">Campus Feed</h1>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Search posts..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition"
            >
              Search
            </button>
          </div>
        </form>

        <div className="grid grid-cols-4 gap-6">
          {/* Main Feed */}
          <div className="col-span-3">
            {/* Filter & Sort */}
            <div className="bg-white rounded-lg shadow p-4 mb-6 space-y-4">
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setShowBookmarks(false);
                    setShowSearch(false);
                    setShowDrafts(false);
                    setFeedFilter("all");
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    !showBookmarks &&
                    !showSearch &&
                    !showDrafts &&
                    feedFilter === "all"
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  🌍 All
                </button>
                <button
                  onClick={() => {
                    setShowBookmarks(false);
                    setShowSearch(false);
                    setShowDrafts(false);
                    setFeedFilter("following");
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    !showBookmarks &&
                    !showSearch &&
                    !showDrafts &&
                    feedFilter === "following"
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  👥 Following
                </button>
                <button
                  onClick={() => setShowBookmarks(true)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    showBookmarks
                      ? "bg-yellow-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  🔖 Bookmarks
                </button>
                <button
                  onClick={handleLoadDrafts}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    showDrafts
                      ? "bg-purple-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  📝 Drafts
                </button>
              </div>

              {!showBookmarks && !showSearch && !showDrafts && (
                <div className="flex gap-2 items-center">
                  <span className="text-sm text-gray-600 font-medium">
                    Sort:
                  </span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                  >
                    <option value="recent">📅 Recent</option>
                    <option value="trending">🔥 Trending</option>
                    <option value="most-liked">❤️ Liked</option>
                    <option value="most-commented">💬 Commented</option>
                  </select>
                </div>
              )}
            </div>

            {/* Create Post */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold text-secondary mb-4">
                Create a Post
              </h2>
              <form onSubmit={handleCreatePost} className="space-y-4">
                <RichTextEditor
                  content={newPost.content}
                  onChange={(content) => setNewPost({ ...newPost, content })}
                />

                <TagInput
                  tags={newPost.tags}
                  onTagsChange={(tags) => setNewPost({ ...newPost, tags })}
                />

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Template:
                  </label>
                  <select
                    value={newPost.templateType}
                    onChange={(e) =>
                      setNewPost({ ...newPost, templateType: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="default">📄 Default</option>
                    <option value="highlight">⭐ Highlight</option>
                    <option value="minimal">📱 Minimal</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={posting || !newPost.content.trim()}
                  className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
                >
                  {posting ? "Posting..." : "Post"}
                </button>
              </form>
            </div>

            {/* Posts Feed */}
            <div>
              {showSearch && (
                <>
                  <h3 className="text-lg font-semibold mb-4">
                    Search results for "{searchQuery}" ({searchResults.length})
                  </h3>
                  {searchResults.map((post, idx) => (
                    <div
                      key={post.id}
                      ref={
                        idx === searchResults.length - 1 ? lastPostRef : null
                      }
                    >
                      <PostCard
                        post={post}
                        onLike={handleLike}
                        onComment={handleCommentAdded}
                        onReport={(id, type, name) =>
                          setReportModal({
                            isOpen: true,
                            targetId: id,
                            targetType: type,
                            targetName: name,
                          })
                        }
                        onDelete={handleDeletePost}
                        onEdit={handleEditPost}
                        onBookmark={handleBookmark}
                        onPin={handlePin}
                      />
                    </div>
                  ))}
                </>
              )}

              {showDrafts && (
                <>
                  <h3 className="text-lg font-semibold mb-4">
                    Your Drafts ({drafts.length})
                  </h3>
                  {drafts.map((draft) => (
                    <div
                      key={draft.id}
                      className="bg-white rounded-lg shadow p-4 mb-4 border-l-4 border-purple-500"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-secondary">Draft</h4>
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                await postService.publishDraft(draft.id);
                                setDrafts(
                                  drafts.filter((d) => d.id !== draft.id)
                                );
                                showToast("Draft published", "success");
                              } catch (e) {
                                showToast("Failed to publish draft", "error");
                              }
                            }}
                            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                          >
                            Publish
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await postService.deleteDraft(draft.id);
                                setDrafts(
                                  drafts.filter((d) => d.id !== draft.id)
                                );
                                showToast("Draft deleted", "success");
                              } catch (e) {
                                showToast("Failed to delete draft", "error");
                              }
                            }}
                            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <p className="text-gray-700">{draft.content}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        Saved: {new Date(draft.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </>
              )}

              {!showSearch && !showDrafts && (
                <>
                  {posts.map((post, idx) => (
                    <div
                      key={post.id}
                      ref={idx === posts.length - 1 ? lastPostRef : null}
                    >
                      <PostCard
                        post={post}
                        onLike={handleLike}
                        onComment={handleCommentAdded}
                        onReport={(id, type, name) =>
                          setReportModal({
                            isOpen: true,
                            targetId: id,
                            targetType: type,
                            targetName: name,
                          })
                        }
                        onDelete={handleDeletePost}
                        onEdit={handleEditPost}
                        onBookmark={handleBookmark}
                        onPin={handlePin}
                      />
                    </div>
                  ))}

                  {loadingMore && (
                    <div className="flex justify-center py-4">
                      <LoadingSpinner />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="col-span-1 space-y-6">
            {/* Trending Topics */}
            {trendingTopics.length > 0 && (
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-lg font-semibold mb-4">
                  🔥 Trending Topics
                </h3>
                <div className="space-y-2">
                  {trendingTopics.slice(0, 5).map((topic) => (
                    <button
                      key={topic.tag}
                      onClick={() => {
                        setSearchQuery(`#${topic.tag}`);
                        setSearchResults([]);
                        setShowSearch(true);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded"
                    >
                      <p className="font-medium text-sm">#{topic.tag}</p>
                      <p className="text-xs text-gray-500">
                        {topic.count} posts
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Users */}
            {suggestedUsers.length > 0 && (
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-lg font-semibold mb-4">
                  👥 Suggested Users
                </h3>
                <div className="space-y-3">
                  {suggestedUsers.slice(0, 5).map((suggestedUser) => (
                    <div
                      key={suggestedUser.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <img
                          src={
                            suggestedUser.profilePic ||
                            `https://ui-avatars.com/api/?name=${suggestedUser.name}`
                          }
                          alt={suggestedUser.name}
                          className="w-8 h-8 rounded-full"
                        />
                        <div>
                          <p className="text-sm font-medium">
                            {suggestedUser.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {suggestedUser._count?.followers} followers
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Keyword Mute */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-semibold mb-4">🔇 Mute Keywords</h3>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMuteKeyword}
                    onChange={(e) => setNewMuteKeyword(e.target.value)}
                    placeholder="Add keyword..."
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                  <button
                    onClick={handleAddMuteKeyword}
                    className="px-3 py-1 bg-primary text-white rounded text-sm hover:bg-blue-600"
                  >
                    Add
                  </button>
                </div>
                <div className="space-y-1">
                  {mutedKeywords.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between bg-gray-100 px-2 py-1 rounded text-sm"
                    >
                      <span>{m.keyword}</span>
                      <button
                        onClick={async () => {
                          try {
                            await postService.removeKeywordMute(m.id);
                            setMutedKeywords(
                              mutedKeywords.filter((kw) => kw.id !== m.id)
                            );
                            showToast("Keyword unmuted", "success");
                          } catch (e) {
                            showToast("Failed to unmute keyword", "error");
                          }
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Report Modal */}
        <ReportModal
          isOpen={reportModal.isOpen}
          targetId={reportModal.targetId}
          targetName={reportModal.targetName}
          targetType={reportModal.targetType}
          onClose={() => setReportModal({ ...reportModal, isOpen: false })}
        />
      </div>
    </PageTransition>
  );
}
