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
import Cookies from 'js-cookie';
import { getCookieKey, COOKIE_CONFIG, COOKIE_KEYS, FIRESTORE_COLLECTIONS } from '../config/keysDatabase';

const COOKIE_EXPIRY_DAYS = COOKIE_CONFIG.PROFILE_TUTORIAL_EXPIRY_DAYS;

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
  
  const [impersonationSession, setImpersonationSession] = useState(null);
  const [impersonatedUser, setImpersonatedUser] = useState(null);
  const [originalUserProfile, setOriginalUserProfile] = useState(null);
  
  // Comment these out if not using them
  // const navigate = useNavigate();
  // const location = useLocation();

  // Helper functions for cookie management
  const setCookieValues = useCallback((userId, profileComplete, tutorialPassed) => {
    if (!userId) return;

    Cookies.set(getCookieKey('PROFILE_COMPLETE', userId), profileComplete ? 'true' : 'false', { expires: COOKIE_EXPIRY_DAYS });
    Cookies.set(getCookieKey('TUTORIAL_PASSED', userId), tutorialPassed ? 'true' : 'false', { expires: COOKIE_EXPIRY_DAYS });

    // console.log(`[AuthContext] Updated cookies - Profile Complete: ${profileComplete}, Tutorial Passed: ${tutorialPassed}`);
  }, []);

  const getCookieValues = useCallback((userId) => {
    if (!userId) return { profileComplete: false, tutorialPassed: false };

    const profileCompleteCookie = Cookies.get(getCookieKey('PROFILE_COMPLETE', userId));
    const tutorialPassedCookie = Cookies.get(getCookieKey('TUTORIAL_PASSED', userId));

    return {
      profileComplete: profileCompleteCookie === 'true',
      tutorialPassed: tutorialPassedCookie === 'true'
    };
  }, []);

  const clearCookieValues = useCallback((userId) => {
    if (!userId) return;

    Cookies.remove(getCookieKey('PROFILE_COMPLETE', userId));
    Cookies.remove(getCookieKey('TUTORIAL_PASSED', userId));
  }, []);

  // Check onboarding status
  const checkOnboardingStatus = useCallback(async (userId, providedUserData = null) => {
    try {
      // First check cookies for faster response (as fallback/initial state)
      const cookieValues = getCookieValues(userId);

      // If no data provided, try to get from Firestore
      let userData = providedUserData;
      if (!userData) {
        const userDoc = await getDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, userId));
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
              roles: [],
              createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };

          await setDoc(userDocRef, userData);
        };

          const fetchAdminData = async (userId) => {
            try {
              const adminDocRef = doc(db, 'admins', userId);
              const adminDoc = await getDoc(adminDocRef);
              if (adminDoc.exists()) {
                const data = adminDoc.data();
                if (data.isActive !== false) {
                  return data;
                }
              }
              return null;
            } catch (err) {
              console.debug('[AuthContext] Admin data fetch error:', err.message);
              return null;
            }
          };

          const fetchData = async () => {
            if (!db) {
              throw new Error('Firestore database not initialized');
            }

            const userDocRef = doc(db, 'users', user.uid);
            
            try {
              const quickReadPromise = getDoc(userDocRef);
              const quickTimeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Quick read timeout')), 5000)
              );
              
              let userDoc;
              try {
                quickReadPromise.catch(err => {
                  if (err.message !== 'Quick read timeout') {
                    // Background quick read error
                  }
                });
                userDoc = await Promise.race([quickReadPromise, quickTimeout]);
              } catch (quickError) {
                await createUserDocument(user, userDocRef);
                userDoc = await getDoc(userDocRef);
              }

              if (userDoc.exists()) {
                const userData = userDoc.data();
                
                const adminData = await fetchAdminData(user.uid);
                const profileWithAdmin = { 
                  id: userDoc.id, 
                  ...userData,
                  adminData: adminData
                };
                
                setUserProfile(profileWithAdmin);
                await checkOnboardingStatus(user.uid, userData);
              } else {
                await createUserDocument(user, userDocRef);
                
                const newUserDoc = await getDoc(userDocRef);
                if (newUserDoc.exists()) {
                  const userData = newUserDoc.data();
                  const adminData = await fetchAdminData(user.uid);
                  const profileWithAdmin = { 
                    id: newUserDoc.id, 
                    ...userData,
                    adminData: adminData
                  };
                  setUserProfile(profileWithAdmin);
                  await checkOnboardingStatus(user.uid, userData);
                } else {
                  await checkOnboardingStatus(user.uid);
                }
              }
            } catch (docError) {
              try {
                await createUserDocument(user, userDocRef);
              } catch (createError) {
                // Failed to create user document
              }
              throw docError;
            }
          };

          if (timeoutPromise) {
            const fetchDataPromise = fetchData();
            // Catch any rejections from fetchData that occur after timeout
            fetchDataPromise.catch(err => {
              // Silently handle - timeout already handled the error
              if (err.message !== 'Request timed out' && err.message !== 'Quick read timeout') {
                // Background fetch error
              }
            });
            try {
              await Promise.race([fetchDataPromise, timeoutPromise]);
            } catch (raceError) {
              // Re-throw to be caught by outer catch block
              throw raceError;
            }
          } else {
            await fetchData();
          }

        } catch (err) {
          if (err.message === 'Request timed out') {
            // Try a quick retry with shorter timeout
            try {
              const quickRetryPromise = getDoc(doc(db, 'users', user.uid));
              const quickRetryTimeout = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Quick retry timed out')), 3000)
              );
              
              // Catch any rejections from quickRetryPromise that occur after timeout
              quickRetryPromise.catch(err => {
                if (err.message !== 'Quick retry timed out') {
                  // Background quick retry error
                }
              });
              
              const quickRetry = await Promise.race([quickRetryPromise, quickRetryTimeout]);
              
              if (quickRetry.exists()) {
                const userData = quickRetry.data();
                setUserProfile({ id: quickRetry.id, ...userData });
                await checkOnboardingStatus(user.uid, userData);
              }
            } catch (retryError) {
              // Silently handle timeout errors - they're expected
            }
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

      // Create user document in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userData = {
        email,
        firstName,
        lastName,
        phoneNumber: phoneNumber || '',
        phonePrefix: phonePrefix || '+41',
        roles: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await setDoc(userDocRef, userData);

      // Verify the document was created
      const verifyUserDoc = await getDoc(userDocRef);
      if (!verifyUserDoc.exists()) {
        throw new Error('Failed to create user document in Firestore - document does not exist after write');
      }

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

      // Verify the profile document was created
      const verifyProfileDoc = await getDoc(profileDocRef);

      // Set cookies for onboarding status
      setCookieValues(user.uid, false, false);

      return user;
    } catch (error) {
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

  const refreshUserData = async () => {
    if (currentUser) {
      try {
        const profile = await getUserProfile(currentUser.uid);
        
        let adminData = null;
        try {
          const adminDocRef = doc(db, 'admins', currentUser.uid);
          const adminDoc = await getDoc(adminDocRef);
          if (adminDoc.exists()) {
            const data = adminDoc.data();
            if (data.isActive !== false) {
              adminData = data;
            }
          }
        } catch (err) {
          console.debug('[AuthContext] Admin data refresh error:', err.message);
        }
        
        const profileWithAdmin = {
          ...profile,
          adminData: adminData
        };
        
        setUserProfile(profileWithAdmin);
        return profileWithAdmin;
      } catch (err) {
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
      await user.delete();
    } else {
      throw new Error('No user is currently authenticated.');
    }
  };

  const startImpersonation = useCallback(async (targetUserId) => {
    try {
      const { impersonateUser } = await import('../../utils/adminUtils');
      const result = await impersonateUser(targetUserId);
      
      if (result.success) {
        setOriginalUserProfile(userProfile);
        setImpersonationSession({
          sessionId: result.sessionId,
          expiresAt: new Date(result.expiresAt),
          remainingMinutes: result.expiresInMinutes
        });
        setImpersonatedUser(result.targetUser);
        
        const targetUserProfile = {
          ...result.targetUser,
          id: result.targetUser.uid,
          uid: result.targetUser.uid
        };
        setUserProfile(targetUserProfile);
        
        Cookies.set(COOKIE_KEYS.IMPERSONATION_SESSION, result.sessionId, {
          expires: new Date(result.expiresAt)
        });
        
        return result;
      } else {
        throw new Error(result.message || 'Failed to start impersonation');
      }
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }, [userProfile]);

  const stopImpersonation = useCallback(async () => {
    try {
      if (!impersonationSession) {
        return;
      }

      const { stopImpersonation: stopImpersonationFn } = await import('../../utils/adminUtils');
      await stopImpersonationFn(impersonationSession.sessionId);
      
      if (originalUserProfile) {
        setUserProfile(originalUserProfile);
      }
      
      setImpersonationSession(null);
      setImpersonatedUser(null);
      setOriginalUserProfile(null);
      
      Cookies.remove(COOKIE_KEYS.IMPERSONATION_SESSION);
      
      return { success: true };
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }, [impersonationSession, originalUserProfile]);

  const validateImpersonationSession = useCallback(async () => {
    try {
      const sessionId = Cookies.get(COOKIE_KEYS.IMPERSONATION_SESSION);
      if (!sessionId) {
        if (impersonationSession) {
          setImpersonationSession(null);
          setImpersonatedUser(null);
          if (originalUserProfile) {
            setUserProfile(originalUserProfile);
          }
          setOriginalUserProfile(null);
        }
        return false;
      }

      const { validateImpersonationSession: validateSession } = await import('../../utils/adminUtils');
      const result = await validateSession(sessionId);
      
      if (!result.isValid) {
        setImpersonationSession(null);
        setImpersonatedUser(null);
        if (originalUserProfile) {
          setUserProfile(originalUserProfile);
        }
        setOriginalUserProfile(null);
        Cookies.remove(COOKIE_KEYS.IMPERSONATION_SESSION);
        return false;
      }

      if (result.session) {
        setImpersonationSession({
          sessionId: result.session.sessionId,
          expiresAt: new Date(result.session.expiresAt),
          remainingMinutes: result.session.remainingMinutes
        });
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }, [impersonationSession, originalUserProfile]);

  useEffect(() => {
    if (currentUser && !impersonationSession) {
      const sessionId = Cookies.get(COOKIE_KEYS.IMPERSONATION_SESSION);
      if (sessionId) {
        validateImpersonationSession();
      }
    }
  }, [currentUser, impersonationSession, validateImpersonationSession]);

  useEffect(() => {
    if (impersonationSession) {
      const interval = setInterval(() => {
        validateImpersonationSession();
      }, 60000);

      const expiresAt = impersonationSession.expiresAt;
      if (expiresAt) {
        const timeout = expiresAt.getTime() - Date.now();
        if (timeout > 0) {
          setTimeout(() => {
            stopImpersonation();
          }, timeout);
        }
      }

      return () => {
        clearInterval(interval);
      };
    }
  }, [impersonationSession, validateImpersonationSession, stopImpersonation]);

  const effectiveUserProfile = impersonatedUser ? {
    ...impersonatedUser,
    id: impersonatedUser.uid,
    uid: impersonatedUser.uid
  } : userProfile;

  const isImpersonating = !!impersonationSession && !!impersonatedUser;

  // Context value
  const value = {
    currentUser,
    userProfile: effectiveUserProfile,
    originalUserProfile: isImpersonating ? originalUserProfile : userProfile,
    loading,
    error,
    isProfileComplete: isProfessionalProfileComplete,
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
    checkOnboardingStatus,
    startImpersonation,
    stopImpersonation,
    validateImpersonationSession,
    impersonationSession,
    impersonatedUser,
    isImpersonating
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