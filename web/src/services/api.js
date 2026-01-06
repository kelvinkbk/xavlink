import axios from "axios";

// Sanitize API_BASE by removing any whitespace/newlines from environment variable
const rawApiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const API_BASE = rawApiBase.toString().trim().replace(/[\n\r\t]/g, '');
const API_ORIGIN = API_BASE.replace(/\/api$/, "");

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Globally handle unauthorized responses: clear stale auth and redirect
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      if (typeof window !== "undefined") {
        // Clear stale auth if available
        if (window.localStorage) {
          window.localStorage.removeItem("token");
          window.localStorage.removeItem("user");
        }
        // Redirect to login if not already there
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  verifyTwoFactor: (userId, token) =>
    api.post("/auth/verify-2fa", { userId, token }).then((res) => res.data),
  verifyEmail: (token) =>
    api
      .get("/auth/verify-email", { params: { token } })
      .then((res) => res.data),
  resendVerification: (email) =>
    api.post("/auth/resend-verification", { email }).then((res) => res.data),
};

export const userService = {
  getProfile: (id) => api.get(`/users/${id}`),
};

export const skillService = {
  addSkill: (data) => api.post("/skills/add", data),
  searchSkills: (search = "") => api.get(`/skills/all?search=${search}`),
};

export const postService = {
  createPost: (data) => api.post("/posts/create", data),
  getAllPosts: (filter = "all") => api.get(`/posts/all?filter=${filter}`),
  likePost: (postId) => api.post(`/posts/${postId}/like`),
  unlikePost: (postId) => api.delete(`/posts/${postId}/like`),
  addComment: (postId, text) => api.post(`/posts/${postId}/comments`, { text }),
  getComments: (postId) => api.get(`/posts/${postId}/comments`),
};

const toAbsolute = (url) => {
  if (!url) return url;
  // Sanitize URL by removing whitespace and control characters
  url = url
    .toString()
    .trim()
    .replace(/[\n\r\t]/g, "");
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_ORIGIN}${url}`.trim().replace(/[\n\r\t]/g, "");
};

export const uploadService = {
  uploadPostImage: (file) => {
    const formData = new FormData();
    formData.append("image", file);
    return api
      .post("/uploads/post-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((res) => ({ ...res.data, url: toAbsolute(res.data?.url) }));
  },
  uploadProfilePic: (file) => {
    const formData = new FormData();
    formData.append("image", file);
    return api
      .post("/uploads/profile-pic", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((res) => ({
        ...res.data,
        url: toAbsolute(res.data?.url),
        user: res.data?.user,
      }));
  },
  uploadChatAttachment: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return api
      .post("/uploads/chat-attachment", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((res) => ({ ...res.data, url: toAbsolute(res.data?.url) }));
  },
};

export const reviewService = {
  // User reviews
  createUserReview: (userId, data) =>
    api.post("/reviews/user", { userId, ...data }).then((res) => res.data),
  getUserReviews: (userId) =>
    api.get(`/reviews/user/${userId}`).then((res) => res.data),
  updateUserReview: (reviewId, data) =>
    api.put(`/reviews/user/${reviewId}`, data).then((res) => res.data),
  deleteUserReview: (reviewId) =>
    api.delete(`/reviews/user/${reviewId}`).then((res) => res.data),

  // Post reviews
  createPostReview: (postId, data) =>
    api.post("/reviews/post", { postId, ...data }).then((res) => res.data),
  getPostReviews: (postId) =>
    api.get(`/reviews/post/${postId}`).then((res) => res.data),
  updatePostReview: (reviewId, data) =>
    api.put(`/reviews/post/${reviewId}`, data).then((res) => res.data),
  deletePostReview: (reviewId) =>
    api.delete(`/reviews/post/${reviewId}`).then((res) => res.data),

  // My reviews
  getMyReviews: () => api.get("/reviews/my/reviews").then((res) => res.data),
};

export const requestService = {
  sendRequest: (data) => api.post("/requests/send", data),
  getReceived: (userId) => api.get(`/requests/received/${userId}`),
  updateStatus: (id, status) => api.put(`/requests/update/${id}`, { status }),
};

export const adminService = {
  getStats: () => api.get("/admin/stats").then((res) => res.data),
  listUsers: (params = {}) =>
    api.get("/admin/users", { params }).then((res) => res.data),
  setRole: (id, role) =>
    api.patch(`/admin/users/${id}/role`, { role }).then((res) => res.data),
  setSuspended: (id, data) =>
    typeof data === "boolean"
      ? api.patch(`/admin/users/${id}/suspend`, { isSuspended: data })
      : api.patch(`/admin/users/${id}/suspend`, data).then((res) => res.data),
  setVerified: (id, emailVerified) =>
    api
      .patch(`/admin/users/${id}/verified`, { emailVerified })
      .then((res) => res.data),
  updateUser: (id, data) =>
    api.patch(`/admin/users/${id}/details`, data).then((res) => res.data),
  bulkSuspend: (ids, isSuspended) =>
    api
      .post(`/admin/users/bulk/suspend`, { ids, isSuspended })
      .then((res) => res.data),
  bulkDelete: (ids) =>
    api.post(`/admin/users/bulk/delete`, { ids }).then((res) => res.data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`).then((res) => res.data),
};

export const moderationService = {
  listUsers: (params = {}) =>
    api.get("/mod/users", { params }).then((res) => res.data),
  setSuspended: (id, isSuspended) =>
    api
      .patch(`/mod/users/${id}/suspend`, { isSuspended })
      .then((res) => res.data),
  listComments: (params = {}) =>
    api.get("/mod/comments", { params }).then((res) => res.data),
  editPost: (id, data) =>
    api.patch(`/mod/posts/${id}`, data).then((res) => res.data),
  deletePost: (id) => api.delete(`/mod/posts/${id}`).then((res) => res.data),
  deleteComment: (id) =>
    api.delete(`/mod/comments/${id}`).then((res) => res.data),
  deleteUserReview: (id) =>
    api.delete(`/mod/reviews/user/${id}`).then((res) => res.data),
  deletePostReview: (id) =>
    api.delete(`/mod/reviews/post/${id}`).then((res) => res.data),
};

export const twoFactorService = {
  generateSecret: () => api.post("/2fa/generate").then((res) => res.data),
  enableTwoFactor: (secret, token) =>
    api.post("/2fa/enable", { secret, token }).then((res) => res.data),
  disableTwoFactor: (password) =>
    api.post("/2fa/disable", { password }).then((res) => res.data),
};

export const reportService = {
  createReport: (data) => api.post("/reports", data).then((res) => res.data),
  listReports: (params = {}) =>
    api.get("/reports", { params }).then((res) => res.data),
  getReport: (id) => api.get(`/reports/${id}`).then((res) => res.data),
  updateReportStatus: (id, status, resolutionNote = "") =>
    api
      .patch(`/reports/${id}/status`, { status, resolutionNote })
      .then((res) => res.data),
};

export const auditService = {
  listLogs: (params = {}) =>
    api.get("/reports/logs/history", { params }).then((res) => res.data),
};

export default api;
