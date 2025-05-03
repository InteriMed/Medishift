import apiService from './apiService';

const userService = {
  /**
   * Get current user profile
   */
  getCurrentUser: async () => {
    try {
      const response = await apiService.get('/users/me');
      return response.data;
    } catch (error) {
      console.error('Error fetching current user:', error);
      throw error;
    }
  },

  /**
   * Get user profile by ID
   * @param {string} userId - User ID
   */
  getUserProfile: async (userId) => {
    try {
      const response = await apiService.get(`/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching user ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} userData - User data to update
   */
  updateUserProfile: async (userId, userData) => {
    try {
      const response = await apiService.put(`/users/${userId}`, userData);
      return response.data;
    } catch (error) {
      console.error(`Error updating user ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Change user password
   * @param {Object} passwordData - Object containing old and new passwords
   */
  changePassword: async (passwordData) => {
    try {
      const response = await apiService.post('/users/change-password', passwordData);
      return response.data;
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  },

  /**
   * Upload profile picture
   * @param {FormData} formData - Form data containing the image file
   */
  uploadProfilePicture: async (formData) => {
    try {
      const response = await apiService.upload('/users/profile-picture', formData);
      return response.data;
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      throw error;
    }
  }
};

export default userService; 