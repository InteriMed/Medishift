import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

/**
 * Custom hook to access authentication context
 * @returns {Object} Authentication context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    // Return a mock implementation if the context is not available
    // This helps prevent errors during development or when testing
    return {
      currentUser: null,
      loading: false,
      error: null,
      signIn: () => Promise.resolve(),
      signUp: () => Promise.resolve(),
      signOut: () => Promise.resolve(),
      resetPassword: () => Promise.resolve()
    };
  }
  
  return context;
};

// Also export as default for compatibility with existing imports
export default useAuth; 