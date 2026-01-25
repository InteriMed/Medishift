import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useDashboard } from './DashboardContext';
import { useSidebar } from './SidebarContext';
import { debounce } from '../../utils/debounce';
import i18n, { routeMappings } from '../../i18n';
import { WORKSPACE_TYPES } from '../../utils/sessionAuth';
import { LOCALSTORAGE_KEYS } from '../../config/keysDatabase';
import {
  TUTORIAL_IDS,
  PROFILE_TAB_IDS,
  FALLBACK_SIDEBAR_TOOLTIP_POSITION,
  getTutorialSteps,
  getMandatoryTutorials,
  getNextTutorial,
  getProfileTutorialForType,
  isProfileTutorial,
  ONBOARDING_TYPES,
  getTabOrder
} from '../../config/tutorialSystem';
import { isTabCompleted } from '../pages/profile/utils/profileUtils';
import { extractFeatureFromPath, isProfilePath, normalizePathForComparison } from '../../config/tutorialRoutes';

const tutorialSteps = {};
Object.keys(TUTORIAL_IDS).forEach(key => {
  const id = TUTORIAL_IDS[key];
  tutorialSteps[id] = getTutorialSteps(id);
});

const TutorialContext = createContext(null);

export const TutorialProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    profileComplete,
    tutorialPassed,
    setTutorialComplete,
    user,
    isLoading: isDashboardLoading,
    selectedWorkspace
  } = useDashboard();
  const { isMainSidebarCollapsed, setIsMainSidebarCollapsed } = useSidebar();
  const { showWarning, showError } = useNotification();

  // Busy flag to prevent concurrent updates
  const [isBusy, setIsBusy] = useState(false);

  // Tutorial state variables
  const [completedTutorials, setCompletedTutorials] = useState({});
  const [showFirstTimeModal, setShowFirstTimeModal] = useState(false);
  const [showTutorialSelectionModal, setShowTutorialSelectionModal] = useState(false);
  const [showAccessLevelModal, setShowAccessLevelModal] = useState(false);
  const [allowAccessLevelModalClose, setAllowAccessLevelModalClose] = useState(false);
  const [showStopTutorialConfirm, setShowStopTutorialConfirm] = useState(false);

  // Refs for preventing infinite loops
  const syncTimestampRef = useRef({});
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [activeTutorial, setActiveTutorial] = useState(TUTORIAL_IDS.PROFILE_TABS);
  const lastWorkspaceIdRef = useRef(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepData, setStepData] = useState(null);
  const [elementPosition, setElementPosition] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isWaitingForSave, setIsWaitingForSave] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Access level choice: 'full' (complete all profile tabs) or 'team' (quick team access)
  const [accessLevelChoice, setAccessLevelChoice] = useState(null);

  // Dual onboarding type: 'professional' or 'facility'
  // Automatically determined based on selectedWorkspace
  const [onboardingType, setOnboardingType] = useState('professional');

  // MAX ACCESSED TAB FOR PROFILE TUTORIAL - Load from localStorage
  const [maxAccessedProfileTab, setMaxAccessedProfileTab] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCALSTORAGE_KEYS.TUTORIAL_MAX_ACCESSED_PROFILE_TAB);
      if (saved === 'settings') return 'marketplace';
      return saved || 'personalDetails';
    } catch (error) {
      console.error('[TutorialContext] Error loading maxAccessedProfileTab from localStorage:', error);
      return 'personalDetails';
    }
  });

  // Save maxAccessedProfileTab to localStorage whenever it changes
  useEffect(() => {
    try {
      const valueToPersist = maxAccessedProfileTab === 'settings' ? 'marketplace' : maxAccessedProfileTab;
      localStorage.setItem(LOCALSTORAGE_KEYS.TUTORIAL_MAX_ACCESSED_PROFILE_TAB, valueToPersist);
    } catch (error) {
      console.error('[TutorialContext] Error saving maxAccessedProfileTab to localStorage:', error);
    }
  }, [maxAccessedProfileTab]);

  // Debug: Log when accessLevelChoice changes
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log("[TutorialContext] State Update:", {
        isTutorialActive,
        activeTutorial,
        currentStep,
        accessLevelChoice,
        onboardingType,
        isPaused,
        isBusy
      });
    }
  }, [isTutorialActive, activeTutorial, currentStep, accessLevelChoice, onboardingType, isPaused, isBusy]);

  // Auto-detect onboardingType based on selectedWorkspace and URL
  useEffect(() => {
    // 1. Check for URL parameter first (highest priority)
    const isPageOnboarding = location.pathname.includes('/onboarding');
    if (isPageOnboarding) {
      const searchParams = new URLSearchParams(location.search);
      const urlType = searchParams.get('type');
      if (urlType === 'facility' || urlType === 'professional') {
        if (urlType !== onboardingType) {
          console.log('[TutorialContext] Setting onboardingType from URL:', urlType);
          setOnboardingType(urlType);
        }
        return;
      }
    }

    // 2. Fallback to workspace detection (only if ID changed)
    if (selectedWorkspace && selectedWorkspace.id !== lastWorkspaceIdRef.current) {
      const newType = selectedWorkspace.type === WORKSPACE_TYPES.TEAM ? 'facility' : 'professional';
      lastWorkspaceIdRef.current = selectedWorkspace.id;

      if (newType !== onboardingType) {
        console.log('[TutorialContext] Setting onboardingType from Workspace:', newType);
        setOnboardingType(newType);
      }
    }
  }, [selectedWorkspace, location.pathname, location.search, onboardingType]);

  // Load accessLevelChoice from profile document when tutorial starts or profile changes
  useEffect(() => {
    const loadAccessMode = async () => {
      if (!currentUser) {
        return;
      }

      try {
        const profileCollection = onboardingType === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
        const profileRef = doc(db, profileCollection, currentUser.uid);
        const profileDoc = await getDoc(profileRef);

        if (profileDoc.exists()) {
          const profileData = profileDoc.data();
          const savedAccessMode = profileData.tutorialAccessMode;

          if (savedAccessMode === 'team' || savedAccessMode === 'full') {
            if (savedAccessMode !== accessLevelChoice) {
              setAccessLevelChoice(savedAccessMode);
            }
          } else if (savedAccessMode === 'enabled' || savedAccessMode === 'disabled') {
            setAccessLevelChoice(null);
          } else if (!savedAccessMode) {
            setAccessLevelChoice(null);
          }
        } else {
          setAccessLevelChoice(null);
        }
      } catch (error) {
        console.error("[TutorialContext] Error loading accessLevelChoice:", error);
      }
    };

    loadAccessMode();
  }, [currentUser, onboardingType]); // Removed accessLevelChoice from dependency to avoid loops

  // Track sidebar width for overlay positioning
  const sidebarWidth = isMainSidebarCollapsed ? 70 : 256;


  // Ref to store updateElementPosition function to allow manual position refresh
  const updateElementPositionRef = useRef(null);

  // Ref to track tutorials that are currently being completed
  // This prevents checkTutorialStatus from restoring a tutorial that is in the process of being completed
  // (solves the race condition where Firestore write hasn't finished yet)
  const completingTutorialRef = useRef(null);

  // Ref to track the last restored state to prevent duplicate restorations
  const lastRestoredStateRef = useRef({ tutorial: null, step: null });

  // Ref to track if tutorial was explicitly stopped (prevents auto-restoration)
  const tutorialStoppedRef = useRef(false);

  // Ref to track last pathname to prevent duplicate tutorial restarts
  const lastPathnameRef = useRef(location.pathname);

  // Ref for external validation (e.g., from Profile component)
  const validationRef = useRef({});

  // Function to register a validation for a specific feature or tab
  const registerValidation = useCallback((key, validateFn) => {
    validationRef.current[key] = validateFn;
    return () => {
      delete validationRef.current[key];
    };
  }, []);

  // Helper function to check if user is in dashboard - Memoized to prevent infinite loops
  const isInDashboard = useMemo(() => {
    const path = location.pathname;
    return path.includes('/dashboard');
  }, [location.pathname]);

  // Helper function to get localized route
  const getLocalizedRoute = (routeName, language = i18n.language) => {
    const lang = routeMappings[language] ? language : 'en';
    const route = routeMappings[lang][routeName] || routeName;
    return route;
  };

  // Add a utility function to safely update tutorial state
  const safelyUpdateTutorialState = useCallback(async (updates = [], callback = null) => {
    // Set busy flag to prevent concurrent updates
    setIsBusy(true);

    // Auto-clear busy flag after 10 seconds to prevent deadlock
    const timeoutId = setTimeout(() => {
      setIsBusy(false);
    }, 10000);

    try {
      // Apply all state updates in sequence
      for (const [setter, value] of updates) {
        setter(value);
      }

      // Wait a small delay to ensure state updates have been processed
      await new Promise(resolve => setTimeout(resolve, 50));

      // Execute callback if provided
      if (typeof callback === 'function') {
        await callback();
      }

      // Success - clear timeout and busy flag
      clearTimeout(timeoutId);
      setIsBusy(false);
    } catch (error) {
      // Error - clear timeout and busy flag
      clearTimeout(timeoutId);
      setIsBusy(false);
      throw error; // Re-throw to allow caller to handle
    }
  }, []);

  // Reset all tutorial state to default values (also clears Firestore to prevent reactivation)
  const resetTutorialState = useCallback(async () => {
    lastRestoredStateRef.current = { tutorial: null, step: null };
    setStepData(null);
    setElementPosition(null);

    // CLEAR TUTORIAL LOCAL STORAGE (access flag is separate in Firestore)
    try {
      localStorage.removeItem(LOCALSTORAGE_KEYS.TUTORIAL_STATE);
      localStorage.removeItem(LOCALSTORAGE_KEYS.TUTORIAL_MAX_ACCESSED_PROFILE_TAB);
    } catch (error) {
      console.error('[TutorialContext] Error clearing tutorial localStorage on reset:', error);
    }

    await safelyUpdateTutorialState([
      [setShowFirstTimeModal, false],
      [setIsTutorialActive, false],
      [setActiveTutorial, getProfileTutorialForType(onboardingType)],
      [setCurrentStep, 0]
    ], async () => {
      if (currentUser && isTutorialActive) {
        try {
          const profileCollection = onboardingType === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
          const profileDocRef = doc(db, profileCollection, currentUser.uid);
          await updateDoc(profileDocRef, {
            [`tutorialProgress.${onboardingType}.activeTutorial`]: null,
            updatedAt: serverTimestamp()
          });
        } catch (error) {
        }
      }
    });
  }, [safelyUpdateTutorialState, currentUser, onboardingType, isTutorialActive]);

  // Save granular progress for tutorial steps
  const saveTutorialProgress = useCallback(async (tutorialName, stepIndex) => {
    if (!currentUser) return;

    try {
      // Use profile collection instead of users
      const profileCollection = onboardingType === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
      const profileDocRef = doc(db, profileCollection, currentUser.uid);

      const steps = tutorialSteps[tutorialName] || [];
      const currentStepId = steps[stepIndex]?.id;

      if (!currentStepId) return;

      const progressPath = `tutorialProgress.${onboardingType}.tutorials.${tutorialName}`;

      const updates = {
        [`tutorialProgress.${onboardingType}.activeTutorial`]: tutorialName,
        [`tutorialProgress.${onboardingType}.currentStepIndex`]: stepIndex,
        [`${progressPath}.steps.${currentStepId}.completed`]: true,
        [`${progressPath}.lastActiveStepId`]: currentStepId,
        [`${progressPath}.updatedAt`]: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Check if document exists, if not create it with setDoc, otherwise update it
      const profileDoc = await getDoc(profileDocRef);
      if (!profileDoc.exists()) {
        // Document doesn't exist, create it with minimal structure
        const initialData = {
          userId: currentUser.uid,
          role: onboardingType === 'facility' ? 'facility' : 'professional',
          ...updates
        };
        await setDoc(profileDocRef, initialData);
      } else {
        // Document exists, update it
        await updateDoc(profileDocRef, updates);
      }
    } catch (error) {
      console.error('Error saving tutorial progress:', error);
    }
  }, [currentUser, onboardingType]);

  // Start tutorial for a specific feature
  const startTutorial = useCallback(async (feature) => {
    // Clear stopped flag to allow fresh start and restoration
    tutorialStoppedRef.current = false;
    // Clear restoration ref to allow fresh start
    lastRestoredStateRef.current = { tutorial: null, step: null };

    // Prevent starting if already busy with another operation
    if (isBusy) {
      console.log('[TutorialContext] startTutorial blocked: isBusy =', isBusy);
      return;
    }

    setIsBusy(true);
    console.log('[TutorialContext] Starting tutorial:', feature);

    try {
      // CLEAR TUTORIAL LOCAL STORAGE FIRST (access flag is separate in Firestore)
      try {
        localStorage.removeItem(LOCALSTORAGE_KEYS.TUTORIAL_STATE);
        localStorage.removeItem(LOCALSTORAGE_KEYS.TUTORIAL_MAX_ACCESSED_PROFILE_TAB);
      } catch (error) {
        console.error('[TutorialContext] Error clearing tutorial localStorage on start:', error);
      }

      // CRITICAL: Clear this tutorial from completed list (allows restarting completed tutorials)
      // This is an explicit restart, so we want to allow the user to view it again
      if (completedTutorials[feature]) {
        setCompletedTutorials(prev => {
          const updated = { ...prev };
          delete updated[feature];
          return updated;
        });

        // Also clear from Firestore
        if (currentUser) {
          try {
            const profileCollection = onboardingType === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
            const profileDocRef = doc(db, profileCollection, currentUser.uid);
            await updateDoc(profileDocRef, {
              [`completedTutorials.${feature}`]: null
            });
          } catch (error) {
            console.error('Error clearing completed tutorial status:', error);
          }
        }
      }

      // Load saved progress for this tutorial from the new granular structure
      // Also ensure profile document exists before starting tutorial
      let startStep = 0;
      if (currentUser) {
        try {
          const profileCollection = onboardingType === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
          const profileDocRef = doc(db, profileCollection, currentUser.uid);
          const profileDoc = await getDoc(profileDocRef);

          // Ensure profile document exists - create it if it doesn't
          if (!profileDoc.exists()) {
            const initialProfileData = {
              userId: currentUser.uid,
              role: onboardingType === 'facility' ? 'facility' : 'professional',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            };
            await setDoc(profileDocRef, initialProfileData);
          } else {
            const profileData = profileDoc.data();
            const typeProgress = profileData.tutorialProgress?.[onboardingType] || {};

            if (typeProgress.activeTutorial === feature) {
              const savedStepIndex = typeProgress.currentStepIndex || 0;
              // For profile tutorial, ensure we start at step 0 (Personal Details) 
              // unless the tutorial was already completed
              const isCompleted = typeProgress.tutorials?.[feature]?.completed;
              if (isProfileTutorial(feature) && !isCompleted && typeProgress.currentStepIndex === undefined) {
                startStep = 0;
              } else {
                startStep = savedStepIndex;
              }
            }
          }
        } catch (error) {
          console.error('Error loading tutorial progress:', error);
        }
      }

      // Reset maxAccessedProfileTab when starting profile tutorials (only if not already set to a real choice)
      if (isProfileTutorial(feature)) {
        const hasRealAccessChoice = accessLevelChoice === 'full' || accessLevelChoice === 'team';

        if (!hasRealAccessChoice) {
          setMaxAccessedProfileTab(PROFILE_TAB_IDS.PERSONAL_DETAILS);
          try {
            localStorage.setItem(LOCALSTORAGE_KEYS.TUTORIAL_MAX_ACCESSED_PROFILE_TAB, 'personalDetails');
          } catch (error) {
            console.error('[TutorialContext] Error resetting maxAccessedProfileTab in localStorage:', error);
          }
        }
      }

      // Proceed with starting the tutorial
      console.log('[TutorialContext] Activating tutorial:', feature, 'at step:', startStep);
      safelyUpdateTutorialState([
        [setActiveTutorial, feature],
        [setCurrentStep, startStep],
        [setIsTutorialActive, true],
        [setShowFirstTimeModal, false]
      ], async () => {
        await saveTutorialProgress(feature, startStep);
      });
    } finally {
      setIsBusy(false);
    }
  }, [isBusy, safelyUpdateTutorialState, currentUser, saveTutorialProgress, completedTutorials, accessLevelChoice, onboardingType]);

  // Start all tutorials from the beginning (profile)
  const startAllTutorials = useCallback(async () => {
    const firstTutorial = getProfileTutorialForType(onboardingType);
    await startTutorial(firstTutorial);
  }, [startTutorial, onboardingType]);

  // Check if tutorial should be shown based on tutorial status
  useEffect(() => {
    const checkTutorialStatus = async () => {
      // Prevent running check while system is busy (e.g. completing a tutorial)
      if (isBusy) {
        return;
      }

      // CRITICAL: Skip if tutorial was explicitly stopped - prevents auto-restart
      if (tutorialStoppedRef.current) {
        setIsReady(true);
        return;
      }

      // CRITICAL: Strict early return if not in dashboard
      if (!isInDashboard) {
        setIsReady(true);
        return;
      }

      if (!currentUser) {
        setIsReady(true);
        return;
      }

      if (isDashboardLoading) {
        return;
      }

      try {
        // Check tutorial status 
        // OPTIMIZATION: Use the user object already fetched in DashboardContext
        // This avoids a redundant fetch of the same data
        const userData = user;

        if (userData) {
          // Load completed tutorials
          if (userData.completedTutorials) {
            setCompletedTutorials(prev => {
              // Merge remote data with local state
              const merged = { ...userData.completedTutorials };
              Object.keys(prev).forEach(key => {
                if (prev[key] === true) {
                  merged[key] = true;
                }
              });
              return merged;
            });
          }

          const bypassedGLN = userData.bypassedGLN === true && userData.GLN_certified === false;
          const isVerifiedProfile = !!userData.GLN_certified || !!userData.isVerified || bypassedGLN;
          const onboardingCompleted = userData._professionalProfileExists || userData.hasProfessionalProfile || isVerifiedProfile;

          const isAdmin = !!(userData.adminData && userData.adminData.isActive !== false);

          const hasProfessionalProfile = userData.hasProfessionalProfile || userData._professionalProfileExists;
          const hasFacilityProfile = userData.hasFacilityProfile;


          const hasEstablishedWorkspace = hasProfessionalProfile === true || hasFacilityProfile === true || isAdmin || isVerifiedProfile;

          const isProfilePage = isProfilePath(location.pathname);

          if (isAdmin) {
            setIsReady(true);
            return;
          }

          // Wait for flags only if we don't have enough info to determine if workspace exists
          if (!hasEstablishedWorkspace && (typeof hasProfessionalProfile !== 'boolean' || typeof hasFacilityProfile !== 'boolean')) {
            return;
          }

          if (!hasEstablishedWorkspace) {
            // EXEMPT profile page - user might be completing it to establish workspace
            if (isInDashboard && !isProfilePage) {
              const lang = i18n.language || 'fr';
              // Path-based workspace is already in the URL
              navigate(`/${lang}/onboarding`);
            }
            return; // Stop here
          }

          // OPTIMIZATION: If workspace exists AND tutorial is already passed, skip the rest
          if (tutorialPassed && !isTutorialActive && !showFirstTimeModal) {
            setIsReady(true);
            return;
          }

          // PRIORITY CHECK 2: Workspace exists but Incomplete/Unverified
          if (!onboardingCompleted && !isVerifiedProfile && !isAdmin) {
            // EXEMPT profile page - user might be there to complete verification
            if (isInDashboard && !isProfilePage) {
              const lang = i18n.language || 'fr';
              // Path-based workspace is already in the URL
              navigate(`/${lang}/onboarding`);
            }
            return; // Stop here
          }

          // Check for in-progress tutorial first - Restoration has priority
          const typeProgress = userData.tutorialProgress?.[onboardingType] || {};
          if (typeProgress.activeTutorial) {
            const savedTutorial = typeProgress.activeTutorial;

            // CRITICAL: Skip restoration if tutorial was explicitly stopped
            if (tutorialStoppedRef.current) {
              console.log('[TutorialContext] Skipping restoration: tutorial was explicitly stopped');
              return;
            }

            // CRITICAL FIX 0: If tutorial is already active and matches the saved state, don't restore
            if (isTutorialActive && activeTutorial === savedTutorial) {
              const savedStep = typeProgress.currentStepIndex || 0;

              if (currentStep >= savedStep) {
                return;
              }
            }

            // CRITICAL FIX 1: Check if we are currently completing this tutorial
            if (completingTutorialRef.current === savedTutorial) {
              return;
            }

            // CRITICAL FIX 2: Check if we just completed this tutorial locally
            if (completedTutorials[savedTutorial] === true || typeProgress.tutorials?.[savedTutorial]?.completed) {

              if (isTutorialActive) {
                await safelyUpdateTutorialState([
                  [setIsTutorialActive, false]
                ]);
              }
              return;
            }

            // CRITICAL FIX: Check if tutorial is already passed for this account type
            if (typeProgress.completed) {

              // Clean up the stale activeTutorial field
              if (savedTutorial) {
                const profileCollection = onboardingType === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
                const profileRef = doc(db, profileCollection, currentUser.uid);
                updateDoc(profileRef, {
                  [`tutorialProgress.${onboardingType}.activeTutorial`]: null
                }).catch(err => { });
              }
              return;
            }

            const savedStep = typeProgress.currentStepIndex || 0;

            // CRITICAL FIX 4: Check if we already restored this exact state
            if (lastRestoredStateRef.current.tutorial === savedTutorial &&
              lastRestoredStateRef.current.step === savedStep) {
              return;
            }


            // Track that we are restoring this state
            lastRestoredStateRef.current = { tutorial: savedTutorial, step: savedStep };

            // Restore state
            safelyUpdateTutorialState([
              [setActiveTutorial, savedTutorial],
              [setCurrentStep, savedStep],
              [setIsTutorialActive, true],
              [setShowFirstTimeModal, false]
            ]);
            return;
          }

          // AUTO-START REMOVED: Tutorial must be started manually by user clicking the header button
          // Clear any stale shouldStartTutorial flags without starting tutorial
          if (!isTutorialActive && !showFirstTimeModal && isInDashboard && !tutorialPassed && !isAdmin && onboardingCompleted) {
            try {
              const profileCollection = onboardingType === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
              const profileRef = doc(db, profileCollection, currentUser.uid);
              const profileDoc = await getDoc(profileRef);

              if (profileDoc.exists()) {
                const profileData = profileDoc.data();
                if (profileData.shouldStartTutorial === true) {
                  // Just clear the flag, don't start tutorial automatically
                  await updateDoc(profileRef, {
                    shouldStartTutorial: false
                  });
                }
              }
            } catch (error) {
              console.error('[TutorialContext] Error clearing shouldStartTutorial flag:', error);
            }
          }

          // Only check and update if we're in dashboard and tutorial hasn't been passed
          if (isInDashboard && !tutorialPassed && !isAdmin) {
            // Don't re-show modal if it's already showing or tutorial is active
            if (showFirstTimeModal || isTutorialActive) {
              return;
            }

            if (onboardingCompleted) {
              // Onboarding completed - allow access
              setShowFirstTimeModal(false);
            } else {
              // Onboarding not completed - check verification status
              if (isVerifiedProfile) {
                // Profile is verified but onboarding not completed - allow access
                setShowFirstTimeModal(false);
              }
              // Verification check handled above already
            }
          } else if (isInDashboard && tutorialPassed) {
            // Hide modal if tutorial is already passed
            if (showFirstTimeModal) {
              return;
            }
            setShowFirstTimeModal(false);
          }
        } else {
          // No user data (user is null but isLoading is false)
          if (isInDashboard && !tutorialPassed) {
            const lang = i18n.language || 'fr';
            // Path-based workspace is already in the URL
            navigate(`/${lang}/onboarding`);
          }
        }
      } catch (error) {

        if (isInDashboard) {
          const lang = i18n.language || 'fr';
          // Path-based workspace is already in the URL
          navigate(`/${lang}/onboarding`);
        } else {
        }
      } finally {
        setIsReady(true);
      }
    };

    checkTutorialStatus();
  }, [currentUser, tutorialPassed, isInDashboard, profileComplete, showFirstTimeModal, isTutorialActive, isBusy, user, isDashboardLoading, safelyUpdateTutorialState]);

  // Removed: currentStep (now handled by ref-based restoration check)
  // Removed: activeTutorial (now handled by ref-based restoration check)
  // Removed: completedTutorials (now handled by ref-based restoration check)
  // Removed: safelyUpdateTutorialState (only used in conditional branches, wrapped in try-catch, and its stability is assumed)

  // Force sidebar open when tutorial is active (except on mobile)
  useEffect(() => {
    if (isTutorialActive && isMainSidebarCollapsed) {
      // Check if screen is wide enough (not mobile)
      const isMobile = window.innerWidth < 768;
      if (!isMobile) {
        setIsMainSidebarCollapsed(false);
      }
    }
  }, [isTutorialActive, isMainSidebarCollapsed, setIsMainSidebarCollapsed]);

  // CENTRALIZED: Stop tutorial and clear from Firestore (prevents reactivation on reload/tab change)
  const stopTutorial = useCallback(async (options = {}) => {
    const { showAccessPopupForProfile = true, showConfirmation = false, forceStop = false } = options;

    if (isBusy && !forceStop) {
      return false;
    }

    if (!isTutorialActive && !showFirstTimeModal) {
      return true;
    }

    if (showConfirmation && !forceStop) {
      setShowStopTutorialConfirm(true);
      return false;
    }

    const isInProfileTutorial = isProfileTutorial(activeTutorial);
    const isProfileTutorialComplete = completedTutorials?.[TUTORIAL_IDS.PROFILE_TABS] === true || completedTutorials?.[TUTORIAL_IDS.FACILITY_PROFILE_TABS] === true;

    if (showAccessPopupForProfile && isInProfileTutorial && !isProfileTutorialComplete) {
      // ONLY show popup if on marketplace page
      const isOnMarketplacePage = location.pathname.includes('/marketplace');

      if (isOnMarketplacePage) {
        setAllowAccessLevelModalClose(true);
        setShowAccessLevelModal(true);
        return false;
      }
    }

    // Mark as explicitly stopped to prevent auto-restoration
    tutorialStoppedRef.current = true;
    lastRestoredStateRef.current = { tutorial: null, step: null };
    setShowStopTutorialConfirm(false);
    setStepData(null);
    setElementPosition(null);

    // CLEAR TUTORIAL LOCAL STORAGE (access flag is separate in Firestore)
    try {
      localStorage.removeItem(LOCALSTORAGE_KEYS.TUTORIAL_STATE);
      localStorage.removeItem(LOCALSTORAGE_KEYS.TUTORIAL_MAX_ACCESSED_PROFILE_TAB);
    } catch (error) {
      console.error('[TutorialContext] Error clearing tutorial localStorage on stop:', error);
    }

    await safelyUpdateTutorialState([
      [setIsTutorialActive, false],
      [setShowFirstTimeModal, false],
      [setActiveTutorial, null],
      [setCurrentStep, 0]
    ], async () => {
      if (currentUser) {
        try {
          const profileCollection = onboardingType === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
          const profileDocRef = doc(db, profileCollection, currentUser.uid);
          await updateDoc(profileDocRef, {
            [`tutorialProgress.${onboardingType}.activeTutorial`]: null,
            updatedAt: serverTimestamp()
          });
        } catch (error) {
          console.error('[TutorialContext] Error clearing activeTutorial from Firestore:', error);
        }
      }
    });

    return true;
  }, [isBusy, isTutorialActive, showFirstTimeModal, activeTutorial, completedTutorials, safelyUpdateTutorialState, currentUser, onboardingType]);

  // Stop the tutorial completely when target tab is inaccessible
  // (e.g., tab locked due to missing validation/information)
  // This is a full stop - clears all state except access level choice
  const pauseTutorial = useCallback(async () => {
    if (isBusy) {
      return;
    }

    console.log('[TutorialContext] Stopping tutorial (tab locked)');

    // Mark as explicitly stopped to prevent auto-restoration
    tutorialStoppedRef.current = true;
    lastRestoredStateRef.current = { tutorial: null, step: null };
    setStepData(null);
    setElementPosition(null);
    setIsPaused(false);
    setShowStopTutorialConfirm(false);

    await safelyUpdateTutorialState([
      [setIsTutorialActive, false],
      [setShowFirstTimeModal, false],
      [setActiveTutorial, null],
      [setCurrentStep, 0]
    ], async () => {
      if (currentUser) {
        try {
          const profileCollection = onboardingType === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
          const profileDocRef = doc(db, profileCollection, currentUser.uid);
          await updateDoc(profileDocRef, {
            [`tutorialProgress.${onboardingType}.activeTutorial`]: null,
            updatedAt: serverTimestamp()
          });
        } catch (error) {
          console.error('[TutorialContext] Error clearing activeTutorial from Firestore:', error);
        }
      }
    });

    // CLEAR TUTORIAL LOCAL STORAGE (access flag is separate in Firestore)
    try {
      localStorage.removeItem(LOCALSTORAGE_KEYS.TUTORIAL_STATE);
      localStorage.removeItem(LOCALSTORAGE_KEYS.TUTORIAL_MAX_ACCESSED_PROFILE_TAB);
    } catch (error) {
      console.error('[TutorialContext] Error clearing tutorial localStorage on pause:', error);
    }
  }, [isBusy, safelyUpdateTutorialState, currentUser, onboardingType]);

  // Resume is now a no-op since pauseTutorial does a full stop
  // Keeping for API compatibility but it won't do anything
  const resumeTutorial = useCallback(() => {
    // No-op - tutorial must be manually restarted after a stop
    console.log('[TutorialContext] resumeTutorial called but tutorial was fully stopped');
  }, []);

  // Restart the onboarding flow (Smart Restart)
  const restartOnboarding = useCallback(async (type = 'professional') => {
    console.log('[TutorialContext] restartOnboarding called:', { type, isBusy, hasCurrentUser: !!currentUser });

    if (isBusy || !currentUser) {
      console.log('[TutorialContext] restartOnboarding blocked:', { isBusy, hasCurrentUser: !!currentUser });
      return;
    }

    // If tutorial is currently active, stop it first before restarting
    if (isTutorialActive || showFirstTimeModal) {
      console.log('[TutorialContext] Stopping active tutorial before restart');
      const stopped = await stopTutorial();
      if (!stopped) {
        console.log('[TutorialContext] stopTutorial returned false, aborting restart');
        return;
      }
      // Continue to restart after stopping (don't return here)
    }

    // Set the onboarding type
    setOnboardingType(type);

    // Check if user is already verified/onboarded for this type
    try {
      const profileCollection = type === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
      const profileDocRef = doc(db, profileCollection, currentUser.uid);
      const profileDoc = await getDoc(profileDocRef);

      let canStartTutorialInDashboard = false;
      if (profileDoc.exists()) {
        const data = profileDoc.data();
        const tutorialAccessMode = data.tutorialAccessMode || 'loading';
        // NEW SCHEMA: 'team', 'full', 'loading' | OLD SCHEMA: 'enabled', 'disabled'
        // Users in dashboard can start tutorial if they have any access mode set
        canStartTutorialInDashboard = tutorialAccessMode === 'enabled' || tutorialAccessMode === 'disabled' ||
          tutorialAccessMode === 'team' || tutorialAccessMode === 'full' || tutorialAccessMode === 'loading';

        if (type === 'professional') {
          const bypassedGLN = data.bypassedGLN === true && data.GLN_certified === false;
          canStartTutorialInDashboard = canStartTutorialInDashboard || !!data.GLN_certified || bypassedGLN;
        }

        console.log('[TutorialContext] canStartTutorialInDashboard:', canStartTutorialInDashboard, { tutorialAccessMode });
      } else {
        console.log('[TutorialContext] Profile doc does not exist');
      }

      if (canStartTutorialInDashboard) {
        const firstTutorial = getProfileTutorialForType(type);
        console.log('[TutorialContext] Calling startTutorial:', firstTutorial);
        await startTutorial(firstTutorial);
      } else {
        const lang = i18n.language || 'fr';
        console.log('[TutorialContext] Navigating to onboarding page');
        navigate(`/${lang}/onboarding?type=${type}`);
      }
    } catch (e) {
      console.error("Error checking status for restart:", e);
      // Fallback to onboarding page
      const lang = i18n.language || 'fr';
      navigate(`/${lang}/onboarding?type=${onboardingType}`);
    }
  }, [isBusy, safelyUpdateTutorialState, currentUser, startTutorial, isTutorialActive, showFirstTimeModal, onboardingType, stopTutorial]);

  // Start facility onboarding specifically (for "Create a business" button)
  const startFacilityOnboarding = useCallback(async () => {
    await restartOnboarding('facility');
  }, [restartOnboarding]);

  // Reset tutorial state when leaving dashboard
  useEffect(() => {
    if (!isInDashboard) {
      resetTutorialState();
    }
  }, [isInDashboard, resetTutorialState]);

  // Update step data when current step or active tutorial changes
  useEffect(() => {
    if (isTutorialActive && tutorialSteps[activeTutorial]) {
      const steps = tutorialSteps[activeTutorial];

      // AUTO-SYNC: Detect correct step based on current URL for profile tutorials
      if (isProfileTutorial(activeTutorial) && isProfilePath(location.pathname)) {
        let currentTab = location.pathname.split('/').pop();

        // If URL ends with 'profile', default to personalDetails
        if (currentTab === 'profile') {
          currentTab = 'personalDetails';
        }

        const tabToStepMap = {
          'personalDetails': 0,
          'professionalBackground': 1,
          'billingInformation': 2,
          'documentUploads': 3,
          'marketplace': 4,
          'account': 6
        };

        const expectedStep = tabToStepMap[currentTab];

        // Debug Auto-Sync
        console.log('[TutorialContext] Auto-Sync Check:', {
          currentTab,
          expectedStep,
          currentStep,
          isPaused,
          isWaitingForSave,
          showAccessLevelModal
        });

        const extendedTabOrder = ['personalDetails', 'professionalBackground', 'billingInformation', 'documentUploads', 'marketplace', 'account'];
        const targetTabIndex = extendedTabOrder.indexOf(currentTab);
        const maxTabIndex = extendedTabOrder.indexOf(maxAccessedProfileTab);

        if (currentTab === 'account' || currentTab === 'marketplace') {
          // Check if the user can access this tab based on maxAccessedProfileTab
          if (targetTabIndex > maxTabIndex) {
            // User trying to access a tab beyond their current progress
            console.log('[TutorialContext] Account/Marketplace blocked: redirecting to', maxAccessedProfileTab);
            const redirectStep = extendedTabOrder.indexOf(maxAccessedProfileTab);
            if (redirectStep !== -1 && redirectStep !== currentStep && redirectStep < 4) {
              safelyUpdateTutorialState([
                [setCurrentStep, redirectStep]
              ], async () => {
                await saveTutorialProgress(activeTutorial, redirectStep);
              });
              const workspaceId = selectedWorkspace?.id || 'personal';
              navigate(`/dashboard/${workspaceId}/profile/${maxAccessedProfileTab}`);
            }
            return;
          }
          // User has access - update maxAccessedProfileTab if advancing
          if (targetTabIndex > maxTabIndex) {
            setMaxAccessedProfileTab(currentTab);
          }
          // Sync to the expected step for account/marketplace
          // Don't sync backwards if user has manually advanced ahead
          if (expectedStep !== undefined && expectedStep !== currentStep && !showAccessLevelModal) {
            // Only sync if we're going forward or staying the same, not backwards
            // This allows users to advance steps ahead of their current tab
            if (expectedStep >= currentStep) {
              safelyUpdateTutorialState([
                [setCurrentStep, expectedStep]
              ], async () => {
                await saveTutorialProgress(activeTutorial, expectedStep);
              });
            }
          }
          return;
        }

        let canAccessTab = targetTabIndex === -1 || maxTabIndex === -1 || targetTabIndex <= maxTabIndex;

        if (targetTabIndex !== -1 && maxTabIndex !== -1 && targetTabIndex > maxTabIndex) {
          setMaxAccessedProfileTab(currentTab);
          canAccessTab = true;
        }

        // Don't sync to a tab the user doesn't have access to
        if (!canAccessTab) {
          console.log('[TutorialContext] Skipping auto-sync: tab not accessible', { currentTab, maxAccessedProfileTab, targetTabIndex, maxTabIndex });
          // Don't return - continue to set step data for current step
        }

        if (canAccessTab && expectedStep !== undefined && expectedStep !== currentStep && !showAccessLevelModal) {
          // Don't sync backwards if user has manually advanced ahead
          // This allows users to advance steps ahead of their current tab
          if (expectedStep < currentStep) {
            console.log('[TutorialContext] Skipping auto-sync backwards: user is ahead', { expectedStep, currentStep });
            // Don't return - continue to set step data for current step
          } else {
            // Clear waiting state if user manually navigates to a new step
            if (isWaitingForSave) {
              console.log('[TutorialContext] Clearing isWaitingForSave due to manual navigation');
              setIsWaitingForSave(false);
            }

            console.log('[TutorialContext] Auto-syncing to step:', expectedStep);
            safelyUpdateTutorialState([
              [setCurrentStep, expectedStep]
            ], async () => {
              await saveTutorialProgress(activeTutorial, expectedStep);
            });
          }
          return;
        }
      }

      if (steps && steps[currentStep]) {
        let currentStepData = { ...steps[currentStep] };

        // STOP CHECK: If step targets an inaccessible tab, stop tutorial completely
        if (isProfileTutorial(activeTutorial) && currentStepData.highlightTab) {
          const fullTabOrder = ['personalDetails', 'professionalBackground', 'billingInformation', 'documentUploads', 'marketplace', 'account'];
          const targetTabIndex = fullTabOrder.indexOf(currentStepData.highlightTab);
          const maxTabIndex = fullTabOrder.indexOf(maxAccessedProfileTab);

          if (targetTabIndex !== -1 && maxTabIndex !== -1) {
            if (targetTabIndex > maxTabIndex) {
              console.log('[TutorialContext] Stopping tutorial: target tab locked', { targetTabIndex, maxTabIndex });
              pauseTutorial();
              return;
            }
          }
        }

        setStepData(currentStepData);
      } else {
        setStepData(null);
      }
    } else {
      setStepData(null);
    }
  }, [currentStep, activeTutorial, isTutorialActive, location.pathname, showAccessLevelModal, maxAccessedProfileTab, pauseTutorial, navigate, selectedWorkspace]);

  const previousHighlightTabRef = useRef(null);
  useEffect(() => {
    if (!isTutorialActive) return;
    if (!isProfileTutorial(activeTutorial)) return;

    const highlightTab = stepData?.highlightTab || null;
    const previousHighlightTab = previousHighlightTabRef.current;
    previousHighlightTabRef.current = highlightTab;

    if (!highlightTab) return;
    if (previousHighlightTab === highlightTab) return;

    if (showAccessLevelModal) {
      setShowAccessLevelModal(false);
      setAllowAccessLevelModalClose(false);
    }

    const tabOrder = ['personalDetails', 'professionalBackground', 'billingInformation', 'documentUploads', 'marketplace', 'account'];
    const targetIndex = tabOrder.indexOf(highlightTab);
    const maxIndex = tabOrder.indexOf(maxAccessedProfileTab);

    if (targetIndex !== -1 && maxIndex !== -1 && targetIndex > maxIndex) {
      setMaxAccessedProfileTab(highlightTab);
    }
  }, [isTutorialActive, activeTutorial, stepData?.highlightTab, showAccessLevelModal, maxAccessedProfileTab]);

  // Get element position for highlighting
  useEffect(() => {
    if (!stepData) {
      setElementPosition(null);
      return;
    }

    const updateElementPosition = () => {
      let targetSelector = null;

      // Determine the target selector based on step data
      if (stepData.highlightSidebarItem) {
        targetSelector = `[data-tutorial="${stepData.highlightSidebarItem}-link"]`;
      } else if (stepData.highlightTab) {
        targetSelector = `[data-tab="${stepData.highlightTab}"]`;
      } else if (stepData.targetSelector) {
        targetSelector = stepData.targetSelector;
      }

      if (targetSelector) {
        // Check if we are on the required tab (if specified)
        if (stepData.requiredTab) {
          const currentTab = location.pathname.split('/').pop();
          if (currentTab !== stepData.requiredTab) {
            setElementPosition(null);
            return;
          }
        }

        // On mobile, ensure sidebar is open before finding elements
        const isMobile = window.innerWidth < 768;
        if (isMobile && stepData.highlightSidebarItem) {
          const sidebar = document.querySelector('.sidebar');
          const isSidebarVisible = sidebar &&
            window.getComputedStyle(sidebar).display !== 'none' &&
            window.getComputedStyle(sidebar).visibility !== 'hidden';

          if (!isSidebarVisible) {
            const targetElement = document.querySelector(targetSelector);
            if (targetElement) {
              const rect = targetElement.getBoundingClientRect();
              setElementPosition({
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height
              });
            } else {
              setElementPosition(null);
            }
            return;
          }
        }

        const targetElement = document.querySelector(targetSelector);
        if (targetElement) {
          const rect = targetElement.getBoundingClientRect();
          setElementPosition({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height
          });
        } else {
          setElementPosition(null);
        }
      } else {
        setElementPosition(null);
      }
    };

    // Store updateElementPosition in ref so it can be called externally
    updateElementPositionRef.current = updateElementPosition;

    // Initial position update - use multiple frames to ensure DOM is ready
    // and a retry mechanism if the element is not found immediately
    let retryCount = 0;
    const maxRetries = 20; // 2 seconds at 100ms intervals

    const initialPositioning = () => {
      updateElementPosition();

      // If we still don't have a position but we have a step that expects one,
      // retry up to maxRetries
      const targetSelector = stepData.highlightSidebarItem
        ? `[data-tutorial="${stepData.highlightSidebarItem}-link"]`
        : stepData.highlightTab
          ? `[data-tab="${stepData.highlightTab}"]`
          : stepData.targetSelector;

      if (targetSelector && !document.querySelector(targetSelector) && retryCount < maxRetries) {
        retryCount++;
        setTimeout(() => {
          requestAnimationFrame(initialPositioning);
        }, 100);
      } else if (targetSelector && document.querySelector(targetSelector)) {
        // Element finally found, set up observer if not already done
        setupObserver(document.querySelector(targetSelector));
      }
    };

    let resizeObserver = null;
    const setupObserver = (element) => {
      if (element && window.ResizeObserver && !resizeObserver) {
        resizeObserver = new ResizeObserver(() => {
          requestAnimationFrame(updateElementPosition);
        });
        resizeObserver.observe(element);
      }
    };

    // Start initial positioning
    requestAnimationFrame(initialPositioning);

    // Initial check for ResizeObserver
    const targetSelector = stepData.highlightSidebarItem
      ? `[data-tutorial="${stepData.highlightSidebarItem}-link"]`
      : stepData.highlightTab
        ? `[data-tab="${stepData.highlightTab}"]`
        : stepData.targetSelector;

    const targetElement = targetSelector ? document.querySelector(targetSelector) : null;
    if (targetElement) {
      setupObserver(targetElement);
    }

    // Debounced window resize handler
    const debouncedResize = debounce(updateElementPosition, 150);
    window.addEventListener('resize', debouncedResize);

    // Sidebar transition handler
    const sidebar = document.querySelector('aside[class*="fixed left-0"]');
    const handleSidebarTransition = (e) => {
      if (e.propertyName === 'width' || e.propertyName === 'transform') {
        requestAnimationFrame(updateElementPosition);
      }
    };

    if (sidebar) {
      sidebar.addEventListener('transitionend', handleSidebarTransition);
    }

    return () => {
      // Cleanup
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener('resize', debouncedResize);
      if (sidebar) {
        sidebar.removeEventListener('transitionend', handleSidebarTransition);
      }
    };
  }, [stepData, sidebarWidth, location.pathname]);

  // REMOVED: Access mode choice tooltip (conflicting with AccessLevelChoicePopup)
  // The AccessLevelChoicePopup is now shown ONLY when:
  // 1. User clicks locked tabs (profile sub-tabs or marketplace) with team access

  // Function to force immediate position update (called by sidebar toggle button)
  const forceUpdateElementPosition = useCallback(() => {
    if (updateElementPositionRef.current) {
      updateElementPositionRef.current();
    }
  }, []);

  // Complete the current tutorial
  const completeTutorial = useCallback(async () => {

    // Prevent completion while busy
    if (isBusy) {
      return;
    }

    const previousTutorial = activeTutorial;

    // Clear restoration ref
    lastRestoredStateRef.current = { tutorial: null, step: null };

    // CRITICAL: Set the ref BEFORE any state changes to prevent race conditions
    completingTutorialRef.current = previousTutorial;

    try {
      await safelyUpdateTutorialState([
        [setIsTutorialActive, false],
        [setActiveTutorial, getProfileTutorialForType(onboardingType)]
      ], async () => {
        if (currentUser) {
          try {
            // Use profile collection instead of users
            const profileCollection = onboardingType === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
            const profileDocRef = doc(db, profileCollection, currentUser.uid);

            const progressPath = `tutorialProgress.${onboardingType}.tutorials.${previousTutorial}`;

            // Update completedTutorials for this onboarding type
            await updateDoc(profileDocRef, {
              [`${progressPath}.completed`]: true,
              [`tutorialProgress.${onboardingType}.activeTutorial`]: null,
              updatedAt: serverTimestamp()
            });

            // Update local state
            setCompletedTutorials(prev => ({
              ...prev,
              [previousTutorial]: true
            }));

            // Chain next tutorial if applicable
            const mandatoryOnboardingTutorials = getMandatoryTutorials(onboardingType);

            const currentIndex = mandatoryOnboardingTutorials.indexOf(previousTutorial);

            // SPECIAL: If finishing profile tabs, mark tutorial as passed officially and set access mode to full
            if (isProfileTutorial(previousTutorial)) {
              await setTutorialComplete(true);

              // ALWAYS upgrade to full access after profile completion (regardless of current mode)
              setAccessLevelChoice('full');

              try {
                await updateDoc(profileDocRef, {
                  tutorialAccessMode: 'enabled'
                });
              } catch (saveError) {
                console.error("[TutorialContext] ❌ Error saving access mode 'full' to Firestore:", saveError);
              }

              // Auto-start Messages tutorial
              setTimeout(() => {
                startTutorial(TUTORIAL_IDS.MESSAGES);
              }, 500);
            }

            if (currentIndex !== -1 && currentIndex >= mandatoryOnboardingTutorials.length - 1) {
              // Check if all tutorials are done to mark account tutorial as completed
              const profileDoc = await getDoc(profileDocRef);
              if (profileDoc.exists()) {
                const typeData = profileDoc.data().tutorialProgress?.[onboardingType] || {};
                const tutorials = typeData.tutorials || {};
                const allDone = mandatoryOnboardingTutorials.every(f => tutorials[f]?.completed);
                if (allDone) {
                  await updateDoc(profileDocRef, {
                    [`tutorialProgress.${onboardingType}.completed`]: true
                  });
                }
              }
            }
          } catch (error) {
            console.error('Error updating tutorial completion status:', error);
          }
        }
      });
    } finally {
      setTimeout(() => {
        completingTutorialRef.current = null;
      }, 1000);
    }
  }, [activeTutorial, isBusy, safelyUpdateTutorialState, currentUser, onboardingType, setTutorialComplete, accessLevelChoice]);

  // Load tutorial progress from Firestore
  // DISABLED: This effect was causing step regression by triggering on every currentStep change
  // and reading stale data from Firestore before the save completed.
  // Tutorial restoration is already handled by checkTutorialStatus effect.
  /* 
  useEffect(() => {
    const loadTutorialProgress = async () => {
      if (!currentUser || !isTutorialActive) return;

      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();

          if (userData.tutorialProgress && userData.tutorialProgress.activeTutorial === activeTutorial) {
            const savedStep = userData.tutorialProgress.currentStep;
            if (savedStep !== undefined && savedStep !== currentStep) {
              setCurrentStep(savedStep);
            }
          }
        }
      } catch (error) {
        console.error('Error loading tutorial progress:', error);
      }
    };

    loadTutorialProgress();
  }, [currentUser, isTutorialActive, activeTutorial, currentStep]);
  */

  // Move to the next step in the current tutorial
  const nextStep = useCallback(() => {
    // Prevent step change while busy
    if (isBusy) {
      return;
    }

    const totalSteps = tutorialSteps[activeTutorial]?.length || 0;

    // Clear restoration ref to allow manual navigation
    lastRestoredStateRef.current = { tutorial: null, step: null };

    if (currentStep < totalSteps - 1) {
      const newStep = currentStep + 1;

      safelyUpdateTutorialState([
        [setCurrentStep, newStep]
      ], async () => {
        await saveTutorialProgress(activeTutorial, newStep);
      });
    } else {
      // Tutorial completed
      completeTutorial();
    }
  }, [
    isBusy, currentStep, activeTutorial, safelyUpdateTutorialState, completeTutorial, saveTutorialProgress, setAllowAccessLevelModalClose, setShowAccessLevelModal
  ]);

  // Navigate to the feature if "Show me" button is clicked or if step has navigationPath
  const navigateToFeature = useCallback(() => {
    let targetPath = null;

    // Get the current step to check for special actions
    const stepData = tutorialSteps[activeTutorial]?.[currentStep];

    // Handle special action: start_next_tutorial - just complete current tutorial
    // User must manually start the next tutorial (no auto-start)
    if (stepData?.actionButton?.action?.startsWith('start_') && stepData?.actionButton?.action?.endsWith('_tutorial')) {
      completeTutorial();
      return;
    }

    // Handle special action: next_step
    if (stepData?.actionButton?.action === 'next_step') {
      nextStep();
      return;
    }

    // Check for actionButton path first (for "Show me" buttons)
    if (stepData && stepData.actionButton && stepData.actionButton.path) {
      targetPath = stepData.actionButton.path;
    }
    // Check for navigationPath (for automatic navigation steps)
    else if (stepData && stepData.navigationPath) {
      targetPath = stepData.navigationPath;
    }

    if (targetPath) {
      // Logic to block profile navigation if current tab is not valid
      // This specifically prevents tutorial from skipping mandatory fields
      if (location.pathname.includes('/profile') && targetPath.includes('/profile')) {
        // More robust tab name extraction (removes query params and hashes)
        const getTabName = (path) => path.split('?')[0].split('#')[0].split('/').filter(Boolean).pop();

        const currentTab = getTabName(location.pathname);
        const targetTabName = getTabName(targetPath);

        // If navigating to a DIFFERENT tab within profile
        if (currentTab !== targetTabName && currentTab !== 'profile') {
          const validate = validationRef.current['profile'];
          if (validate && !validate(currentTab)) {
            return;
          }
        }
      }

      navigate(targetPath);

      // Do NOT automatically advance to next step - user must click Next button
    }
  }, [activeTutorial, completeTutorial, currentStep, navigate, location.pathname, showWarning]);

  // Skip the first-time modal (when user clicks "Skip")
  const skipFirstTimeModal = useCallback(() => {

    // Prevent multiple skips
    if (isBusy) {
      return;
    }

    safelyUpdateTutorialState([
      [setShowFirstTimeModal, false]
    ], async () => {
      // Update user's tutorial status in Firestore
      if (currentUser) {
        try {
          // Set cookie and update profile database to remember tutorial was passed
          await setTutorialComplete(true);
        } catch (error) {
          console.error('Error updating tutorial status:', error);
        }
      }
    });
  }, [isBusy, currentUser, safelyUpdateTutorialState, setTutorialComplete]);

  // RESET PROFILE TAB ACCESS PROGRESS
  const resetProfileTabAccess = useCallback(() => {
    setMaxAccessedProfileTab('personalDetails');
    try {
      localStorage.setItem(LOCALSTORAGE_KEYS.TUTORIAL_MAX_ACCESSED_PROFILE_TAB, 'personalDetails');
    } catch (error) {
      console.error('[TutorialContext] Error resetting maxAccessedProfileTab in localStorage:', error);
    }
  }, []);

  // Skip the entire tutorial (marks as completed, unlike stopTutorial which just pauses)
  const skipTutorial = useCallback(async () => {
    if (isBusy) {
      return;
    }

    const isInProfileTutorial = isProfileTutorial(activeTutorial);
    const isProfileTutorialComplete = completedTutorials?.[TUTORIAL_IDS.PROFILE_TABS] === true || completedTutorials?.[TUTORIAL_IDS.FACILITY_PROFILE_TABS] === true;

    if (isInProfileTutorial && !isProfileTutorialComplete) {
      if (accessLevelChoice === 'team') {
      } else if (accessLevelChoice === 'full') {
        setAllowAccessLevelModalClose(true);
        setShowAccessLevelModal(true);
        return;
      } else {
        setAllowAccessLevelModalClose(true);
        setShowAccessLevelModal(true);
        return;
      }
    }

    resetProfileTabAccess();
    // Mark as explicitly stopped to prevent auto-restoration
    tutorialStoppedRef.current = true;
    lastRestoredStateRef.current = { tutorial: null, step: null };
    setStepData(null);
    setElementPosition(null);

    // CLEAR TUTORIAL LOCAL STORAGE (access flag is separate in Firestore)
    try {
      localStorage.removeItem(LOCALSTORAGE_KEYS.TUTORIAL_STATE);
      localStorage.removeItem(LOCALSTORAGE_KEYS.TUTORIAL_MAX_ACCESSED_PROFILE_TAB);
    } catch (error) {
      console.error('[TutorialContext] Error clearing tutorial localStorage on skip:', error);
    }

    await safelyUpdateTutorialState([
      [setIsTutorialActive, false],
      [setShowFirstTimeModal, false],
      [setActiveTutorial, null],
      [setCurrentStep, 0]
    ], async () => {
      if (currentUser) {
        try {
          const profileCollection = onboardingType === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
          const profileDocRef = doc(db, profileCollection, currentUser.uid);

          await setTutorialComplete(true);

          await updateDoc(profileDocRef, {
            [`tutorialProgress.${onboardingType}.completed`]: true,
            [`tutorialProgress.${onboardingType}.activeTutorial`]: null,
            tutorialPassed: true,
            updatedAt: serverTimestamp()
          });
        } catch (error) {
          console.error('Error updating tutorial status:', error);
        }
      }
    });
  }, [isBusy, currentUser, safelyUpdateTutorialState, setTutorialComplete, completedTutorials, onboardingType, activeTutorial, accessLevelChoice, resetProfileTabAccess]);

  // Move to the previous step
  const prevStep = useCallback(() => {
    // Prevent step change while busy
    if (isBusy) {
      return;
    }

    if (currentStep > 0) {
      // Clear restoration ref to allow manual navigation
      lastRestoredStateRef.current = { tutorial: null, step: null };

      const newStep = currentStep - 1;
      safelyUpdateTutorialState([
        [setCurrentStep, newStep]
      ], async () => {
        await saveTutorialProgress(activeTutorial, newStep);
      });
    }
  }, [
    isBusy, currentStep, activeTutorial, safelyUpdateTutorialState, saveTutorialProgress
  ]);

  // Set waiting for save state (replaces global window.__tutorialWaitingForSave)
  const setWaitingForSave = useCallback((waiting) => {
    setIsWaitingForSave(waiting);
  }, []);

  // Set access mode (team or full) and persist to Firestore
  const setAccessMode = useCallback(async (mode) => {
    if (!currentUser) return;

    // PROTECTION: Once full access is granted (when documents are completed), it should never be changed
    if (accessLevelChoice === 'full' && mode !== 'full') {
      console.warn('[TutorialContext] Attempted to change full access - this is not allowed. Full access is permanent.');
      return;
    }

    setAccessLevelChoice(mode);
    setShowAccessLevelModal(false);
    setAllowAccessLevelModalClose(false);

    try {
      // Determine the profile collection based on onboarding type
      const profileCollection = onboardingType === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
      const profileRef = doc(db, profileCollection, currentUser.uid);

      await updateDoc(profileRef, {
        accessLevelChoice: mode,
        tutorialAccessMode: mode,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
    }
  }, [currentUser, onboardingType, accessLevelChoice, completeTutorial, nextStep, activeTutorial, currentStep, safelyUpdateTutorialState, saveTutorialProgress]);

  // Callback for when a tab/section is completed during tutorial
  const onTabCompleted = useCallback((tabId, isComplete) => {
    // Allow completion regardless of waiting state to support "Save & Continue" without clicking tooltip
    // Support both professional and facility profile tutorials
    const isInProfileTutorial = isProfileTutorial(activeTutorial);
    if (!isTutorialActive || !isInProfileTutorial) {
      return;
    }

    if (isComplete) {
      console.log('[TutorialContext] Tab completed:', tabId);

      // Define tab order based on role
      const tabOrder = onboardingType === 'facility'
        ? ['facilityCoreDetails', 'facilityLegalBilling', 'marketplace', 'account']
        : ['personalDetails', 'professionalBackground', 'billingInformation', 'documentUploads', 'marketplace', 'account'];

      const tabIndex = tabOrder.indexOf(tabId);
      const currentMaxIndex = tabOrder.indexOf(maxAccessedProfileTab);

      // RULE: When a tab is completed, unlock the next tab
      // Account and Settings (Marketplace) tabs are always considered complete (no required fields)
      // So they automatically unlock the next tab when accessed
      if (tabIndex !== -1 && (tabIndex === currentMaxIndex || tabId === 'account' || tabId === 'marketplace') && tabIndex < tabOrder.length - 1) {
        const nextTab = tabOrder[tabIndex + 1];

        console.log('[TutorialContext] Unlocking next tab:', nextTab);
        setMaxAccessedProfileTab(nextTab);
      }

      // SPECIAL: Grant full access PERMANENTLY when critical progress is made
      // Professionals: after document uploads
      // Facilities: after legal & billing info
      const isCriticalTabComplete =
        (tabId === 'documentUploads' && onboardingType === 'professional') ||
        (tabId === 'facilityLegalBilling' && onboardingType === 'facility');

      if (isCriticalTabComplete || (tabId === 'account' && isInProfileTutorial)) {
        console.log('[TutorialContext] Critical tab completed - granting FULL access permanently');

        // Set full access in state - this is permanent and should never change
        setAccessLevelChoice('full');

        if (currentUser) {
          const profileCollection = onboardingType === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
          const profileDocRef = doc(db, profileCollection, currentUser.uid);

          // Save full access to Firestore - both accessLevelChoice and tutorialAccessMode
          // This ensures full access is permanent and won't be changed
          updateDoc(profileDocRef, {
            accessLevelChoice: 'full',
            tutorialAccessMode: 'enabled',
            updatedAt: serverTimestamp()
          }).then(() => {
            console.log('[TutorialContext] ✅ Full access saved permanently to Firestore');
          }).catch(err => {
            console.error('[TutorialContext] ❌ Error granting full access:', err);
          });
        }
      }

      // Clear waiting state immediately
      setIsWaitingForSave(false);

      if (onboardingType === 'professional' && activeTutorial === TUTORIAL_IDS.PROFILE_TABS && tabId === PROFILE_TAB_IDS.PERSONAL_DETAILS) {
        if (accessLevelChoice !== 'team' && accessLevelChoice !== 'full') {
          setAccessMode('team');
        }
      }

      // AUTO-ADVANCE: If the current tab matches the highlighted tab in the tooltip, advance to next step
      if (stepData?.highlightTab === tabId && nextStep) {
        console.log('[TutorialContext] Auto-advancing tutorial step for tab completion:', tabId);
        // Small timeout to allow state updates to settle
        setTimeout(() => {
          nextStep();
        }, 300);
      }

      // URL-based sync will handle step advancement automatically as a fallback
    }
  }, [isTutorialActive, activeTutorial, onboardingType, maxAccessedProfileTab, stepData, nextStep, currentUser, db, accessLevelChoice, setAccessMode, setAllowAccessLevelModalClose, setShowAccessLevelModal, setMaxAccessedProfileTab]);

  const syncProfileInitialState = useCallback((formData, profileConfig) => {
    if (!isTutorialActive || !isProfileTutorial(activeTutorial) || !formData || !profileConfig) return;
    if (accessLevelChoice === 'full') return;

    const tabOrder = getTabOrder(onboardingType);
    let firstIncompleteTab = null;

    for (const tabId of tabOrder) {
      if (!isTabCompleted(formData, tabId, profileConfig)) {
        firstIncompleteTab = tabId;
        break;
      }
    }

    if (firstIncompleteTab) {
      console.log('[TutorialContext] Initial sync - first incomplete tab:', firstIncompleteTab);

      if (maxAccessedProfileTab !== firstIncompleteTab) {
        const currentIndex = tabOrder.indexOf(maxAccessedProfileTab);
        const targetIndex = tabOrder.indexOf(firstIncompleteTab);
        if (targetIndex > currentIndex) {
          setMaxAccessedProfileTab(firstIncompleteTab);
        }
      }

      const steps = tutorialSteps[activeTutorial] || [];
      const targetStepIndex = steps.findIndex(s => s.highlightTab === firstIncompleteTab);

      if (targetStepIndex !== -1 && targetStepIndex > currentStep) {
        console.log('[TutorialContext] Jumping to first incomplete step:', targetStepIndex);
        safelyUpdateTutorialState([[setCurrentStep, targetStepIndex]], async () => {
          await saveTutorialProgress(activeTutorial, targetStepIndex);
        });
      }
    }
  }, [isTutorialActive, activeTutorial, onboardingType, accessLevelChoice, maxAccessedProfileTab, tutorialSteps, currentStep, setMaxAccessedProfileTab, setCurrentStep, safelyUpdateTutorialState, saveTutorialProgress]);

  // Check if a sidebar item should be accesssible during onboarding
  const isSidebarItemAccessible = useCallback((itemPath) => {
    const isAdmin = !!(user?.adminData && user?.adminData.isActive !== false);
    if (isAdmin) {
      return true;
    }

    const itemName = itemPath.split('/').pop();
    const isPersonalWorkspace = selectedWorkspace?.type === WORKSPACE_TYPES.PERSONAL;
    const isTeamWorkspace = selectedWorkspace?.type === WORKSPACE_TYPES.TEAM;

    // Marketplace: Only accessible with complete profile (tutorialPassed)
    if (itemName === TUTORIAL_IDS.MARKETPLACE) {
      return tutorialPassed;
    }

    // Organization: Only accessible in team workspace with complete profile
    if (itemName === TUTORIAL_IDS.ORGANIZATION) {
      if (!isTeamWorkspace) return false;
      return tutorialPassed;
    }

    if (tutorialPassed) {
      return true;
    }

    // Team access users can access everything except marketplace (and organization on team workspace)
    // which are already handled above
    if (accessLevelChoice === 'team') {
      return true;
    }

    if (showFirstTimeModal) {
      return itemPath.includes('overview') || itemPath.includes('profile');
    }

    const isProfileTutorialComplete = completedTutorials?.[TUTORIAL_IDS.PROFILE_TABS] === true || completedTutorials?.[TUTORIAL_IDS.FACILITY_PROFILE_TABS] === true;

    if (isProfileTutorialComplete) {
      return true;
    }

    if (itemName === 'overview') {
      return true;
    }

    if (itemName === 'profile') {
      return true;
    }

    const sharedItems = [TUTORIAL_IDS.MESSAGES, TUTORIAL_IDS.CONTRACTS, TUTORIAL_IDS.CALENDAR];
    if (sharedItems.includes(itemName)) {
      return true;
    }

    const tutorialOrder = ['overview', 'profile', TUTORIAL_IDS.MESSAGES, TUTORIAL_IDS.CONTRACTS, TUTORIAL_IDS.CALENDAR, TUTORIAL_IDS.MARKETPLACE, TUTORIAL_IDS.PAYROLL, TUTORIAL_IDS.ORGANIZATION, TUTORIAL_IDS.ACCOUNT];
    const itemIndex = tutorialOrder.indexOf(itemName);

    if (itemIndex !== -1) {
      if (activeTutorial === itemName || (itemName === 'profile' && isProfileTutorial(activeTutorial))) {
        return true;
      }

      const prevItem = tutorialOrder[itemIndex - 1];
      const prevTutorialKey = prevItem === 'profile' ? getProfileTutorialForType(onboardingType) : prevItem;
      if (completedTutorials[prevTutorialKey]) {
        return true;
      }
    }

    return false;

  }, [activeTutorial, completedTutorials, tutorialPassed, showFirstTimeModal, accessLevelChoice, selectedWorkspace, user]);

  // Route guard: Enforce strict navigation during mandatory onboarding
  useEffect(() => {
    // 1. Safety & Exemption Checks
    if (!isInDashboard) return; // Allow navigation outside dashboard (e.g. login)
    const isAdmin = !!(user?.adminData && user?.adminData.isActive !== false);
    if (isAdmin) return; // Admins bypass all route guards
    if (tutorialPassed) return; // If passed, allow all

    // If not in a tutorial, we rely on checkTutorialStatus to start one.
    if (!isTutorialActive) return;

    // Special Exception: If completing Dashboard tutorial by reaching Profile page, allow it even if busy
    if (activeTutorial === TUTORIAL_IDS.DASHBOARD && currentStep >= 3 && isProfilePath(location.pathname)) {

      // Force update if busy to ensure completion
      if (isBusy) {
        setIsBusy(false);
        return;
      }

      completeTutorial();
      return;
    }

    // Skip if busy (tutorial stop clears isTutorialActive, so we won't reach here if stopped)
    if (isBusy) return;

    // Skip step syncing when access level modal is showing to prevent redirect conflicts
    if (showAccessLevelModal) return;

    const path = location.pathname;

    // 2. Strict Redirection Logic based on Active Tutorial

    // Case A: Profile Creation Tutorial
    // User must stay within the profile section
    if (isProfileTutorial(activeTutorial)) {
      // SYNC: Check if current URL matches any step's navigationPath and switch to it
      // This allows users to click tabs without getting stuck on previous steps
      // Use a ref to prevent infinite sync loops
      try {
        const steps = tutorialSteps[activeTutorial];
        if (steps) {
          const currentPath = location.pathname;
          const normalizedCurrentPath = normalizePathForComparison(currentPath);
          const matchingStepIndex = steps.findIndex(step =>
            step.navigationPath && normalizedCurrentPath.includes(step.navigationPath)
          );

          // Check if the matching step targets an accessible tab
          const matchingStep = matchingStepIndex !== -1 ? steps[matchingStepIndex] : null;
          const extTabOrder = ['personalDetails', 'professionalBackground', 'billingInformation', 'documentUploads', 'marketplace', 'account'];
          const targetTabIndex = matchingStep?.highlightTab ? extTabOrder.indexOf(matchingStep.highlightTab) : -1;
          const maxTabIndex = extTabOrder.indexOf(maxAccessedProfileTab);
          let canAccessMatchingTab = targetTabIndex === -1 || maxTabIndex === -1 || targetTabIndex <= maxTabIndex;

          if (targetTabIndex !== -1 && maxTabIndex !== -1 && targetTabIndex > maxTabIndex) {
            setMaxAccessedProfileTab(matchingStep.highlightTab);
            canAccessMatchingTab = true;
          }

          // Only sync if:
          // 1. There's a matching step
          // 2. It's different from current step
          // 3. We're not busy
          // 4. We haven't just synced to this step in the last 500ms (prevent rapid cycles)
          // 5. The tab is accessible
          const now = Date.now();
          const lastSyncKey = `${matchingStepIndex}_${currentPath}`;
          const lastSyncTime = syncTimestampRef.current[lastSyncKey] || 0;
          const timeSinceLastSync = now - lastSyncTime;

          if (matchingStepIndex !== -1 &&
            matchingStepIndex !== currentStep &&
            !isBusy &&
            timeSinceLastSync > 500 &&
            canAccessMatchingTab) {

            // Prevent reverting if current step is a continuation on the same page
            if (matchingStepIndex < currentStep) {
              let isContinuation = true;
              // Check if any step between matchingStepIndex+1 and currentStep has a navigationPath
              // If so, it means we should have navigated, so we are not in a continuation
              for (let k = matchingStepIndex + 1; k <= currentStep; k++) {
                if (steps[k] && steps[k].navigationPath) {
                  isContinuation = false;
                  break;
                }
              }
              if (isContinuation) {
                console.log('[TutorialContext] Skipping auto-sync backwards: step is continuation', { matchingStepIndex, currentStep });
                return;
              }
            }

            syncTimestampRef.current[lastSyncKey] = now;
            safelyUpdateTutorialState([
              [setCurrentStep, matchingStepIndex]
            ], async () => {
              await saveTutorialProgress(activeTutorial, matchingStepIndex);
            });
            return;
          } else if (matchingStepIndex !== -1 && timeSinceLastSync <= 500) {
          }
        }
      } catch (err) {
        console.error('[TutorialContext] Error syncing tutorial step:', err);
      }

      if (!isProfilePath(path)) {
        const isTutorialMarketplaceTarget = isTutorialActive && stepData?.highlightSidebarItem === 'marketplace' && path.includes('/marketplace');

        // If team access, allow navigation and show access popup ONLY if navigating to marketplace
        if (accessLevelChoice === 'team') {
          if (path.includes('/marketplace')) {
            if (isTutorialMarketplaceTarget) {
              return;
            }
            setAllowAccessLevelModalClose(true);
            setShowAccessLevelModal(true);
            return;
          }
          // Allow navigation to other tabs (overview, calendar, etc.) without redirecting back to profile
          return;
        }

        // If full access and past first step, show Access Level popup ONLY if navigating to marketplace
        if (accessLevelChoice === 'full' && currentStep >= 1) {
          if (path.includes('/marketplace')) {
            if (isTutorialMarketplaceTarget) {
              return;
            }
            setAllowAccessLevelModalClose(true);
            setShowAccessLevelModal(true);
            return;
          }
          // Allow navigation to other tabs
          return;
        }

        // No access mode set - redirect back to profile
        // Workspace is already in the path
        const workspaceId = selectedWorkspace?.id || 'personal';
        const profileUrl = `/dashboard/${workspaceId}/profile`;
        navigate(profileUrl);
      }
      return;
    }

    // Case B: Dashboard Intro Tutorial
    if (activeTutorial === TUTORIAL_IDS.DASHBOARD) {
      const normalizedPath = normalizePathForComparison(path);
      const isOverview = normalizedPath.includes('/overview') || path.includes('/overview');
      const isProfile = isProfilePath(path);
      const isSharedFeature = path.includes('/messages') || path.includes('/calendar') || path.includes('/contracts');

      // CRITICAL: Allow profile and shared features (messages, calendar, contracts) during dashboard tutorial
      // This check must happen FIRST to prevent unwanted redirects
      if (isProfile || isSharedFeature) {
        // If user navigates to profile, complete the dashboard tutorial since that's the goal
        if (isProfile && currentStep >= 3) {
          completeTutorial();
        }
        // Explicitly return early to prevent any redirects for shared features
        return;
      }

      // Steps before "Navigate to Profile" (Step 3) -> Must stay on Overview
      if (currentStep < 3) {
        if (!isOverview) {
          // Workspace is already in the path
          const workspaceId = selectedWorkspace?.id || 'personal';
          const dashboardUrl = `/dashboard/${workspaceId}/overview`;
          navigate(dashboardUrl);
        }
      } else {
        // Step 3+ but not on profile, overview, or shared features - redirect to dashboard
        if (!isOverview && !isProfile && !isSharedFeature) {
          // Workspace is already in the path
          const workspaceId = selectedWorkspace?.id || 'personal';
          const dashboardUrl = `/dashboard/${workspaceId}/overview`;
          navigate(dashboardUrl);
        }
      }
      return;
    }
  }, [isTutorialActive, tutorialPassed, isBusy, activeTutorial, currentStep, location.pathname, navigate, isInDashboard, showWarning, completeTutorial, maxAccessedProfileTab, showAccessLevelModal]);


  const value = {
    // State
    currentStep,
    activeTutorial,
    isTutorialActive,
    showFirstTimeModal,
    showTutorialSelectionModal,
    showAccessLevelModal,
    allowAccessLevelModalClose,
    showStopTutorialConfirm,
    completedTutorials,
    stepData,
    elementPosition,
    isBusy,
    isPaused,
    isWaitingForSave,
    isReady,
    sidebarWidth, // Expose sidebar width for overlay components
    onboardingType, // 'professional' or 'facility'
    maxAccessedProfileTab,

    // Tutorial steps data
    tutorialSteps,

    // Action functions
    startTutorial,
    startAllTutorials, // Start complete tutorial sequence from dashboard
    skipFirstTimeModal,
    skipTutorial,
    stopTutorial, // Stop tutorial without marking as completed (clears Firestore)
    nextStep,
    prevStep,
    completeTutorial,
    resetTutorialState,
    navigateToFeature,
    restartOnboarding,
    startFacilityOnboarding, // Start facility onboarding specifically
    pauseTutorial,
    resumeTutorial,
    setShowFirstTimeModal,
    setShowTutorialSelectionModal, // Control tutorial selection modal
    setShowAccessLevelModal, // Control access level modal
    setAllowAccessLevelModalClose, // Control whether access level modal can be closed
    setShowStopTutorialConfirm, // Control stop tutorial confirmation modal
    setOnboardingType, // Allow changing onboarding type
    setWaitingForSave,
    onTabCompleted,
    syncProfileInitialState,
    isSidebarItemAccessible,
    forceUpdateElementPosition, // Allow manual position refresh
    registerValidation,
    validationRef,
    showWarning,
    showError,
    accessLevelChoice,
    setAccessMode,
    setMaxAccessedProfileTab,
    resetProfileTabAccess
  };

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
};

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
};

TutorialProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export default TutorialContext;