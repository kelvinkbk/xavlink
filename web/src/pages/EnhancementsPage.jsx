import React, { useState, useEffect } from "react";
import { Calendar, Trash2, AlertCircle } from "lucide-react";
import { enhancementService } from "../services/api";
import SchedulePostModal from "../components/SchedulePostModal";
import ActivityTimeline from "../components/ActivityTimeline";
import SkillRecommendations from "../components/SkillRecommendations";
import SystemHealthDashboard from "../components/SystemHealthDashboard";

export default function EnhancementsPage() {
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("scheduled");

  const loadScheduledPosts = async () => {
    try {
      setIsLoading(true);
      const data = await enhancementService.getScheduledPosts();
      setScheduledPosts(data.posts || []);
    } catch (error) {
      setError("Failed to load scheduled posts");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadScheduledPosts();
  }, []);

  const handleCancelPost = async (postId) => {
    if (
      !window.confirm("Are you sure you want to cancel this scheduled post?")
    ) {
      return;
    }

    try {
      await enhancementService.cancelScheduledPost(postId);
      setScheduledPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      console.error("Failed to cancel post:", err);
      setError("Failed to cancel post");
    }
  };

  const formatScheduledTime = (date) => {
    const d = new Date(date);
    return (
      d.toLocaleDateString() +
      " at " +
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  const tabs = [
    { id: "scheduled", label: "Scheduled Posts" },
    { id: "activity", label: "Activity Timeline" },
    { id: "skills", label: "Skill Recommendations" },
    { id: "health", label: "System Health" },
  ];

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Enhancements</h1>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 bg-white rounded-lg shadow p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-2 rounded font-medium transition ${
                activeTab === tab.id
                  ? "bg-blue-500 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scheduled Posts Tab */}
        {activeTab === "scheduled" && (
          <div>
            <div className="mb-6">
              <button
                onClick={() => setShowScheduleModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                <Calendar size={20} />
                Schedule New Post
              </button>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle
                  size={20}
                  className="text-red-600 flex-shrink-0 mt-0.5"
                />
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {isLoading ? (
              <div className="text-center p-8 bg-white rounded-lg shadow">
                <p className="text-gray-500">Loading scheduled posts...</p>
              </div>
            ) : scheduledPosts.length === 0 ? (
              <div className="text-center p-8 bg-white rounded-lg shadow">
                <Calendar size={48} className="mx-auto text-gray-400 mb-3" />
                <p className="text-gray-500 text-lg">No scheduled posts yet</p>
                <p className="text-gray-400 text-sm mt-1">
                  Schedule your first post to see it here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {scheduledPosts.map((post) => (
                  <div key={post.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Scheduled for {formatScheduledTime(post.scheduledAt)}
                        </h3>
                      </div>
                      <button
                        onClick={() => handleCancelPost(post.id)}
                        className="text-red-500 hover:text-red-700 p-2"
                        title="Cancel scheduled post"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>

                    <p className="text-gray-700 whitespace-pre-wrap">
                      {post.content}
                    </p>

                    {post.image && (
                      <img
                        src={post.image}
                        alt="Post"
                        className="mt-4 rounded-lg max-w-md max-h-64 object-cover"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Activity Timeline Tab */}
        {activeTab === "activity" && <ActivityTimeline />}

        {/* Skill Recommendations Tab */}
        {activeTab === "skills" && <SkillRecommendations />}

        {/* System Health Tab */}
        {activeTab === "health" && <SystemHealthDashboard />}
      </div>

      {/* Schedule Post Modal */}
      <SchedulePostModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onSuccess={loadScheduledPosts}
      />
    </div>
  );
}
