// Default to localhost if no environment variable is set
export const API_BASE_URL = 'http://localhost:8000/api';

export const API_ENDPOINTS = {
  VALIDATE: `${API_BASE_URL}/users/validate/`,
  SIGNUP: `${API_BASE_URL}/users/signup/`,
  // Add other endpoints as needed
}; 