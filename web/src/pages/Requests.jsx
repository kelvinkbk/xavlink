import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { requestService, enhancementService } from "../services/api";
import PageTransition from "../components/PageTransition";
import LoadingSpinner from "../components/LoadingSpinner";
import SkeletonLoader from "../components/SkeletonLoader";
import { useToast } from "../context/ToastContext";

function RequestCard({ request, onStatusUpdate, isReceived }) {
  const [updating, setUpdating] = useState(false);
  const [showCounterOffer, setShowCounterOffer] = useState(false);
  const [counterOffer, setCounterOffer] = useState("");
  const [counterPrice, setCounterPrice] = useState("");
  const { showToast } = useToast();

  const handleUpdateStatus = async (status) => {
    setUpdating(true);
    try {
      await requestService.updateStatus(request.id, status);
      onStatusUpdate();
      showToast(
        status === "accepted" ? "Request accepted" : "Request rejected",
        "success"
      );
    } catch (e) {
      console.error("Error updating status:", e);
      showToast("Failed to update request status", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleSendCounterOffer = async () => {
    if (!counterOffer.trim()) {
      showToast("Please enter a counter-offer message", "error");
      return;
    }
    setUpdating(true);
    try {
      await enhancementService.sendCounterOffer(request.id, {
        counterOffer,
        counterPrice: counterPrice || null,
      });
      setShowCounterOffer(false);
      setCounterOffer("");
      setCounterPrice("");
      onStatusUpdate();
      showToast("Counter-offer sent", "success");
    } catch (e) {
      console.error("Error sending counter-offer:", e);
      showToast("Failed to send counter-offer", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleComplete = async () => {
    if (!window.confirm("Mark this request as completed?")) return;
    setUpdating(true);
    try {
      await enhancementService.completeRequest(request.id);
      onStatusUpdate();
      showToast("Request marked as completed", "success");
    } catch (e) {
      console.error("Error completing request:", e);
      showToast("Failed to complete request", "error");
    } finally {
      setUpdating(false);
    }
  };

  const isUrgent = request.isUrgent;
  const deadline = request.deadline ? new Date(request.deadline) : null;
  const isOverdue =
    deadline && deadline < new Date() && request.status === "pending";

  return (
    <div
      className={`bg-white rounded-lg shadow p-6 mb-4 ${
        isOverdue
          ? "border-2 border-red-500"
          : isUrgent
          ? "border-2 border-orange-500"
          : ""
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <img
            src={
              request.fromUser?.profilePic ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                request.fromUser?.name || "User"
              )}&background=3b82f6&color=fff`
            }
            alt={request.fromUser?.name}
            className="w-12 h-12 rounded-full mr-3"
          />
          <div>
            <h3 className="font-semibold text-secondary">
              {request.fromUser?.name || "Unknown User"}
            </h3>
            <p className="text-sm text-gray-500">{request.fromUser?.course}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isUrgent && (
            <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded">
              ⚠️ Urgent
            </span>
          )}
          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold ${
              request.status === "pending"
                ? "bg-yellow-100 text-yellow-800"
                : request.status === "accepted"
                ? "bg-green-100 text-green-800"
                : request.status === "completed"
                ? "bg-blue-100 text-blue-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
          </span>
        </div>
      </div>

      <div className="mb-4 pb-4 border-b border-gray-200">
        <h4 className="font-semibold text-secondary mb-2">Skill Requested:</h4>
        <p className="text-gray-600">
          {request.skill?.title || "Unknown Skill"}
        </p>
        {request.message && (
          <div className="mt-2 p-3 bg-gray-50 rounded">
            <p className="text-sm text-gray-700">{request.message}</p>
          </div>
        )}
        {deadline && (
          <div
            className={`mt-2 text-sm ${
              isOverdue ? "text-red-600 font-semibold" : "text-gray-600"
            }`}
          >
            📅 Deadline: {deadline.toLocaleDateString()}{" "}
            {isOverdue && "(Overdue)"}
          </div>
        )}
        {request.counterOffer && (
          <div className="mt-2 p-3 bg-blue-50 rounded border border-blue-200">
            <p className="text-sm font-semibold text-blue-800">
              Counter-offer:
            </p>
            <p className="text-sm text-blue-700">{request.counterOffer}</p>
            {request.counterPrice && (
              <p className="text-sm text-blue-700 mt-1">
                Price: {request.counterPrice}
              </p>
            )}
          </div>
        )}
      </div>

      {request.status === "pending" && isReceived && (
        <div className="space-y-3">
          <div className="flex gap-3">
            <button
              onClick={() => handleUpdateStatus("accepted")}
              disabled={updating}
              className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              {updating ? "Processing..." : "Accept"}
            </button>
            <button
              onClick={() => handleUpdateStatus("rejected")}
              disabled={updating}
              className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
            >
              {updating ? "Processing..." : "Reject"}
            </button>
            <button
              onClick={() => setShowCounterOffer(!showCounterOffer)}
              disabled={updating}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {showCounterOffer ? "Cancel" : "Counter-offer"}
            </button>
          </div>
          {showCounterOffer && (
            <div className="p-4 bg-gray-50 rounded-lg space-y-3">
              <textarea
                value={counterOffer}
                onChange={(e) => setCounterOffer(e.target.value)}
                placeholder="Enter your counter-offer message..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                rows="3"
              />
              <input
                type="text"
                value={counterPrice}
                onChange={(e) => setCounterPrice(e.target.value)}
                placeholder="Counter price (optional)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleSendCounterOffer}
                disabled={updating || !counterOffer.trim()}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                Send Counter-offer
              </button>
            </div>
          )}
        </div>
      )}

      {request.status === "accepted" && (
        <button
          onClick={handleComplete}
          disabled={updating}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {updating ? "Processing..." : "Mark as Completed"}
        </button>
      )}
    </div>
  );
}

export default function Requests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("received"); // "received" or "sent" or "history"
  const [templates, setTemplates] = useState([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ title: "", message: "" });
  const { showToast } = useToast();

  useEffect(() => {
    const fetchRequests = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        if (activeTab === "received") {
          const { data } = await requestService.getReceived(user.id);
          setRequests(data || []);
        } else if (activeTab === "sent" || activeTab === "history") {
          const { requests: historyData } =
            await enhancementService.getRequestHistory(
              activeTab === "sent" ? "sent" : "sent"
            );
          setRequests(historyData || []);
        }
      } catch (e) {
        console.error("Error fetching requests:", e);
        setError("Failed to load requests");
        showToast("Failed to load requests", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, activeTab]);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const { templates: templatesData } =
          await enhancementService.getRequestTemplates();
        setTemplates(templatesData || []);
      } catch (e) {
        console.error("Error fetching templates:", e);
      }
    };
    if (user?.id) {
      fetchTemplates();
    }
  }, [user?.id]);

  const handleCreateTemplate = async () => {
    if (!newTemplate.title.trim() || !newTemplate.message.trim()) {
      showToast("Please fill in all fields", "error");
      return;
    }
    try {
      await enhancementService.createRequestTemplate(newTemplate);
      setNewTemplate({ title: "", message: "" });
      setShowTemplateModal(false);
      const { templates: templatesData } =
        await enhancementService.getRequestTemplates();
      setTemplates(templatesData || []);
      showToast("Template created", "success");
    } catch (e) {
      console.error("Error creating template:", e);
      showToast("Failed to create template", "error");
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm("Delete this template?")) return;
    try {
      await enhancementService.deleteRequestTemplate(templateId);
      setTemplates(templates.filter((t) => t.id !== templateId));
      showToast("Template deleted", "success");
    } catch (e) {
      console.error("Error deleting template:", e);
      showToast("Failed to delete template", "error");
    }
  };

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-secondary">Skill Requests</h1>
          <button
            onClick={() => setShowTemplateModal(true)}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            📝 Templates
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("received")}
            className={`px-4 py-2 font-semibold ${
              activeTab === "received"
                ? "border-b-2 border-primary text-primary"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Received
          </button>
          <button
            onClick={() => setActiveTab("sent")}
            className={`px-4 py-2 font-semibold ${
              activeTab === "sent"
                ? "border-b-2 border-primary text-primary"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Sent
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 font-semibold ${
              activeTab === "history"
                ? "border-b-2 border-primary text-primary"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            History
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded mb-4 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={async () => {
                setError("");
                setLoading(true);
                try {
                  const { data } = await requestService.getReceived(user.id);
                  setRequests(data);
                  showToast("Requests refreshed", "success");
                } catch (e) {
                  console.error("Retry failed:", e);
                  setError("Failed to load requests");
                  showToast("Failed to load requests", "error");
                } finally {
                  setLoading(false);
                }
              }}
              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div>
            <SkeletonLoader type="card" />
            <SkeletonLoader type="card" />
            <div className="flex justify-center py-6">
              <LoadingSpinner />
            </div>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <p className="text-gray-500">No skill requests yet.</p>
            <button
              onClick={async () => {
                setLoading(true);
                try {
                  const { data } = await requestService.getReceived(user.id);
                  setRequests(data);
                  showToast("Requests refreshed", "success");
                } catch (e) {
                  console.error("Refresh failed:", e);
                  showToast("Failed to load requests", "error");
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
          requests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              currentUserId={user?.id}
              isReceived={activeTab === "received"}
              onStatusUpdate={() => {
                // Refetch after update
                const refetch = async () => {
                  if (activeTab === "received") {
                    const { data } = await requestService.getReceived(user.id);
                    setRequests(data || []);
                  } else if (activeTab === "history") {
                    const { requests: historyData } =
                      await enhancementService.getRequestHistory("sent");
                    setRequests(historyData || []);
                  }
                };
                refetch();
              }}
            />
          ))
        )}

        {/* Template Modal */}
        {showTemplateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-2xl font-bold text-secondary mb-4">
                Request Templates
              </h2>

              <div className="mb-4">
                <h3 className="font-semibold mb-2">Create New Template</h3>
                <input
                  type="text"
                  value={newTemplate.title}
                  onChange={(e) =>
                    setNewTemplate({ ...newTemplate, title: e.target.value })
                  }
                  placeholder="Template title"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2"
                />
                <textarea
                  value={newTemplate.message}
                  onChange={(e) =>
                    setNewTemplate({ ...newTemplate, message: e.target.value })
                  }
                  placeholder="Template message"
                  rows="4"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <button
                  onClick={handleCreateTemplate}
                  className="mt-2 w-full bg-primary text-white py-2 rounded-lg hover:bg-blue-600"
                >
                  Create Template
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto">
                <h3 className="font-semibold mb-2">Saved Templates</h3>
                {templates.length === 0 ? (
                  <p className="text-gray-500 text-sm">No templates yet</p>
                ) : (
                  templates.map((template) => (
                    <div
                      key={template.id}
                      className="p-3 bg-gray-50 rounded mb-2 flex justify-between items-start"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-sm">
                          {template.title}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {template.message}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="ml-2 text-red-600 hover:text-red-800"
                      >
                        🗑️
                      </button>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => setShowTemplateModal(false)}
                className="mt-4 w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
