import { useState } from "react";
import { skillService } from "../services/api";

const SKILL_CATEGORIES = [
  "Programming",
  "Design",
  "Marketing",
  "Business",
  "Content Writing",
  "Data Science",
  "DevOps",
  "Mobile Development",
  "Web Development",
  "Other",
];

const AddSkillModal = ({ isOpen, onClose, onSuccess }) => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Programming");
  const [description, setDescription] = useState("");
  const [proficiency, setProficiency] = useState("intermediate");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAddSkill = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Skill name is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await skillService.addSkill({
        title: title.trim(),
        category,
        description: description.trim(),
        proficiency,
      });
      setTitle("");
      setDescription("");
      setCategory("Programming");
      setProficiency("intermediate");
      setError("");
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add skill");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} className="fixed inset-0 bg-black/50 z-40" />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Add Skill
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          {/* Form */}
          <form
            onSubmit={handleAddSkill}
            className="p-4 max-h-96 overflow-y-auto"
          >
            {error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded">
                {error}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Skill Name *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
                placeholder="e.g., React, UI Design"
                className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={loading}
                className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                {SKILL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                placeholder="Tell us about this skill..."
                className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none"
                rows="3"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Proficiency Level *
              </label>
              <select
                value={proficiency}
                onChange={(e) => setProficiency(e.target.value)}
                disabled={loading}
                className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="expert">Expert</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-slate-700">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !title.trim()}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Adding..." : "Add Skill"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default AddSkillModal;
