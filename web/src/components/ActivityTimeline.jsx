import React, { useState, useEffect } from "react";
import { Activity, Loader } from "lucide-react";
import { enhancementService } from "../services/api";

export default function ActivityTimeline() {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const getActivityTypeIcon = (type) => {
    const icons = {
      post_created: "📝",
      post_liked: "❤️",
      post_commented: "💬",
      user_followed: "👥",
      skill_endorsed: "⭐",
      request_sent: "✉️",
      request_completed: "✅",
      skill_added: "🎯",
    };
    return icons[type] || "📌";
  };

  const getActivityDescription = (activity) => {
    switch (activity.type) {
      case "post_created":
        return "You created a post";
      case "post_liked":
        return "Your post was liked";
      case "post_commented":
        return "Someone commented on your post";
      case "user_followed":
        return `${activity.targetUser?.name || "Someone"} followed you`;
      case "skill_endorsed":
        return `${activity.targetUser?.name || "Someone"} endorsed your skill`;
      case "request_sent":
        return "You sent a collaboration request";
      case "request_completed":
        return "You completed a collaboration request";
      case "skill_added":
        return "You added a new skill";
      default:
        return activity.description || "Activity";
    }
  };

  const loadActivities = async () => {
    try {
      setIsLoading(true);
      const data = await enhancementService.getActivityTimeline(20, offset);
      setActivities((prev) =>
        offset === 0 ? data.activities : [...prev, ...data.activities]
      );
      setHasMore(data.hasMore);
    } catch (err) {
      setError("Failed to load activities");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoadMore = () => {
    setOffset((prev) => prev + 20);
    loadActivities();
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <div className="flex items-center gap-2">
          <Activity size={24} className="text-blue-500" />
          <h2 className="text-2xl font-bold text-gray-900">
            Activity Timeline
          </h2>
        </div>
      </div>

      <div className="divide-y">
        {activities.length === 0 && !isLoading ? (
          <div className="p-6 text-center text-gray-500">No activities yet</div>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-start gap-3">
                <span className="text-2xl">
                  {getActivityTypeIcon(activity.type)}
                </span>
                <div className="flex-1">
                  <p className="text-gray-900 font-medium">
                    {getActivityDescription(activity)}
                  </p>
                  {activity.description && (
                    <p className="text-gray-600 text-sm mt-1">
                      {activity.description}
                    </p>
                  )}
                  <p className="text-gray-500 text-xs mt-2">
                    {new Date(activity.createdAt).toLocaleDateString()}{" "}
                    {new Date(activity.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {error && <div className="p-4 bg-red-50 text-red-700">{error}</div>}

      {isLoading && (
        <div className="flex justify-center p-6">
          <Loader className="animate-spin text-blue-500" />
        </div>
      )}

      {hasMore && !isLoading && activities.length > 0 && (
        <div className="p-4 text-center border-t">
          <button
            onClick={handleLoadMore}
            className="text-blue-500 hover:text-blue-700 font-medium"
          >
            Load More Activities
          </button>
        </div>
      )}
    </div>
  );
}
