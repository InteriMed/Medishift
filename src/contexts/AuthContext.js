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
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
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
  const checkOnboardingStatus = useCallback(async (userId, providedUserData = null) => {
    try {
      // First check cookies for faster response (as fallback/initial state)
      const cookieValues = getCookieValues(userId);

      // If no data provided, try to get from Firestore
      let userData = providedUserData;
      if (!userData) {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          userData = userDoc.data();
        }
      }

      if (userData) {
        // Get onboarding status
        const profileComplete = userData.hasOwnProperty('isProfessionalProfileComplete')
          ? userData.isProfessionalProfileComplete
          : false;

        const tutorialPassed = userData.hasOwnProperty('tutorialPassed')
          ? userData.tutorialPassed
          : false;

        console.log(`[AuthContext] Firestore values for ${userId} - Profile Complete: ${profileComplete}, Tutorial Passed: ${tutorialPassed}`);

        // Update state
        setIsProfessionalProfileComplete(profileComplete);
        setIsTutorialPassed(tutorialPassed);

        // Update cookies
        setCookieValues(userId, profileComplete, tutorialPassed);

        return { profileComplete, tutorialPassed };
      }

      // Fallback to cookies if no data found/provided
      setIsProfessionalProfileComplete(cookieValues.profileComplete);
      setIsTutorialPassed(cookieValues.tutorialPassed);
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
          const isOnboarding = window.location.pathname.includes('/onboarding') || 
                               window.location.pathname.includes('/dashboard/profile') ||
                               window.location.pathname.includes('/dashboard/onboarding');
          
          const timeoutPromise = isOnboarding ? null : new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timed out')), 15000)
          );

          // Helper function to create user document
          const createUserDocument = async (user, userDocRef) => {
            const displayName = user.displayName || user.email?.split('@')[0] || '';
            const nameParts = displayName.split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            const userData = {
              email: user.email || '',
              displayName: displayName,
              firstName: firstName,
              lastName: lastName,
              phoneNumber: '',
              phonePrefix: '+41',
              photoURL: user.photoURL || '',
              role: 'professional',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              profileCompleted: false,
              profileCompletionPercentage: 0,
              isProfessionalProfileComplete: false,
              tutorialPassed: false
            };

            console.log(`[AuthContext] Creating user document for ${user.uid}`);
            await setDoc(userDocRef, userData);
            console.log(`[AuthContext] ✅ User document created for ${user.uid}`);

            // Also create profile document
            try {
              const profileRef = doc(db, 'professionalProfiles', user.uid);
              const profileData = {
                email: userData.email,
                firstName: firstName,
                lastName: lastName,
                legalFirstName: firstName,
                legalLastName: lastName,
                contactPhone: '',
                contactPhonePrefix: '+41',
                profileVisibility: 'public',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              };
              await setDoc(profileRef, profileData);
              console.log(`[AuthContext] ✅ Profile document created for ${user.uid}`);
            } catch (profileError) {
              console.warn(`[AuthContext] ⚠️ Could not create profile document:`, profileError);
            }
          };

          // Get additional user data from Firestore with timeout
          const fetchData = async () => {
            if (!db) {
              throw new Error('Firestore database not initialized');
            }

            console.log(`[AuthContext] Fetching user document for ${user.uid}`);
            const userDocRef = doc(db, 'users', user.uid);
            
            try {
              // Use a shorter timeout for the initial read
              const quickReadPromise = getDoc(userDocRef);
              const quickTimeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Quick read timeout')), 5000)
              );
              
              let userDoc;
              try {
                userDoc = await Promise.race([quickReadPromise, quickTimeout]);
              } catch (quickError) {
                // If quick read fails, try creating document directly
                console.log(`[AuthContext] Quick read failed, creating user document directly for ${user.uid}`);
                await createUserDocument(user, userDocRef);
                userDoc = await getDoc(userDocRef);
              }

              if (userDoc.exists()) {
                const userData = userDoc.data();
                console.log(`[AuthContext] User document found for ${user.uid}`);
                setUserProfile({ id: userDoc.id, ...userData });
                await checkOnboardingStatus(user.uid, userData);
              } else {
                console.log(`[AuthContext] User document doesn't exist, creating for ${user.uid}`);
                await createUserDocument(user, userDocRef);
                
                // Fetch the newly created document
                const newUserDoc = await getDoc(userDocRef);
                if (newUserDoc.exists()) {
                  const userData = newUserDoc.data();
                  setUserProfile({ id: newUserDoc.id, ...userData });
                  await checkOnboardingStatus(user.uid, userData);
                } else {
                  await checkOnboardingStatus(user.uid);
                }
              }
            } catch (docError) {
              console.error(`[AuthContext] Error with user document:`, docError);
              // Try to create document anyway as fallback
              try {
                console.log(`[AuthContext] Fallback: Creating user document for ${user.uid}`);
                await createUserDocument(user, userDocRef);
              } catch (createError) {
                console.error(`[AuthContext] Failed to create user document:`, createError);
              }
              throw docError;
            }
          };

          if (timeoutPromise) {
            await Promise.race([fetchData(), timeoutPromise]);
          } else {
            await fetchData();
          }

        } catch (err) {
          if (err.message === 'Request timed out') {
            console.warn("⚠️ User profile fetch timed out - allowing app to load without full profile");
            console.warn("This may indicate:");
            console.warn("  1. Firestore is slow to respond");
            console.warn("  2. Network connectivity issues");
            console.warn("  3. User document doesn't exist and needs to be created");
            
            // Try a quick retry with shorter timeout
            try {
              console.log("[AuthContext] Attempting quick retry...");
              const quickRetry = await Promise.race([
                getDoc(doc(db, 'users', user.uid)),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Quick retry timed out')), 3000))
              ]);
              
              if (quickRetry.exists()) {
                const userData = quickRetry.data();
                setUserProfile({ id: quickRetry.id, ...userData });
                await checkOnboardingStatus(user.uid, userData);
                console.log("[AuthContext] Quick retry succeeded");
              }
            } catch (retryError) {
              console.warn("[AuthContext] Quick retry also failed:", retryError.message);
            }
          } else if (err.code === 'unavailable' || (err.message && err.message.includes('offline'))) {
            console.warn("⚠️ User profile fetch skipped - client is offline");
          } else if (err.code === 'permission-denied') {
            console.error("❌ Permission denied accessing user document. Check Firestore security rules.");
          } else {
            console.error("❌ Error fetching user profile:", err);
            console.error("Error code:", err.code);
            console.error("Error message:", err.message);
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

      if (!db) {
        throw new Error('Firestore database not initialized');
      }

      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('✅ Auth user created:', user.uid);

      // Create user document in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userData = {
        email,
        firstName,
        lastName,
        phoneNumber: phoneNumber || '',
        phonePrefix: phonePrefix || '+41',
        role: 'professional',
        createdAt: new Date(),
        updatedAt: new Date(),
        profileCompleted: false,
        profileCompletionPercentage: 0,
        isProfessionalProfileComplete: false,
        tutorialPassed: false
      };

      await setDoc(userDocRef, userData);
      console.log('📝 User document write initiated');

      // Verify the document was created
      const verifyUserDoc = await getDoc(userDocRef);
      if (!verifyUserDoc.exists()) {
        throw new Error('Failed to create user document in Firestore - document does not exist after write');
      }
      console.log('✅ User document verified in Firestore:', user.uid);

      // Create empty profile document
      const profileCollection = 'professionalProfiles';
      const profileDocRef = doc(db, profileCollection, user.uid);
      const profileData = {
        email,
        firstName,
        lastName,
        legalFirstName: firstName,
        legalLastName: lastName,
        contactPhone: phoneNumber || '',
        contactPhonePrefix: phonePrefix || '+41',
        profileVisibility: 'public',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await setDoc(profileDocRef, profileData);
      console.log('📝 Profile document write initiated');

      // Verify the profile document was created
      const verifyProfileDoc = await getDoc(profileDocRef);
      if (!verifyProfileDoc.exists()) {
        console.warn('⚠️ Profile document may not have been created');
      } else {
        console.log('✅ Profile document verified in Firestore');
      }

      // Set cookies for onboarding status
      setCookieValues(user.uid, false, false);

      return user;
    } catch (error) {
      console.error("❌ Error registering user:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      if (error.stack) {
        console.error("Error stack:", error.stack);
      }
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