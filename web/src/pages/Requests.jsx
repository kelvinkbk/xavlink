import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { requestService } from "../services/api";
import PageTransition from "../components/PageTransition";
import LoadingSpinner from "../components/LoadingSpinner";
import SkeletonLoader from "../components/SkeletonLoader";
import { useToast } from "../context/ToastContext";

function RequestCard({ request, onStatusUpdate }) {
  const [updating, setUpdating] = useState(false);
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

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <img
            src={
              request.fromUser.profilePic ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                request.fromUser.name
              )}&background=3b82f6&color=fff`
            }
            alt={request.fromUser.name}
            className="w-12 h-12 rounded-full mr-3"
          />
          <div>
            <h3 className="font-semibold text-secondary">
              {request.fromUser.name}
            </h3>
            <p className="text-sm text-gray-500">{request.fromUser.course}</p>
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-semibold ${
            request.status === "pending"
              ? "bg-yellow-100 text-yellow-800"
              : request.status === "accepted"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
        </span>
      </div>

      <div className="mb-4 pb-4 border-b border-gray-200">
        <h4 className="font-semibold text-secondary mb-2">Skill Requested:</h4>
        <p className="text-gray-600">
          {request.skill?.title || "Unknown Skill"}
        </p>
      </div>

      {request.status === "pending" && (
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
        </div>
      )}
    </div>
  );
}

export default function Requests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { showToast } = useToast();

  useEffect(() => {
    const fetchRequests = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        const { data } = await requestService.getReceived(user.id);
        setRequests(data);
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
  }, [user?.id]);

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto py-8">
        <h1 className="text-3xl font-bold text-secondary mb-6">
          Skill Requests
        </h1>

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
              onStatusUpdate={() => {
                // Refetch after update
                const refetch = async () => {
                  const { data } = await requestService.getReceived(user.id);
                  setRequests(data);
                };
                refetch();
              }}
            />
          ))
        )}
      </div>
    </PageTransition>
  );
}
