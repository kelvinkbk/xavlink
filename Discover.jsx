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
  const [mutualConnections, setMutualConnections] = useState([]);
  const [skillSuggestions, setSkillSuggestions] = useState([]);
  const [hashtagSuggestions, setHashtagSuggestions] = useState([]);
  const [activeTab, setActiveTab] = useState("suggested"); // 'suggested', 'mutual', 'skills', or 'hashtags'
  const [loading, setLoading] = useState(false);
  const [suggestedLoading, setSuggestedLoading] = useState(true);
  const [mutualLoading, setMutualLoading] = useState(true);
  const [skillLoading, setSkillLoading] = useState(true);
  const [hashtagLoading, setHashtagLoading] = useState(true);
  const [startingChats, setStartingChats] = useState(new Set());

  // Filter states
  const [filterCourse, setFilterCourse] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterSkill, setFilterSkill] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [allCourses, setAllCourses] = useState([]);
  const [allYears, setAllYears] = useState([]);
  const [allSkills, setAllSkills] = useState([]);

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

  // Fetch filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const { data } = await api.get("/users/filter-options");
        if (data.courses) setAllCourses(data.courses);
        if (data.years) setAllYears(data.years);
        if (data.skills) setAllSkills(data.skills);
      } catch (error) {
        console.error("Failed to fetch filter options:", error);
      }
    };
    fetchFilterOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply filters to results
  const applyFilters = (users) => {
    return users.filter((user) => {
      if (filterCourse && user.course !== filterCourse) return false;
      if (filterYear && user.year !== filterYear) return false;
      if (filterSkill && !user.skills?.some((s) => s.name === filterSkill))
        return false;
      return true;
    });
  };

  const handleClearFilters = () => {
    setFilterCourse("");
    setFilterYear("");
    setFilterSkill("");
  };

  const hasActiveFilters = filterCourse || filterYear || filterSkill;

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

  const UserCard = ({
    user,
    showSkillMatch = false,
    showHashtagMatch = false,
  }) => (
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
          {showSkillMatch && user.matchingSkillCount && (
            <p className="text-sm text-blue-600 font-semibold mt-1">
              💼 {user.matchingSkillCount} matching skill
              {user.matchingSkillCount > 1 ? "s" : ""}
            </p>
          )}
          {showHashtagMatch && user.matchingHashtagCount && (
            <p className="text-sm text-purple-600 font-semibold mt-1">
              # {user.matchingHashtagCount} shared hashtag
              {user.matchingHashtagCount > 1 ? "s" : ""}
            </p>
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

        {/* Filter Toggle Button */}
        <div className="mb-6 flex justify-between items-center">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
          >
            <span>🔽</span>
            <span>{showFilters ? "Hide Filters" : "Show Filters"}</span>
          </button>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 text-red-600 hover:text-red-700 font-semibold transition-colors"
            >
              ✕ Clear Filters
            </button>
          )}
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Course Filter */}
              <div>
                <label className="block text-sm font-semibold text-secondary mb-2">
                  Course
                </label>
                <select
                  value={filterCourse}
                  onChange={(e) => setFilterCourse(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">All Courses</option>
                  {allCourses.map((course) => (
                    <option key={course} value={course}>
                      {course}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Filter */}
              <div>
                <label className="block text-sm font-semibold text-secondary mb-2">
                  Year
                </label>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">All Years</option>
                  {allYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              {/* Skill Filter */}
              <div>
                <label className="block text-sm font-semibold text-secondary mb-2">
                  Skill
                </label>
                <select
                  value={filterSkill}
                  onChange={(e) => setFilterSkill(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">All Skills</option>
                  {allSkills.map((skill) => (
                    <option key={skill} value={skill}>
                      {skill}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-secondary mb-4">
              Search Results ({searchResults.length})
            </h2>
            <div className="space-y-3">
              {applyFilters(searchResults).map((user) => (
                <UserCard key={user.id} user={user} />
              ))}
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-8 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("suggested")}
            className={`px-4 py-3 font-semibold transition-colors ${
              activeTab === "suggested"
                ? "text-primary border-b-2 border-primary"
                : "text-gray-600 hover:text-secondary"
            }`}
          >
            ✨ Suggested for You
          </button>
          <button
            onClick={() => setActiveTab("mutual")}
            className={`px-4 py-3 font-semibold transition-colors ${
              activeTab === "mutual"
                ? "text-primary border-b-2 border-primary"
                : "text-gray-600 hover:text-secondary"
            }`}
          >
            🤝 Mutual Connections
          </button>
          <button
            onClick={() => setActiveTab("skills")}
            className={`px-4 py-3 font-semibold transition-colors ${
              activeTab === "skills"
                ? "text-primary border-b-2 border-primary"
                : "text-gray-600 hover:text-secondary"
            }`}
          >
            💼 Skills-Based
          </button>
          <button
            onClick={() => setActiveTab("hashtags")}
            className={`px-4 py-3 font-semibold transition-colors ${
              activeTab === "hashtags"
                ? "text-primary border-b-2 border-primary"
                : "text-gray-600 hover:text-secondary"
            }`}
          >
            # Hashtag-Based
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
                      {applyFilters(group.users).map((user) => (
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
                      {applyFilters(group.users).map((user) => (
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
                  {applyFilters(skillSuggestions).map((user) => (
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
                  {applyFilters(hashtagSuggestions).map((user) => (
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
