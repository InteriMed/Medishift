import React, { createContext, useState, useEffect, useContext } from 'react';
import { getCurrentUser, logoutUser } from '../services/authService';

// Create the context
const AuthContext = createContext(null);

/**
 * Authentication Provider component
 * Manages global authentication state and provides auth methods
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Check for existing auth on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check if user is already authenticated
        if (localStorage.getItem('authToken')) {
          const userData = await getCurrentUser();
          setUser(userData);
        }
      } catch (err) {
        console.error('Authentication initialization error:', err);
        // Clear invalid tokens
        localStorage.removeItem('authToken');
      } finally {
        setLoading(false);
      }
    };
    
    initAuth();
  }, []);
  
  /**
   * Update user data after successful authentication
   * @param {Object} userData - User data from login or registration
   */
  const setUserData = (userData) => {
    setUser(userData);
  };
  
  /**
   * Logout the current user
   */
  const logout = () => {
    logoutUser();
    setUser(null);
  };
  
  // Context value
  const value = {
    user,
    loading,
    error,
    setUserData,
    logout,
    isAuthenticated: !!user
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to use the auth context
 * @returns {Object} Auth context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 