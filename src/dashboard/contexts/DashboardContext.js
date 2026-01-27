import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNetwork } from '../../contexts/NetworkContext';
import { db } from '../../services/firebase';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot, updateDoc } from 'firebase/firestore';
import { setWorkspaceCookie, getWorkspaceCookie, clearWorkspaceCookie } from '../../utils/cookieUtils';
import {
  createWorkspaceSession,
  clearWorkspaceSession,
  getAvailableWorkspaces,
  WORKSPACE_TYPES
} from '../../utils/sessionAuth';
import { isAdminSync } from '../../config/workspaceDefinitions';
import { buildDashboardUrl, getDefaultRouteForWorkspace, getRelativePathFromUrl, getWorkspaceIdForUrl, isPathValidForWorkspace } from '../../config/routeUtils';
import Dialog from '../../components/Dialog/Dialog';
import Button from '../../components/BoxedInputFields/Button';
import { COOKIE_CONFIG, FIRESTORE_COLLECTIONS } from '../../config/keysDatabase';

const DashboardContext = createContext(null);

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
  const [userProfile, setUserProfile] = useState(null);

  const [nextIncompleteProfileSection, setNextIncompleteProfileSection] = useState(null);

  const [showFacilityNotFoundDialog, setShowFacilityNotFoundDialog] = useState(false);
  const [facilityNotFoundWorkspace, setFacilityNotFoundWorkspace] = useState(null);
  const [isLeavingFacility, setIsLeavingFacility] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);
  const [tutorialPassed, setTutorialPassed] = useState(false);

  // Debug logging - Fixed to prevent infinite loops
  // Debug logging
  useEffect(() => {
  }, [currentUser, isLoading, error]);

  // Helper functions for cookie management
  const setCookieValues = (userId, isProfessionalProfileComplete, isTutorialPassed) => {
    // Cookie setting removed
  };

  const clearCookieValues = (userId) => {
    // Cookie clearing removed
  };

  const setTutorialComplete = useCallback(async (isComplete = true) => {
    return false;
  }, []);

  const setProfileCompletionStatus = useCallback(async (isComplete = true) => {
    if (!currentUser) return false;

    try {
      // Use profile collection instead of users
      const collectionName = (selectedWorkspace?.type === WORKSPACE_TYPES.TEAM || selectedWorkspace?.type === 'organization') ? FIRESTORE_COLLECTIONS.FACILITY_PROFILES : FIRESTORE_COLLECTIONS.PROFESSIONAL_PROFILES;

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
  }, [currentUser, selectedWorkspace, tutorialPassed]);

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

  const refreshUserData = useCallback(async () => {
    if (!currentUser) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));

      const collectionName = (selectedWorkspace?.type === WORKSPACE_TYPES.TEAM || selectedWorkspace?.type === 'organization') ? 'facilityProfiles' : 'professionalProfiles';
      const profileDoc = await getDoc(doc(db, collectionName, currentUser.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const profileData = profileDoc.exists() ? profileDoc.data() : {};

        let adminData = null;
        try {
          const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
          if (adminDoc.exists()) {
            const data = adminDoc.data();
            if (data.isActive !== false) {
              adminData = data;
              adminDataRef.current = data;
            }
          }
        } catch (adminErr) {
          console.debug('[DashboardContext] Admin check skipped in refresh');
        }

        const combinedData = { ...userData, ...profileData, uid: currentUser.uid, adminData };

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
  }, [currentUser, selectedWorkspace]);

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
          setUser(basicUserData);
          setUserProfile(basicUserData);
          setProfileComplete(false);
          setTutorialPassed(false);
          setCookieValues(currentUser.uid, false, false);
        } else {
          const userData = userDoc.data();
          const profDocRef = doc(db, FIRESTORE_COLLECTIONS.PROFESSIONAL_PROFILES, currentUser.uid);
          const facDocRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, currentUser.uid);

          const [profDoc, facDoc] = await Promise.all([
            getDoc(profDocRef),
            getDoc(facDocRef)
          ]);

          const profDocData = profDoc.exists() ? profDoc.data() : {};
          const facDocData = facDoc.exists() ? facDoc.data() : {};
          const profileData = (selectedWorkspace?.type === WORKSPACE_TYPES.TEAM || selectedWorkspace?.type === 'organization') ? facDocData : profDocData;

          let adminData = null;
          try {
            const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
            if (adminDoc.exists()) {
              const data = adminDoc.data();
              if (data.isActive !== false) {
                adminData = {
                  ...data,
                  isActive: data.isActive !== false
                };
                adminDataRef.current = adminData;
                console.log('[DashboardContext] Admin data loaded:', { uid: currentUser.uid, isActive: adminData.isActive, roles: adminData.roles, rights: adminData.rights });
              } else {
                console.log('[DashboardContext] Admin document exists but isActive is false');
              }
            } else {
              console.log('[DashboardContext] No admin document found for user:', currentUser.uid);
            }
          } catch (adminErr) {
            console.error('[DashboardContext] Error loading admin data:', adminErr);
          }

          const isProfileComplete = profileData.hasOwnProperty('isProfessionalProfileComplete')
            ? profileData.isProfessionalProfileComplete
            : checkProfileCompleteness(profileData);

          const isTutorialPassed = profileData.hasOwnProperty('tutorialPassed')
            ? profileData.tutorialPassed
            : false;

          // Build user object using CENTRALIZED workspace definitions
          // hasProfessionalProfile = professionalProfiles document EXISTS
          // hasFacilityProfile = user has facilityMemberships (not the old flag)
          const userWithId = {
            ...userData,
            ...profileData,
            uid: currentUser.uid,
            roles: userData.roles || [],
            // CENTRALIZED: professionalProfile existence is the ONLY condition
            hasProfessionalProfile: profDoc.exists(),
            _professionalProfileExists: profDoc.exists(),
            // CENTRALIZED: facility access = has memberships in facilityMemberships array
            hasFacilityProfile: (userData.roles || []).some(r => r.facility_uid),
            adminData: adminData
          };

          console.log('[DashboardContext] User data loaded:', {
            uid: userWithId.uid,
            roles: userWithId.roles,
            adminData: userWithId.adminData,
            adminDataExists: !!userWithId.adminData,
            adminDataIsActive: userWithId.adminData?.isActive
          });

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
      setIsLoading(false);
    };

    fetchUserData();

    let unsubscribeProfile = null;
    let unsubscribeUser = null;

    if (currentUser) {
      const userDocRef = doc(db, 'users', currentUser.uid);
      unsubscribeUser = onSnapshot(userDocRef, async (docSnapshot) => {
        if (docSnapshot.exists()) {
          const userData = docSnapshot.data();
          const userWithId = { ...userData, uid: docSnapshot.id };

          let currentAdminData = adminDataRef.current;
          if (!currentAdminData) {
            try {
              const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
              if (adminDoc.exists()) {
                const data = adminDoc.data();
                if (data.isActive !== false) {
                  currentAdminData = {
                    ...data,
                    isActive: data.isActive !== false
                  };
                  adminDataRef.current = currentAdminData;
                }
              }
            } catch (adminErr) {
              console.error('[DashboardContext] Error loading admin data in snapshot:', adminErr);
            }
          }

          setUser(prev => ({
            ...userWithId,
            // Preserve computed profile flags - use prev if available, otherwise keep from Firestore
            hasProfessionalProfile: prev?.hasProfessionalProfile ?? userWithId.hasProfessionalProfile,
            hasFacilityProfile: prev?.hasFacilityProfile ?? userWithId.hasFacilityProfile,
            adminData: currentAdminData
          }));
          setUserProfile({ ...userWithId, adminData: currentAdminData });
        }
      });

      const collectionName = (selectedWorkspace?.type === WORKSPACE_TYPES.TEAM || selectedWorkspace?.type === 'organization') ? 'facilityProfiles' : 'professionalProfiles';
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

          setUser(prev => {
            // Don't let profile data override critical user fields
            const { role: _ignoreRole, hasProfessionalProfile: _ignorePP, hasFacilityProfile: _ignoreFP, adminData: _ignoreAdmin, ...safeProfileData } = profileData;
            return {
              ...prev,
              ...safeProfileData,
              // Preserve these critical user fields
              role: prev?.role,
              hasProfessionalProfile: prev?.hasProfessionalProfile,
              hasFacilityProfile: prev?.hasFacilityProfile,
              adminData: prev?.adminData || adminDataRef.current
            };
          });
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

  const updateUserPreferences = useCallback(async (newPrefs) => {
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
  }, [currentUser, userPreferences]);

  const refreshDashboardData = async () => {
    // Implement refresh logic with Firestore
    // To be completed during development
  };

  const switchWorkspace = useCallback(async (workspace) => {
    if (!workspace || !workspace.id) {
      return;
    }

    // Check if user is admin for bypass logic
    const userIsAdmin = isAdminSync(user);

    try {
      // STRICT: Verify profile document exists before allowing workspace access
      // ADMIN BYPASS: Admins can access any workspace without profile checks
      if (workspace.type === WORKSPACE_TYPES.PERSONAL) {
        if (!userIsAdmin && user.hasProfessionalProfile !== true) {
          const lang = window.location.pathname.split('/')[1] || 'fr';
          navigate(`/${lang}/onboarding?type=professional`, { replace: true });
          return;
        }
      } else if (workspace.type === WORKSPACE_TYPES.TEAM && isOnline) {
        const facilityDoc = await getDoc(doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, workspace.facilityId));
        if (!facilityDoc.exists()) {
          setFacilityNotFoundWorkspace(workspace);
          setShowFacilityNotFoundDialog(true);
          return;
        }

        // Also verify user has facility profile if this is their own facility
        // ADMIN BYPASS: Admins can access any facility
        if (!userIsAdmin && workspace.facilityId === user.uid && user.hasFacilityProfile !== true) {
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
        setFacilityNotFoundWorkspace(workspace);
        setShowFacilityNotFoundDialog(true);
        return;
      }

      setSelectedWorkspace(workspace);
      setWorkspaceCookie(workspace);

      const newWorkspaceId = getWorkspaceIdForUrl(workspace);
      const relativePath = getRelativePathFromUrl(location.pathname);
      const queryString = location.search || '';
      
      const wasInAdminWorkspace = selectedWorkspace?.type === WORKSPACE_TYPES.ADMIN || location.pathname.includes('/dashboard/admin');
      const isSwitchingToAdmin = workspace.type === WORKSPACE_TYPES.ADMIN;
      
      if (wasInAdminWorkspace && !isSwitchingToAdmin) {
        const defaultRoute = getDefaultRouteForWorkspace(workspace.type);
        const defaultPath = buildDashboardUrl(defaultRoute, newWorkspaceId);
        navigate(defaultPath + queryString, { replace: true });
      } else if (relativePath && isPathValidForWorkspace(relativePath, workspace.type)) {
        const newPath = buildDashboardUrl(relativePath, newWorkspaceId);
        navigate(newPath + queryString, { replace: true });
      } else {
        const defaultRoute = getDefaultRouteForWorkspace(workspace.type);
        const defaultPath = buildDashboardUrl(defaultRoute, newWorkspaceId);
        navigate(defaultPath + queryString, { replace: true });
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

      const facilityRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, facilityId);
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

  // Store adminData in a ref to prevent it from being lost by onSnapshot updates
  const adminDataRef = useRef(null);

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

    // If URL requests admin workspace but adminData hasn't loaded yet, wait
    const urlParamsEarly = new URLSearchParams(location.search);
    const requestedWorkspace = urlParamsEarly.get('workspace');
    const pathContainsAdmin = location.pathname.includes('/admin');
    if ((requestedWorkspace === 'admin' || pathContainsAdmin) && !user.adminData && !adminDataRef.current) {
      return;
    }

    // Ensure user has adminData from ref if not already present
    const userWithAdmin = { ...user };
    if (!userWithAdmin.adminData && adminDataRef.current) {
      userWithAdmin.adminData = adminDataRef.current;
    }

    // AGGRESSIVE BYPASS: If on profile path with workspace segment, just set workspace and return
    // This prevents ANY redirect logic from running during profile navigation
    const segments = location.pathname.split('/').filter(Boolean);
    const dashboardIndex = segments.indexOf('dashboard');
    if (dashboardIndex !== -1 && segments.length > dashboardIndex + 1) {
      const workspaceId = segments[dashboardIndex + 1];

        const availableWs = getAvailableWorkspaces(userWithAdmin);
        const wsFromUrl = availableWs.find(w => w.id === workspaceId);

        if (wsFromUrl) {
          if (!selectedWorkspace || selectedWorkspace.id !== wsFromUrl.id) {
          setSelectedWorkspace(wsFromUrl);
          setWorkspaceCookie(wsFromUrl);
        }

        // Only update workspaces if they changed
        const newHash = JSON.stringify(availableWs);
        const oldHash = JSON.stringify(workspaces);
        if (newHash !== oldHash) {
          setWorkspaces(availableWs);
        }

        return;
      }
    }

    const currentUserHash = JSON.stringify({
      uid: userWithAdmin.uid,
      role: userWithAdmin.role,
      roles: userWithAdmin.roles,
      adminData: userWithAdmin.adminData ? { roles: userWithAdmin.adminData.roles, isActive: userWithAdmin.adminData.isActive } : null,
      facilityMemberships: userWithAdmin.facilityMemberships?.map(m => m.facilityProfileId).sort()
    });

    // If critical user data hasn't changed, skip initialization
    if (lastProcessedUserRef.current === currentUserHash) {
      return;
    }

    // Update the ref
    lastProcessedUserRef.current = currentUserHash;


    // Get available workspaces based on user roles
    const availableWorkspaces = getAvailableWorkspaces(userWithAdmin);

    const isUserAdmin = isAdminSync(userWithAdmin);

    console.log('[DashboardContext] Workspace initialization:', {
      isUserAdmin,
      userRoles: userWithAdmin.roles,
      adminData: userWithAdmin.adminData,
      adminDataRoles: userWithAdmin.adminData?.roles,
      adminDataRights: userWithAdmin.adminData?.rights,
      adminDataIsActive: userWithAdmin.adminData?.isActive,
      availableWorkspaces: availableWorkspaces.map(w => ({ id: w.id, type: w.type, name: w.name })),
      selectedWorkspace: selectedWorkspace?.id,
      userUid: userWithAdmin.uid
    });

    // Only update workspaces state if it actually changed to prevent downstream re-renders
    setWorkspaces(prev => {
      const prevHash = JSON.stringify(prev);
      const newHash = JSON.stringify(availableWorkspaces);
      return prevHash === newHash ? prev : availableWorkspaces;
    });

    // Try to restore workspace from URL path first, then cookie
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const dashIdx = pathSegments.indexOf('dashboard');
    const workspaceIdFromUrl = dashIdx !== -1 && pathSegments.length > dashIdx + 1 ? pathSegments[dashIdx + 1] : null;

    // SPECIAL HANDLING: If URL contains /dashboard/admin/*, force admin workspace selection
    if (location.pathname.includes('/dashboard/admin/') && isUserAdmin) {
      const adminWorkspace = availableWorkspaces.find(w => w.type === WORKSPACE_TYPES.ADMIN);
      if (adminWorkspace) {
        if (!selectedWorkspace || selectedWorkspace.id !== adminWorkspace.id) {
          console.log('[DashboardContext] Admin URL detected, selecting admin workspace');
          setSelectedWorkspace(adminWorkspace);
          setWorkspaceCookie(adminWorkspace);
        }
        return;
      }
    }

    let workspaceFromUrl = null;
    if (workspaceIdFromUrl) {
      workspaceFromUrl = availableWorkspaces.find(w => w.id === workspaceIdFromUrl);

      if (workspaceFromUrl && !selectedWorkspace) {
        setSelectedWorkspace(workspaceFromUrl);
        setWorkspaceCookie(workspaceFromUrl);
        return;
      }

      if (!workspaceFromUrl && workspaceIdFromUrl === 'personal') {
        if (typeof userWithAdmin.hasProfessionalProfile === 'undefined') {
          return;
        }
        if (userWithAdmin.hasProfessionalProfile === false) {
          return;
        }
      }
    }

    // Try to restore workspace from cookie if not in URL
    const savedWorkspace = workspaceFromUrl || getWorkspaceCookie();


    if (selectedWorkspace) {
      // If the current selected workspace is still in the available list, we're good
      const stillAvailable = availableWorkspaces.find(w => w.id === selectedWorkspace.id);
      if (stillAvailable) {
        // Only enforce workspace in URL if we are on a dashboard page
        if (location.pathname.includes('/dashboard')) {
          // Aggressive URL rewriting removed to prevent feature redirect loops
          // The router will handle 404s if the path is invalid.
        }
        return;
      }
    }

    // Only attempt to switch/restore workspace if we are on a dashboard page
    // This prevents redirection loops on public pages or test pages
    if (!location.pathname.includes('/dashboard') && !location.pathname.includes('/onboarding')) {
      return;
    }

    if (savedWorkspace && availableWorkspaces.find(w => w.id === savedWorkspace.id)) {


      // Validate existing session
      let hasValidSession = true; // Default to true since we are using path-based routing

      // Only validate if we are NOT using path-based routing or if we explicitly want to check cookies
      // hasValidSession = validateWorkspaceSession(...) !== null;


      if (hasValidSession) {
        setSelectedWorkspace(savedWorkspace);
        return;
      } else {
        switchWorkspace(savedWorkspace);
      }
    }

    const adminWorkspace = availableWorkspaces.find(w => w.type === WORKSPACE_TYPES.ADMIN);
    if (adminWorkspace && !selectedWorkspace && isUserAdmin) {
      console.log('[DashboardContext] Auto-selecting admin workspace for admin user (no redirect)');
      setSelectedWorkspace(adminWorkspace);
      setWorkspaceCookie(adminWorkspace);
      return;
    }

    if (availableWorkspaces.length > 0) {
      // CRITICAL FIX: If URL explicitly requests a workspace, don't auto-select a different one
      // Wait for user data to fully load so the requested workspace appears in available list
      if (workspaceIdFromUrl && !workspaceFromUrl) {
        // Check if we're waiting for professional profile data
        if (workspaceIdFromUrl === 'personal' && typeof userWithAdmin.hasProfessionalProfile === 'undefined') {
          return;
        }
        // If workspace is explicitly requested but not available, don't auto-select
        // The switchWorkspace function will handle validation and redirect if needed
        return;
      }

      if (isUserAdmin) {
        const adminWorkspace = availableWorkspaces.find(w => w.type === WORKSPACE_TYPES.ADMIN);
        if (adminWorkspace) {
          console.log('[DashboardContext] Auto-selecting admin workspace for admin user (no redirect)');
          setSelectedWorkspace(adminWorkspace);
          setWorkspaceCookie(adminWorkspace);
          return;
        }
      }

      // Auto-select workspace based on user's primary role to avoid blinking

      // Prioritize based on user's primary role field
      const primaryWorkspace = availableWorkspaces.find(w => {
        const isFacilityRole = (userWithAdmin.roles || []).some(r => r.facility_uid);
        if (isFacilityRole) {
          return w.type === WORKSPACE_TYPES.TEAM;
        } else if (userWithAdmin._professionalProfileExists || userWithAdmin.hasProfessionalProfile) {
          return w.type === WORKSPACE_TYPES.PERSONAL;
        }
        return false;
      }) || availableWorkspaces.find(w => w.type === WORKSPACE_TYPES.ADMIN);

      // Fall back to first workspace if no match found
      const workspaceToSelect = primaryWorkspace || availableWorkspaces[0];
      switchWorkspace(workspaceToSelect);
    } else {
      setSelectedWorkspace(null);
      clearWorkspaceCookie();

      // ADMIN BYPASS: Admins should never be redirected to onboarding
      const userIsAdmin = isAdminSync(userWithAdmin);
      if (userIsAdmin) {
        return;
      }

      // STRICT: If no workspaces available, user must complete onboarding
      // Check onboarding status to determine which type
      const onboardingProgress = userWithAdmin.onboardingProgress || {};
      const professionalCompleted = onboardingProgress.professional?.completed === true;
      const facilityCompleted = onboardingProgress.facility?.completed === true;
      const onboardingCompleted = professionalCompleted || facilityCompleted || userWithAdmin.onboardingCompleted === true;

      if (!onboardingCompleted && location.pathname.includes('/dashboard')) {
        console.warn('[DashboardContext] No workspaces available and onboarding incomplete, but automatic rerouting is disabled');
        return;
      }

      // Remove workspace from URL search params if no workspaces available (it's now in the path)
      const searchParams = new URLSearchParams(location.search);
      if (searchParams.has('workspace')) {
        console.log('[DashboardContext] Legacy workspace query param detected, but automatic cleanup redirection is disabled');
      }
    }
  }, [user, switchWorkspace, selectedWorkspace, location, navigate, workspaces]);

  // Validate workspace session periodically
  useEffect(() => {
    if (!selectedWorkspace) return;

    // Skip session validation on profile paths - profile is accessible without strict session
    // This prevents an infinite loop where validation clears workspace, triggering re-init
    if (location.pathname.includes('/profile') && location.pathname.includes('/dashboard')) {
      return;
    }

    const validateSession = () => {
      // DISABLED: Session validation via cookies is causing loops because path-based routing
      // doesn't always create a session token immediately.
      // let isValid = false;
      // ...
      // if (!isValid) { ... }
    };

    // Validate immediately and then every 5 minutes
    validateSession();
    const interval = setInterval(validateSession, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [selectedWorkspace, location.pathname]);

  const fetchUserProfile = async (userId, userRole) => {
    try {
      // Determine the correct profile collection based on role
      const profileCollection = (userRole === 'facility' || userRole === 'company') ? FIRESTORE_COLLECTIONS.FACILITY_PROFILES : FIRESTORE_COLLECTIONS.PROFESSIONAL_PROFILES;
      const profileDocRef = doc(db, profileCollection, userId);

      const profileSnapshot = await getDoc(profileDocRef);

      if (profileSnapshot.exists()) {
        const profileData = profileSnapshot.data();
        return profileData;
      } else {
        return null;
      }
    } catch (error) {
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
        ? children({ isLoading })
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