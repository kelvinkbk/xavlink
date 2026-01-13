import { useEffect, useMemo, useState } from "react";
import { adminService, authService } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const ROLE_OPTIONS = [
  { value: "user", label: "User" },
  { value: "moderator", label: "Moderator" },
  { value: "admin", label: "Admin" },
];

export default function Admin() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [suspendedFilter, setSuspendedFilter] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", bio: "" });
  const [stats, setStats] = useState(null);
  const [suspensionDays, setSuspensionDays] = useState({});

  const canAct = useMemo(() => user?.role === "admin", [user?.role]);

  const loadStats = async () => {
    try {
      const data = await adminService.getStats();
      setStats(data);
    } catch (e) {
      console.error("Failed to load stats:", e);
    }
  };

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await adminService.listUsers({
        search: search || undefined,
        role: roleFilter || undefined,
        suspended: suspendedFilter || undefined,
        verified: verifiedFilter || undefined,
      });
      setUsers(data.users || []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter, suspendedFilter, verifiedFilter]);

  const handleSetRole = async (id, role) => {
    if (!canAct) return;
    try {
      await adminService.setRole(id, role);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to update role");
    }
  };

  const handleSuspend = async (id, isSuspended) => {
    if (!canAct) return;
    try {
      const data = { isSuspended };
      if (isSuspended && suspensionDays[id]) {
        data.durationDays = suspensionDays[id];
      }
      await adminService.setSuspended(id, data);
      setSuspensionDays((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to update suspension");
    }
  };

  const handleSetVerified = async (id, emailVerified) => {
    if (!canAct) return;
    try {
      await adminService.setVerified(id, emailVerified);
      await load();
    } catch (e) {
      setError(
        e?.response?.data?.message || "Failed to update verification status"
      );
    }
  };

  const handleDelete = async (id) => {
    if (!canAct) return;
    if (!window.confirm("Delete this user?")) return;
    try {
      await adminService.deleteUser(id);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to delete user");
    }
  };

  const handleResendVerification = async (email) => {
    try {
      await authService.resendVerification(email);
      showToast("Verification email resent", "success");
    } catch (e) {
      const msg = e?.response?.data?.message || "Failed to resend verification";
      setError(msg);
      showToast(msg, "error");
    }
  };

  const handleEditStart = (u) => {
    setEditingId(u.id);
    setEditForm({ name: u.name || "", email: u.email || "", bio: u.bio || "" });
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditForm({ name: "", email: "", bio: "" });
  };

  const handleEditSave = async (id) => {
    try {
      await adminService.updateUser(id, editForm);
      showToast("User updated", "success");
      await load();
    } catch (e) {
      const msg = e?.response?.data?.message || "Failed to update user";
      setError(msg);
      showToast(msg, "error");
    } finally {
      handleEditCancel();
    }
  };

  const toggleSelected = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const selectableIds = users
      .filter((u) => u.id !== user?.id)
      .map((u) => u.id);
    if (selectedIds.length === selectableIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(selectableIds);
    }
  };

  const handleBulkSuspend = async (isSuspended) => {
    if (selectedIds.length === 0) return;
    try {
      await adminService.bulkSuspend(selectedIds, isSuspended);
      showToast(
        `Users ${isSuspended ? "suspended" : "unsuspended"}`,
        "success"
      );
      setSelectedIds([]);
      await load();
    } catch (e) {
      const msg = e?.response?.data?.message || "Bulk suspend failed";
      setError(msg);
      showToast(msg, "error");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm("Delete selected users?")) return;
    try {
      await adminService.bulkDelete(selectedIds);
      showToast("Users deleted", "success");
      setSelectedIds([]);
      await load();
    } catch (e) {
      const msg = e?.response?.data?.message || "Bulk delete failed";
      setError(msg);
      showToast(msg, "error");
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-sm text-gray-500">
            Manage users, roles, and suspensions
          </p>
        </div>
      </div>

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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          className="border rounded px-3 py-2"
          placeholder="Search name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") load();
          }}
        />
        <select
          className="border rounded px-3 py-2"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All roles</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <select
          className="border rounded px-3 py-2"
          value={suspendedFilter}
          onChange={(e) => setSuspendedFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="false">Active</option>
          <option value="true">Suspended</option>
        </select>
        <select
          className="border rounded px-3 py-2"
          value={verifiedFilter}
          onChange={(e) => setVerifiedFilter(e.target.value)}
        >
          <option value="">All verification</option>
          <option value="true">Verified</option>
          <option value="false">Unverified</option>
        </select>
        <button
          className="bg-blue-600 text-white rounded px-4 py-2"
          onClick={load}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 alert-primary rounded px-3 py-2">
          <span className="text-sm font-medium">
            {selectedIds.length} selected
          </span>
          <button
            className="border rounded px-3 py-1"
            onClick={() => handleBulkSuspend(true)}
            disabled={loading}
          >
            Suspend
          </button>
          <button
            className="border rounded px-3 py-1"
            onClick={() => handleBulkSuspend(false)}
            disabled={loading}
          >
            Unsuspend
          </button>
          <button
            className="border rounded px-3 py-1 text-red-600"
            onClick={handleBulkDelete}
            disabled={loading}
          >
            Delete
          </button>
        </div>
      )}

      <div className="overflow-x-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left w-10">
                <input
                  type="checkbox"
                  checked={
                    users.length > 0 &&
                    selectedIds.length ===
                      users.filter((u) => u.id !== user?.id).length
                  }
                  onChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Bio</th>
              <th className="px-4 py-2 text-left">Role</th>
              <th className="px-4 py-2 text-left">Verified</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Created</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-4" colSpan={9}>
                  Loading...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td className="px-4 py-4" colSpan={9}>
                  No users found
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isEditing = editingId === u.id;
                const isSelected = selectedIds.includes(u.id);
                return (
                  <tr key={u.id} className="border-t align-top">
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelected(u.id)}
                        disabled={u.id === user?.id}
                        aria-label={`Select ${u.name || u.email}`}
                      />
                    </td>
                    <td className="px-4 py-2">
                      {isEditing ? (
                        <input
                          className="border rounded px-2 py-1 w-full"
                          value={editForm.name}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                          placeholder="Name"
                        />
                      ) : (
                        u.name || "-"
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {isEditing ? (
                        <input
                          className="border rounded px-2 py-1 w-full"
                          type="email"
                          value={editForm.email}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              email: e.target.value,
                            }))
                          }
                          placeholder="Email"
                        />
                      ) : (
                        u.email
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {isEditing ? (
                        <textarea
                          className="border rounded px-2 py-1 w-full"
                          rows={2}
                          value={editForm.bio}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              bio: e.target.value,
                            }))
                          }
                          placeholder="Bio"
                        />
                      ) : (
                        u.bio || "-"
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <select
                        className="border rounded px-2 py-1"
                        value={u.role}
                        onChange={(e) => handleSetRole(u.id, e.target.value)}
                        disabled={!canAct || u.id === user?.id}
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          u.emailVerified
                            ? "text-green-600 font-semibold"
                            : "text-red-600 font-semibold"
                        }
                      >
                        {u.emailVerified ? "Verified" : "Unverified"}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          u.isSuspended
                            ? "text-red-600 font-semibold"
                            : "text-green-600 font-semibold"
                        }
                      >
                        {u.isSuspended ? "Suspended" : "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 space-x-2">
                      {isEditing ? (
                        <>
                          <button
                            className="border rounded px-2 py-1"
                            onClick={() => handleEditSave(u.id)}
                          >
                            Save
                          </button>
                          <button
                            className="border rounded px-2 py-1"
                            onClick={handleEditCancel}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="border rounded px-2 py-1"
                            onClick={() => handleEditStart(u)}
                          >
                            Edit
                          </button>
                          {!u.isSuspended ? (
                            <>
                              <button
                                className="border rounded px-2 py-1"
                                onClick={() => {
                                  const days = prompt(
                                    "Suspend for how many days? (leave blank for permanent)",
                                    ""
                                  );
                                  if (days !== null) {
                                    if (days) {
                                      setSuspensionDays((prev) => ({
                                        ...prev,
                                        [u.id]: days,
                                      }));
                                    }
                                    handleSuspend(u.id, true);
                                  }
                                }}
                                disabled={!canAct || u.id === user?.id}
                              >
                                Suspend
                              </button>
                            </>
                          ) : (
                            <button
                              className="border rounded px-2 py-1"
                              onClick={() => handleSuspend(u.id, false)}
                              disabled={!canAct || u.id === user?.id}
                            >
                              Unsuspend
                            </button>
                          )}
                          <button
                            className="border rounded px-2 py-1"
                            onClick={() =>
                              handleSetVerified(u.id, !u.emailVerified)
                            }
                            disabled={!canAct}
                          >
                            {u.emailVerified
                              ? "Mark Unverified"
                              : "Mark Verified"}
                          </button>
                          {!u.emailVerified && (
                            <button
                              className="border rounded px-2 py-1"
                              onClick={() => handleResendVerification(u.email)}
                            >
                              Resend Verification
                            </button>
                          )}
                          <button
                            className="border rounded px-2 py-1 text-red-600"
                            onClick={() => handleDelete(u.id)}
                            disabled={!canAct || u.id === user?.id}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
