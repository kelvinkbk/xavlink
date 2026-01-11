import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageTransition from "../components/PageTransition";
import api, { enhancementService } from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import SkeletonLoader from "../components/SkeletonLoader";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { chatService } from "../services/chatService";

export default function Discover() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [suggestedCategories, setSuggestedCategories] = useState([]);
  const [mutualConnections, setMutualConnections] = useState([]);
  const [skillSuggestions, setSkillSuggestions] = useState([]);
  const [hashtagSuggestions, setHashtagSuggestions] = useState([]);
  const [trendingSkills, setTrendingSkills] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [activeTab, setActiveTab] = useState("suggested"); // 'suggested', 'mutual', 'skills', 'hashtags', 'trending', 'favorites'
  const [loading, setLoading] = useState(false);
  const [suggestedLoading, setSuggestedLoading] = useState(true);
  const [mutualLoading, setMutualLoading] = useState(true);
  const [skillLoading, setSkillLoading] = useState(true);
  const [hashtagLoading, setHashtagLoading] = useState(true);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [startingChats, setStartingChats] = useState(new Set());

  // Filters
  const [filters, setFilters] = useState({
    course: "",
    skills: [],
    year: "",
  });
  const [availableCourses, setAvailableCourses] = useState([]);
  const [availableSkills, setAvailableSkills] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [filterLoading, setFilterLoading] = useState(false);

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

  useEffect(() => {
    const fetchMutualConnections = async () => {
      try {
        const { data } = await api.get("/users/connections/mutual");
        setMutualConnections(data.connections || []);
      } catch (error) {
        console.error("Failed to fetch mutual connections:", error);
        showToast("Failed to load mutual connections", "error");
      } finally {
        setMutualLoading(false);
      }
    };

    fetchMutualConnections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchSkillSuggestions = async () => {
      try {
        const { data } = await api.get("/users/suggestions/skills");
        setSkillSuggestions(data.skillSuggestions || []);
      } catch (error) {
        console.error("Failed to fetch skill-based suggestions:", error);
        showToast("Failed to load skill suggestions", "error");
      } finally {
        setSkillLoading(false);
      }
    };

    fetchSkillSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchHashtagSuggestions = async () => {
      try {
        const { data } = await api.get("/users/suggestions/hashtags");
        setHashtagSuggestions(data.hashtagSuggestions || []);
      } catch (error) {
        console.error("Failed to fetch hashtag-based suggestions:", error);
        showToast("Failed to load hashtag suggestions", "error");
      } finally {
        setHashtagLoading(false);
      }
    };

    fetchHashtagSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchTrendingSkills = async () => {
      try {
        setTrendingLoading(true);
        const { trendingSkills: skills } =
          await enhancementService.getTrendingSkills();
        setTrendingSkills(skills || []);
      } catch (error) {
        console.error("Failed to fetch trending skills:", error);
        showToast("Failed to load trending skills", "error");
      } finally {
        setTrendingLoading(false);
      }
    };

    if (activeTab === "trending") {
      fetchTrendingSkills();
    }
  }, [activeTab, showToast]);

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        setFavoritesLoading(true);
        const { favorites: favs } = await enhancementService.getFavorites();
        setFavorites(favs || []);
      } catch (error) {
        console.error("Failed to fetch favorites:", error);
        showToast("Failed to load favorites", "error");
      } finally {
        setFavoritesLoading(false);
      }
    };

    if (activeTab === "favorites" && user?.id) {
      fetchFavorites();
    }
  }, [activeTab, user?.id, showToast]);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        // Fetch available courses and skills for filters
        const { data: skillsData } = await api.get("/skills/all");
        const uniqueCourses = new Set();
        const uniqueSkills = new Set();

        skillsData.forEach((skill) => {
          if (skill.user?.course) {
            uniqueCourses.add(skill.user.course);
          }
          uniqueSkills.add(skill.title);
        });

        setAvailableCourses(Array.from(uniqueCourses).sort());
        setAvailableSkills(Array.from(uniqueSkills).sort());
      } catch (error) {
        console.error("Failed to fetch filter options:", error);
      }
    };

    fetchFilterOptions();
  }, []);

  useEffect(() => {
    const applyFilters = async () => {
      if (!filters.course && filters.skills.length === 0 && !filters.year) {
        setFilteredUsers([]);
        return;
      }

      setFilterLoading(true);
      try {
        const params = {};
        if (filters.course) params.course = filters.course;
        if (filters.skills.length > 0) params.skills = filters.skills.join(",");
        if (filters.year) params.year = filters.year;

        const { users } = await enhancementService.filterUsers(params);
        setFilteredUsers(users || []);
      } catch (error) {
        console.error("Failed to filter users:", error);
        showToast("Failed to filter users", "error");
      } finally {
        setFilterLoading(false);
      }
    };

    applyFilters();
  }, [filters, showToast]);

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
      "Mutual Connections": "🤝",
      "Followed by your follows": "👫",
      "From your course": "🎓",
    };
    return icons[category] || "👤";
  };

  const handleAddToFavorites = async (favoriteUserId) => {
    try {
      await enhancementService.addToFavorites(favoriteUserId);
      setFavorites((prev) => {
        const user =
          searchResults.find((u) => u.id === favoriteUserId) ||
          suggestedCategories
            .flatMap((g) => g.users)
            .find((u) => u.id === favoriteUserId);
        return user ? [...prev, user] : prev;
      });
      showToast("Added to favorites", "success");
    } catch (error) {
      console.error("Failed to add to favorites:", error);
      showToast("Failed to add to favorites", "error");
    }
  };

  const handleRemoveFromFavorites = async (favoriteUserId) => {
    try {
      await enhancementService.removeFromFavorites(favoriteUserId);
      setFavorites((prev) => prev.filter((u) => u.id !== favoriteUserId));
      showToast("Removed from favorites", "success");
    } catch (error) {
      console.error("Failed to remove from favorites:", error);
      showToast("Failed to remove from favorites", "error");
    }
  };

  const isFavorite = (userId) => {
    return favorites.some((f) => f.id === userId);
  };

  const UserCard = ({
    user: cardUser,
    showSkillMatch = false,
    showHashtagMatch = false,
    showFavoriteButton = true,
  }) => {
    const favorited = isFavorite(cardUser.id);
    const isOwnProfile = cardUser.id === user?.id;

    return (
      <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:border-primary hover:shadow-md transition">
        <Link
          to={`/profile/${cardUser.id}`}
          className="flex items-center gap-4 flex-1 min-w-0"
        >
          <img
            src={cardUser.profilePic || "https://placehold.co/64x64?text=User"}
            alt={cardUser.name}
            className="w-16 h-16 rounded-full object-cover"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-secondary truncate">
              {cardUser.name}
            </h3>
            {cardUser.email && (
              <p className="text-sm text-gray-600 truncate">{cardUser.email}</p>
            )}
            {cardUser.course && (
              <p className="text-sm text-gray-500">{cardUser.course}</p>
            )}
            {cardUser.year && (
              <p className="text-sm text-gray-500">Year {cardUser.year}</p>
            )}
            {cardUser.bio && (
              <p className="text-sm text-gray-700 truncate mt-1">
                {cardUser.bio}
              </p>
            )}
            {showSkillMatch && cardUser.matchingSkillCount && (
              <p className="text-sm text-blue-600 font-semibold mt-1">
                💼 {cardUser.matchingSkillCount} matching skill
                {cardUser.matchingSkillCount > 1 ? "s" : ""}
              </p>
            )}
            {showHashtagMatch && cardUser.matchingHashtagCount && (
              <p className="text-sm text-purple-600 font-semibold mt-1">
                # {cardUser.matchingHashtagCount} shared hashtag
                {cardUser.matchingHashtagCount > 1 ? "s" : ""}
              </p>
            )}
          </div>
          <div className="text-right text-sm text-gray-600">
            <p className="font-semibold">{cardUser.followersCount || 0}</p>
            <p>Followers</p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {showFavoriteButton && !isOwnProfile && user?.id && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (favorited) {
                  handleRemoveFromFavorites(cardUser.id);
                } else {
                  handleAddToFavorites(cardUser.id);
                }
              }}
              className={`p-2 rounded-lg transition ${
                favorited
                  ? "bg-yellow-100 text-yellow-600 hover:bg-yellow-200"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              title={favorited ? "Remove from favorites" : "Add to favorites"}
            >
              ⭐
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              startChat(cardUser.id);
            }}
            disabled={startingChats.has(cardUser.id)}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
          >
            {startingChats.has(cardUser.id) ? (
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
      </div>
    );
  };

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

        {/* Filters */}
        <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold text-secondary mb-4">
            🔍 Filter Users
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Course
              </label>
              <select
                value={filters.course}
                onChange={(e) =>
                  setFilters({ ...filters, course: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              >
                <option value="">All Courses</option>
                {availableCourses.map((course) => (
                  <option key={course} value={course}>
                    {course}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Year
              </label>
              <select
                value={filters.year}
                onChange={(e) =>
                  setFilters({ ...filters, year: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              >
                <option value="">All Years</option>
                <option value="1">Year 1</option>
                <option value="2">Year 2</option>
                <option value="3">Year 3</option>
                <option value="4">Year 4</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Skills
              </label>
              <select
                multiple
                value={filters.skills}
                onChange={(e) => {
                  const selected = Array.from(
                    e.target.selectedOptions,
                    (option) => option.value
                  );
                  setFilters({ ...filters, skills: selected });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                size="3"
              >
                {availableSkills.map((skill) => (
                  <option key={skill} value={skill}>
                    {skill}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Hold Ctrl/Cmd to select multiple
              </p>
            </div>
          </div>
          {(filters.course || filters.skills.length > 0 || filters.year) && (
            <button
              onClick={() => setFilters({ course: "", skills: [], year: "" })}
              className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Filtered Results */}
        {filteredUsers.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-secondary mb-4">
              Filtered Results ({filteredUsers.length})
            </h2>
            {filterLoading ? (
              <div className="space-y-3">
                <SkeletonLoader type="card" />
                <SkeletonLoader type="card" />
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    showFavoriteButton={true}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-secondary mb-4">
              Search Results ({searchResults.length})
            </h2>
            <div className="space-y-3">
              {searchResults.map((user) => (
                <UserCard key={user.id} user={user} showFavoriteButton={true} />
              ))}
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("suggested")}
            className={`px-4 py-3 font-semibold transition-colors ${
              activeTab === "suggested"
                ? "text-primary border-b-2 border-primary"
                : "text-gray-600 hover:text-secondary"
            }`}
          >
            ✨ Suggested
          </button>
          <button
            onClick={() => setActiveTab("mutual")}
            className={`px-4 py-3 font-semibold transition-colors ${
              activeTab === "mutual"
                ? "text-primary border-b-2 border-primary"
                : "text-gray-600 hover:text-secondary"
            }`}
          >
            🤝 Mutual
          </button>
          <button
            onClick={() => setActiveTab("skills")}
            className={`px-4 py-3 font-semibold transition-colors ${
              activeTab === "skills"
                ? "text-primary border-b-2 border-primary"
                : "text-gray-600 hover:text-secondary"
            }`}
          >
            💼 Skills
          </button>
          <button
            onClick={() => setActiveTab("hashtags")}
            className={`px-4 py-3 font-semibold transition-colors ${
              activeTab === "hashtags"
                ? "text-primary border-b-2 border-primary"
                : "text-gray-600 hover:text-secondary"
            }`}
          >
            # Hashtags
          </button>
          <button
            onClick={() => setActiveTab("trending")}
            className={`px-4 py-3 font-semibold transition-colors ${
              activeTab === "trending"
                ? "text-primary border-b-2 border-primary"
                : "text-gray-600 hover:text-secondary"
            }`}
          >
            🔥 Trending Skills
          </button>
          <button
            onClick={() => setActiveTab("favorites")}
            className={`px-4 py-3 font-semibold transition-colors ${
              activeTab === "favorites"
                ? "text-primary border-b-2 border-primary"
                : "text-gray-600 hover:text-secondary"
            }`}
          >
            ⭐ Favorites
          </button>
        </div>

        {/* Suggested Tab */}
        {activeTab === "suggested" && (
          <div>
            {suggestedLoading ? (
              <div className="space-y-6">
                <SkeletonLoader type="card" />
                <SkeletonLoader type="card" />
              </div>
            ) : suggestedCategories.length > 0 ? (
              <div className="space-y-8">
                {suggestedCategories.map((group) => (
                  <div key={group.category}>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-2xl">
                        {getCategoryIcon(group.category)}
                      </span>
                      <div>
                        <h3 className="text-lg font-semibold text-secondary">
                          {group.category}
                        </h3>
                        {group.description && (
                          <p className="text-sm text-gray-600">
                            {group.description}
                          </p>
                        )}
                      </div>
                      <span className="text-sm text-gray-500 ml-auto">
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
                      const { data } = await api.get(
                        "/users/suggested?limit=15"
                      );
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
        )}

        {/* Mutual Connections Tab */}
        {activeTab === "mutual" && (
          <div>
            {mutualLoading ? (
              <div className="space-y-6">
                <SkeletonLoader type="card" />
                <SkeletonLoader type="card" />
              </div>
            ) : mutualConnections.length > 0 ? (
              <div className="space-y-8">
                {mutualConnections.map((group) => (
                  <div key={group.category}>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-2xl">
                        {getCategoryIcon(group.category)}
                      </span>
                      <div>
                        <h3 className="text-lg font-semibold text-secondary">
                          {group.category}
                        </h3>
                        {group.description && (
                          <p className="text-sm text-gray-600">
                            {group.description}
                          </p>
                        )}
                      </div>
                      <span className="text-sm text-gray-500 ml-auto">
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
              <p className="text-gray-600">No mutual connections available</p>
            )}
            {mutualConnections.length === 0 && !mutualLoading && (
              <div className="mt-4">
                <button
                  onClick={async () => {
                    setMutualLoading(true);
                    try {
                      const { data } = await api.get(
                        "/users/connections/mutual"
                      );
                      setMutualConnections(data.connections || []);
                      showToast("Connections refreshed", "success");
                    } catch (e) {
                      console.error("Refresh connections failed:", e);
                      showToast("Failed to load connections", "error");
                    } finally {
                      setMutualLoading(false);
                    }
                  }}
                  className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-600"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        )}

        {/* Skills-Based Tab */}
        {activeTab === "skills" && (
          <div>
            {skillLoading ? (
              <div className="space-y-6">
                <SkeletonLoader type="card" />
                <SkeletonLoader type="card" />
              </div>
            ) : skillSuggestions.length > 0 ? (
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-secondary mb-2">
                    💼 Users with similar skills
                  </h3>
                  <p className="text-sm text-gray-600">
                    People who share skills with you
                  </p>
                </div>
                <div className="space-y-3">
                  {skillSuggestions.map((user) => (
                    <UserCard key={user.id} user={user} showSkillMatch={true} />
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-gray-600">
                No skill-based suggestions available. Add some skills to your
                profile to get personalized recommendations!
              </p>
            )}
            {skillSuggestions.length === 0 && !skillLoading && (
              <div className="mt-4">
                <button
                  onClick={async () => {
                    setSkillLoading(true);
                    try {
                      const { data } = await api.get(
                        "/users/suggestions/skills"
                      );
                      setSkillSuggestions(data.skillSuggestions || []);
                      showToast("Skills suggestions refreshed", "success");
                    } catch (e) {
                      console.error("Refresh skills failed:", e);
                      showToast("Failed to load skill suggestions", "error");
                    } finally {
                      setSkillLoading(false);
                    }
                  }}
                  className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-600"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        )}
        {/* Hashtag-Based Tab */}
        {activeTab === "hashtags" && (
          <div>
            {hashtagLoading ? (
              <div className="space-y-6">
                <SkeletonLoader type="card" />
                <SkeletonLoader type="card" />
              </div>
            ) : hashtagSuggestions.length > 0 ? (
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-secondary mb-2">
                    # Users with similar interests
                  </h3>
                  <p className="text-sm text-gray-600">
                    People who use hashtags similar to yours
                  </p>
                </div>
                <div className="space-y-3">
                  {hashtagSuggestions.map((user) => (
                    <UserCard
                      key={user.id}
                      user={user}
                      showHashtagMatch={true}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-gray-600">
                No hashtag-based suggestions available. Use hashtags in your
                posts to get personalized recommendations!
              </p>
            )}
            {hashtagSuggestions.length === 0 && !hashtagLoading && (
              <div className="mt-4">
                <button
                  onClick={async () => {
                    setHashtagLoading(true);
                    try {
                      const { data } = await api.get(
                        "/users/suggestions/hashtags"
                      );
                      setHashtagSuggestions(data.hashtagSuggestions || []);
                      showToast("Hashtag suggestions refreshed", "success");
                    } catch (e) {
                      console.error("Refresh hashtags failed:", e);
                      showToast("Failed to load hashtag suggestions", "error");
                    } finally {
                      setHashtagLoading(false);
                    }
                  }}
                  className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-600"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
