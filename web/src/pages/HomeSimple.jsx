import { useState, useEffect } from "react";
import { useToast } from "../context/ToastContext";
import CreatePostModal from "../components/CreatePostModal";
import axios from "axios";
import { socket } from "../services/socket";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Helper to convert relative URLs to absolute based on API origin
const API_ORIGIN = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/api$/, "");
const toAbsolute = (url) => {
  if (!url) return url;
  const clean = url
    .toString()
    .trim()
    .replace(/[\n\r\t]/g, "");
  if (/^https?:\/\//i.test(clean)) return clean;
  return `${API_ORIGIN}${clean}`;
};

// Format relative time (e.g., "2 hours ago")
const formatRelativeTime = (date) => {
  const now = new Date();
  const postDate = new Date(date);
  const diff = Math.floor((now - postDate) / 1000); // seconds

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return postDate.toLocaleDateString();
};

function HomeSimple() {
  const { showToast } = useToast();
  const [posts, setPosts] = useState([]);
  const [allPosts, setAllPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);

  // Pagination state for infinite scroll
  const [currentPage, setCurrentPage] = useState(1);
  const [postsPerPage] = useState(10);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Feed filtering state
  const [sortBy, setSortBy] = useState("recent"); // recent, trending, mostLiked
  const [bookmarkedPosts, setBookmarkedPosts] = useState([]);
  const [pinnedPosts, setPinnedPosts] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showFollowingOnly, setShowFollowingOnly] = useState(false);
  const [followingUserIds, setFollowingUserIds] = useState([]);
  const [trendingHashtags, setTrendingHashtags] = useState([]);

  useEffect(() => {
    fetchPosts();
    fetchBookmarkedPostIds();
    fetchPinnedPostIds();
    fetchUnreadNotificationCount();
    fetchFollowingUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !loadingMore &&
          !loading &&
          searchQuery === ""
        ) {
          loadMorePosts();
        }
      },
      { threshold: 0.1 }
    );

    const sentinel = document.getElementById("scroll-sentinel");
    if (sentinel) observer.observe(sentinel);

    return () => {
      if (sentinel) observer.unobserve(sentinel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadingMore, loading, searchQuery]);

  // Listen for real-time comment updates
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    socket.on("new_comment", (data) => {
      const { postId, comment } = data;
      console.log(`📨 Real-time comment received for post ${postId}:`, comment);

      // Update comments if modal is open for this post
      if (selectedPost && selectedPost.id === postId) {
        setComments((prevComments) => [...prevComments, comment]);
      }

      // Update comment count in posts
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? { ...post, commentsCount: (post.commentsCount || 0) + 1 }
            : post
        )
      );

      setAllPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? { ...post, commentsCount: (post.commentsCount || 0) + 1 }
            : post
        )
      );
    });

    // Listen for real-time like updates
    socket.on("post_liked", (data) => {
      const { postId, likesCount } = data;
      console.log(
        `❤️ Real-time like received for post ${postId}, count: ${likesCount}`
      );

      // Update like count in posts
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId ? { ...post, likesCount } : post
        )
      );

      setAllPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId ? { ...post, likesCount } : post
        )
      );
    });

    socket.on("post_unliked", (data) => {
      const { postId, likesCount } = data;
      console.log(
        `💔 Real-time unlike received for post ${postId}, count: ${likesCount}`
      );

      // Update like count in posts
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId ? { ...post, likesCount } : post
        )
      );

      setAllPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId ? { ...post, likesCount } : post
        )
      );
    });

    // Listen for real-time new posts
    socket.on("new_post", (data) => {
      const { post } = data;
      console.log(`📝 Real-time new post received:`, post);

      // Normalize URLs for image and profilePic
      const normalized = {
        ...post,
        image: toAbsolute(post.image),
        user: post.user
          ? { ...post.user, profilePic: toAbsolute(post.user.profilePic) }
          : post.user,
      };

      // Only add if not already in the list (avoid duplicates for the creator)
      setPosts((prevPosts) => {
        const exists = prevPosts.some((p) => p.id === normalized.id);
        if (exists) return prevPosts;
        return [normalized, ...prevPosts];
      });

      setAllPosts((prevPosts) => {
        const exists = prevPosts.some((p) => p.id === normalized.id);
        if (exists) return prevPosts;
        return [normalized, ...prevPosts];
      });
    });

    // Listen for real-time notifications
    socket.on("new_notification", (data) => {
      console.log("🔔 New notification received:", data);
      setUnreadNotifications((prev) => prev + 1);
      showToast(data.title || "You have a new notification", "info");
    });

    return () => {
      socket.off("new_comment");
      socket.off("post_liked");
      socket.off("post_unliked");
      socket.off("new_post");
      socket.off("new_notification");
    };
  }, [selectedPost, showToast]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      setCurrentPage(1);

      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/posts/all`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        params: { page: 1, limit: postsPerPage },
      });

      let posts = response.data.posts || [];

      // Fetch like status and comment count for each post
      if (token && posts.length > 0) {
        posts = await Promise.all(
          posts.map(async (post) => {
            try {
              const likeResponse = await axios.get(
                `${API_URL}/posts/${post.id}/likes`,
                { headers: { Authorization: `Bearer ${token}` } }
              );

              // Fetch comment count
              const commentResponse = await axios.get(
                `${API_URL}/posts/${post.id}/comments`,
                { headers: { Authorization: `Bearer ${token}` } }
              );

              return {
                ...post,
                likesCount: likeResponse.data.likesCount,
                isLiked: likeResponse.data.isLiked,
                commentsCount: (commentResponse.data.comments || []).length,
                isBookmarked: bookmarkedPosts.includes(post.id),
              };
            } catch (err) {
              console.error(`Error fetching data for post ${post.id}:`, err);
              return post;
            }
          })
        );
      }

      setAllPosts(posts);
      setPosts(sortPosts(posts, sortBy));
      setHasMore(posts.length === postsPerPage);
      updateTrendingHashtags(posts);
    } catch (err) {
      console.error("Error fetching posts:", err);
      setError("Unable to load posts. The server might be updating.");
      setPosts([]);
      setAllPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMorePosts = async () => {
    try {
      setLoadingMore(true);
      const token = localStorage.getItem("token");
      const nextPage = currentPage + 1;

      const response = await axios.get(`${API_URL}/posts/all`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        params: { page: nextPage, limit: postsPerPage },
      });

      let newPosts = response.data.posts || [];

      // Fetch like status and comment count for new posts
      if (token && newPosts.length > 0) {
        newPosts = await Promise.all(
          newPosts.map(async (post) => {
            try {
              const likeResponse = await axios.get(
                `${API_URL}/posts/${post.id}/likes`,
                { headers: { Authorization: `Bearer ${token}` } }
              );

              const commentResponse = await axios.get(
                `${API_URL}/posts/${post.id}/comments`,
                { headers: { Authorization: `Bearer ${token}` } }
              );

              return {
                ...post,
                likesCount: likeResponse.data.likesCount,
                isLiked: likeResponse.data.isLiked,
                commentsCount: (commentResponse.data.comments || []).length,
                isBookmarked: bookmarkedPosts.includes(post.id),
              };
            } catch (err) {
              console.error(`Error fetching data for post ${post.id}:`, err);
              return post;
            }
          })
        );
      }

      setPosts((prev) => [...prev, ...newPosts]);
      setAllPosts((prev) => [...prev, ...newPosts]);
      setCurrentPage(nextPage);
      setHasMore(newPosts.length === postsPerPage);
    } catch (err) {
      console.error("Error loading more posts:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const sortPosts = (postsToSort, sort) => {
    const sorted = [...postsToSort];

    // Separate pinned and unpinned posts
    const pinned = sorted.filter((p) => pinnedPosts.includes(p.id));
    const unpinned = sorted.filter((p) => !pinnedPosts.includes(p.id));

    // Sort each group
    const sortFn = (a, b) => {
      switch (sort) {
        case "trending":
          return (
            (b.likesCount || 0) +
            (b.commentsCount || 0) * 2 -
            ((a.likesCount || 0) + (a.commentsCount || 0) * 2)
          );
        case "mostLiked":
          return (b.likesCount || 0) - (a.likesCount || 0);
        case "recent":
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    };

    pinned.sort(sortFn);
    unpinned.sort(sortFn);

    return [...pinned, ...unpinned];
  };

  const fetchFollowingUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await axios.get(`${API_URL}/users/me/following`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const followingIds = (response.data.following || []).map((u) => u.id);
      setFollowingUserIds(followingIds);
    } catch (err) {
      console.error("Error fetching following users:", err);
    }
  };

  const extractHashtags = (text) => {
    if (!text) return [];
    const matches = text.match(/#\w+/g) || [];
    return matches.map((tag) => tag.toLowerCase());
  };

  const updateTrendingHashtags = (postsToAnalyze) => {
    const hashtagCounts = {};
    postsToAnalyze.forEach((post) => {
      const tags = extractHashtags(post.content);
      tags.forEach((tag) => {
        hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
      });
    });

    const trending = Object.entries(hashtagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);

    setTrendingHashtags(trending);
  };

  const fetchBookmarkedPostIds = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await axios.get(`${API_URL}/bookmarks/ids`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setBookmarkedPosts(response.data.bookmarkIds || []);
    } catch (err) {
      console.error("Error fetching bookmarked posts:", err);
    }
  };

  const fetchPinnedPostIds = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await axios.get(`${API_URL}/pins`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const pinnedIds = (response.data.pinnedPosts || []).map((p) => p.id);
      setPinnedPosts(pinnedIds);
    } catch (err) {
      console.error("Error fetching pinned posts:", err);
    }
  };

  const fetchUnreadNotificationCount = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await axios.get(
        `${API_URL}/notifications/unread-count`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setUnreadNotifications(response.data.unreadCount || 0);
    } catch (err) {
      console.error("Error fetching unread notifications:", err);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.trim() === "") {
      const filtered = showFollowingOnly
        ? allPosts.filter((p) => followingUserIds.includes(p.userId))
        : allPosts;
      setPosts(sortPosts(filtered, sortBy));
    } else {
      let filtered = allPosts.filter(
        (post) =>
          post.content.toLowerCase().includes(query.toLowerCase()) ||
          post.user?.name.toLowerCase().includes(query.toLowerCase()) ||
          extractHashtags(post.content).some((tag) =>
            tag.includes(query.toLowerCase().replace("#", ""))
          )
      );
      if (showFollowingOnly) {
        filtered = filtered.filter((p) => followingUserIds.includes(p.userId));
      }
      setPosts(sortPosts(filtered, sortBy));
    }
  };

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    const filtered = showFollowingOnly
      ? posts.filter((p) => followingUserIds.includes(p.userId))
      : posts;
    setPosts(sortPosts(filtered, newSort));
  };

  const handleBookmark = async (postId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        showToast("Please log in to bookmark posts", "error");
        return;
      }

      if (bookmarkedPosts.includes(postId)) {
        // Remove bookmark via API
        await axios.delete(`${API_URL}/bookmarks/${postId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setBookmarkedPosts((prev) => prev.filter((id) => id !== postId));
        setPosts(
          posts.map((post) =>
            post.id === postId ? { ...post, isBookmarked: false } : post
          )
        );
        setAllPosts(
          allPosts.map((post) =>
            post.id === postId ? { ...post, isBookmarked: false } : post
          )
        );
        showToast("Post removed from bookmarks", "success");
      } else {
        // Add bookmark via API
        await axios.post(
          `${API_URL}/bookmarks`,
          { postId },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setBookmarkedPosts((prev) => [...prev, postId]);
        setPosts(
          posts.map((post) =>
            post.id === postId ? { ...post, isBookmarked: true } : post
          )
        );
        setAllPosts(
          allPosts.map((post) =>
            post.id === postId ? { ...post, isBookmarked: true } : post
          )
        );
        showToast("Post saved to bookmarks!", "success");
      }
    } catch (err) {
      console.error("Error bookmarking post:", err);
      showToast("Failed to bookmark post", "error");
    }
  };

  const handlePin = async (postId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        showToast("Please log in to pin posts", "error");
        return;
      }

      await axios.post(
        `${API_URL}/pins`,
        { postId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPinnedPosts((prev) => [...prev, postId]);
      setPosts(sortPosts(posts, sortBy));
      setAllPosts(sortPosts(allPosts, sortBy));
      showToast("Post pinned to top!", "success");
    } catch (err) {
      console.error("Error pinning post:", err);
      showToast(err.response?.data?.error || "Failed to pin post", "error");
    }
  };

  const handleUnpin = async (postId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        showToast("Please log in to unpin posts", "error");
        return;
      }

      await axios.delete(`${API_URL}/pins/${postId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setPinnedPosts((prev) => prev.filter((id) => id !== postId));
      setPosts(sortPosts(posts, sortBy));
      setAllPosts(sortPosts(allPosts, sortBy));
      showToast("Post unpinned", "success");
    } catch (err) {
      console.error("Error unpinning post:", err);
      showToast(err.response?.data?.error || "Failed to unpin post", "error");
    }
  };

  const handlePostCreated = (newPost) => {
    // Ensure the new post has all required fields and normalized URLs
    const postWithDefaults = {
      ...newPost,
      image: toAbsolute(newPost.image),
      user: newPost.user
        ? { ...newPost.user, profilePic: toAbsolute(newPost.user.profilePic) }
        : newPost.user,
      likesCount: newPost.likesCount || 0,
      commentsCount: newPost.commentsCount || 0,
      isLiked: newPost.isLiked || false,
      isBookmarked: false,
    };
    setPosts([postWithDefaults, ...posts]);
    setAllPosts([postWithDefaults, ...allPosts]);
    setShowCreateModal(false);
    showToast("Post created successfully!", "success");
  };

  const handleLike = async (postId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_URL}/posts/${postId}/like`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update state with server's like count
      const { likesCount } = response.data;
      setPosts(
        posts.map((post) =>
          post.id === postId ? { ...post, isLiked: true, likesCount } : post
        )
      );
      setAllPosts(
        allPosts.map((post) =>
          post.id === postId ? { ...post, isLiked: true, likesCount } : post
        )
      );
    } catch (err) {
      console.error("Error liking post:", err);
      showToast("Failed to like post", "error");
    }
  };

  const handleUnlike = async (postId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.delete(`${API_URL}/posts/${postId}/like`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Update state with server's like count
      const { likesCount } = response.data;
      setPosts(
        posts.map((post) =>
          post.id === postId
            ? {
                ...post,
                isLiked: false,
                likesCount,
              }
            : post
        )
      );
      setAllPosts(
        allPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                isLiked: false,
                likesCount,
              }
            : post
        )
      );
    } catch {
      showToast("Failed to unlike post", "error");
    }
  };

  const openCommentModal = async (post) => {
    setSelectedPost(post);
    setShowCommentModal(true);
    setComments([]);
    setNewComment("");
    await fetchComments(post.id);
  };

  const fetchComments = async (postId) => {
    try {
      setCommentsLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/posts/${postId}/comments`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      setComments(response.data.comments || []);
    } catch (err) {
      console.error("Error fetching comments:", err);
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      showToast("Comment cannot be empty", "error");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_URL}/posts/${selectedPost.id}/comments`,
        { text: newComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const newCommentObj = response.data;

      // Add comment to local state
      setComments([...comments, newCommentObj]);
      setNewComment("");

      // Update post comment count
      setPosts(
        posts.map((post) =>
          post.id === selectedPost.id
            ? { ...post, commentsCount: (post.commentsCount || 0) + 1 }
            : post
        )
      );
      setAllPosts(
        allPosts.map((post) =>
          post.id === selectedPost.id
            ? { ...post, commentsCount: (post.commentsCount || 0) + 1 }
            : post
        )
      );

      showToast("Comment added successfully!", "success");
    } catch (err) {
      console.error("Error adding comment:", err);
      showToast("Failed to add comment", "error");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Campus Feed</h1>
              <p className="text-gray-400">
                Connect with your campus community
              </p>
            </div>
            {unreadNotifications > 0 && (
              <div className="bg-red-500 text-white rounded-full px-3 py-1 text-sm font-semibold">
                {unreadNotifications} new
              </div>
            )}
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="mb-6 space-y-3">
          <input
            type="text"
            placeholder="🔍 Search posts or users..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none transition"
          />
          {searchQuery && (
            <p className="text-gray-400 text-sm">
              Found {posts.length} result{posts.length !== 1 ? "s" : ""}
            </p>
          )}

          {/* Sort Controls */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => handleSortChange("recent")}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                sortBy === "recent"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              🕐 Recent
            </button>
            <button
              onClick={() => handleSortChange("trending")}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                sortBy === "trending"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              🔥 Trending
            </button>
            <button
              onClick={() => handleSortChange("mostLiked")}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                sortBy === "mostLiked"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              👍 Most Liked
            </button>
          </div>
        </div>

        {/* Create Post Button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg mb-6 transition"
        >
          Create a Post
        </button>

        {/* Posts Feed */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading posts...</p>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500 rounded-lg p-6 text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchPosts}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition"
            >
              Retry
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-lg">
            <p className="text-gray-400 text-lg mb-4">No posts yet</p>
            <p className="text-gray-500">Be the first to share something!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition"
              >
                {/* Post Header */}
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold mr-3">
                    {post.user?.name?.[0] || "U"}
                  </div>

                  {/* Following Only Toggle */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => {
                        setShowFollowingOnly(!showFollowingOnly);
                        const filtered = !showFollowingOnly
                          ? allPosts.filter((p) =>
                              followingUserIds.includes(p.userId)
                            )
                          : allPosts;
                        setPosts(sortPosts(filtered, sortBy));
                      }}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                        showFollowingOnly
                          ? "bg-purple-600 text-white"
                          : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                      }`}
                    >
                      Following Only
                    </button>
                  </div>

                  {/* Trending Hashtags */}
                  {trendingHashtags.length > 0 && (
                    <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                      <h3 className="font-bold text-sm mb-2 text-gray-700">
                        Trending Hashtags
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {trendingHashtags.map((tag, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setSearchQuery(`#${tag}`);
                              handleSearch(`#${tag}`);
                            }}
                            className="px-3 py-1 bg-white text-purple-600 border border-purple-300 rounded-full text-xs hover:bg-purple-50 transition"
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">
                      {post.user?.name || "Unknown User"}
                    </p>
                    <p className="text-sm text-gray-400">
                      {post.user?.course || "Student"} •{" "}
                      {formatRelativeTime(post.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Post Content */}
                <p className="text-gray-200 mb-4 whitespace-pre-wrap">
                  {post.content}
                </p>

                {/* Post Image */}
                {post.image && (
                  <img
                    src={post.image}
                    alt="Post image"
                    className="w-full rounded-lg mb-4 max-h-96 object-cover"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                )}

                {/* Post Actions */}
                <div className="flex items-center gap-6 text-gray-400">
                  <button
                    onClick={() =>
                      post.isLiked ? handleUnlike(post.id) : handleLike(post.id)
                    }
                    className={`flex items-center gap-2 hover:text-blue-400 transition ${
                      post.isLiked ? "text-blue-500" : ""
                    }`}
                  >
                    <svg
                      className="w-5 h-5"
                      fill={post.isLiked ? "currentColor" : "none"}
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                    <span>{post.likesCount || 0}</span>
                  </button>

                  <button
                    onClick={() => openCommentModal(post)}
                    className="flex items-center gap-2 hover:text-green-400 transition"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                    <span>{post.commentsCount || 0}</span>
                  </button>

                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/posts/${post.id}`;
                      navigator.clipboard.writeText(url);
                      showToast("Link copied to clipboard!", "success");
                    }}
                    className="flex items-center gap-2 hover:text-purple-400 transition"
                    title="Share post"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8.684 13.342C9.278 10.902 11.487 9 14 9c2.761 0 5 2.239 5 5 0 2.513-1.902 4.722-4.342 5.316m0 0a9.005 9.005 0 01-8.464-4.95m8.464 4.95L3.102 19.894m0 0a9.005 9.005 0 010-13.788m13.788 0L19.75 7.111"
                      />
                    </svg>
                  </button>

                  <button
                    onClick={() => handleBookmark(post.id)}
                    className={`flex items-center gap-2 hover:text-yellow-400 transition ${
                      post.isBookmarked ? "text-yellow-400" : ""
                    }`}
                    title="Bookmark post"
                  >
                    <svg
                      className="w-5 h-5"
                      fill={post.isBookmarked ? "currentColor" : "none"}
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 5a2 2 0 012-2h6a2 2 0 012 2v16l-7-3.5L5 21V5z"
                      />
                    </svg>
                  </button>

                  {String(post.userId) ===
                    String(localStorage.getItem("userId")) && (
                    <button
                      onClick={() =>
                        pinnedPosts.includes(post.id)
                          ? handleUnpin(post.id)
                          : handlePin(post.id)
                      }
                      className={`flex items-center gap-2 hover:text-red-400 transition ${
                        pinnedPosts.includes(post.id) ? "text-red-400" : ""
                      }`}
                      title={
                        pinnedPosts.includes(post.id)
                          ? "Unpin post"
                          : "Pin to top"
                      }
                    >
                      <svg
                        className="w-5 h-5"
                        fill={
                          pinnedPosts.includes(post.id)
                            ? "currentColor"
                            : "none"
                        }
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Infinite scroll sentinel */}
            <div id="scroll-sentinel" className="h-10" />

            {/* Loading more indicator */}
            {loadingMore && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-gray-400 mt-2">Loading more posts...</p>
              </div>
            )}

            {/* No more posts indicator */}
            {!hasMore && posts.length > 0 && (
              <div className="text-center py-4">
                <p className="text-gray-500">No more posts to load</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      {showCreateModal && (
        <CreatePostModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handlePostCreated}
        />
      )}

      {/* Comment Modal */}
      {showCommentModal && selectedPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex justify-between items-center">
              <h2 className="text-xl font-bold">Comments</h2>
              <button
                onClick={() => setShowCommentModal(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* Original Post */}
            <div className="p-6 border-b border-gray-700 bg-gray-750">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold mr-3">
                  {selectedPost.user?.name?.[0] || "U"}
                </div>
                <div>
                  <p className="font-semibold">
                    {selectedPost.user?.name || "Unknown User"}
                  </p>
                  <p className="text-sm text-gray-400">
                    {formatRelativeTime(selectedPost.createdAt)}
                  </p>
                </div>
              </div>
              <p className="text-gray-200 whitespace-pre-wrap">
                {selectedPost.content}
              </p>
            </div>

            {/* Comments Section */}
            <div className="p-6">
              {commentsLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                </div>
              ) : comments.length === 0 ? (
                <p className="text-gray-400 text-center py-4">
                  No comments yet. Be the first to comment!
                </p>
              ) : (
                <div className="space-y-4 mb-6">
                  {comments.map((comment) => (
                    <div key={comment.id} className="bg-gray-750 rounded p-4">
                      <div className="flex items-center mb-2">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold mr-2">
                          {comment.user?.name?.[0] || "U"}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">
                            {comment.user?.name || "Unknown"}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatRelativeTime(comment.createdAt)}
                          </p>
                        </div>
                      </div>
                      <p className="text-gray-200 text-sm">
                        {comment.text || comment.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Comment Form */}
              <div className="border-t border-gray-700 pt-4">
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleAddComment()}
                    className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAddComment}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-semibold"
                  >
                    Post
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HomeSimple;
