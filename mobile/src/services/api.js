import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import Constants from "expo-constants";

// Resolve API base URL for simulator/device
const resolveApiBase = () => {
  console.log(" resolveApiBase called! Platform:", Platform.OS);

  // FORCE LOCALHOST DEBUGGING (Top Priority)
  if (Platform.OS === "android") {
    console.log("forcing android local (priority)");
    return "http://10.0.2.2:5000/api";
  } else if (Platform.OS === "ios") {
    console.log("forcing ios local (priority)");
    return "http://localhost:5000/api";
  }

  // 1) explicit env (ngrok URL for cross-network or LAN IP)
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (Constants?.expoConfig?.extra?.apiUrl)
    return Constants.expoConfig.extra.apiUrl;

  // 1b) ngrok fallback (set EXPO_PUBLIC_NGROK_URL if using ngrok)
  if (process.env.EXPO_PUBLIC_NGROK_URL)
    return `${process.env.EXPO_PUBLIC_NGROK_URL}/api`;

  // 2) Derive host from Expo dev server (works on LAN with Expo Go)
  if (Constants?.expoConfig?.hostUri) {
    const host = Constants.expoConfig.hostUri.split(":")[0];
    return `http://${host}:5000/api`;
  }

  // 3) Android emulator maps host machine to 10.0.2.2
  // if (Platform.OS === "android") return "http://10.0.2.2:5000/api";

  // 4) Fallback to localhost
  return "http://localhost:5000/api";
};

const API_BASE = resolveApiBase();
const API_ORIGIN = API_BASE.replace(/\/api$/, "");

// Export for socket.js to reuse
export { API_BASE };

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 20000, // 20 seconds - increased for slower network connections
});

// Surface base URL once for debugging connectivity issues
console.log("[API] Base URL", API_BASE);

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't log 403 errors for admin endpoints (expected for non-admin users)
    const isAdminEndpoint =
      error?.config?.url?.includes("/admin/") ||
      error?.config?.url?.includes("/enhancements/admin/");
    const is403 = error?.response?.status === 403;

    if (!(is403 && isAdminEndpoint)) {
      console.warn("[API] Error", {
        url: error?.config?.url,
        method: error?.config?.method,
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message,
      });
    }
    return Promise.reject(error);
  },
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
  forgotPassword: (email) =>
    api.post("/auth/forgot-password", { email }).then((res) => res.data),
  resetPassword: (token, newPassword) =>
    api
      .post("/auth/reset-password", { token, newPassword })
      .then((res) => res.data),
};

export const userService = {
  getProfile: (id) => api.get(`/users/${id}`),
  updateProfile: (id, payload) => api.put(`/users/${id}`, payload),
  follow: (id) => api.post(`/users/${id}/follow`),
  unfollow: (id) => api.delete(`/users/${id}/follow`),
  getFollowStatus: (id) => api.get(`/users/${id}/follow-status`),
  getFollowers: (id, params = {}) =>
    api.get(`/users/${id}/followers`, { params }),
  getFollowing: (id, params = {}) =>
    api.get(`/users/${id}/following`, { params }),
  searchUsers: (query) =>
    api.get(`/users/search?q=${encodeURIComponent(query)}`),
  getSuggestedUsers: (limit = 15) => api.get(`/users/suggested?limit=${limit}`),
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
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_ORIGIN}${url}`;
};

export const uploadService = {
  uploadPostImage: (formData) =>
    api
      .post("/uploads/post-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((res) => ({ ...res.data, url: toAbsolute(res.data?.url) })),
  uploadProfilePic: (formData) =>
    api
      .post("/uploads/profile-pic", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((res) => ({
        ...res.data,
        url: toAbsolute(res.data?.url),
        user: res.data?.user,
      })),
  uploadChatAttachment: (formData) =>
    api
      .post("/uploads/chat-attachment", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((res) => ({ ...res.data, url: toAbsolute(res.data?.url) })),
};

export const requestService = {
  sendRequest: (data) => api.post("/requests/send", data),
  getReceived: (userId) => api.get(`/requests/received/${userId}`),
  updateStatus: (id, status) => api.put(`/requests/update/${id}`, { status }),
};

export const skillService = {
  addSkill: (data) => api.post("/skills/add", data),
  searchSkills: (search = "") => api.get(`/skills/all?search=${search}`),
  getSkillsByUser: (userId) => api.get(`/skills?userId=${userId}`),
  deleteSkill: (id) => api.delete(`/skills/${id}`),
  requestSkill: (skillId, toUserId) =>
    api.post("/requests/send", { skillId, toUserId }),
};

export const chatService = {
  getUserChats: () => api.get("/chats"),
  getChatMessages: (chatId, limit = 50) =>
    api.get(`/chats/${chatId}/messages`, { params: { limit } }),
  getOrCreateDirectChat: (otherUserId) =>
    api.post("/chats/direct", { otherUserId }),
  createGroupChat: (participantIds, name) =>
    api.post("/chats/group", { participantIds, name }),
};

export const notificationService = {
  getAll: () => api.get(`/notifications`),
  getUnreadCount: () => api.get(`/notifications/unread-count`),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put(`/notifications/read-all`),
  remove: (id) => api.delete(`/notifications/${id}`),
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
  getAll: () => api.get("/reports").then((res) => res.data),
  getReport: (id) => api.get(`/reports/${id}`).then((res) => res.data),
  updateStatus: (id, status, resolutionNote = "") =>
    api
      .patch(`/reports/${id}/status`, { status, resolutionNote })
      .then((res) => res.data),
  updateReportStatus: (id, status, resolutionNote = "") =>
    api
      .patch(`/reports/${id}/status`, { status, resolutionNote })
      .then((res) => res.data),
};

export const adminService = {
  getStats: () => api.get("/admin/stats").then((res) => res.data),
  listUsers: (params = {}) =>
    api.get("/admin/users", { params }).then((res) => res.data),
  listPosts: (params = {}) =>
    api.get("/posts/all", { params }).then((res) => res.data),
  listComments: (params = {}) =>
    api.get("/mod/comments", { params }).then((res) => res.data),
  listReviews: (params = {}) =>
    api.get("/reviews/my/reviews", { params }).then((res) => res.data),
  listReports: (params = {}) =>
    api.get("/reports", { params }).then((res) => res.data),
  listLogs: (params = {}) =>
    api.get("/reports/logs/history", { params }).then((res) => res.data),
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
  editPost: (id, data) =>
    api.patch(`/mod/posts/${id}`, data).then((res) => res.data),
  deletePost: (id) => api.delete(`/mod/posts/${id}`).then((res) => res.data),
  editComment: (id, data) =>
    api.patch(`/mod/comments/${id}`, data).then((res) => res.data),
  deleteComment: (id) =>
    api.delete(`/mod/comments/${id}`).then((res) => res.data),
  editReview: (id, data) =>
    api.patch(`/reviews/${id}`, data).then((res) => res.data),
  deleteReview: (id) => api.delete(`/reviews/${id}`).then((res) => res.data),
  updateReport: (id, data) =>
    api.patch(`/reports/${id}`, data).then((res) => res.data),
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

// Enhancement services for advanced features
export const enhancementService = {
  // Discover
  filterUsers: (params = {}) =>
    api
      .get("/enhancements/discover/filter", { params })
      .then((res) => res.data),
  getTrendingSkills: (params = {}) =>
    api
      .get("/enhancements/discover/trending-skills", { params })
      .then((res) => res.data),
  addToFavorites: (favoriteUserId) =>
    api
      .post("/enhancements/discover/favorites", { favoriteUserId })
      .then((res) => res.data),
  removeFromFavorites: (favoriteUserId) =>
    api
      .delete(`/enhancements/discover/favorites/${favoriteUserId}`)
      .then((res) => res.data),
  getFavorites: () =>
    api.get("/enhancements/discover/favorites").then((res) => res.data),

  // Profile
  trackProfileView: (userId) =>
    api.post(`/enhancements/profile/${userId}/view`).then((res) => res.data),
  getProfileStats: (userId) =>
    api.get(`/enhancements/profile/${userId}/stats`).then((res) => res.data),
  updateSocialLinks: (data) =>
    api.put("/enhancements/profile/social-links", data).then((res) => res.data),
  verifySocialLink: (platform) =>
    api
      .post(`/enhancements/profile/social-links/${platform}/verify`)
      .then((res) => res.data),
  addUserPhoto: (data) =>
    api.post("/enhancements/profile/photos", data).then((res) => res.data),
  getUserPhotos: (userId) =>
    api.get(`/enhancements/profile/${userId}/photos`).then((res) => res.data),
  deleteUserPhoto: (photoId) =>
    api
      .delete(`/enhancements/profile/photos/${photoId}`)
      .then((res) => res.data),
  getAchievements: (userId) =>
    api
      .get(`/enhancements/profile/${userId}/achievements`)
      .then((res) => res.data),

  // Skills
  endorseSkill: (skillId) =>
    api.post(`/enhancements/skills/${skillId}/endorse`).then((res) => res.data),
  removeEndorsement: (skillId) =>
    api
      .delete(`/enhancements/skills/${skillId}/endorse`)
      .then((res) => res.data),
  getMostEndorsedSkills: (params = {}) =>
    api
      .get("/enhancements/skills/trending/endorsed", { params })
      .then((res) => res.data),
  addCertification: (skillId, data) =>
    api
      .post(`/enhancements/skills/${skillId}/certifications`, data)
      .then((res) => res.data),
  getSkillCertifications: (skillId) =>
    api
      .get(`/enhancements/skills/${skillId}/certifications`)
      .then((res) => res.data),
  getSkillRecommendations: () =>
    api.get("/enhancements/skills/recommendations").then((res) => res.data),
  generateSkillRecommendations: () =>
    api
      .post("/enhancements/skills/recommendations/generate")
      .then((res) => res.data),

  // Requests
  createRequestTemplate: (data) =>
    api.post("/enhancements/requests/templates", data).then((res) => res.data),
  getRequestTemplates: () =>
    api.get("/enhancements/requests/templates").then((res) => res.data),
  deleteRequestTemplate: (templateId) =>
    api
      .delete(`/enhancements/requests/templates/${templateId}`)
      .then((res) => res.data),
  getRequestHistory: (type = "sent") =>
    api
      .get("/enhancements/requests/history", { params: { type } })
      .then((res) => res.data),
  sendCounterOffer: (requestId, data) =>
    api
      .post(`/enhancements/requests/${requestId}/counter-offer`, data)
      .then((res) => res.data),
  completeRequest: (requestId) =>
    api
      .post(`/enhancements/requests/${requestId}/complete`)
      .then((res) => res.data),

  // Notifications
  getGroupedNotifications: (timeFilter = "all") =>
    api
      .get("/enhancements/notifications/grouped", { params: { timeFilter } })
      .then((res) => res.data),
  pinNotification: (notificationId) =>
    api
      .post(`/enhancements/notifications/${notificationId}/pin`)
      .then((res) => res.data),
  archiveNotification: (notificationId) =>
    api
      .post(`/enhancements/notifications/${notificationId}/archive`)
      .then((res) => res.data),
  getArchivedNotifications: () =>
    api.get("/enhancements/notifications/archived").then((res) => res.data),

  // Moderation
  addModNote: (reportId, note) =>
    api
      .post(`/enhancements/moderation/reports/${reportId}/notes`, { note })
      .then((res) => res.data),
  getModNotes: (reportId) =>
    api
      .get(`/enhancements/moderation/reports/${reportId}/notes`)
      .then((res) => res.data),
  getModerationDashboard: () =>
    api.get("/enhancements/moderation/dashboard").then((res) => res.data),

  // Admin
  getAnalyticsDashboard: () =>
    api.get("/enhancements/admin/analytics").then((res) => res.data),
  getSystemHealth: () =>
    api.get("/enhancements/admin/health").then((res) => res.data),
  getSystemHealthMetrics: () =>
    api.get("/enhancements/admin/health/metrics").then((res) => res.data),

  // Device Management
  getDeviceSessions: () =>
    api.get("/enhancements/devices/sessions").then((res) => res.data),
  revokeDeviceSession: (sessionId) =>
    api
      .delete(`/enhancements/devices/sessions/${sessionId}`)
      .then((res) => res.data),
  revokeAllOtherSessions: (currentDeviceId) =>
    api
      .post("/enhancements/devices/sessions/revoke-all", { currentDeviceId })
      .then((res) => res.data),

  // Scheduled Posts

  schedulePost: (data) =>
    api
      .post("/enhancements/posts/schedule", data, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((res) => res.data),
  getScheduledPosts: () =>
    api.get("/enhancements/posts/scheduled").then((res) => res.data),
  cancelScheduledPost: (postId) =>
    api
      .delete(`/enhancements/posts/scheduled/${postId}`)
      .then((res) => res.data),

  // Activity Timeline
  getActivityTimeline: (limit = 20, offset = 0) =>
    api
      .get("/enhancements/activity/timeline", { params: { limit, offset } })
      .then((res) => res.data),
};

export default api;
