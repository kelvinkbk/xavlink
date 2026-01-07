import { useState, useEffect } from "react";
import { useToast } from "../context/ToastContext";
import CreatePostModal from "../components/CreatePostModal";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

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

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/posts/all`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        params: { page: 1, limit: 20 },
      });

      setAllPosts(response.data.posts || []);
      setPosts(response.data.posts || []);
    } catch (err) {
      console.error("Error fetching posts:", err);
      setError("Unable to load posts. The server might be updating.");
      setPosts([]);
      setAllPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.trim() === "") {
      setPosts(allPosts);
    } else {
      const filtered = allPosts.filter((post) =>
        post.content.toLowerCase().includes(query.toLowerCase()) ||
        post.user?.name.toLowerCase().includes(query.toLowerCase())
      );
      setPosts(filtered);
    }
  };

  const handlePostCreated = (newPost) => {
    setPosts([newPost, ...posts]);
    setAllPosts([newPost, ...allPosts]);
    setShowCreateModal(false);
    showToast("Post created successfully!", "success");
  };

  const handleLike = async (postId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_URL}/posts/${postId}/like`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPosts(
        posts.map((post) =>
          post.id === postId
            ? { ...post, isLiked: true, likesCount: (post.likesCount || 0) + 1 }
            : post
        )
      );
    } catch {
      showToast("Failed to like post", "error");
    }
  };

  const handleUnlike = async (postId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/posts/${postId}/unlike`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setPosts(
        posts.map((post) =>
          post.id === postId
            ? {
                ...post,
                isLiked: false,
                likesCount: Math.max(0, (post.likesCount || 0) - 1),
              }
            : post
        )
      );
    } catch {
      showToast("Failed to unlike post", "error");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Campus Feed</h1>
          <p className="text-gray-400">Connect with your campus community</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="🔍 Search posts or users..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none transition"
          />
          {searchQuery && (
            <p className="text-gray-400 text-sm mt-2">
              Found {posts.length} result{posts.length !== 1 ? "s" : ""}
            </p>
          )}
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

                  <button className="flex items-center gap-2 hover:text-green-400 transition">
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      {showCreateModal && (
        <CreatePostModal
          onClose={() => setShowCreateModal(false)}
          onPostCreated={handlePostCreated}
        />
      )}
    </div>
  );
}

export default HomeSimple;
