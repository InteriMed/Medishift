import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
// Only import these if you're actually using them
// import { useNavigate, useLocation } from 'react-router-dom';

import LoadingSpinner from '../components/LoadingSpinner/LoadingSpinner';

// Import all firebase services from our firebase.js service file
import {
  auth,
  db,
  loginUser,
  logoutUser,
  resetPassword,
  loginWithGoogle,
  getUserProfile,
  updateUserProfile,
  authStateObserver
} from '../services/firebase';

// Import Firebase functions directly from firebase/auth and firebase/firestore
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import Cookies from 'js-cookie'; // Import js-cookie library

// Cookie names for storing onboarding status
const PROFILE_COMPLETE_COOKIE = 'medishift_profile_complete';
const TUTORIAL_PASSED_COOKIE = 'medishift_tutorial_passed';
const COOKIE_EXPIRY_DAYS = 7; // Set cookies to expire after 7 days

// Create the Auth Context
const AuthContext = createContext();

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isProfessionalProfileComplete, setIsProfessionalProfileComplete] = useState(false);
  const [isTutorialPassed, setIsTutorialPassed] = useState(false);
  // Comment these out if not using them
  // const navigate = useNavigate();
  // const location = useLocation();

  // Helper functions for cookie management
  const setCookieValues = useCallback((userId, profileComplete, tutorialPassed) => {
    if (!userId) return;

    // Store values in cookies with expiry time
    Cookies.set(`${PROFILE_COMPLETE_COOKIE}_${userId}`, profileComplete ? 'true' : 'false', { expires: COOKIE_EXPIRY_DAYS });
    Cookies.set(`${TUTORIAL_PASSED_COOKIE}_${userId}`, tutorialPassed ? 'true' : 'false', { expires: COOKIE_EXPIRY_DAYS });

    // console.log(`[AuthContext] Updated cookies - Profile Complete: ${profileComplete}, Tutorial Passed: ${tutorialPassed}`);
  }, []);

  const getCookieValues = useCallback((userId) => {
    if (!userId) return { profileComplete: false, tutorialPassed: false };

    const profileCompleteCookie = Cookies.get(`${PROFILE_COMPLETE_COOKIE}_${userId}`);
    const tutorialPassedCookie = Cookies.get(`${TUTORIAL_PASSED_COOKIE}_${userId}`);

    return {
      profileComplete: profileCompleteCookie === 'true',
      tutorialPassed: tutorialPassedCookie === 'true'
    };
  }, []);

  const clearCookieValues = useCallback((userId) => {
    if (!userId) return;

    Cookies.remove(`${PROFILE_COMPLETE_COOKIE}_${userId}`);
    Cookies.remove(`${TUTORIAL_PASSED_COOKIE}_${userId}`);
  }, []);

  // Check onboarding status
  const checkOnboardingStatus = useCallback(async (userId) => {
    try {
      // First check cookies for faster response
      const cookieValues = getCookieValues(userId);
      console.log(`[AuthContext] Cookie values for user ${userId}:`, cookieValues);

      // Set initial values from cookies
      setIsProfessionalProfileComplete(cookieValues.profileComplete);
      setIsTutorialPassed(cookieValues.tutorialPassed);

      // Then get the latest values from Firestore
      const userDoc = await getDoc(doc(db, 'users', userId));

      if (userDoc.exists()) {
        const userData = userDoc.data();

        // Get onboarding status
        const profileComplete = userData.hasOwnProperty('isProfessionalProfileComplete')
          ? userData.isProfessionalProfileComplete
          : false;

        const tutorialPassed = userData.hasOwnProperty('tutorialPassed')
          ? userData.tutorialPassed
          : false;

        console.log(`[AuthContext] Firestore values - Profile Complete: ${profileComplete}, Tutorial Passed: ${tutorialPassed}`);

        // Update state
        setIsProfessionalProfileComplete(profileComplete);
        setIsTutorialPassed(tutorialPassed);

        // Update cookies
        setCookieValues(userId, profileComplete, tutorialPassed);

        return { profileComplete, tutorialPassed };
      }

      return cookieValues;
    } catch (error) {
      console.error('[AuthContext] Error checking onboarding status:', error);
      return { profileComplete: false, tutorialPassed: false };
    }
  }, [getCookieValues, setCookieValues]);

  useEffect(() => {
    // Set up auth state observer
    const unsubscribe = authStateObserver(async (user) => {
      setCurrentUser(user);
      setLoading(true);

      if (user) {
        try {
          // Create a timeout promise
          const TIMEOUT_MS = 15000;
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timed out')), TIMEOUT_MS)
          );

          // Get additional user data from Firestore with timeout
          // We wrap the fetch logic to run in parallel
          const fetchData = async () => {
            const profile = await getUserProfile(user.uid);
            setUserProfile(profile);
            await checkOnboardingStatus(user.uid);
          };

          await Promise.race([fetchData(), timeoutPromise]);

        } catch (err) {
          if (err.message === 'Request timed out') {
            console.warn("User profile fetch timed out - allowing app to load without full profile");
          } else if (err.code === 'unavailable' || (err.message && err.message.includes('offline'))) {
            console.warn("User profile fetch skipped - client is offline");
          } else {
            console.error("Error fetching user profile:", err);
          }
        }
      } else {
        setUserProfile(null);
        setIsProfessionalProfileComplete(false);
        setIsTutorialPassed(false);
        clearCookieValues(currentUser?.uid);
      }

      setLoading(false);
    });

    // Clean up subscription
    return () => unsubscribe();
  }, [checkOnboardingStatus, clearCookieValues, currentUser?.uid]);

  // Handle sign up
  const register = async (email, password, firstName, lastName, phoneNumber, phonePrefix) => {
    try {
      setLoading(true);

      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email,
        firstName,
        lastName,
        phoneNumber: phoneNumber || '',
        phonePrefix: phonePrefix || '+41', // Default to Swiss prefix
        role: 'professional', // Default role
        createdAt: new Date(),
        updatedAt: new Date(),
        profileCompleted: false,
        profileCompletionPercentage: 0,
        isProfessionalProfileComplete: false, // Add new fields
        tutorialPassed: false
      });

      // Create empty profile document
      const profileCollection = 'professionalProfiles'; // Default to professional
      await setDoc(doc(db, profileCollection, user.uid), {
        email,
        firstName,
        lastName,
        legalFirstName: firstName,
        legalLastName: lastName,
        contactPhone: phoneNumber || '',
        contactPhonePrefix: phonePrefix || '+41',
        profileVisibility: 'public', // Default to public
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Set cookies for onboarding status
      setCookieValues(user.uid, false, false);

      return user;
    } catch (error) {
      console.error("Error registering user:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Handle sign in
  const login = async (email, password) => {
    setError(null);
    try {
      const user = await loginUser(email, password);

      // Check onboarding status
      if (user) {
        await checkOnboardingStatus(user.uid);
      }

      return user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Handle sign out
  const logout = async () => {
    setError(null);
    try {
      const userId = currentUser?.uid;

      await logoutUser();
      setCurrentUser(null);
      setUserProfile(null);
      setIsProfessionalProfileComplete(false);
      setIsTutorialPassed(false);

      // Clear cookies
      clearCookieValues(userId);

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

  const deleteUser = async (user) => {
    if (user) {
      await user.delete(); // This deletes the user from Firebase Auth
      // Optionally, you can also delete user data from Firestore or other services here
    } else {
      throw new Error('No user is currently authenticated.');
    }
  };

  // Context value
  const value = {
    currentUser,
    userProfile,
    loading,
    error,
    isProfileComplete: isProfessionalProfileComplete, // Maintain backward compatibility
    isProfessionalProfileComplete,
    isTutorialPassed,
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
    isAuthenticated: !!currentUser,
    deleteUser,
    checkOnboardingStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading ? children : <LoadingSpinner />}
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