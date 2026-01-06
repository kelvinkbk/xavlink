import api from "./api";

export const chatService = {
  // Get or create 1-on-1 chat
  async getOrCreateDirectChat(otherUserId) {
    const response = await api.post("/chats/direct", { otherUserId });
    return response.data;
  },

  // Create group chat
  async createGroupChat(participantIds, name) {
    const response = await api.post("/chats/group", { participantIds, name });
    return response.data;
  },

  // Get all user chats
  async getUserChats() {
    const response = await api.get("/chats");
    return response.data;
  },

  // Get messages for a chat
  async getChatMessages(chatId, limit = 50, before = null) {
    const params = { limit };
    if (before) params.before = before;
    const response = await api.get(`/chats/${chatId}/messages`, { params });
    return response.data;
  },

  // Send message (REST fallback)
  async sendMessage(chatId, text, attachmentUrl = null) {
    const response = await api.post(`/chats/${chatId}/messages`, {
      chatId,
      text,
      attachmentUrl,
    });
    return response.data;
  },
};
