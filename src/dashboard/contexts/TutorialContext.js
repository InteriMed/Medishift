import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp, collection } from 'firebase/firestore';
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
  getTutorialSteps,
  getMandatoryTutorials,
  getNextTutorial,
  getProfileTutorialForType,
  isProfileTutorial,
  ONBOARDING_TYPES
} from '../../config/tutorialSystem';
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
      return saved || 'personalDetails';
    } catch (error) {
      console.error('[TutorialContext] Error loading maxAccessedProfileTab from localStorage:', error);
      return 'personalDetails';
    }
  });

  // Save maxAccessedProfileTab to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(LOCALSTORAGE_KEYS.TUTORIAL_MAX_ACCESSED_PROFILE_TAB, maxAccessedProfileTab);
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

  // Auto-detect onboardingType based on selectedWorkspace
  useEffect(() => {
    if (selectedWorkspace) {
      const newType = selectedWorkspace.type === WORKSPACE_TYPES.TEAM ? 'facility' : 'professional';
      if (newType !== onboardingType) {
        setOnboardingType(newType);
      }
    }
  }, [selectedWorkspace, onboardingType]);

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
          
          // NEW SCHEMA: tutorialAccessMode stores the access level choice ('team', 'full', 'loading')
          // OLD SCHEMA: tutorialAccessMode stores tutorial enabled/disabled state ('enabled', 'disabled')
          // Handle both cases:
          if (savedAccessMode === 'team' || savedAccessMode === 'full' || savedAccessMode === 'loading') {
            if (savedAccessMode !== accessLevelChoice) {
              setAccessLevelChoice(savedAccessMode);
            }
          } else if (savedAccessMode === 'enabled' || savedAccessMode === 'disabled') {
            // OLD SCHEMA DETECTED - migrate by defaulting to 'loading' (user needs to make choice)
            setAccessLevelChoice('loading');
          } else if (!savedAccessMode) {
            // Default to 'loading' if nothing is saved in DB
            setAccessLevelChoice('loading');
          }
        } else {
          // If profile doc doesn't exist yet, default to 'loading'
          setAccessLevelChoice('loading');
        }
      } catch (error) {
        console.error("[TutorialContext] Error loading accessLevelChoice:", error);
      }
    };

    loadAccessMode();
  }, [currentUser, onboardingType]); // Removed accessLevelChoice from dependency to avoid loops

  // Track sidebar width for overlay positioning
  const sidebarWidth = isMainSidebarCollapsed ? 70 : 256;

  // Ref to store startTutorial function to avoid circular dependency
  const startTutorialRef = useRef(null);

  // Ref to store updateElementPosition function to allow manual position refresh
  const updateElementPositionRef = useRef(null);

  // Ref to track tutorials that are currently being completed
  // This prevents checkTutorialStatus from restoring a tutorial that is in the process of being completed
  // (solves the race condition where Firestore write hasn't finished yet)
  const completingTutorialRef = useRef(null);

  // Ref to track the last restored state to prevent duplicate restorations
  const lastRestoredStateRef = useRef({ tutorial: null, step: null });

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

      await updateDoc(profileDocRef, updates);
    } catch (error) {
      console.error('Error saving tutorial progress:', error);
    }
  }, [currentUser, onboardingType]);

  // Start tutorial for a specific feature
  const startTutorial = useCallback(async (feature) => {
    // Clear restoration ref to allow fresh start
    lastRestoredStateRef.current = { tutorial: null, step: null };

    // Prevent starting if already busy with another operation
    if (isBusy) {
      return;
    }

    setIsBusy(true);

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
    let startStep = 0;
    if (currentUser) {
      try {
        const profileCollection = onboardingType === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
        const profileDocRef = doc(db, profileCollection, currentUser.uid);
        const profileDoc = await getDoc(profileDocRef);

        if (profileDoc.exists()) {
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

    // Reset maxAccessedProfileTab when starting profile tutorials
    if (isProfileTutorial(feature)) {
      setMaxAccessedProfileTab(PROFILE_TAB_IDS.PERSONAL_DETAILS);
      try {
        localStorage.setItem(LOCALSTORAGE_KEYS.TUTORIAL_MAX_ACCESSED_PROFILE_TAB, 'personalDetails');
      } catch (error) {
        console.error('[TutorialContext] Error resetting maxAccessedProfileTab in localStorage:', error);
      }
      
      // Set initial access mode to 'loading' when starting profile tutorial (if not already set to team/full)
      if (!accessLevelChoice || accessLevelChoice === null || accessLevelChoice === 'loading') {
        setAccessLevelChoice('loading');
        // Don't save 'loading' to Firestore - it's a temporary state
      }
    }

    // Proceed with starting the tutorial
    safelyUpdateTutorialState([
      [setActiveTutorial, feature],
      [setCurrentStep, startStep],
      [setIsTutorialActive, true],
      [setShowFirstTimeModal, false]
    ], async () => {
      await saveTutorialProgress(feature, startStep);
    });
    setIsBusy(false);
  }, [isBusy, safelyUpdateTutorialState, currentUser, saveTutorialProgress, completedTutorials, accessLevelChoice, onboardingType]);

  // Store startTutorial in ref for use in useEffect
  useEffect(() => {
    startTutorialRef.current = startTutorial;
  }, [startTutorial]);

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
                }).catch(err => {});
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

          // MANDATORY: Automatic start of tutorial if onboarding is done but tutorial isn't
          if (onboardingCompleted || isVerifiedProfile) {
            const isTutorialCompletedForAccount = typeProgress.completed === true;

            // Skip auto-start on account/settings tabs - these are end-of-tutorial tabs
            // User navigating there intentionally shouldn't trigger a restart
            const currentTab = location.pathname.split('/').pop();
            const isOnAccountOrSettings = currentTab === 'account' || currentTab === 'settings';

            if (!isTutorialCompletedForAccount && !isTutorialActive && !showFirstTimeModal && !isOnAccountOrSettings) {

              // Determine which tutorial to start based on what's already completed
              const completedInType = typeProgress.tutorials || {};
              const profileTutorialName = getProfileTutorialForType(onboardingType);

              if (!completedInType[TUTORIAL_IDS.PROFILE_TABS]?.completed && !completedInType[TUTORIAL_IDS.FACILITY_PROFILE_TABS]?.completed) {
                startTutorial(profileTutorialName);
              } else if (!completedInType[TUTORIAL_IDS.DASHBOARD]?.completed) {
                startTutorial(TUTORIAL_IDS.DASHBOARD);
              } else {
                // If core ones are done but the account isn't marked as complete, do it now or start the next one in sequence
                const remainingTutorials = [TUTORIAL_IDS.MESSAGES, TUTORIAL_IDS.CONTRACTS, TUTORIAL_IDS.CALENDAR, TUTORIAL_IDS.MARKETPLACE, TUTORIAL_IDS.SETTINGS];
                const nextFeature = remainingTutorials.find(f => !completedInType[f]?.completed);
                if (nextFeature) {
                  startTutorial(nextFeature);
                } else {
                  // Mark everything as complete
                  const profileCollection = onboardingType === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
                  const profileDocRef = doc(db, profileCollection, currentUser.uid);
                  await updateDoc(profileDocRef, {
                    [`tutorialProgress.${onboardingType}.completed`]: true,
                    updatedAt: serverTimestamp()
                  });
                }
              }
              return;
            }
          }

          // Only check and update if we're in dashboard and tutorial hasn't been passed
          if (isInDashboard && !tutorialPassed) {
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

    lastRestoredStateRef.current = { tutorial: null, step: null };
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

    return true;
  }, [isBusy, isTutorialActive, showFirstTimeModal, activeTutorial, completedTutorials, accessLevelChoice, safelyUpdateTutorialState, currentUser, onboardingType]);

  // Pause the tutorial when next tooltip targets an inaccessible page/tab
  // (e.g., tab locked due to missing validation/information)
  // Tutorial remains active but paused until validation state allows continuation
  const pauseTutorial = useCallback(() => {
    if (isBusy) {
      return;
    }

    safelyUpdateTutorialState([
      [setIsPaused, true],
      [setShowFirstTimeModal, false]
    ]);
  }, [isBusy, safelyUpdateTutorialState]);

  // Resume the tutorial when validation state allows continuation
  // (e.g., tab becomes accessible after required information is provided)
  const resumeTutorial = useCallback(() => {
    if (isBusy) {
      return;
    }

    // Simply unpause - tutorial is already active, just resume from current step
    safelyUpdateTutorialState([
      [setIsPaused, false]
    ]);
  }, [isBusy, safelyUpdateTutorialState]);

  // Restart the onboarding flow (Smart Restart)
  const restartOnboarding = useCallback(async (type = 'professional') => {
    if (isBusy || !currentUser) return;

    if (isTutorialActive || showFirstTimeModal) {
      const stopped = await stopTutorial();
      if (!stopped) return;
      return;
    }

    // Set the onboarding type
    setOnboardingType(type);

    // Check if user is already verified/onboarded for this type
    try {
      const profileCollection = type === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
      const profileDocRef = doc(db, profileCollection, currentUser.uid);
      const profileDoc = await getDoc(profileDocRef);

      let isTypeCompleted = false;
      if (profileDoc.exists()) {
        const data = profileDoc.data();
        const tutorialAccessMode = data.tutorialAccessMode || 'loading';
        isTypeCompleted = tutorialAccessMode === 'enabled' || tutorialAccessMode === 'disabled';

        if (type === 'professional') {
          const bypassedGLN = data.bypassedGLN === true && data.GLN_certified === false;
          isTypeCompleted = isTypeCompleted || !!data.GLN_certified || bypassedGLN;
        }
      }

      if (isTypeCompleted) {
        const firstTutorial = getProfileTutorialForType(type);
        startTutorial(firstTutorial);
      } else {
        const lang = i18n.language || 'fr';
        navigate(`/${lang}/onboarding?type=${type}`);
      }
    } catch (e) {
      console.error("Error checking status for restart:", e);
      // Fallback to onboarding page
      const lang = i18n.language || 'fr';
      navigate(`/${lang}/onboarding?type=${onboardingType}`);
    }
  }, [isBusy, safelyUpdateTutorialState, currentUser, startTutorial, isTutorialActive, showFirstTimeModal, onboardingType]);

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

  // AUTO-RESTART TUTORIAL ON URL CHANGE
  useEffect(() => {
    if (!isInDashboard) {
      return;
    }

    if (isBusy || isDashboardLoading || !currentUser) {
      return;
    }

    const currentPath = location.pathname;
    const lastPath = lastPathnameRef.current;

    if (currentPath === lastPath) {
      return;
    }

    lastPathnameRef.current = currentPath;

    const normalizedPath = normalizePathForComparison(currentPath);
    const feature = extractFeatureFromPath(normalizedPath);

    const getTutorialForFeature = (featureName) => {
      if (isProfilePath(normalizedPath)) {
        return getProfileTutorialForType(onboardingType);
      }

      const featureToTutorialMap = {
        'overview': TUTORIAL_IDS.DASHBOARD,
        'messages': TUTORIAL_IDS.MESSAGES,
        'contracts': TUTORIAL_IDS.CONTRACTS,
        'calendar': TUTORIAL_IDS.CALENDAR,
        'marketplace': TUTORIAL_IDS.MARKETPLACE,
        'payroll': TUTORIAL_IDS.PAYROLL,
        'organization': TUTORIAL_IDS.ORGANIZATION,
        'settings': TUTORIAL_IDS.SETTINGS
      };

      return featureToTutorialMap[featureName] || null;
    };

    const tutorialForRoute = getTutorialForFeature(feature);

    if (!tutorialForRoute) {
      return;
    }

    const isCurrentlyInThisTutorial = isTutorialActive && activeTutorial === tutorialForRoute;
    const isProfileTutorialRoute = isProfileTutorial(tutorialForRoute);
    const wasProfileTutorialRoute = isProfilePath(normalizePathForComparison(lastPath));

    if (isCurrentlyInThisTutorial) {
      if (isProfileTutorialRoute && wasProfileTutorialRoute) {
        return;
      }
      return;
    }

    // CRITICAL: Don't restart profile tutorial when navigating between profile tabs
    // Even if isTutorialActive is temporarily false, if activeTutorial is a profile tutorial
    // and we're on a profile path, don't restart - just let the state restoration handle it
    if (isProfileTutorialRoute && wasProfileTutorialRoute && isProfileTutorial(activeTutorial)) {
      return;
    }

    // Also skip restart for account/settings tabs - these are end-of-tutorial tabs
    const currentTab = currentPath.split('/').pop();
    if (isProfileTutorialRoute && (currentTab === 'account' || currentTab === 'settings')) {
      return;
    }

    if (startTutorialRef.current) {
      setTimeout(() => {
        if (startTutorialRef.current) {
          startTutorialRef.current(tutorialForRoute);
        }
      }, 300);
    }
  }, [location.pathname, isInDashboard, isBusy, isDashboardLoading, currentUser, isTutorialActive, activeTutorial, onboardingType]);


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
          'account': 4,
          'settings': 5
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

        // For account/settings tabs, don't force sync back - just allow being there
        // This prevents the tutorial from restarting when clicking these tabs
        if (currentTab === 'account' || currentTab === 'settings') {
          return;
        }

        if (expectedStep !== undefined && expectedStep !== currentStep && !showAccessLevelModal) {
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
          return;
        }
      }
      
      if (steps && steps[currentStep]) {
        let currentStepData = { ...steps[currentStep] };

        // PAUSE CHECK: If step targets an inaccessible tab, pause tutorial
        if (isProfileTutorial(activeTutorial) && currentStepData.highlightTab) {
          const tabOrder = ['personalDetails', 'professionalBackground', 'billingInformation', 'documentUploads'];
          const targetTabIndex = tabOrder.indexOf(currentStepData.highlightTab);
          const maxTabIndex = tabOrder.indexOf(maxAccessedProfileTab);
          
          if (targetTabIndex !== -1 && maxTabIndex !== -1) {
            // If target tab is ahead of max accessed tab, pause until validation unlocks it
            if (targetTabIndex > maxTabIndex && !isPaused) {
              console.log('[TutorialContext] Pausing tutorial: target tab ahead of max accessed', { targetTabIndex, maxTabIndex });
              pauseTutorial();
            }
            // If target tab is now accessible and tutorial is paused, resume
            else if (targetTabIndex <= maxTabIndex && isPaused) {
              console.log('[TutorialContext] Resuming tutorial: target tab now accessible', { targetTabIndex, maxTabIndex });
              resumeTutorial();
            }
          }
        }

        // Check if step requires a specific page
        const requiredPath = currentStepData.navigationPath || currentStepData.requiredPage;
        if (requiredPath) {
          // Normalize both paths to remove language prefixes for comparison
          const normalizeForComparison = (path) => {
            // Remove language prefix (e.g., /en/, /fr/, /de/, /it/)
            return path.replace(/^\/(en|fr|de|it)\//, '/');
          };

          const currentPath = location.pathname;
          const normalizedCurrentPath = normalizeForComparison(currentPath);
          const normalizedRequiredPath = normalizeForComparison(requiredPath);

          let isOnCorrectPage = false;

          if (normalizedRequiredPath === normalizedCurrentPath) {
            isOnCorrectPage = true;
          } else if (normalizedCurrentPath.startsWith(normalizedRequiredPath + '/')) {
            isOnCorrectPage = true;
          } else if (normalizedRequiredPath === '/dashboard/overview') {
            if (normalizedCurrentPath === '/dashboard' || normalizedCurrentPath === '/dashboard/' || normalizedCurrentPath.startsWith('/dashboard/overview')) {
              isOnCorrectPage = true;
            }
          } else if (normalizedRequiredPath.includes('/profile') && /\/dashboard\/[^/]*\/profile|\/dashboard\/profile/.test(normalizedCurrentPath)) {
            const requiredTab = currentStepData.requiredTab || currentStepData.highlightTab;

            // Allow tab navigation without hiding tutorial for tab-targeted steps
            // This ensures the overlay stays on the target tab button even if user navigates to another tab
            // Also allow Auto Fill button overlay to display regardless of active tab
            if (currentStepData.highlightTab || currentStepData.highlightUploadButton) {
              isOnCorrectPage = true;
            } else if (requiredTab) {
              const currentTab = normalizedCurrentPath.split('/').pop();
              if (currentTab === requiredTab || normalizedCurrentPath.endsWith(`/${requiredTab}`)) {
                isOnCorrectPage = true;
              } else if (normalizedCurrentPath.includes('/profile') && !normalizedCurrentPath.split('/profile/')[1] && requiredTab === 'personalDetails') {
                isOnCorrectPage = true;
              }
            } else {
              isOnCorrectPage = true;
            }
          }

          // Dynamic Override: If user is in profile tutorial but NOT on profile page,
          // highlight the sidebar item to guide them back.
          if (isProfileTutorial(activeTutorial) && !isOnCorrectPage) {
            currentStepData = {
              ...currentStepData,
              targetSelector: 'a[href="/dashboard/profile"]',
              highlightSidebarItem: 'profile',
              highlightTab: null,
              requiredTab: null,
              tooltipPosition: { top: '150px', left: 'calc(250px + 20px)' }
            };
          }
        } else {
          // Dynamic Override: If user is in profile tutorial but NOT on profile page,
          // highlight the sidebar item to guide them back.
          const isOnProfilePage = /\/dashboard\/[^/]*\/profile|\/dashboard\/profile/.test(location.pathname);
          if (isProfileTutorial(activeTutorial) && !isOnProfilePage) {
            currentStepData = {
              ...currentStepData,
              targetSelector: 'a[href="/dashboard/profile"]',
              highlightSidebarItem: 'profile',
              highlightTab: null,
              requiredTab: null,
              tooltipPosition: { top: '150px', left: 'calc(250px + 20px)' }
            };
          }
        }

        setStepData(currentStepData);
      } else {
        setStepData(null);
      }
    } else {
      setStepData(null);
    }
  }, [currentStep, activeTutorial, isTutorialActive, location.pathname, showAccessLevelModal, maxAccessedProfileTab, isPaused, pauseTutorial, resumeTutorial]);

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
            }

            if (currentIndex !== -1 && currentIndex < mandatoryOnboardingTutorials.length - 1) {
              let nextFeature = mandatoryOnboardingTutorials[currentIndex + 1];
              
              // After profile completion, access mode is now 'full', so don't skip marketplace
              // Only skip marketplace if user completed profile with team mode AND didn't upgrade
              const shouldSkipMarketplace = !isProfileTutorial(previousTutorial) && 
                                           accessLevelChoice === 'team' && 
                                           nextFeature === TUTORIAL_IDS.MARKETPLACE;
              
              if (shouldSkipMarketplace) {
                const nextIndex = mandatoryOnboardingTutorials.indexOf(TUTORIAL_IDS.MARKETPLACE) + 1;
                if (nextIndex < mandatoryOnboardingTutorials.length) {
                  nextFeature = mandatoryOnboardingTutorials[nextIndex];
                } else {
                  nextFeature = null;
                }
              }
              
              if (nextFeature) {
                setTimeout(() => {
                  if (startTutorialRef.current) {
                    startTutorialRef.current(nextFeature);
                  }
                }, 500);
              }
            } else {
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

    // Handle special action: start_next_tutorial (standardized chaining)
    if (stepData?.actionButton?.action?.startsWith('start_') && stepData?.actionButton?.action?.endsWith('_tutorial')) {
      const targetTutorial = stepData.actionButton.action.replace('start_', '').replace('_tutorial', '');

      // Complete current tutorial
      completeTutorial();

      // Start target tutorial after small delay
      setTimeout(() => {
        if (startTutorialRef.current) {
          startTutorialRef.current(targetTutorial);
        }
      }, 500);

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
    lastRestoredStateRef.current = { tutorial: null, step: null };

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

    setAccessLevelChoice(mode);
    setShowAccessLevelModal(false);
    setAllowAccessLevelModalClose(false);

    // 'loading' is a temporary state - don't save to Firestore, just close popup
    if (mode === 'loading') {
      return;
    }

    try {
      // Determine the profile collection based on onboarding type
      const profileCollection = onboardingType === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
      const profileRef = doc(db, profileCollection, currentUser.uid);

      await updateDoc(profileRef, {
        tutorialAccessMode: mode,
        updatedAt: serverTimestamp()
      });


      if (mode === 'team') {
        // Team mode: Mark profile as complete and skip to dashboard tutorials

        await updateDoc(profileRef, {
          tutorialAccessMode: 'enabled'
        });

        // Mark the profile tabs tutorial as completed in Firestore BEFORE calling completeTutorial
        // This prevents checkTutorialStatus from restoring it
        const tutorialName = getProfileTutorialForType(onboardingType);
        const progressPath = `tutorialProgress.${onboardingType}.tutorials.${tutorialName}`;

        await updateDoc(profileRef, {
          [`${progressPath}.completed`]: true,
          [`tutorialProgress.${onboardingType}.activeTutorial`]: null,
          [`completedTutorials.${tutorialName}`]: true,
          updatedAt: serverTimestamp()
        });

        // Update local state immediately to prevent restoration
        setCompletedTutorials(prev => ({
          ...prev,
          [tutorialName]: true
        }));

        // Team access: Stop tutorial instead of chaining to next tutorial
        // User selected team access, so they want to skip the full tutorial flow
        await safelyUpdateTutorialState([
          [setIsTutorialActive, false],
          [setActiveTutorial, getProfileTutorialForType(onboardingType)],
          [setCurrentStep, 0]
        ]);
      } else {
        // Full mode: User selected to continue with full access
        // Don't automatically advance to step 2
        // User will click on the tab themselves
      }
    } catch (error) {
    }
  }, [currentUser, onboardingType, completeTutorial, nextStep, activeTutorial, currentStep, safelyUpdateTutorialState, saveTutorialProgress]);

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

      const professionalTabOrder = ['personalDetails', 'professionalBackground', 'billingInformation', 'documentUploads'];
      const tabIndex = professionalTabOrder.indexOf(tabId);
      const currentMaxIndex = professionalTabOrder.indexOf(maxAccessedProfileTab);
      
      // RULE: When a tab is completed, unlock the next tab
      if (tabIndex === currentMaxIndex && tabIndex < professionalTabOrder.length - 1) {
        const nextTab = professionalTabOrder[tabIndex + 1];
        
        console.log('[TutorialContext] Unlocking next tab:', nextTab);
        setMaxAccessedProfileTab(nextTab);
        
        // RESUME: If tutorial was paused waiting for this tab to become accessible, resume now
        if (isPaused) {
          setTimeout(() => {
            const currentStepData = tutorialSteps[activeTutorial]?.[currentStep];
            if (currentStepData?.highlightTab === nextTab) {
              console.log('[TutorialContext] Resuming tutorial after tab unlock');
              resumeTutorial();
            }
          }, 100);
        }
      }

      // Clear waiting state immediately
      setIsWaitingForSave(false);

      // Show AccessLevelChoicePopup when completing Personal Details for first time (only once)
      if (activeTutorial === TUTORIAL_IDS.PROFILE_TABS && tabId === PROFILE_TAB_IDS.PERSONAL_DETAILS) {
        const popupShownKey = LOCALSTORAGE_KEYS.POPUP_SHOWN(`accessLevelPopup_${currentUser?.uid}_personalToProf`);
        const wasShown = localStorage.getItem(popupShownKey);
        const isChoiceAlreadyMade = accessLevelChoice === 'loading' || accessLevelChoice === 'team' || accessLevelChoice === 'full';
        
        // ONLY show popup if accessLevelChoice is NOT already set to 'loading', 'team', or 'full'
        if (!wasShown && !isChoiceAlreadyMade) {
          localStorage.setItem(popupShownKey, 'true');
          setAllowAccessLevelModalClose(false);
          setShowAccessLevelModal(true);
          return;
        } else {
          
          // Automatically set accessLevelChoice to loading if it's not already set
          if (!isChoiceAlreadyMade) {
            setAccessMode('loading');
          }
        }
      }

      // URL-based sync will handle step advancement automatically
    }
  }, [isTutorialActive, activeTutorial, setAllowAccessLevelModalClose, setShowAccessLevelModal, maxAccessedProfileTab, isPaused, resumeTutorial, currentStep]);

  // Check if a sidebar item should be accesssible during onboarding
  const isSidebarItemAccessible = useCallback((itemPath) => {
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

    const tutorialOrder = ['overview', 'profile', TUTORIAL_IDS.MESSAGES, TUTORIAL_IDS.CONTRACTS, TUTORIAL_IDS.CALENDAR, TUTORIAL_IDS.MARKETPLACE, TUTORIAL_IDS.PAYROLL, TUTORIAL_IDS.ORGANIZATION, TUTORIAL_IDS.SETTINGS];
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

  }, [activeTutorial, completedTutorials, tutorialPassed, showFirstTimeModal, accessLevelChoice, selectedWorkspace]);

  // Route guard: Enforce strict navigation during mandatory onboarding
  useEffect(() => {
    // 1. Safety & Exemption Checks
    if (!isInDashboard) return; // Allow navigation outside dashboard (e.g. login)
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

    // Pause allows temporary deviation (e.g. file upload or help)
    if (isPaused || isBusy) return;

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

                // Only sync if:
                // 1. There's a matching step
                // 2. It's different from current step
                // 3. We're not busy
                // 4. We haven't just synced to this step in the last 500ms (prevent rapid cycles)
                const now = Date.now();
                const lastSyncKey = `${matchingStepIndex}_${currentPath}`;
                const lastSyncTime = syncTimestampRef.current[lastSyncKey] || 0;
                const timeSinceLastSync = now - lastSyncTime;

                if (matchingStepIndex !== -1 &&
                  matchingStepIndex !== currentStep &&
                  !isBusy &&
                  timeSinceLastSync > 500) {
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
              // If team access, allow navigation and show access popup ONLY if navigating to marketplace
              if (accessLevelChoice === 'team') {
                if (path.includes('/marketplace')) {
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
        const isOverview = path.includes('/overview');
        const isProfile = isProfilePath(path);
        const isSharedFeature = path.includes('/messages') || path.includes('/calendar') || path.includes('/contracts');

        // Allow profile and shared features (messages, calendar, contracts) during dashboard tutorial
        if (isProfile || isSharedFeature) {
          // If user navigates to profile, complete the dashboard tutorial since that's the goal
          if (isProfile && currentStep >= 3) {
            completeTutorial();
          }
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
  }, [isTutorialActive, tutorialPassed, isPaused, isBusy, activeTutorial, currentStep, location.pathname, navigate, isInDashboard, showWarning, completeTutorial]);


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