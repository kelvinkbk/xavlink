import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { skillService, requestService } from "../services/api";
import PageTransition from "../components/PageTransition";
import LoadingSpinner from "../components/LoadingSpinner";
import SkeletonLoader from "../components/SkeletonLoader";
import { useToast } from "../context/ToastContext";

function SkillCard({ skill, onRequest }) {
  return (
    <div className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold text-secondary text-lg">
            {skill.title}
          </h3>
          <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded mt-1">
            {skill.category}
          </span>
        </div>
        {skill.priceRange && (
          <p className="text-primary font-semibold">{skill.priceRange}</p>
        )}
      </div>

      <p className="text-gray-600 text-sm mb-3">{skill.description}</p>

      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
        <span className="text-xs text-gray-500">{skill.user?.name}</span>
        <button
          onClick={() => onRequest(skill)}
          className="bg-primary text-white px-4 py-1 rounded text-sm hover:bg-blue-600 transition"
        >
          Request Skill
        </button>
      </div>
    </div>
  );
}

export default function Skills() {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [skills, setSkills] = useState([]);
  const [search, setSearch] = useState("");
  const [newSkill, setNewSkill] = useState({
    title: "",
    description: "",
    category: "Web Development",
    priceRange: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        setLoading(true);
        const { data } = await skillService.searchSkills(search);
        setSkills(data);
      } catch (e) {
        console.error("Error fetching skills:", e);
        setError("Failed to load skills");
        showToast("Failed to load skills", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchSkills();
  }, [search, showToast]);

  const handleAddSkill = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await skillService.addSkill(newSkill);
      setNewSkill({
        title: "",
        description: "",
        category: "Web Development",
        priceRange: "",
      });
      setShowForm(false);
      // Refetch skills after adding new skill
      const { data } = await skillService.searchSkills(search);
      setSkills(data);
      showToast("Skill added", "success");
    } catch (e) {
      console.error("Error adding skill:", e);
      setError(e.response?.data?.message || "Failed to add skill");
      showToast(e.response?.data?.message || "Failed to add skill", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestSkill = async (skill) => {
    if (!isAuthenticated) {
      showToast("Please login to request skills", "error");
      return;
    }

    try {
      await requestService.sendRequest({
        toUserId: skill.userId,
        skillId: skill.id,
      });
      showToast(`Request sent for "${skill.title}"!`, "success");
    } catch (e) {
      console.error("Error requesting skill:", e);
      showToast(e.response?.data?.message || "Failed to send request", "error");
    }
  };

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-secondary">
            Skills Marketplace
          </h1>
          {isAuthenticated && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition"
            >
              {showForm ? "Cancel" : "Add Skill"}
            </button>
          )}
        </div>

        {showForm && isAuthenticated && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-2xl font-semibold text-secondary mb-4">
              Add New Skill
            </h2>
            {error && (
              <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleAddSkill} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Skill Title
                </label>
                <input
                  type="text"
                  value={newSkill.title}
                  onChange={(e) =>
                    setNewSkill({ ...newSkill, title: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={newSkill.description}
                  onChange={(e) =>
                    setNewSkill({ ...newSkill, description: e.target.value })
                  }
                  required
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <select
                    value={newSkill.category}
                    onChange={(e) =>
                      setNewSkill({ ...newSkill, category: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  >
                    <option>Web Development</option>
                    <option>Mobile Development</option>
                    <option>Data Science</option>
                    <option>UI/UX Design</option>
                    <option>Tutoring</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Price Range
                  </label>
                  <input
                    type="text"
                    value={newSkill.priceRange}
                    onChange={(e) =>
                      setNewSkill({ ...newSkill, priceRange: e.target.value })
                    }
                    placeholder="e.g., ₹150-200/hr"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary text-white py-2 rounded-lg hover:bg-blue-600 transition font-semibold disabled:opacity-50"
              >
                {submitting ? "Adding Skill..." : "Add Skill"}
              </button>
            </form>
          </div>
        )}

        <div className="mb-6">
          <input
            type="text"
            placeholder="Search skills by title or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
          />
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <SkeletonLoader type="card" />
              <SkeletonLoader type="card" />
              <SkeletonLoader type="card" />
            </div>
            <div className="flex justify-center py-6">
              <LoadingSpinner />
            </div>
          </div>
        ) : skills.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <p className="text-gray-500">
              No skills found. Try a different search.
            </p>
            <button
              onClick={async () => {
                setLoading(true);
                try {
                  const { data } = await skillService.searchSkills(search);
                  setSkills(data);
                  showToast("Skills refreshed", "success");
                } catch (e) {
                  console.error("Refresh failed:", e);
                  setError("Failed to load skills");
                  showToast("Failed to load skills", "error");
                } finally {
                  setLoading(false);
                }
              }}
              className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {skills.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                onRequest={handleRequestSkill}
              />
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
