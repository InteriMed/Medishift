import authService from './authService';

// Base API URL - changing from '/api' to match Flask API structure
const API_BASE_URL = '';

// Service for making authenticated API requests
const apiService = {
  // Make authenticated GET request
  get: async (endpoint) => {
    const token = await authService.getIdToken();
    if (!token) {
      throw new Error('Authentication required');
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      // Check for non-JSON response (likely HTML error page)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Non-JSON response received:', await response.text());
        throw new Error(`Server returned non-JSON response: ${response.status} ${response.statusText}`);
      }
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Request failed with status ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  },
  
  // Make authenticated POST request
  post: async (endpoint, data) => {
    const token = await authService.getIdToken();
    if (!token) {
      throw new Error('Authentication required');
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      // Check for non-JSON response
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Non-JSON response received:', await response.text());
        throw new Error(`Server returned non-JSON response: ${response.status} ${response.statusText}`);
      }
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Request failed with status ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  },
  
  // Make authenticated PUT request
  put: async (endpoint, data) => {
    const token = await authService.getIdToken();
    if (!token) {
      throw new Error('Authentication required');
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      // Check for non-JSON response
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Non-JSON response received:', await response.text());
        throw new Error(`Server returned non-JSON response: ${response.status} ${response.statusText}`);
      }
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Request failed with status ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  },
  
  // Make authenticated DELETE request
  delete: async (endpoint) => {
    const token = await authService.getIdToken();
    if (!token) {
      throw new Error('Authentication required');
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      // Check for non-JSON response
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Non-JSON response received:', await response.text());
        throw new Error(`Server returned non-JSON response: ${response.status} ${response.statusText}`);
      }
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Request failed with status ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  },
  
  // Get user data by UID
  getUserData: async (uid) => {
    return apiService.get(`/api/user/${uid}`);
  },
  
  // Test API connection
  testApiConnection: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/test`);
      
      // Check for non-JSON response
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Non-JSON response received:', await response.text());
        throw new Error(`Server returned non-JSON response: ${response.status} ${response.statusText}`);
      }
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Request failed with status ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('API test connection failed:', error);
      throw error;
    }
  },
};

export default apiService; 