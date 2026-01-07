import axios from "axios";

// Sanitize API_BASE by removing any whitespace/newlines from environment variable
const rawApiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const API_BASE = rawApiBase
  .toString()
  .trim()
  .replace(/[\n\r\t]/g, "");
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
  getAllPosts: (filter = "all", sort = "recent", page = 1, limit = 10) =>
    api
      .get(
        `/posts/all?filter=${filter}&sort=${sort}&page=${page}&limit=${limit}`
      )
      .then((res) => ({
        ...res,
        data: {
          ...res.data,
          posts: res.data.posts.map((post) => ({
            ...post,
            image: toAbsolute(post.image),
            user: {
              ...post.user,
              profilePic: toAbsolute(post.user?.profilePic),
            },
          })),
        },
      })),
  likePost: (postId) => api.post(`/posts/${postId}/like`),
  unlikePost: (postId) => api.delete(`/posts/${postId}/like`),
  addComment: (postId, text) => api.post(`/posts/${postId}/comments`, { text }),
  getComments: (postId) =>
    api.get(`/posts/${postId}/comments`).then((res) => ({
      ...res,
      data: res.data.map((comment) => ({
        ...comment,
        user: {
          ...comment.user,
          profilePic: toAbsolute(comment.user?.profilePic),
        },
      })),
    })),
  deletePost: (postId) => api.delete(`/posts/${postId}`),
  updatePost: (postId, data) =>
    api.patch(`/posts/${postId}`, data).then((res) => res.data),
  updateComment: (commentId, data) =>
    api.patch(`/posts/comments/${commentId}`, data).then((res) => res.data),
  deleteComment: (commentId) =>
    api.delete(`/posts/comments/${commentId}`).then((res) => res.data),

  // Bookmark methods
  bookmarkPost: (postId) =>
    api.post(`/posts/${postId}/bookmark`).then((res) => res.data),
  unbookmarkPost: (postId) =>
    api.delete(`/posts/${postId}/bookmark`).then((res) => res.data),
  getBookmarkedPosts: (page = 1, limit = 10) =>
    api.get(`/posts/bookmarks?page=${page}&limit=${limit}`).then((res) => ({
      ...res,
      data: {
        ...res.data,
        posts: res.data.posts.map((post) => ({
          ...post,
          image: toAbsolute(post.image),
          user: {
            ...post.user,
            profilePic: toAbsolute(post.user?.profilePic),
          },
        })),
      },
    })),

  // Reaction methods
  addReaction: (postId, emoji) =>
    api.post(`/posts/${postId}/reaction`, { emoji }).then((res) => res.data),
  removeReaction: (postId) =>
    api.delete(`/posts/${postId}/reaction`).then((res) => res.data),

  // ===== NEW FEATURE METHODS =====

  // 1. Search posts
  searchPosts: (query, sort = "recent", page = 1, limit = 10) =>
    api
      .get(
        `/posts/search?q=${encodeURIComponent(
          query
        )}&sort=${sort}&page=${page}&limit=${limit}`
      )
      .then((res) => ({
        ...res,
        data: {
          ...res.data,
          posts: res.data.posts.map((post) => ({
            ...post,
            image: toAbsolute(post.image),
            user: {
              ...post.user,
              profilePic: toAbsolute(post.user?.profilePic),
            },
          })),
        },
      })),

  // 2. Trending topics
  getTrendingTopics: () =>
    api.get(`/posts/trending/topics`).then((res) => res.data),

  // 3. Posts by tag
  getPostsByTag: (tag, page = 1, limit = 10) =>
    api
      .get(`/posts/tags/${encodeURIComponent(tag)}?page=${page}&limit=${limit}`)
      .then((res) => ({
        ...res,
        data: {
          ...res.data,
          posts: res.data.posts.map((post) => ({
            ...post,
            image: toAbsolute(post.image),
            user: {
              ...post.user,
              profilePic: toAbsolute(post.user?.profilePic),
            },
          })),
        },
      })),

  // 4. Draft management
  createDraft: (data) =>
    api.post("/posts/drafts/create", data).then((res) => res.data),

  getDrafts: (page = 1, limit = 10) =>
    api
      .get(`/posts/drafts?page=${page}&limit=${limit}`)
      .then((res) => res.data),

  updateDraft: (draftId, data) =>
    api.patch(`/posts/drafts/${draftId}`, data).then((res) => res.data),

  publishDraft: (draftId) =>
    api.post(`/posts/drafts/${draftId}/publish`).then((res) => res.data),

  deleteDraft: (draftId) =>
    api.delete(`/posts/drafts/${draftId}`).then((res) => res.data),

  // 5. Pin/Unpin posts
  pinPost: (postId) => api.post(`/posts/${postId}/pin`).then((res) => res.data),

  unpinPost: (postId) =>
    api.delete(`/posts/${postId}/pin`).then((res) => res.data),

  // 6. View tracking
  trackPostView: (postId) =>
    api.post(`/posts/${postId}/view`).then((res) => res.data),

  // 7. Post analytics
  getPostAnalytics: (postId) =>
    api.get(`/posts/${postId}/analytics`).then((res) => res.data),

  // 8. Share posts
  sharePost: (postId, shareType, sharedWithId = null) =>
    api
      .post(`/posts/${postId}/share`, { shareType, sharedWithId })
      .then((res) => res.data),

  // 9. Suggested users
  getSuggestedUsers: (limit = 5) =>
    api.get(`/posts/users/suggested?limit=${limit}`).then((res) => ({
      ...res,
      data: res.data.map((user) => ({
        ...user,
        profilePic: toAbsolute(user?.profilePic),
      })),
    })),

  // 10. Keyword mute
  addKeywordMute: (keyword) =>
    api.post("/posts/mute-keywords", { keyword }).then((res) => res.data),

  removeKeywordMute: (muteId) =>
    api.delete(`/posts/mute-keywords/${muteId}`).then((res) => res.data),

  getMutedKeywords: () =>
    api.get("/posts/mute-keywords").then((res) => res.data),
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
  uploadChatAttachment: (file, onProgress, signal) => {
    const formData = new FormData();
    formData.append("file", file);
    return api
      .post("/uploads/chat-attachment", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (evt) => {
          try {
            if (!evt || !evt.total) return;
            const percent = Math.round((evt.loaded / evt.total) * 100);
            if (typeof onProgress === "function") onProgress(percent);
          } catch {
            // ignore progress errors
          }
        },
        signal,
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
