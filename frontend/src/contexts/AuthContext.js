import React, { createContext, useContext, useEffect, useState } from 'react';
// Only import these if you're actually using them
// import { useNavigate, useLocation } from 'react-router-dom';

// Import all firebase services from our firebase.js service file
import { 
  // Remove 'auth' from imports if not using it directly in this file
  // auth, 
  registerUser, 
  loginUser, 
  logoutUser, 
  resetPassword, 
  loginWithGoogle,
  getUserProfile,
  updateUserProfile,
  authStateObserver 
} from '../services/firebase';

// Create the Auth Context
const AuthContext = createContext();

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Comment these out if not using them
  // const navigate = useNavigate();
  // const location = useLocation();
  
  useEffect(() => {
    // Set up auth state observer
    const unsubscribe = authStateObserver(async (user) => {
      setCurrentUser(user);
      setLoading(true);
      
      if (user) {
        try {
          // Get additional user data from Firestore
          const profile = await getUserProfile(user.uid);
          setUserProfile(profile);
        } catch (err) {
          console.error("Error fetching user profile:", err);
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    // Clean up subscription
    return () => unsubscribe();
  }, []);
  
  // Handle sign up
  const register = async (email, password, displayName) => {
    setError(null);
    try {
      return await registerUser(email, password, displayName);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };
  
  // Handle sign in
  const login = async (email, password) => {
    setError(null);
    try {
      return await loginUser(email, password);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };
  
  // Handle sign out
  const logout = async () => {
    setError(null);
    try {
      await logoutUser();
      setCurrentUser(null);
      setUserProfile(null);
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };
  
  // Handle password reset
  const resetUserPassword = async (email) => {
    setError(null);
    try {
      return await resetPassword(email);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };
  
  // Manually refresh user data
  const refreshUserData = async () => {
    if (currentUser) {
      try {
        const profile = await getUserProfile(currentUser.uid);
        setUserProfile(profile);
        return profile;
      } catch (err) {
        console.error("Error refreshing user data:", err);
        throw err;
      }
    }
    return null;
  };
  
  // Email verification methods
  const simulateEmailVerification = async () => {
    // Implementation can remain for development purposes
    return { success: true, verificationTime: new Date().toISOString() };
  };
  
  const verifyEmail = async () => {
    // Implement using Firebase
    return { success: true };
  };
  
  // Update profile
  const updateProfile = async (data) => {
    setError(null);
    if (!currentUser) {
      setError("No authenticated user");
      throw new Error("No authenticated user");
    }
    
    try {
      await updateUserProfile(currentUser.uid, data);
      
      // Update local profile state
      setUserProfile(prev => ({
        ...prev,
        ...data
      }));
      
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };
  
  // Email and password update methods
  const updateUserEmail = async (newEmail) => {
    // Implement using Firebase
    return { success: true };
  };
  
  const updateUserPassword = async (newPassword) => {
    // Implement using Firebase
    return { success: true };
  };
  
  // Social sign-in methods
  const loginWithGoogleProvider = async () => {
    setError(null);
    try {
      return await loginWithGoogle();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };
  
  const facebookSignIn = async () => {
    // Implement Facebook sign-in
    return { success: true };
  };
  
  // Check if user has specific role
  const hasRole = (role) => {
    return userProfile?.role === role;
  };
  
  // Context value
  const value = {
    currentUser,
    userProfile,
    loading,
    error,
    register,
    login,
    logout,
    resetPassword: resetUserPassword,
    refreshUserData,
    simulateEmailVerification,
    verifyEmail,
    updateProfile,
    updateUserEmail,
    updateUserPassword,
    loginWithGoogle: loginWithGoogleProvider,
    facebookSignIn,
    hasRole,
    isAuthenticated: !!currentUser
  };
  
  return (
    <AuthContext.Provider value={value}>
      {!loading ? children : <div>Loading...</div>}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 