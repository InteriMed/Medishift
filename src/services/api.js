import { auth } from './firebase';
import { DEFAULT_VALUES, getEnvVar } from '../config/keysDatabase';

const API_BASE_URL = getEnvVar('API_BASE_URL') || DEFAULT_VALUES.API_BASE_URL;

/**
 * Fetch with authentication
 */
const fetchWithAuth = async (endpoint, options = {}) => {
  // Get current user
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;
  
  // Set authentication headers
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };
  
  // Make request
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `API error ${response.status}`);
  }
  
  return response.json();
};

/**
 * API methods
 */
const api = {
  // User methods
  users: {
    get: (userId) => fetchWithAuth(`/users/${userId}`),
    update: (userId, data) => fetchWithAuth(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),
    create: (userData) => fetchWithAuth('/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    })
  },
  
  // Add other API endpoints as needed
};

export default api; 