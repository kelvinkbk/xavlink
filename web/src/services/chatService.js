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

  // Delete/unsend a message (sender only)
  async deleteMessage(chatId, messageId) {
    const response = await api.delete(`/chats/${chatId}/messages/${messageId}`);
    return response.data;
  },

  // Add/remove reaction to message
  async toggleReaction(chatId, messageId, emoji) {
    const response = await api.post(
      `/chats/${chatId}/messages/${messageId}/react`,
      { emoji }
    );
    return response.data;
  },

  // Get reactions for a message
  async getReactions(chatId, messageId) {
    const response = await api.get(
      `/chats/${chatId}/messages/${messageId}/reactions`
    );
    return response.data;
  },

  // Pin/unpin a message
  async togglePin(chatId, messageId) {
    const response = await api.patch(
      `/chats/${chatId}/messages/${messageId}/pin`
    );
    return response.data;
  },

  // Mark message as read
  async markAsRead(chatId, messageId) {
    const response = await api.post(
      `/chats/${chatId}/messages/${messageId}/read`
    );
    return response.data;
  },

  // Mark entire chat as read
  async markChatAsRead(chatId) {
    const response = await api.post(`/chats/${chatId}/read`);
    return response.data;
  },

  // Search messages in a chat
  async searchMessages(chatId, query, limit = 50) {
    const response = await api.get(`/chats/${chatId}/search`, {
      params: { query, limit },
    });
    return response.data;
  },};