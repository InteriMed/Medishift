import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNetwork } from '../../contexts/NetworkContext';
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
import Dialog from '../../components/Dialog/Dialog';
import Button from '../../components/BoxedInputFields/Button';

const DashboardContext = createContext(null);

// Cookie names for storing profile and tutorial status
const PROFILE_COMPLETE_COOKIE = 'medishift_profile_complete';
const TUTORIAL_PASSED_COOKIE = 'medishift_tutorial_passed';
const COOKIE_EXPIRY_DAYS = 7; // Set cookies to expire after 7 days

export const DashboardProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const networkContext = useNetwork();
  const isOnline = networkContext?.isOnline ?? navigator.onLine;
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

  const [showFacilityNotFoundDialog, setShowFacilityNotFoundDialog] = useState(false);
  const [facilityNotFoundWorkspace, setFacilityNotFoundWorkspace] = useState(null);
  const [isLeavingFacility, setIsLeavingFacility] = useState(false);

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
      // Use profile collection instead of users
      const collectionName = selectedWorkspace?.type === WORKSPACE_TYPES.TEAM ? 'facilityProfiles' : 'professionalProfiles';

      // Update in database
      await updateDoc(doc(db, collectionName, currentUser.uid), {
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
      // Use profile collection instead of users
      const collectionName = selectedWorkspace?.type === WORKSPACE_TYPES.TEAM ? 'facilityProfiles' : 'professionalProfiles';

      // Update in database
      await updateDoc(doc(db, collectionName, currentUser.uid), {
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

      // Determine profile collection
      const collectionName = selectedWorkspace?.type === WORKSPACE_TYPES.TEAM ? 'facilityProfiles' : 'professionalProfiles';
      const profileDoc = await getDoc(doc(db, collectionName, currentUser.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const profileData = profileDoc.exists() ? profileDoc.data() : {};

        // Combine data, prioritizing profileData for tutorial and profile completion
        const combinedData = { ...userData, ...profileData, uid: currentUser.uid };

        const isProfileComplete = combinedData.hasOwnProperty('isProfessionalProfileComplete')
          ? combinedData.isProfessionalProfileComplete
          : checkProfileCompleteness(combinedData);

        const isTutorialPassed = combinedData.hasOwnProperty('tutorialPassed')
          ? combinedData.tutorialPassed
          : false;

        const userWithId = { ...combinedData, uid: currentUser.uid };
        setUser(userWithId);
        setUserProfile(userWithId);
        setProfileComplete(isProfileComplete);
        setTutorialPassed(isTutorialPassed);

        setCookieValues(currentUser.uid, isProfileComplete, isTutorialPassed);

        return userWithId;
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }

    return null;
  };

  // Fetch user data and workspaces when currentUser changes
  useEffect(() => {
    const fetchUserData = async () => {
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

      if (user && user.uid === currentUser.uid && typeof user.hasProfessionalProfile !== 'undefined') {
        setIsLoading(false);
        return;
      }

      let fetchedUser = null;

      try {
        setIsLoading(true);

        const TIMEOUT_MS = 15000;
        const fetchUserDoc = getDoc(doc(db, 'users', currentUser.uid));
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timed out')), TIMEOUT_MS)
        );

        const userDoc = await Promise.race([fetchUserDoc, timeoutPromise]);

        if (!userDoc.exists()) {
          const basicUserData = {
            uid: currentUser.uid,
            email: currentUser.email,
            emailVerified: currentUser.emailVerified,
            displayName: currentUser.displayName || '',
            firstName: currentUser.displayName ? currentUser.displayName.split(' ')[0] : '',
            lastName: currentUser.displayName ? currentUser.displayName.split(' ').slice(1).join(' ') : '',
            phoneNumber: currentUser.phoneNumber || '',
            photoURL: currentUser.photoURL || '',
            role: 'professional',
            isProfessionalProfileComplete: false,
            tutorialPassed: false,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          await setDoc(doc(db, 'users', currentUser.uid), basicUserData);
          fetchedUser = basicUserData;
          setUser(basicUserData);
          setUserProfile(basicUserData);
          setProfileComplete(false);
          setTutorialPassed(false);
          setCookieValues(currentUser.uid, false, false);
        } else {
          const userData = userDoc.data();
          const profDocRef = doc(db, 'professionalProfiles', currentUser.uid);
          const facDocRef = doc(db, 'facilityProfiles', currentUser.uid);

          const [profDoc, facDoc] = await Promise.all([
            getDoc(profDocRef),
            getDoc(facDocRef)
          ]);

          const profDocData = profDoc.exists() ? profDoc.data() : {};
          const facDocData = facDoc.exists() ? facDoc.data() : {};
          const profileData = selectedWorkspace?.type === WORKSPACE_TYPES.TEAM ? facDocData : profDocData;

          const isProfileComplete = profileData.hasOwnProperty('isProfessionalProfileComplete')
            ? profileData.isProfessionalProfileComplete
            : checkProfileCompleteness(profileData);

          const isTutorialPassed = profileData.hasOwnProperty('tutorialPassed')
            ? profileData.tutorialPassed
            : false;

          if (!userData.role) {
            await updateDoc(doc(db, 'users', currentUser.uid), {
              role: 'professional',
              updatedAt: serverTimestamp()
            });
            userData.role = 'professional';
          }

          const userWithId = {
            ...userData,
            ...profileData,
            uid: currentUser.uid,
            hasProfessionalProfile: profDoc.exists(),
            hasFacilityProfile: facDoc.exists()
          };

          fetchedUser = userWithId;
          setUser(userWithId);
          setUserProfile(userWithId);
          setProfileComplete(isProfileComplete);
          setTutorialPassed(isTutorialPassed);
          setCookieValues(currentUser.uid, isProfileComplete, isTutorialPassed);
        }
      } catch (error) {
        if (error.message === 'Request timed out') {
          console.warn('[DashboardContext] User data fetch timed out');
        } else {
          console.error('Error fetching user data:', error);
          if (!user) setError(`Error fetching user data: ${error.message}`);
        }
      }

      const hasProfessionalProfile = fetchedUser?.hasProfessionalProfile;
      const hasFacilityProfile = fetchedUser?.hasFacilityProfile;

      if (hasFacilityProfile && (fetchedUser && (fetchedUser.role !== 'facility' && fetchedUser.role !== 'company'))) {
        if (fetchedUser) setUser(prev => ({ ...prev, role: 'facility' }));
      } else if (hasProfessionalProfile && (fetchedUser && fetchedUser.role !== 'professional') && !hasFacilityProfile) {
        if (fetchedUser) setUser(prev => ({ ...prev, role: 'professional' }));
      }
      setIsLoading(false);
    };

    fetchUserData();

    let unsubscribeProfile = null;
    let unsubscribeUser = null;

    if (currentUser) {
      const userDocRef = doc(db, 'users', currentUser.uid);
      unsubscribeUser = onSnapshot(userDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const userData = docSnapshot.data();
          const userWithId = { ...userData, uid: docSnapshot.id };
          setUser(prev => ({
            ...userWithId,
            hasProfessionalProfile: prev?.hasProfessionalProfile,
            hasFacilityProfile: prev?.hasFacilityProfile
          }));
          setUserProfile(userWithId);
        }
      });

      const collectionName = selectedWorkspace?.type === WORKSPACE_TYPES.TEAM ? 'facilityProfiles' : 'professionalProfiles';
      const profileDocRef = doc(db, collectionName, currentUser.uid);

      unsubscribeProfile = onSnapshot(profileDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const profileData = docSnapshot.data();
          const isProfileComplete = profileData.hasOwnProperty('isProfessionalProfileComplete')
            ? profileData.isProfessionalProfileComplete
            : checkProfileCompleteness(profileData);
          const isTutorialPassed = profileData.hasOwnProperty('tutorialPassed')
            ? profileData.tutorialPassed
            : false;

          if (isProfileComplete !== profileComplete || isTutorialPassed !== tutorialPassed) {
            setProfileComplete(isProfileComplete);
            setTutorialPassed(isTutorialPassed);
            setCookieValues(currentUser.uid, isProfileComplete, isTutorialPassed);
          }

          setUser(prev => ({ ...prev, ...profileData }));
        }
      }, (error) => {
        console.debug("Profile document listener error (likely missing doc yet):", error.message);
      });

      return () => {
        if (unsubscribeUser) unsubscribeUser();
        if (unsubscribeProfile) unsubscribeProfile();
      };
    }
  }, [currentUser, profileComplete, tutorialPassed, selectedWorkspace]);

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

  const switchWorkspace = useCallback(async (workspace) => {
    if (!workspace || !workspace.id) {
      console.warn('Invalid workspace provided to switchWorkspace');
      return;
    }

    console.log('[DashboardContext] Switching to workspace:', workspace);

    try {
      // STRICT: Verify profile document exists before allowing workspace access
      if (workspace.type === WORKSPACE_TYPES.PERSONAL) {
        if (user.hasProfessionalProfile !== true) {
          console.warn(`[DashboardContext] Cannot switch to Personal workspace - no professional profile exists`);
          const lang = window.location.pathname.split('/')[1] || 'fr';
          navigate(`/${lang}/onboarding?type=professional`, { replace: true });
          return;
        }
      } else if (workspace.type === WORKSPACE_TYPES.TEAM && isOnline) {
        const facilityDoc = await getDoc(doc(db, 'facilityProfiles', workspace.facilityId));
        if (!facilityDoc.exists()) {
          console.warn(`[DashboardContext] Facility profile not found: ${workspace.facilityId}`);
          setFacilityNotFoundWorkspace(workspace);
          setShowFacilityNotFoundDialog(true);
          return;
        }

        // Also verify user has facility profile if this is their own facility
        if (workspace.facilityId === user.uid && user.hasFacilityProfile !== true) {
          console.warn(`[DashboardContext] Cannot switch to Facility workspace - no facility profile exists`);
          const lang = window.location.pathname.split('/')[1] || 'fr';
          navigate(`/${lang}/onboarding?type=facility`, { replace: true });
          return;
        }
      }

      clearWorkspaceSession(WORKSPACE_TYPES.PERSONAL);
      if (selectedWorkspace) {
        if (selectedWorkspace.type === WORKSPACE_TYPES.PERSONAL) {
          clearWorkspaceSession(WORKSPACE_TYPES.PERSONAL);
        } else if (selectedWorkspace.type === WORKSPACE_TYPES.TEAM) {
          clearWorkspaceSession(WORKSPACE_TYPES.TEAM, selectedWorkspace.facilityId);
        } else if (selectedWorkspace.type === WORKSPACE_TYPES.ADMIN) {
          clearWorkspaceSession(WORKSPACE_TYPES.ADMIN);
        }
      }

      let sessionToken = null;
      if (workspace.type === WORKSPACE_TYPES.PERSONAL) {
        sessionToken = await createWorkspaceSession(user.uid, WORKSPACE_TYPES.PERSONAL, null, user);
      } else if (workspace.type === WORKSPACE_TYPES.TEAM) {
        sessionToken = await createWorkspaceSession(user.uid, WORKSPACE_TYPES.TEAM, workspace.facilityId, user);
      } else if (workspace.type === WORKSPACE_TYPES.ADMIN) {
        sessionToken = await createWorkspaceSession(user.uid, WORKSPACE_TYPES.ADMIN, null, user);
      }

      if (!sessionToken && workspace.type === WORKSPACE_TYPES.TEAM && isOnline) {
        console.warn('[DashboardContext] Failed to create workspace session - Facility may not exist');
        setFacilityNotFoundWorkspace(workspace);
        setShowFacilityNotFoundDialog(true);
        return;
      }

      if (!sessionToken) {
        console.warn('[DashboardContext] Failed to create workspace session - Token is null. Setting workspace anyway to prevent UI breakage.');
      }

      setSelectedWorkspace(workspace);
      setWorkspaceCookie(workspace);

      // Simply update the URL with the new workspace ID while preserving the current path
      // This fulfills the user request to remove redirecting logic to default routes
      const currentPath = location.pathname;
      const searchParams = new URLSearchParams(location.search);
      searchParams.set('workspace', workspace.id);

      const targetUrl = `${currentPath}?${searchParams.toString()}${location.hash}`;
      console.log('[DashboardContext] switchWorkspace: Updating URL workspace parameter:', targetUrl);

      navigate(targetUrl, { replace: true });

      // Only reload if we were previously in a different workspace type to clean up state
      // but without changing the user's current route
      const typeChanged = selectedWorkspace && selectedWorkspace.type !== workspace.type;
      if (typeChanged) {
        console.log('[DashboardContext] Workspace type changed, performing safe reload');
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }

    } catch (error) {
      console.error('[DashboardContext] Error switching workspace:', error);
      if (workspace.type === WORKSPACE_TYPES.TEAM && isOnline) {
        setFacilityNotFoundWorkspace(workspace);
        setShowFacilityNotFoundDialog(true);
      }
    }
  }, [selectedWorkspace, user, isOnline, navigate]);

  const handleLeaveFacility = useCallback(async () => {
    if (!facilityNotFoundWorkspace || !currentUser?.uid) return;

    setIsLeavingFacility(true);
    try {
      const facilityId = facilityNotFoundWorkspace.facilityId;
      const userId = currentUser.uid;

      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const updatedMemberships = (userData.facilityMemberships || []).filter(
          m => m.facilityId !== facilityId && m.facilityProfileId !== facilityId
        );
        await updateDoc(userRef, {
          facilityMemberships: updatedMemberships,
          updatedAt: serverTimestamp()
        });
      }

      const facilityRef = doc(db, 'facilityProfiles', facilityId);
      const facilitySnap = await getDoc(facilityRef);
      if (facilitySnap.exists()) {
        const facilityData = facilitySnap.data();
        const updatedEmployees = (facilityData.employees || []).filter(e => e.uid !== userId);
        const updatedAdmins = (facilityData.admins || []).filter(a => a !== userId);
        await updateDoc(facilityRef, {
          employees: updatedEmployees,
          admins: updatedAdmins,
          updatedAt: serverTimestamp()
        });
      }

      setShowFacilityNotFoundDialog(false);
      setFacilityNotFoundWorkspace(null);

      const updatedUserData = await refreshUserData();

      if (updatedUserData) {
        const updatedWorkspaces = getAvailableWorkspaces(updatedUserData);
        setWorkspaces(updatedWorkspaces);

        if (updatedWorkspaces.length > 0) {
          const primaryWorkspace = updatedWorkspaces.find(w => {
            if (updatedUserData.role === 'facility' || updatedUserData.role === 'company') {
              return w.type === WORKSPACE_TYPES.TEAM;
            } else if (updatedUserData.role === 'professional') {
              return w.type === WORKSPACE_TYPES.PERSONAL;
            }
            return false;
          }) || updatedWorkspaces[0];

          if (primaryWorkspace) {
            switchWorkspace(primaryWorkspace);
          }
        }
      }
    } catch (error) {
      console.error('Error leaving facility:', error);
    } finally {
      setIsLeavingFacility(false);
    }
  }, [facilityNotFoundWorkspace, currentUser, refreshUserData, switchWorkspace]);

  const handleContactAdmin = useCallback(() => {
    setShowFacilityNotFoundDialog(false);
    setFacilityNotFoundWorkspace(null);
    window.location.href = '/en/contact';
  }, []);

  // Initialize workspaces and selected workspace
  // Use a ref to track the last processed user to prevent infinite loops
  // The user object changes on every Firestore update (including tutorial steps),
  // which causes the original useEffect to re-run, re-initialize workspaces, 
  // and re-create sessions in a loop.
  const lastProcessedUserRef = useRef(null);

  useEffect(() => {
    console.log('[DashboardContext] === WORKSPACE INIT START ===', {
      path: location.pathname,
      search: location.search,
      user: user?.uid,
      selectedWorkspace: selectedWorkspace?.id
    });

    // Skip if no user
    if (!user) {
      console.log('[DashboardContext] No user, returning early');
      lastProcessedUserRef.current = null;
      return;
    }

    // AGGRESSIVE BYPASS: If on profile path with workspace param, just set workspace and return
    // This prevents ANY redirect logic from running during profile navigation
    if (location.pathname.includes('/dashboard/profile')) {
      const urlParams = new URLSearchParams(location.search);
      const workspaceId = urlParams.get('workspace');
      console.log('[DashboardContext] On profile path, workspaceId from URL:', workspaceId);
      if (workspaceId) {
        const availableWs = getAvailableWorkspaces(user);
        const wsFromUrl = availableWs.find(w => w.id === workspaceId);
        if (wsFromUrl) {
          console.log('[DashboardContext] BYPASS: On profile path with valid workspace:', wsFromUrl.name);

          let stateChanged = false;
          if (!selectedWorkspace || selectedWorkspace.id !== wsFromUrl.id) {
            setSelectedWorkspace(wsFromUrl);
            setWorkspaceCookie(wsFromUrl);
            stateChanged = true;
          }

          // Only update workspaces if they changed
          const newHash = JSON.stringify(availableWs);
          const oldHash = JSON.stringify(workspaces);
          if (newHash !== oldHash) {
            setWorkspaces(availableWs);
            stateChanged = true;
          }

          if (stateChanged) {
            console.log('[DashboardContext] BYPASS: State updated, returning');
          } else {
            console.log('[DashboardContext] BYPASS: State already correct, returning');
          }
          return;
        } else {
          console.log('[DashboardContext] Workspace from URL not found in available workspaces:', availableWs.map(w => w.id));
        }
      } else {
        console.log('[DashboardContext] On profile but no workspace param in URL');
      }
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
      console.log('[DashboardContext] User hash unchanged, skipping init');
      return;
    }

    // Update the ref
    lastProcessedUserRef.current = currentUserHash;

    console.log('[DashboardContext] Initializing workspaces for user:', user.uid);

    // Get available workspaces based on user roles
    const availableWorkspaces = getAvailableWorkspaces(user);
    console.log('[DashboardContext] Available workspaces:', availableWorkspaces.map(w => w.id));

    // Only update workspaces state if it actually changed to prevent downstream re-renders
    setWorkspaces(prev => {
      const prevHash = JSON.stringify(prev);
      const newHash = JSON.stringify(availableWorkspaces);
      return prevHash === newHash ? prev : availableWorkspaces;
    });

    // Try to restore workspace from URL first, then cookie
    const urlParams = new URLSearchParams(location.search);
    const workspaceIdFromUrl = urlParams.get('workspace');
    let workspaceFromUrl = null;
    if (workspaceIdFromUrl) {
      workspaceFromUrl = availableWorkspaces.find(w => w.id === workspaceIdFromUrl);
      console.log('[DashboardContext] Workspace from URL:', workspaceIdFromUrl, 'found:', !!workspaceFromUrl);
      // EARLY RETURN: If URL already has a valid workspace, just set it and don't navigate
      // This prevents race conditions with TutorialContext navigates
      if (workspaceFromUrl && !selectedWorkspace) {
        console.log('[DashboardContext] Workspace found in URL, setting without navigation:', workspaceFromUrl.id);
        setSelectedWorkspace(workspaceFromUrl);
        setWorkspaceCookie(workspaceFromUrl);
        return;
      }
    }

    // Try to restore workspace from cookie if not in URL
    const savedWorkspace = workspaceFromUrl || getWorkspaceCookie();
    console.log('[DashboardContext] savedWorkspace:', savedWorkspace?.id, 'selectedWorkspace:', selectedWorkspace?.id);

    // Check if we already have a selected workspace that is valid
    if (selectedWorkspace) {
      // If the current selected workspace is still in the available list, we're good
      const stillAvailable = availableWorkspaces.find(w => w.id === selectedWorkspace.id);
      console.log('[DashboardContext] selectedWorkspace exists, stillAvailable:', !!stillAvailable);
      if (stillAvailable) {
        // Only enforce workspace in URL if we are on a dashboard page
        if (location.pathname.includes('/dashboard')) {
          const searchParams = new URLSearchParams(location.search);
          const currentWorkspaceInUrl = searchParams.get('workspace');
          if (!currentWorkspaceInUrl || currentWorkspaceInUrl !== selectedWorkspace.id) {
            searchParams.set('workspace', selectedWorkspace.id);
            const newUrl = `${location.pathname}?${searchParams.toString()}`;
            console.log('[DashboardContext] Adding workspace to URL:', newUrl);
            navigate(newUrl, { replace: true });
          }
        }
        return;
      }
    }

    // Only attempt to switch/restore workspace if we are on a dashboard page
    // This prevents redirection loops on public pages or test pages
    if (!location.pathname.includes('/dashboard') && !location.pathname.includes('/onboarding')) {
      console.log('[DashboardContext] Not on dashboard/onboarding, skipping');
      return;
    }

    if (savedWorkspace && availableWorkspaces.find(w => w.id === savedWorkspace.id)) {
      console.log('[DashboardContext] Restoring workspace from cookie:', savedWorkspace.id);

      // Validate existing session
      let hasValidSession = false;
      if (savedWorkspace.type === WORKSPACE_TYPES.PERSONAL) {
        hasValidSession = validateWorkspaceSession(WORKSPACE_TYPES.PERSONAL) !== null;
      } else if (savedWorkspace.type === WORKSPACE_TYPES.TEAM) {
        hasValidSession = validateWorkspaceSession(WORKSPACE_TYPES.TEAM, savedWorkspace.facilityId) !== null;
      } else if (savedWorkspace.type === WORKSPACE_TYPES.ADMIN) {
        hasValidSession = validateWorkspaceSession(WORKSPACE_TYPES.ADMIN) !== null;
      }
      console.log('[DashboardContext] hasValidSession:', hasValidSession);

      if (hasValidSession) {
        setSelectedWorkspace(savedWorkspace);

        const currentPath = location.pathname;
        const searchParams = new URLSearchParams(location.search);
        searchParams.set('workspace', savedWorkspace.id);

        const targetUrl = `${currentPath}?${searchParams.toString()}${location.hash}`;
        console.log('[DashboardContext] Restoring workspace: Updating URL parameter:', targetUrl);

        navigate(targetUrl, { replace: true });
      } else {
        console.log('[DashboardContext] No valid session, calling switchWorkspace');
        switchWorkspace(savedWorkspace);
      }
    } else if (availableWorkspaces.length > 0) {
      // Auto-select workspace based on user's primary role to avoid blinking
      console.log('[DashboardContext] No saved workspace, auto-selecting based on role');

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
      console.log('[DashboardContext] Selected workspace:', workspaceToSelect?.id);
      switchWorkspace(workspaceToSelect);
    } else {
      console.log('[DashboardContext] No workspaces available for user - no profiles exist, redirecting to onboarding');
      setSelectedWorkspace(null);
      clearWorkspaceCookie();

      // STRICT: If no workspaces available, user must complete onboarding
      // Check onboarding status to determine which type
      const onboardingProgress = user.onboardingProgress || {};
      const professionalCompleted = onboardingProgress.professional?.completed === true;
      const facilityCompleted = onboardingProgress.facility?.completed === true;
      const onboardingCompleted = professionalCompleted || facilityCompleted || user.onboardingCompleted === true;

      if (!onboardingCompleted && location.pathname.includes('/dashboard')) {
        const lang = window.location.pathname.split('/')[1] || 'fr';
        const onboardingType = user.role === 'facility' || user.role === 'company' ? 'facility' : 'professional';
        console.log('[DashboardContext] Redirecting to onboarding:', onboardingType);
        navigate(`/${lang}/onboarding?type=${onboardingType}`, { replace: true });
        return;
      }

      // Remove workspace from URL if no workspaces available
      const searchParams = new URLSearchParams(location.search);
      searchParams.delete('workspace');
      const newUrl = searchParams.toString() ? `${location.pathname}?${searchParams.toString()}` : location.pathname;
      navigate(newUrl, { replace: true });
    }
    console.log('[DashboardContext] === WORKSPACE INIT END ===');
  }, [user, switchWorkspace, selectedWorkspace, location, navigate]);

  // Validate workspace session periodically
  useEffect(() => {
    if (!selectedWorkspace) return;

    // Skip session validation on profile paths - profile is accessible without strict session
    // This prevents an infinite loop where validation clears workspace, triggering re-init
    if (location.pathname.includes('/dashboard/profile')) {
      console.log('[DashboardContext] Skipping session validation on profile path');
      return;
    }

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
  }, [selectedWorkspace, location.pathname]);

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
      <Dialog
        isOpen={showFacilityNotFoundDialog}
        onClose={() => {
          setShowFacilityNotFoundDialog(false);
          setFacilityNotFoundWorkspace(null);
        }}
        title="Facility Not Found"
        messageType="error"
        size="medium"
        actions={
          <>
            <Button
              onClick={handleContactAdmin}
              variant="secondary"
            >
              Contact Admin
            </Button>
            <Button
              onClick={handleLeaveFacility}
              variant="danger" // Using danger for the "Leave" action as it's destructive/error corrective
              disabled={isLeavingFacility}
            >
              {isLeavingFacility ? 'Leaving...' : 'Leave Facility'}
            </Button>
          </>
        }
      >
        <p className="text-gray-700">
          The facility you're trying to access no longer exists or you no longer have access to it.
        </p>
      </Dialog>

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