import { useState, useEffect } from "react";
import { enhancementService } from "../services/api";
import LoadingSpinner from "./LoadingSpinner";

export default function ProfileStats({ userId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await enhancementService.getProfileStats(userId);
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch profile stats:", error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchStats();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <LoadingSpinner />
      </div>
    );
  }

  if (!stats) return null;

  // Format views history for chart
  const viewsData = Object.entries(stats.viewsHistory || {})
    .sort(([a], [b]) => new Date(a) - new Date(b))
    .slice(-7); // Last 7 days

  const maxViews = Math.max(...viewsData.map(([, count]) => count), 1);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-bold text-secondary mb-4">Profile Statistics</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-3xl font-bold text-primary">{stats.profileViews || 0}</div>
          <div className="text-sm text-gray-600 mt-1">Profile Views</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-3xl font-bold text-primary">{stats.followersCount || 0}</div>
          <div className="text-sm text-gray-600 mt-1">Followers</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-3xl font-bold text-primary">{stats.postsCount || 0}</div>
          <div className="text-sm text-gray-600 mt-1">Posts</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">
            Member since
          </div>
          <div className="text-sm font-semibold text-gray-800 mt-1">
            {new Date(stats.memberSince).toLocaleDateString()}
          </div>
        </div>
      </div>

      {viewsData.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-secondary mb-3">Views (Last 7 Days)</h3>
          <div className="flex items-end justify-between gap-2 h-32">
            {viewsData.map(([date, count]) => (
              <div key={date} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-primary rounded-t transition-all duration-300 hover:bg-primary-dark"
                  style={{
                    height: `${(count / maxViews) * 100}%`,
                    minHeight: count > 0 ? "4px" : "0",
                  }}
                  title={`${date}: ${count} views`}
                />
                <div className="text-xs text-gray-600 mt-1">
                  {new Date(date).toLocaleDateString("en-US", { weekday: "short" })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
