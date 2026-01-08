import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageTransition from "../components/PageTransition";
import api from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import SkeletonLoader from "../components/SkeletonLoader";
import { useToast } from "../context/ToastContext";
import { chatService } from "../services/chatService";

export default function Discover() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [suggestedCategories, setSuggestedCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [suggestedLoading, setSuggestedLoading] = useState(true);
  const [startingChats, setStartingChats] = useState(new Set());

  useEffect(() => {
    const fetchSuggested = async () => {
      try {
        const { data } = await api.get("/users/suggested?limit=15");
        setSuggestedCategories(data.suggestions || []);
      } catch (error) {
        console.error("Failed to fetch suggested users:", error);
        showToast("Failed to load suggestions", "error");
      } finally {
        setSuggestedLoading(false);
      }
    };

    fetchSuggested();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchQuery.trim().length < 2) return;

    setLoading(true);
    try {
      const { data } = await api.get(
        `/users/search?q=${encodeURIComponent(searchQuery)}`
      );
      setSearchResults(data);
      showToast(`Found ${data.length} result(s)`, "success");
    } catch (error) {
      console.error("Search failed:", error);
      showToast("Search failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const startChat = async (userId) => {
    if (startingChats.has(userId)) return;

    setStartingChats(new Set(startingChats).add(userId));
    try {
      const chat = await chatService.getOrCreateDirectChat(userId);
      navigate(`/chat/${chat.id}`);
      showToast("Chat opened", "success");
    } catch (error) {
      console.error("Failed to start chat:", error);
      showToast("Failed to start chat", "error");
    } finally {
      setStartingChats((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      "Because you follow": "👥",
      "Similar to you": "🎓",
      Popular: "⭐",
      Suggested: "✨",
    };
    return icons[category] || "👤";
  };

  const UserCard = ({ user }) => (
    <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:border-primary hover:shadow-md transition">
      <Link
        to={`/profile/${user.id}`}
        className="flex items-center gap-4 flex-1 min-w-0"
      >
        <img
          src={user.profilePic || "https://placehold.co/64x64?text=User"}
          alt={user.name}
          className="w-16 h-16 rounded-full object-cover"
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-secondary truncate">{user.name}</h3>
          {user.email && (
            <p className="text-sm text-gray-600 truncate">{user.email}</p>
          )}
          {user.course && (
            <p className="text-sm text-gray-500">{user.course}</p>
          )}
          {user.bio && (
            <p className="text-sm text-gray-700 truncate mt-1">{user.bio}</p>
          )}
        </div>
        <div className="text-right text-sm text-gray-600">
          <p className="font-semibold">{user.followersCount || 0}</p>
          <p>Followers</p>
        </div>
      </Link>
      <button
        onClick={(e) => {
          e.stopPropagation();
          startChat(user.id);
        }}
        disabled={startingChats.has(user.id)}
        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
      >
        {startingChats.has(user.id) ? (
          <>
            <LoadingSpinner size="sm" />
            <span>Opening...</span>
          </>
        ) : (
          <>
            <span>💬</span>
            <span>Message</span>
          </>
        )}
      </button>
    </div>
  );

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold text-secondary mb-6">
          Discover People
        </h1>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Search by name, email, or course..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <button
              type="submit"
              disabled={loading || searchQuery.trim().length < 2}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner />
                  Searching...
                </span>
              ) : (
                "Search"
              )}
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Enter at least 2 characters to search
          </p>
        </form>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-secondary mb-4">
              Search Results ({searchResults.length})
            </h2>
            <div className="space-y-3">
              {searchResults.map((user) => (
                <UserCard key={user.id} user={user} />
              ))}
            </div>
          </div>
        )}

        {/* Suggested Users by Category */}
        <div>
          <h2 className="text-xl font-semibold text-secondary mb-6">
            Suggested for You
          </h2>
          {suggestedLoading ? (
            <div className="space-y-6">
              <div>
                <SkeletonLoader type="card" />
              </div>
              <div>
                <SkeletonLoader type="card" />
              </div>
            </div>
          ) : suggestedCategories.length > 0 ? (
            <div className="space-y-8">
              {suggestedCategories.map((group) => (
                <div key={group.category}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">
                      {getCategoryIcon(group.category)}
                    </span>
                    <h3 className="text-lg font-semibold text-secondary">
                      {group.category}
                    </h3>
                    <span className="text-sm text-gray-500">
                      ({group.users.length})
                    </span>
                  </div>
                  <div className="space-y-3">
                    {group.users.map((user) => (
                      <UserCard key={user.id} user={user} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No suggestions available</p>
          )}
          {suggestedCategories.length === 0 && !suggestedLoading && (
            <div className="mt-4">
              <button
                onClick={async () => {
                  setSuggestedLoading(true);
                  try {
                    const { data } = await api.get("/users/suggested?limit=15");
                    setSuggestedCategories(data.suggestions || []);
                    showToast("Suggestions refreshed", "success");
                  } catch (e) {
                    console.error("Refresh suggestions failed:", e);
                    showToast("Failed to load suggestions", "error");
                  } finally {
                    setSuggestedLoading(false);
                  }
                }}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-600"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
