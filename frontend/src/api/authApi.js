import { API_BASE_URL } from '../Features/auth/config/api';

export const apiClient = {
  async fetch(endpoint, options = {}) {
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }
};