import { useEffect, useState } from "react";
import {
  moderationService,
  postService,
  reviewService,
  reportService,
  auditService,
  adminService,
} from "../services/api";

export default function Moderation() {
  const [tab, setTab] = useState("users");
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await adminService.getStats();
        setStats(data);
      } catch (e) {
        console.error("Failed to load stats:", e);
      }
    };
    loadStats();
  }, []);

  return (
    <div className="p-6 space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Moderation</h1>
        <p className="text-sm text-gray-500">
          Suspend users, remove content, review reports, and view activity logs
        </p>
      </header>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="border rounded p-4 alert-primary">
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <div className="text-sm text-gray-600">Total Users</div>
          </div>
          <div className="border rounded p-4 alert-success">
            <div className="text-2xl font-bold">{stats.verifiedUsers}</div>
            <div className="text-sm text-gray-600">Verified</div>
          </div>
          <div className="border rounded p-4 alert-danger">
            <div className="text-2xl font-bold">{stats.suspendedUsers}</div>
            <div className="text-sm text-gray-600">Suspended</div>
          </div>
          <div className="border rounded p-4 alert-primary">
            <div className="text-2xl font-bold">{stats.totalPosts}</div>
            <div className="text-sm text-gray-600">Total Posts</div>
          </div>
          <div className="border rounded p-4 alert-warning">
            <div className="text-2xl font-bold">{stats.postsThisWeek}</div>
            <div className="text-sm text-gray-600">Posts This Week</div>
          </div>
        </div>
      )}

      <div className="flex gap-2 border-b">
        {["users", "posts", "comments", "reviews", "reports", "logs"].map(
          (t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 font-semibold ${
                tab === t ? "border-b-2 border-blue-600" : "text-gray-500"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          )
        )}
      </div>

      {tab === "users" && <UsersSection />}
      {tab === "posts" && <PostsSection />}
      {tab === "comments" && <CommentsSection />}
      {tab === "reviews" && <ReviewsSection />}
      {tab === "reports" && <ReportsSection />}
      {tab === "logs" && <ActivityLogsSection />}
    </div>
  );
}

function UsersSection() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [suspended, setSuspended] = useState("");
  const [users, setUsers] = useState([]);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await moderationService.listUsers({
        search: search || undefined,
        suspended: suspended || undefined,
      });
      setUsers(data.users || []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suspended]);

  const toggleSuspend = async (id, isSuspended) => {
    try {
      await moderationService.setSuspended(id, !isSuspended);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to update suspension");
    }
  };

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Users</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          className="border rounded px-3 py-2"
          placeholder="Search name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <select
          className="border rounded px-3 py-2"
          value={suspended}
          onChange={(e) => setSuspended(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="false">Active</option>
          <option value="true">Suspended</option>
        </select>
        <div />
        <button
          className="bg-blue-600 text-white rounded px-4 py-2"
          onClick={load}
          disabled={loading}
        >
          Refresh
        </button>
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="overflow-x-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Role</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-4" colSpan={5}>
                  Loading...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td className="px-4 py-4" colSpan={5}>
                  No users
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-2">{u.name}</td>
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2">{u.role}</td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        u.isSuspended ? "text-red-600" : "text-green-600"
                      }
                    >
                      {u.isSuspended ? "Suspended" : "Active"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      className="border rounded px-2 py-1"
                      onClick={() => toggleSuspend(u.id, u.isSuspended)}
                    >
                      {u.isSuspended ? "Unsuspend" : "Suspend"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PostsSection() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [posts, setPosts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ content: "" });

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await postService.getAllPosts("all");
      setPosts(Array.isArray(data) ? data : data?.posts || []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startEdit = (post) => {
    setEditingId(post.id);
    setEditForm({ content: post.content || "" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ content: "" });
  };

  const saveEdit = async (id) => {
    try {
      await moderationService.editPost(id, editForm);
      cancelEdit();
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to update post");
    }
  };

  const remove = async (id) => {
    try {
      await moderationService.deletePost(id);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to delete post");
    }
  };

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Posts</h2>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="space-y-2">
        {loading ? (
          <div>Loading...</div>
        ) : posts.length === 0 ? (
          <div>No posts</div>
        ) : (
          posts.slice(0, 50).map((p) => {
            const isEditing = editingId === p.id;
            return (
              <div
                key={p.id}
                className="border rounded p-3 flex items-start justify-between gap-3"
              >
                <div className="flex-1">
                  <div className="text-sm text-gray-500 mb-1">ID: {p.id}</div>
                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        className="border rounded px-2 py-1 w-full"
                        rows={3}
                        placeholder="Content"
                        value={editForm.content}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            content: e.target.value,
                          }))
                        }
                      />
                    </div>
                  ) : (
                    <>
                      <div>{p.content || "(no content)"}</div>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <button
                        className="border rounded px-2 py-1"
                        onClick={() => saveEdit(p.id)}
                      >
                        Save
                      </button>
                      <button
                        className="border rounded px-2 py-1"
                        onClick={cancelEdit}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="border rounded px-2 py-1"
                        onClick={() => startEdit(p)}
                      >
                        Edit
                      </button>
                      <button
                        className="border rounded px-2 py-1 text-red-600"
                        onClick={() => remove(p.id)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function CommentsSection() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [comments, setComments] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await moderationService.listComments({ limit: 100 });
        setComments(data.comments || []);
      } catch (e) {
        setError(e?.response?.data?.message || "Failed to load comments");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const remove = async (id) => {
    try {
      await moderationService.deleteComment(id);
      const data = await moderationService.listComments({ limit: 100 });
      setComments(data.comments || []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to delete comment");
    }
  };

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Comments</h2>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="space-y-2">
        {loading ? (
          <div>Loading...</div>
        ) : comments.length === 0 ? (
          <div>No comments</div>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              className="border rounded p-3 flex items-start justify-between gap-3"
            >
              <div className="flex-1">
                <div className="font-semibold">{c.user?.name}</div>
                <div className="text-sm text-gray-500">{c.user?.email}</div>
                <div className="my-2">{c.text}</div>
                <div className="text-xs text-gray-400">
                  Post: {c.post?.content?.substring(0, 50)}...
                </div>
              </div>
              <button
                className="border rounded px-2 py-1 text-red-600"
                onClick={() => remove(c.id)}
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function ReviewsSection() {
  const [userId, setUserId] = useState("");
  const [postId, setPostId] = useState("");
  const [userReviews, setUserReviews] = useState([]);
  const [postReviews, setPostReviews] = useState([]);
  const [loadingU, setLoadingU] = useState(false);
  const [loadingP, setLoadingP] = useState(false);
  const [error, setError] = useState("");

  const loadUser = async () => {
    if (!userId) return;
    try {
      setLoadingU(true);
      setError("");
      const data = await reviewService.getUserReviews(userId);
      setUserReviews(data.reviews || []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load user reviews");
    } finally {
      setLoadingU(false);
    }
  };

  const loadPost = async () => {
    if (!postId) return;
    try {
      setLoadingP(true);
      setError("");
      const data = await reviewService.getPostReviews(postId);
      setPostReviews(data.reviews || []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load post reviews");
    } finally {
      setLoadingP(false);
    }
  };

  const removeUserReview = async (id) => {
    try {
      await moderationService.deleteUserReview(id);
      await loadUser();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to delete review");
    }
  };

  const removePostReview = async (id) => {
    try {
      await moderationService.deletePostReview(id);
      await loadPost();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to delete review");
    }
  };

  return (
    <section className="space-y-6">
      <h2 className="text-xl font-semibold">Reviews</h2>
      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h3 className="font-semibold">User Reviews</h3>
          <div className="flex gap-2">
            <input
              className="border rounded px-3 py-2"
              placeholder="User ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
            <button
              className="bg-blue-600 text-white rounded px-4 py-2"
              onClick={loadUser}
              disabled={!userId || loadingU}
            >
              Load
            </button>
          </div>
          <div className="space-y-2">
            {loadingU ? (
              <div>Loading...</div>
            ) : userReviews.length === 0 ? (
              <div>No reviews</div>
            ) : (
              userReviews.map((r) => (
                <div
                  key={r.id}
                  className="border rounded p-3 flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="text-sm text-gray-500">ID: {r.id}</div>
                    <div>Rating: {r.rating} / 5</div>
                    <div>{r.comment}</div>
                  </div>
                  <button
                    className="border rounded px-2 py-1 text-red-600"
                    onClick={() => removeUserReview(r.id)}
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold">Post Reviews</h3>
          <div className="flex gap-2">
            <input
              className="border rounded px-3 py-2"
              placeholder="Post ID"
              value={postId}
              onChange={(e) => setPostId(e.target.value)}
            />
            <button
              className="bg-blue-600 text-white rounded px-4 py-2"
              onClick={loadPost}
              disabled={!postId || loadingP}
            >
              Load
            </button>
          </div>
          <div className="space-y-2">
            {loadingP ? (
              <div>Loading...</div>
            ) : postReviews.length === 0 ? (
              <div>No reviews</div>
            ) : (
              postReviews.map((r) => (
                <div
                  key={r.id}
                  className="border rounded p-3 flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="text-sm text-gray-500">ID: {r.id}</div>
                    <div>Rating: {r.rating} / 5</div>
                    <div>{r.comment}</div>
                  </div>
                  <button
                    className="border rounded px-2 py-1 text-red-600"
                    onClick={() => removePostReview(r.id)}
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ReportsSection() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("pending");
  const [reports, setReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMessageIds, setSelectedMessageIds] = useState(new Set());

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await reportService.listReports({ status });
        setReports(data.reports || []);
      } catch (e) {
        setError(e?.response?.data?.message || "Failed to load reports");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [status]);

  const updateStatus = async (id, newStatus) => {
    try {
      await reportService.updateReportStatus(id, newStatus);
      const data = await reportService.listReports({ status });
      setReports(data.reports || []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to update report");
    }
  };

  const deleteReportedMessage = async (report) => {
    if (!report.reportedMessageId) return;

    // Find chatId from description if available
    const chatIdMatch = report.description?.match(/Chat ID: ([a-f0-9-]+)/i);
    if (!chatIdMatch) {
      alert("Cannot delete message: Chat ID not found in report");
      return;
    }

    const chatId = chatIdMatch[1];

    if (window.confirm("Delete this reported message?")) {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/chats/${chatId}/messages/${
            report.reportedMessageId
          }`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        if (!response.ok) throw new Error("Failed to delete message");

        // Auto-resolve the report
        await updateStatus(report.id, "resolved");
        alert("Message deleted and report resolved");
      } catch (e) {
        setError(e?.message || "Failed to delete message");
      }
    }
  };

  const bulkDeleteMessages = async () => {
    if (selectedMessageIds.size === 0) {
      alert("Select messages to delete");
      return;
    }

    if (!window.confirm(`Delete ${selectedMessageIds.size} messages?`)) {
      return;
    }

    const selectedReports = reports.filter((r) =>
      selectedMessageIds.has(r.reportedMessageId)
    );

    let deletedCount = 0;
    for (const report of selectedReports) {
      const chatIdMatch = report.description?.match(/Chat ID: ([a-f0-9-]+)/i);
      if (!chatIdMatch) continue;

      try {
        await fetch(
          `${import.meta.env.VITE_API_URL}/chats/${chatIdMatch[1]}/messages/${
            report.reportedMessageId
          }`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        await updateStatus(report.id, "resolved");
        deletedCount++;
      } catch (e) {
        console.error("Failed to delete message:", e);
      }
    }

    alert(`Deleted ${deletedCount} messages`);
    setSelectedMessageIds(new Set());
  };

  const filteredReports = reports.filter(
    (r) =>
      r.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.reportedUser?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const messageReports = filteredReports.filter((r) => r.reportedMessageId);

  const suspendReportedUser = async (report) => {
    if (!report.reportedUserId) return;

    const days = prompt("Suspend user for how many days?", "1");
    if (!days || isNaN(days) || days < 1) return;

    try {
      await fetch(
        `${import.meta.env.VITE_API_URL}/mod/users/${
          report.reportedUserId
        }/suspend`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            isSuspended: true,
            durationDays: parseInt(days),
          }),
        }
      );

      // Resolve the report
      await updateStatus(report.id, "resolved");
      alert(`User suspended for ${days} day(s)`);
    } catch (e) {
      setError(e?.message || "Failed to suspend user");
    }
  };

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Reports</h2>
      <div className="flex gap-2 flex-wrap">
        {["pending", "resolved", "dismissed"].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-1 rounded ${
              status === s ? "bg-blue-600 text-white" : "border"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        <input
          type="text"
          placeholder="Search reports..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 border rounded text-sm"
        />
        {messageReports.length > 0 && (
          <>
            <button
              onClick={() => {
                const allMessageIds = messageReports.map(
                  (r) => r.reportedMessageId
                );
                setSelectedMessageIds(new Set(allMessageIds));
              }}
              className="px-3 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
            >
              ✓ Select All
            </button>
            <button
              onClick={() => setSelectedMessageIds(new Set())}
              className="px-3 py-2 bg-gray-400 text-white rounded text-sm hover:bg-gray-500"
            >
              Clear
            </button>
          </>
        )}
        {selectedMessageIds.size > 0 && (
          <button
            onClick={bulkDeleteMessages}
            className="px-4 py-2 bg-red-600 text-white rounded text-sm font-semibold hover:bg-red-700"
          >
            🗑️ Delete {selectedMessageIds.size} Message
            {selectedMessageIds.size > 1 ? "s" : ""}
          </button>
        )}
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="space-y-3">
        {loading ? (
          <div>Loading...</div>
        ) : filteredReports.length === 0 ? (
          <div>No reports</div>
        ) : (
          filteredReports.map((r) => (
            <div key={r.id} className="border rounded p-3 flex gap-3">
              {r.reportedMessageId && (
                <input
                  type="checkbox"
                  checked={selectedMessageIds.has(r.reportedMessageId)}
                  onChange={(e) => {
                    const newSet = new Set(selectedMessageIds);
                    if (e.target.checked) {
                      newSet.add(r.reportedMessageId);
                    } else {
                      newSet.delete(r.reportedMessageId);
                    }
                    setSelectedMessageIds(newSet);
                  }}
                  className="mt-1 w-5 h-5 cursor-pointer accent-blue-600"
                  title="Select for bulk delete"
                />
              )}
              <div className="flex-1">
                <div>
                  <div className="font-semibold">Reason: {r.reason}</div>
                  <div className="text-sm text-gray-500">{r.description}</div>
                  {r.reportedUser && (
                    <div className="text-sm">
                      User: {r.reportedUser.name} ({r.reportedUser.email})
                    </div>
                  )}
                  {r.reportedPostId && (
                    <div className="text-sm">Post ID: {r.reportedPostId}</div>
                  )}
                  {r.reportedMessageId && (
                    <div className="text-sm">
                      <span className="font-semibold">Message:</span>
                      <div className="mt-1 p-2 bg-gray-50 rounded text-xs">
                        {r.description?.split("\n")[0] || "Message report"}
                      </div>
                      {r.reportedUser && (
                        <div className="text-xs text-gray-600 mt-1">
                          From:{" "}
                          <span className="font-medium">
                            {r.reportedUser.name}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                  {r.status}
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {r.status === "pending" && (
                  <>
                    {r.reportedMessageId && (
                      <button
                        className="px-2 py-1 bg-red-600 text-white rounded text-sm"
                        onClick={() => deleteReportedMessage(r)}
                      >
                        Delete Message
                      </button>
                    )}
                    {r.reportedUserId && (
                      <button
                        className="px-2 py-1 bg-orange-600 text-white rounded text-sm"
                        onClick={() => suspendReportedUser(r)}
                      >
                        Suspend User
                      </button>
                    )}
                    <button
                      className="px-2 py-1 bg-green-600 text-white rounded text-sm"
                      onClick={() => updateStatus(r.id, "resolved")}
                    >
                      Resolve
                    </button>
                    <button
                      className="px-2 py-1 bg-gray-600 text-white rounded text-sm"
                      onClick={() => updateStatus(r.id, "dismissed")}
                    >
                      Dismiss
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function ActivityLogsSection() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await auditService.listLogs({ limit: 100 });
        setLogs(data.logs || []);
      } catch (e) {
        setError(e?.response?.data?.message || "Failed to load logs");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const actionLabels = {
    user_suspended: "Suspended user",
    user_unsuspended: "Unsuspended user",
    user_deleted: "Deleted user",
    user_role_changed: "Changed user role",
    post_deleted: "Deleted post",
    comment_deleted: "Deleted comment",
    review_deleted: "Deleted review",
    report_created: "Created report",
    report_resolved: "Resolved report",
  };

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Activity Logs</h2>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="space-y-2">
        {loading ? (
          <div>Loading...</div>
        ) : logs.length === 0 ? (
          <div>No activity</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="border rounded p-3 text-sm">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <div className="font-semibold">
                    {actionLabels[log.action] || log.action}
                  </div>
                  <div className="text-gray-500">
                    By: {log.actor.name} ({log.actor.role})
                  </div>
                  {log.targetId && (
                    <div className="text-gray-500">
                      Target ID: {log.targetId}
                    </div>
                  )}
                  {log.details && (
                    <div className="text-gray-500">
                      Details:{" "}
                      {typeof log.details === "string"
                        ? log.details
                        : JSON.stringify(log.details)}
                    </div>
                  )}
                </div>
                <span className="text-gray-400">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
