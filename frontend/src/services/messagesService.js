import apiService from './apiService';

const messagesService = {
  /**
   * Get all conversations for the current user
   */
  getConversations: async () => {
    try {
      const response = await apiService.get('/messages/conversations');
      return response.data;
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  },

  /**
   * Get a single conversation by ID
   * @param {string} conversationId - Conversation ID
   */
  getConversation: async (conversationId) => {
    try {
      const response = await apiService.get(`/messages/conversations/${conversationId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching conversation ${conversationId}:`, error);
      throw error;
    }
  },

  /**
   * Create a new conversation
   * @param {Object} conversationData - Conversation data
   */
  createConversation: async (conversationData) => {
    try {
      const response = await apiService.post('/messages/conversations', conversationData);
      return response.data;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  },

  /**
   * Get messages for a conversation
   * @param {string} conversationId - Conversation ID
   */
  getMessages: async (conversationId) => {
    try {
      const response = await apiService.get(`/messages/conversations/${conversationId}/messages`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching messages for conversation ${conversationId}:`, error);
      throw error;
    }
  },

  /**
   * Send a message in a conversation
   * @param {string} conversationId - Conversation ID
   * @param {Object} messageData - Message data
   */
  sendMessage: async (conversationId, messageData) => {
    try {
      const response = await apiService.post(`/messages/conversations/${conversationId}/messages`, messageData);
      return response.data;
    } catch (error) {
      console.error(`Error sending message in conversation ${conversationId}:`, error);
      throw error;
    }
  },

  /**
   * Mark messages as read
   * @param {string} conversationId - Conversation ID
   */
  markAsRead: async (conversationId) => {
    try {
      const response = await apiService.post(`/messages/conversations/${conversationId}/read`);
      return response.data;
    } catch (error) {
      console.error(`Error marking conversation ${conversationId} as read:`, error);
      throw error;
    }
  }
};

export default messagesService; 