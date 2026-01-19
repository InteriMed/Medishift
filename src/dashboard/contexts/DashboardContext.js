import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebase';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot, updateDoc } from 'firebase/firestore';
import Cookies from 'js-cookie';
import { setWorkspaceCookie, getWorkspaceCookie, clearWorkspaceCookie } from '../../utils/cookieUtils';
import {
  createWorkspaceSession,
  validateWorkspaceSession,
  clearWorkspaceSession,
  getAvailableWorkspaces,
  WORKSPACE_TYPES
} from '../../utils/sessionAuth';
import { buildDashboardUrl, getDefaultRouteForWorkspace } from '../utils/pathUtils';

const DashboardContext = createContext(null);

// Cookie names for storing profile and tutorial status
const PROFILE_COMPLETE_COOKIE = 'medishift_profile_complete';
const TUTORIAL_PASSED_COOKIE = 'medishift_tutorial_passed';
const COOKIE_EXPIRY_DAYS = 7; // Set cookies to expire after 7 days

export const DashboardProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dashboardData] = useState(null);
  const [userPreferences, setUserPreferences] = useState(null);
  const [notifications] = useState([]);
  const [loading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileComplete, setProfileComplete] = useState(false);
  const [tutorialPassed, setTutorialPassed] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  const [nextIncompleteProfileSection, setNextIncompleteProfileSection] = useState(null);

  // Debug logging - Fixed to prevent infinite loops
  // Debug logging
  useEffect(() => {
    // console.log("DashboardContext Debug:", { currentUser, isLoading, error });
  }, [currentUser, isLoading, error]);

  // Helper functions for cookie management
  const setCookieValues = (userId, isProfessionalProfileComplete, isTutorialPassed) => {
    if (!userId) return;

    // Store values in cookies with expiry time
    Cookies.set(`${PROFILE_COMPLETE_COOKIE}_${userId}`, isProfessionalProfileComplete ? 'true' : 'false', { expires: COOKIE_EXPIRY_DAYS });
    Cookies.set(`${TUTORIAL_PASSED_COOKIE}_${userId}`, isTutorialPassed ? 'true' : 'false', { expires: COOKIE_EXPIRY_DAYS });

    // console.log(`[DashboardContext] Updated cookies - Profile Complete: ${isProfessionalProfileComplete}, Tutorial Passed: ${isTutorialPassed}`);
  };

  const getCookieValues = (userId) => {
    if (!userId) return { profileComplete: false, tutorialPassed: false };

    const profileCompleteCookie = Cookies.get(`${PROFILE_COMPLETE_COOKIE}_${userId}`);
    const tutorialPassedCookie = Cookies.get(`${TUTORIAL_PASSED_COOKIE}_${userId}`);

    return {
      profileComplete: profileCompleteCookie === 'true',
      tutorialPassed: tutorialPassedCookie === 'true'
    };
  };

  const clearCookieValues = (userId) => {
    if (!userId) return;

    Cookies.remove(`${PROFILE_COMPLETE_COOKIE}_${userId}`);
    Cookies.remove(`${TUTORIAL_PASSED_COOKIE}_${userId}`);
  };

  // Set tutorial completion status
  const setTutorialComplete = async (isComplete = true) => {
    if (!currentUser) return false;

    try {
      // Update in database
      await updateDoc(doc(db, 'users', currentUser.uid), {
        tutorialPassed: isComplete,
        updatedAt: serverTimestamp()
      });

      // Update local state
      setTutorialPassed(isComplete);

      // Update cookie
      setCookieValues(currentUser.uid, profileComplete, isComplete);

      return true;
    } catch (error) {
      console.error('Error updating tutorial status:', error);
      return false;
    }
  };

  // Set profile completion status
  const setProfileCompletionStatus = async (isComplete = true) => {
    if (!currentUser) return false;

    try {
      // Update in database
      await updateDoc(doc(db, 'users', currentUser.uid), {
        isProfessionalProfileComplete: isComplete,
        updatedAt: serverTimestamp()
      });

      // Update local state
      setProfileComplete(isComplete);

      // Update cookie
      setCookieValues(currentUser.uid, isComplete, tutorialPassed);

      return true;
    } catch (error) {
      console.error('Error updating profile completion status:', error);
      return false;
    }
  };

  // Helper function to check profile completeness
  const checkProfileCompleteness = (userData) => {
    // First, check if there's an explicit isProfessionalProfileComplete field
    if (userData.hasOwnProperty('isProfessionalProfileComplete')) {
      return userData.isProfessionalProfileComplete;
    }

    // If not, check based on required fields
    const requiredFields = [
      'firstName',
      'lastName',
      'email',
      'phoneNumber',
      'specialties',
      'bio'
    ];

    return requiredFields.every(field =>
      userData[field] && String(userData[field]).trim() !== ''
    );
  };

  // Helper function to determine the next incomplete profile section
  const getNextIncompleteProfileSection = (userData) => {
    if (!userData) return null;

    // 1. Personal Details (Basic Identity & Contact)
    const personalFields = ['firstName', 'lastName', 'email', 'phoneNumber'];
    const hasPersonalDetails = personalFields.every(field =>
      userData[field] && String(userData[field]).trim() !== ''
    );
    if (!hasPersonalDetails) return 'personalDetails';

    // 2. Professional Background (Assumed incomplete if not explicitly marked complete)
    // In a real app, we'd check if education/workExperience arrays have items
    if (!userData.isProfessionalProfileComplete) {
      // Check if they at least have specialties set
      if (!userData.specialties || (Array.isArray(userData.specialties) && userData.specialties.length === 0)) {
        return 'professionalBackground';
      }

      // Check if they have billing info (simplified)
      if (!userData.bankDetails && !userData.banking && !userData.payrollData) {
        return 'billingInformation';
      }

      // Assume the rest is Document Uploads
      return 'documentUploads';
    }

    return null; // Profile is complete
  };

  // New function to refresh user data from Firestore
  const refreshUserData = async () => {
    if (!currentUser) return;

    try {


      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();

        // Check profile completion status
        const isProfessionalProfileComplete = userData.hasOwnProperty('isProfessionalProfileComplete')
          ? userData.isProfessionalProfileComplete
          : checkProfileCompleteness(userData);

        // Check tutorial completion status
        const isTutorialPassed = userData.hasOwnProperty('tutorialPassed')
          ? userData.tutorialPassed
          : false;

        setUser(userData);
        setUserProfile(userData);
        setProfileComplete(isProfessionalProfileComplete);
        setTutorialPassed(isTutorialPassed);

        // Update cookies
        setCookieValues(currentUser.uid, isProfessionalProfileComplete, isTutorialPassed);



        return userData;
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);

    }

    return null;
  };

  // Fetch user data and workspaces when currentUser changes
  useEffect(() => {
    const fetchUserData = async () => {
      // console.log("[DashboardContext] Fetching user data...");

      if (!currentUser) {
        if (user) {
          setUser(null);
          setWorkspaces([]);
          setSelectedWorkspace(null);
          setProfileComplete(false);
          setTutorialPassed(false);
          setUserProfile(null);
          clearCookieValues(currentUser?.uid);
        }
        setIsLoading(false);
        return;
      }

      // Optimization: if we already have the user data for this UID AND valid profile flags, don't refetch
      // We must allow it to run if flags are undefined (e.g. from onSnapshot initialization)
      if (user && user.uid === currentUser.uid && typeof user.hasProfessionalProfile !== 'undefined') {
        setIsLoading(false);
        return;
      }

      let fetchedUser = null;


      try {
        setIsLoading(true);

        // First check if values exist in cookies to avoid database fetch

        // console.log("[DashboardContext] Cookie values:", cookieValues);

        // console.log(`Attempting to fetch user document for ID: ${currentUser.uid}`);
        // Replace API call with direct Firestore access
        // Add timeout to prevent infinite loading
        const TIMEOUT_MS = 15000;
        const fetchUserDoc = getDoc(doc(db, 'users', currentUser.uid));
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timed out')), TIMEOUT_MS)
        );

        const userDoc = await Promise.race([fetchUserDoc, timeoutPromise]);

        if (!userDoc.exists()) {
          console.log("[DashboardContext] User document does not exist, creating new user document");


          // Create a basic user document using data from Auth
          const basicUserData = {
            uid: currentUser.uid,
            email: currentUser.email,
            emailVerified: currentUser.emailVerified,
            displayName: currentUser.displayName || '',
            firstName: currentUser.displayName ? currentUser.displayName.split(' ')[0] : '',
            lastName: currentUser.displayName ? currentUser.displayName.split(' ').slice(1).join(' ') : '',
            phoneNumber: currentUser.phoneNumber || '',
            photoURL: currentUser.photoURL || '',
            role: 'professional', // Default role
            isProfessionalProfileComplete: false, // Add the new fields
            tutorialPassed: false,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Create the missing document
          await setDoc(doc(db, 'users', currentUser.uid), basicUserData);


          // Set user state with basic data
          fetchedUser = basicUserData;
          setUser(basicUserData);
          setUserProfile(basicUserData);
          setProfileComplete(false);
          setTutorialPassed(false);

          // Update cookies
          setCookieValues(currentUser.uid, false, false);


        } else {
          const userData = userDoc.data();


          // console.log("[DashboardContext] User data fetched:", userData);

          // Check profile completion status - use existing field or compute if not available
          const isProfessionalProfileComplete = userData.hasOwnProperty('isProfessionalProfileComplete')
            ? userData.isProfessionalProfileComplete
            : checkProfileCompleteness(userData);

          // Check tutorial completion status
          const isTutorialPassed = userData.hasOwnProperty('tutorialPassed')
            ? userData.tutorialPassed
            : false;

          // console.log("[DashboardContext] Profile completed status:", isProfessionalProfileComplete);
          // console.log("[DashboardContext] Tutorial passed status:", isTutorialPassed);

          // If the database doesn't have these fields yet, update them
          if (!userData.hasOwnProperty('isProfessionalProfileComplete') || !userData.hasOwnProperty('tutorialPassed')) {
            await updateDoc(doc(db, 'users', currentUser.uid), {
              isProfessionalProfileComplete: isProfessionalProfileComplete,
              tutorialPassed: isTutorialPassed,
              updatedAt: serverTimestamp()
            });
            console.log("[DashboardContext] Updated user document with isProfessionalProfileComplete and tutorialPassed fields");
          }

          // Ensure role field exists (critical for sessionAuth)
          if (!userData.role) {
            console.warn("[DashboardContext] User missing 'role' field, backfilling default 'professional'");
            await updateDoc(doc(db, 'users', currentUser.uid), {
              role: 'professional',
              updatedAt: serverTimestamp()
            });
            // Update local object to reflect change immediately
            userData.role = 'professional';
          }

          // Ensure uid is included in the user object
          const userWithId = { ...userData, uid: currentUser.uid };
          fetchedUser = userWithId;
          setUser(userWithId);
          setUserProfile(userWithId);
          setProfileComplete(isProfessionalProfileComplete);
          setTutorialPassed(isTutorialPassed);

          // Update cookies
          setCookieValues(currentUser.uid, isProfessionalProfileComplete, isTutorialPassed);


        }

        // We could also get workspaces from Firestore
        // For now, keep the example data
        // Workspaces are initialized in useEffect based on user roles
        // This prevents race conditions and ensures correct session handling
      } catch (error) {
        // Don't show full error UI for offline/network issues, just log warning
        if (error.message === 'Request timed out') {
          console.warn('[DashboardContext] User data fetch timed out - using minimal state/cookie values');
        } else if (error.code === 'unavailable' || (error.message && error.message.includes('offline'))) {
          console.warn('[DashboardContext] User data fetch skipped - client is offline');
        } else {
          console.error('Error fetching user data from Firestore:', error);
          // Only set error if we really have no user data to show
          if (!user) {
            setError(`Error fetching user data: ${error.message}`);
          }
        }

      }

      // This handles cases where users collection might be out of sync or ambiguous
      try {
        const profDocRef = doc(db, 'professionalProfiles', currentUser.uid);
        const facDocRef = doc(db, 'facilityProfiles', currentUser.uid);

        const [profDoc, facDoc] = await Promise.all([
          getDoc(profDocRef),
          getDoc(facDocRef)
        ]);

        const hasProfessionalProfile = profDoc.exists();
        const hasFacilityProfile = facDoc.exists();

        // Augment user data with profile existence flags
        if (fetchedUser) {
          setUser(prev => ({
            ...prev,
            hasProfessionalProfile,
            hasFacilityProfile
          }));
          fetchedUser.hasProfessionalProfile = hasProfessionalProfile;
          fetchedUser.hasFacilityProfile = hasFacilityProfile;
        }

        // CRITICAL: Check role mismatch against fetched data
        if (hasFacilityProfile && (fetchedUser && (fetchedUser.role !== 'facility' && fetchedUser.role !== 'company'))) {
          console.log("[DashboardContext] Detected Facility Profile but mismatched role. Correcting to 'facility'.");
          if (fetchedUser) {
            setUser(prev => ({ ...prev, role: 'facility', hasProfessionalProfile, hasFacilityProfile }));
          }
        } else if (hasProfessionalProfile && (fetchedUser && fetchedUser.role !== 'professional') && !hasFacilityProfile) {
          console.log("[DashboardContext] Detected Professional Profile but mismatched role. Correcting to 'professional'.");
          if (fetchedUser) {
            setUser(prev => ({ ...prev, role: 'professional', hasProfessionalProfile, hasFacilityProfile }));
          }
        }
      } catch (profileCheckError) {
        console.error("[DashboardContext] Error checking profile existence:", profileCheckError);
      }

      setIsLoading(false);
    };

    fetchUserData();

    // Set up real-time listener for user document changes
    if (currentUser) {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const userData = docSnapshot.data();

          // Check if user has completed their profile
          const isProfessionalProfileComplete = userData.hasOwnProperty('isProfessionalProfileComplete')
            ? userData.isProfessionalProfileComplete
            : checkProfileCompleteness(userData);

          // Check if user has passed the tutorial
          const isTutorialPassed = userData.hasOwnProperty('tutorialPassed')
            ? userData.tutorialPassed
            : false;

          // Only update if status has changed
          if (isProfessionalProfileComplete !== profileComplete || isTutorialPassed !== tutorialPassed) {
            // console.log("Profile status changed - Profile Complete:", isProfessionalProfileComplete, "Tutorial Passed:", isTutorialPassed);
            setProfileComplete(isProfessionalProfileComplete);
            setTutorialPassed(isTutorialPassed);

            // Update cookies
            setCookieValues(currentUser.uid, isProfessionalProfileComplete, isTutorialPassed);
          }

          // Update user data in state, ensuring uid is included
          const userWithId = { ...userData, uid: docSnapshot.id };

          // CRITICAL: Preserve runtime flags (profile existence) that are not in Firestore
          // This prevents the snapshot listener from clobbering the flags set by fetchUserData
          setUser(prev => ({
            ...userWithId,
            hasProfessionalProfile: prev?.hasProfessionalProfile,
            hasFacilityProfile: prev?.hasFacilityProfile
          }));

          setUserProfile(userWithId);
        }
      }, (error) => {
        console.error("Error in user document listener:", error);
      });

      // Clean up listener on unmount
      return () => unsubscribe();
    }
  }, [currentUser, profileComplete, tutorialPassed]);

  useEffect(() => {
    if (user) {
      const nextSection = getNextIncompleteProfileSection(user);
      setNextIncompleteProfileSection(nextSection);
    }
  }, [user]);

  const updateUserPreferences = async (newPrefs) => {
    if (!currentUser) return;

    try {
      // Update preferences in Firestore
      await setDoc(doc(db, 'users', currentUser.uid, 'settings', 'preferences'),
        { ...userPreferences, ...newPrefs },
        { merge: true }
      );

      setUserPreferences({ ...userPreferences, ...newPrefs });
      return true;
    } catch (err) {
      console.error('Error updating preferences in Firestore:', err);
      return false;
    }
  };

  const refreshDashboardData = async () => {
    // Implement refresh logic with Firestore
    // To be completed during development
  };

  // Function to switch between workspaces
  const switchWorkspace = useCallback(async (workspace) => {
    if (!workspace || !workspace.id) {
      console.warn('Invalid workspace provided to switchWorkspace');
      return;
    }

    console.log('[DashboardContext] Switching to workspace:', workspace);

    try {
      // Clear any existing workspace sessions
      if (selectedWorkspace) {
        if (selectedWorkspace.type === WORKSPACE_TYPES.PERSONAL) {
          clearWorkspaceSession(WORKSPACE_TYPES.PERSONAL);
        } else if (selectedWorkspace.type === WORKSPACE_TYPES.TEAM) {
          clearWorkspaceSession(WORKSPACE_TYPES.TEAM, selectedWorkspace.facilityId);
        } else if (selectedWorkspace.type === WORKSPACE_TYPES.ADMIN) {
          clearWorkspaceSession(WORKSPACE_TYPES.ADMIN);
        }
      }

      // Create new session for the selected workspace
      let sessionToken = null;
      if (workspace.type === WORKSPACE_TYPES.PERSONAL) {
        sessionToken = await createWorkspaceSession(user.uid, WORKSPACE_TYPES.PERSONAL, null, user);
      } else if (workspace.type === WORKSPACE_TYPES.TEAM) {
        sessionToken = await createWorkspaceSession(user.uid, WORKSPACE_TYPES.TEAM, workspace.facilityId, user);
      } else if (workspace.type === WORKSPACE_TYPES.ADMIN) {
        sessionToken = await createWorkspaceSession(user.uid, WORKSPACE_TYPES.ADMIN, null, user);
      }

      if (!sessionToken) {
        console.error('[DashboardContext] Failed to create workspace session - Token is null');
        // Don't leave the UI in a broken state, revert to personal if possible or just stop loading
        setIsLoading(false);
        return;
      }

      // Update local state
      setSelectedWorkspace(workspace);

      // Store workspace selection in cookie for persistence
      setWorkspaceCookie(workspace);

      // Navigate to correct default route based on workspace type with workspace in URL
      const defaultRoute = getDefaultRouteForWorkspace(workspace.type);
      const routeWithWorkspace = buildDashboardUrl(defaultRoute.replace('/dashboard', ''), workspace.id);
      navigate(routeWithWorkspace, { replace: true });

      // Auto-reload to ensure clean state separation between workspaces
      setTimeout(() => {
        window.location.reload();
      }, 100);

    } catch (error) {
      console.error('[DashboardContext] Error switching workspace:', error);
    }
  }, [selectedWorkspace, user]);

  // Initialize workspaces and selected workspace
  // Use a ref to track the last processed user to prevent infinite loops
  // The user object changes on every Firestore update (including tutorial steps),
  // which causes the original useEffect to re-run, re-initialize workspaces, 
  // and re-create sessions in a loop.
  const lastProcessedUserRef = useRef(null);

  useEffect(() => {
    // Skip if no user
    if (!user) {
      lastProcessedUserRef.current = null;
      return;
    }

    // Create a hash/string of relevant fields that should trigger workspace re-initialization
    // We strictly ignore 'updatedAt', 'tutorialProgress', etc.
    const currentUserHash = JSON.stringify({
      uid: user.uid,
      role: user.role,
      roles: user.roles, // Ensure we catch role changes
      facilityMemberships: user.facilityMemberships?.map(m => m.facilityProfileId).sort()
    });

    // If critical user data hasn't changed, skip initialization
    if (lastProcessedUserRef.current === currentUserHash) {
      return;
    }

    // Update the ref
    lastProcessedUserRef.current = currentUserHash;

    // console.log('[DashboardContext] Initializing workspaces for user:', user.uid);

    // Get available workspaces based on user roles
    const availableWorkspaces = getAvailableWorkspaces(user);

    // Only update workspaces state if it actually changed to prevent downstream re-renders
    setWorkspaces(prev => {
      const prevHash = JSON.stringify(prev);
      const newHash = JSON.stringify(availableWorkspaces);
      return prevHash === newHash ? prev : availableWorkspaces;
    });

    // console.log('[DashboardContext] Available workspaces:', availableWorkspaces);

    // Try to restore workspace from URL first, then cookie
    const urlParams = new URLSearchParams(location.search);
    const workspaceIdFromUrl = urlParams.get('workspace');
    let workspaceFromUrl = null;
    if (workspaceIdFromUrl) {
      workspaceFromUrl = availableWorkspaces.find(w => w.id === workspaceIdFromUrl);
    }

    // Try to restore workspace from cookie if not in URL
    const savedWorkspace = workspaceFromUrl || getWorkspaceCookie();

    // Check if we already have a selected workspace that is valid
    if (selectedWorkspace) {
      // If the current selected workspace is still in the available list, we're good
      const stillAvailable = availableWorkspaces.find(w => w.id === selectedWorkspace.id);
      if (stillAvailable) {
        // Always ensure workspace is in URL
        const searchParams = new URLSearchParams(location.search);
        const currentWorkspaceInUrl = searchParams.get('workspace');
        if (!currentWorkspaceInUrl || currentWorkspaceInUrl !== selectedWorkspace.id) {
          searchParams.set('workspace', selectedWorkspace.id);
          const newUrl = `${location.pathname}?${searchParams.toString()}`;
          navigate(newUrl, { replace: true });
        }
        return;
      }
    }

    if (savedWorkspace && availableWorkspaces.find(w => w.id === savedWorkspace.id)) {
      // console.log('[DashboardContext] Restoring workspace from cookie:', savedWorkspace);

      // Validate existing session
      let hasValidSession = false;
      if (savedWorkspace.type === WORKSPACE_TYPES.PERSONAL) {
        hasValidSession = validateWorkspaceSession(WORKSPACE_TYPES.PERSONAL) !== null;
      } else if (savedWorkspace.type === WORKSPACE_TYPES.TEAM) {
        hasValidSession = validateWorkspaceSession(WORKSPACE_TYPES.TEAM, savedWorkspace.facilityId) !== null;
      } else if (savedWorkspace.type === WORKSPACE_TYPES.ADMIN) {
        hasValidSession = validateWorkspaceSession(WORKSPACE_TYPES.ADMIN) !== null;
      }

      if (hasValidSession) {
        setSelectedWorkspace(savedWorkspace);
        // Update URL with workspace - ensure it's always present
        const searchParams = new URLSearchParams(location.search);
        searchParams.set('workspace', savedWorkspace.id);
        const defaultRoute = getDefaultRouteForWorkspace(savedWorkspace.type);
        const routeWithWorkspace = buildDashboardUrl(defaultRoute.replace('/dashboard', ''), savedWorkspace.id);
        navigate(routeWithWorkspace, { replace: true });
      } else {
        // console.log('[DashboardContext] No valid session, creating new one');
        switchWorkspace(savedWorkspace);
      }
    } else if (availableWorkspaces.length > 0) {
      // Auto-select workspace based on user's primary role to avoid blinking
      // console.log('[DashboardContext] Auto-selecting workspace based on primary role');

      // Prioritize based on user's primary role field
      const primaryWorkspace = availableWorkspaces.find(w => {
        if (user.role === 'facility' || user.role === 'company') {
          return w.type === WORKSPACE_TYPES.TEAM;
        } else if (user.role === 'professional') {
          return w.type === WORKSPACE_TYPES.PERSONAL;
        }
        return false;
      }) || availableWorkspaces.find(w => w.type === WORKSPACE_TYPES.ADMIN);

      // Fall back to first workspace if no match found
      const workspaceToSelect = primaryWorkspace || availableWorkspaces[0];
      console.log('[DashboardContext] Selected workspace:', workspaceToSelect);
      switchWorkspace(workspaceToSelect);
    } else {
      console.log('[DashboardContext] No workspaces available for user');
      setSelectedWorkspace(null);
      clearWorkspaceCookie();
      // Remove workspace from URL if no workspaces available
      const searchParams = new URLSearchParams(location.search);
      searchParams.delete('workspace');
      const newUrl = searchParams.toString() ? `${location.pathname}?${searchParams.toString()}` : location.pathname;
      navigate(newUrl, { replace: true });
    }
  }, [user, switchWorkspace, selectedWorkspace, location, navigate]);

  // Validate workspace session periodically
  useEffect(() => {
    if (!selectedWorkspace) return;

    const validateSession = () => {
      let isValid = false;

      if (selectedWorkspace.type === WORKSPACE_TYPES.PERSONAL) {
        isValid = validateWorkspaceSession(WORKSPACE_TYPES.PERSONAL) !== null;
      } else if (selectedWorkspace.type === WORKSPACE_TYPES.TEAM) {
        isValid = validateWorkspaceSession(WORKSPACE_TYPES.TEAM, selectedWorkspace.facilityId) !== null;
      } else if (selectedWorkspace.type === WORKSPACE_TYPES.ADMIN) {
        isValid = validateWorkspaceSession(WORKSPACE_TYPES.ADMIN) !== null;
      }

      if (!isValid) {
        console.warn('[DashboardContext] Session expired, clearing workspace');
        setSelectedWorkspace(null);
        clearWorkspaceCookie();
      }
    };

    // Validate immediately and then every 5 minutes
    validateSession();
    const interval = setInterval(validateSession, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [selectedWorkspace]);

  const fetchUserProfile = async (userId, userRole) => {
    try {
      // Determine the correct profile collection based on role
      const profileCollection = (userRole === 'facility' || userRole === 'company') ? 'facilityProfiles' : 'professionalProfiles';
      const profileDocRef = doc(db, profileCollection, userId);

      console.log(`Fetching profile from ${profileCollection} collection for user:`, userId);

      const profileSnapshot = await getDoc(profileDocRef);

      if (profileSnapshot.exists()) {
        const profileData = profileSnapshot.data();
        return profileData;
      } else {
        console.log(`No profile document found in ${profileCollection} for user:`, userId);
        return null;
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  };

  const value = React.useMemo(() => ({
    dashboardData,
    userPreferences,
    loading,
    error,
    notifications,
    refreshDashboardData,
    updateUserPreferences,
    user,
    userProfile,
    workspaces,
    selectedWorkspace,
    switchWorkspace,
    isLoading,
    profileComplete,
    tutorialPassed,
    nextIncompleteProfileSection,
    setTutorialComplete,
    setProfileCompletionStatus,
    loadingDebugInfo: {
      loading,
      isAuthReady: currentUser !== null,
      isUserDataLoaded: user !== null,
      isDashboardDataLoaded: dashboardData !== null,
      errorMessage: error
    },
    fetchUserProfile,
    refreshUserData
  }), [
    dashboardData,
    userPreferences,
    loading,
    error,
    notifications,
    user,
    userProfile,
    workspaces,
    selectedWorkspace,
    switchWorkspace,
    isLoading,
    profileComplete,
    tutorialPassed,
    nextIncompleteProfileSection,
    currentUser,
    refreshUserData,
    setTutorialComplete,
    setProfileCompletionStatus,
    updateUserPreferences
  ]);

  return (
    <DashboardContext.Provider value={value}>
      {typeof children === 'function'
        ? children({ profileComplete, tutorialPassed, isLoading })
        : children}
    </DashboardContext.Provider>
  );
};

DashboardProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}; 