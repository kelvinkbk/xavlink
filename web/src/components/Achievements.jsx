import { useState, useEffect } from "react";
import { enhancementService } from "../services/api";
import LoadingSpinner from "./LoadingSpinner";

const achievementIcons = {
  top_skill: "🏆",
  most_followers: "👥",
  most_posts: "📝",
  verified: "✅",
  early_adopter: "🚀",
  contributor: "💡",
  default: "⭐",
};

export default function Achievements({ userId }) {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const { achievements: achievementsData } = await enhancementService.getAchievements(userId);
        setAchievements(achievementsData || []);
      } catch (error) {
        console.error("Failed to fetch achievements:", error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchAchievements();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <LoadingSpinner />
      </div>
    );
  }

  if (achievements.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-bold text-secondary mb-4">Achievements</h2>
        <p className="text-gray-500 text-center py-4">No achievements yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-bold text-secondary mb-4">Achievements</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievements.map((achievement) => (
          <div
            key={achievement.id}
            className="flex items-start p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="text-4xl mr-4">
              {achievement.icon || achievementIcons[achievement.type] || achievementIcons.default}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800">{achievement.title}</h3>
              {achievement.description && (
                <p className="text-sm text-gray-600 mt-1">{achievement.description}</p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Earned {new Date(achievement.earnedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
