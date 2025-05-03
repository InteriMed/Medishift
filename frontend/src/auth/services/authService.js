import axios from 'axios';

// API base URL
const API_URL = process.env.REACT_APP_API_URL || '/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Handle token storage
const setToken = (token) => {
  if (token) {
    localStorage.setItem('authToken', token);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem('authToken');
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

// Initialize token from localStorage on service load
const initToken = () => {
  const token = localStorage.getItem('authToken');
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
};

// Call this when the app starts
initToken();

// Register new user
export const registerUser = async (userData) => {
  try {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Login user
export const loginUser = async (credentials) => {
  try {
    const response = await apiClient.post('/auth/login', credentials);
    const { token, user } = response.data;
    
    setToken(token);
    return { token, user };
  } catch (error) {
    throw handleApiError(error);
  }
};

// Logout user
export const logoutUser = () => {
  setToken(null);
};

// Verify email with token
export const verifyEmail = async (token) => {
  try {
    const response = await apiClient.post('/auth/verify-email', { token });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Request password reset
export const requestPasswordReset = async (email) => {
  try {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Reset password with token
export const resetPassword = async (token, newPassword) => {
  try {
    const response = await apiClient.post('/auth/reset-password', { 
      token, 
      password: newPassword 
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Get current user info
export const getCurrentUser = async () => {
  try {
    const response = await apiClient.get('/auth/me');
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Utility function to handle API errors
const handleApiError = (error) => {
  if (error.response) {
    // Server responded with a status code outside the 2xx range
    const errorMessage = error.response.data.message || 'An error occurred';
    return new Error(errorMessage);
  } else if (error.request) {
    // The request was made but no response was received
    return new Error('No response received from the server. Please check your connection');
  } else {
    // Something else triggered an error
    return new Error('An unexpected error occurred');
  }
};

export default {
  registerUser,
  loginUser,
  logoutUser,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  getCurrentUser,
  setToken
}; 