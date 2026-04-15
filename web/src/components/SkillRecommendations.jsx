import React, { useState, useEffect } from "react";
import { Brain, RefreshCw, Loader, AlertCircle } from "lucide-react";
import { enhancementService } from "../services/api";

export default function SkillRecommendations() {
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [lastGenerated, setLastGenerated] = useState(null);

  const loadRecommendations = async () => {
    try {
      setIsLoading(true);
      setError("");
      const data = await enhancementService.getSkillRecommendations();
      setRecommendations(data?.recommendations || []);
      setLastGenerated(data?.lastGenerated);
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Failed to load recommendations";
      setError(errorMsg);
      console.error("Error loading recommendations:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const generateRecommendations = async () => {
    try {
      setIsGenerating(true);
      setError("");
      const data = await enhancementService.generateSkillRecommendations();
      setRecommendations(data?.recommendations || []);
      setLastGenerated(new Date().toISOString());
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        "Failed to generate recommendations. Please try again.";
      setError(errorMsg);
      console.error("Error generating recommendations:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, []);

  const getScoreColor = (score) => {
    if (score >= 0.8) return "text-green-600";
    if (score >= 0.6) return "text-blue-600";
    if (score >= 0.4) return "text-yellow-600";
    return "text-orange-600";
  };

  const getScoreBgColor = (score) => {
    if (score >= 0.8) return "bg-green-100";
    if (score >= 0.6) return "bg-blue-100";
    if (score >= 0.4) return "bg-yellow-100";
    return "bg-orange-100";
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain size={24} className="text-purple-500" />
          <h2 className="text-2xl font-bold text-gray-900">
            Skill Recommendations
          </h2>
        </div>
        <button
          onClick={generateRecommendations}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 transition"
          aria-label="Regenerate skill recommendations"
          title="Generate new recommendations based on your profile"
        >
          {isGenerating ? (
            <>
              <Loader size={16} className="animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <RefreshCw size={16} />
              Regenerate
            </>
          )}
        </button>
      </div>

      {lastGenerated && (
        <div className="px-6 py-3 bg-blue-50 text-sm text-blue-700 border-b">
          Last updated: {new Date(lastGenerated).toLocaleDateString()} at{" "}
          {new Date(lastGenerated).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      )}

      {error && (
        <div className="px-6 py-4 bg-red-50 border-b border-red-200 text-red-700 flex items-center gap-2">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="divide-y" role="list">
        {isLoading && (
          <div className="flex justify-center p-6">
            <Loader className="animate-spin text-purple-500" size={32} />
          </div>
        )}
        {recommendations.length === 0 && !isLoading ? (
          <div className="p-6 text-center text-gray-500">
            <p>
              No recommendations yet. Generate recommendations to get started!
            </p>
          </div>
        ) : (
          recommendations.map((rec) => (
            <div
              key={rec.id}
              className="p-4 hover:bg-gray-50 transition"
              role="listitem"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {rec.skillName}
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">{rec.reason}</p>
                </div>
                <div
                  className={`px-4 py-2 rounded-lg text-right ml-4 ${getScoreBgColor(
                    rec.score,
                  )}`}
                  aria-label={`Recommendation score: ${(rec.score * 100).toFixed(0)}%`}
                >
                  <p
                    className={`font-bold text-sm ${getScoreColor(rec.score)}`}
                  >
                    {(rec.score * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
