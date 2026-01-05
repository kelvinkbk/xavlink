import { useState } from "react";
import { reportService } from "../services/api";
import { useToast } from "../context/ToastContext";

export default function ReportModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetName,
}) {
  const { showToast } = useToast();
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reasons = [
    { value: "spam", label: "Spam or misleading" },
    { value: "harassment", label: "Harassment or bullying" },
    { value: "inappropriate_content", label: "Inappropriate content" },
    { value: "misinformation", label: "Misinformation" },
    { value: "copyright", label: "Copyright issue" },
    { value: "other", label: "Other" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) {
      showToast("Please select a reason", "error");
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      showToast("Description must be at least 10 characters", "error");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        reason,
        description: description.trim(),
      };
      if (targetType === "User") {
        payload.reportedUserId = targetId;
      } else if (targetType === "Post") {
        payload.reportedPostId = targetId;
      }
      console.log("Sending report payload:", payload);
      await reportService.createReport(payload);
      showToast("Report submitted successfully", "success");
      onClose();
      // Reset form
      setReason("");
      setDescription("");
    } catch (err) {
      showToast(
        err?.response?.data?.message || "Failed to submit report",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason("");
    setDescription("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-secondary">
            Report {targetType}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Help us understand what's wrong with this {targetType.toLowerCase()}.
          {targetName && (
            <span className="block mt-1 font-medium">{targetName}</span>
          )}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for reporting <span className="text-red-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-900"
            >
              <option value="">Select a reason...</option>
              {reasons.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional details <span className="text-red-500">*</span>{" "}
              (minimum 10 characters)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide more context..."
              rows={4}
              maxLength={500}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-900 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              {description.length}/500 characters
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !reason}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </form>

        <p className="text-xs text-gray-500 mt-4">
          Reports are reviewed by our moderation team. False reports may result
          in action against your account.
        </p>
      </div>
    </div>
  );
}
