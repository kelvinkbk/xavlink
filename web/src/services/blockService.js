import api from "./api";

export const blockService = {
  // Get all blocked users
  getBlockedUsers: async () => {
    const response = await api.get("/users/blocked");
    return response.data;
  },

  // Block a user
  blockUser: async (blockedId) => {
    const response = await api.post("/users/blocked", { blockedId });
    return response.data;
  },

  // Unblock a user
  unblockUser: async (blockedId) => {
    const response = await api.delete(`/users/blocked/${blockedId}`);
    return response.data;
  },
};
