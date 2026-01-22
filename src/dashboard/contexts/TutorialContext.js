import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp, collection } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { tutorialSteps } from '../tutorial/tutorialSteps';
import { useDashboard } from './DashboardContext';
import { useSidebar } from './SidebarContext';
import { debounce } from '../../utils/debounce';
import i18n from '../../i18n';
import { WORKSPACE_TYPES } from '../../utils/sessionAuth';

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

  // Refs for preventing infinite loops
  const syncTimestampRef = useRef({});
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [activeTutorial, setActiveTutorial] = useState('dashboard');
  const [currentStep, setCurrentStep] = useState(0);
  const [stepData, setStepData] = useState(null);
  const [elementPosition, setElementPosition] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isWaitingForSave, setIsWaitingForSave] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Access mode: 'full' (complete all profile tabs) or 'team' (quick team access)
  const [accessMode, setAccessModeState] = useState(null);

  // Dual onboarding type: 'professional' or 'facility'
  // Automatically determined based on selectedWorkspace
  const [onboardingType, setOnboardingType] = useState('professional');

  // MAX ACCESSED TAB FOR PROFILE TUTORIAL - Load from localStorage
  const [maxAccessedProfileTab, setMaxAccessedProfileTab] = useState(() => {
    try {
      const saved = localStorage.getItem('tutorial_maxAccessedProfileTab');
      return saved || 'personalDetails';
    } catch (error) {
      console.error('[TutorialContext] Error loading maxAccessedProfileTab from localStorage:', error);
      return 'personalDetails';
    }
  });

  // Save maxAccessedProfileTab to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('tutorial_maxAccessedProfileTab', maxAccessedProfileTab);
      console.log('[TutorialContext] Saved maxAccessedProfileTab to localStorage:', maxAccessedProfileTab);
    } catch (error) {
      console.error('[TutorialContext] Error saving maxAccessedProfileTab to localStorage:', error);
    }
  }, [maxAccessedProfileTab]);

  // Debug: Log when accessMode changes
  useEffect(() => {
    console.log("[TutorialContext] accessMode changed to:", accessMode);
  }, [accessMode]);

  // Auto-detect onboardingType based on selectedWorkspace
  useEffect(() => {
    if (selectedWorkspace) {
      const newType = selectedWorkspace.type === WORKSPACE_TYPES.TEAM ? 'facility' : 'professional';
      if (newType !== onboardingType) {
        console.log(`[TutorialContext] Auto-detecting onboardingType: ${newType} (workspace: ${selectedWorkspace.type})`);
        setOnboardingType(newType);
      }
    }
  }, [selectedWorkspace, onboardingType]);

  // Load accessMode from profile document when tutorial starts or profile changes
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
          console.log("[TutorialContext] Loading accessMode - saved:", savedAccessMode, "current:", accessMode);
          if (savedAccessMode && savedAccessMode !== accessMode) {
            console.log("[TutorialContext] Loaded accessMode from profile:", savedAccessMode);
            setAccessModeState(savedAccessMode);
          } else if (!savedAccessMode && !accessMode) {
            console.log("[TutorialContext] No tutorialAccessMode found - setting to 'loading' (pending choice)");
            setAccessModeState('loading');
          }
        }
      } catch (error) {
        console.error("[TutorialContext] Error loading accessMode:", error);
      }
    };

    loadAccessMode();
  }, [currentUser, onboardingType, accessMode]);

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

  // Add a utility function to safely update tutorial state
  const safelyUpdateTutorialState = useCallback(async (updates = [], callback = null) => {
    // Set busy flag to prevent concurrent updates
    setIsBusy(true);
    console.log("[TutorialContext] Setting busy flag");

    // Auto-clear busy flag after 10 seconds to prevent deadlock
    const timeoutId = setTimeout(() => {
      console.error('[TutorialContext] Operation timeout - clearing busy flag');
      setIsBusy(false);
      showWarning?.('Tutorial operation timed out. Please try again.');
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
      console.log("[TutorialContext] Clearing busy flag (success)");
    } catch (error) {
      // Error - clear timeout and busy flag
      clearTimeout(timeoutId);
      console.error("[TutorialContext] Error updating state:", error);
      setIsBusy(false);
      console.log("[TutorialContext] Clearing busy flag (error)");
      showWarning?.('Tutorial error occurred. The tutorial has been reset.');
      throw error; // Re-throw to allow caller to handle
    }
  }, [showWarning]);

  // Reset all tutorial state to default values
  const resetTutorialState = useCallback(() => {
    safelyUpdateTutorialState([
      [setShowFirstTimeModal, false],
      [setIsTutorialActive, false],
      [setActiveTutorial, 'dashboard'],
      [setCurrentStep, 0]
    ]);
  }, [safelyUpdateTutorialState]);

  // Save tutorial progress to Firestore with granular tracking
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
      console.log(`[TutorialContext] Saved granular progress for ${tutorialName}:${currentStepId} in ${profileCollection}`);
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
      console.log('[TutorialContext] Tutorial is busy, ignoring start request');
      return;
    }

    setIsBusy(true);
    console.log('[TutorialContext] Starting tutorial for:', feature);

    // CRITICAL: Clear this tutorial from completed list (allows restarting completed tutorials)
    // This is an explicit restart, so we want to allow the user to view it again
    if (completedTutorials[feature]) {
      console.log(`[TutorialContext] Clearing completed status for ${feature} to allow restart`);
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
            // For profileTabs tutorial, ensure we start at step 0 (Personal Details) 
            // unless the tutorial was already completed
            const isCompleted = typeProgress.tutorials?.[feature]?.completed;
            if (feature === 'profileTabs' && !isCompleted && typeProgress.currentStepIndex === undefined) {
              startStep = 0;
              console.log('[TutorialContext] Starting fresh profileTabs tutorial at step 0');
            } else {
              startStep = savedStepIndex;
              console.log(`[TutorialContext] Resuming ${feature} at step ${startStep}`);
            }
          }
        }
      } catch (error) {
        console.error('Error loading tutorial progress:', error);
      }
    }

    // Reset maxAccessedProfileTab when starting profile tutorials
    if (feature === 'profileTabs' || feature === 'facilityProfileTabs') {
      console.log('[TutorialContext] Resetting maxAccessedProfileTab for profile tutorial restart');
      setMaxAccessedProfileTab('personalDetails');
      try {
        localStorage.setItem('tutorial_maxAccessedProfileTab', 'personalDetails');
      } catch (error) {
        console.error('[TutorialContext] Error resetting maxAccessedProfileTab in localStorage:', error);
      }
      
      // Set initial access mode to 'loading' when starting profile tutorial (if not already set to team/full)
      if (!accessMode || accessMode === null || accessMode === 'loading') {
        console.log('[TutorialContext] Setting initial accessMode to "loading" for profile tutorial (pending user choice)');
        setAccessModeState('loading');
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
  }, [isBusy, safelyUpdateTutorialState, currentUser, saveTutorialProgress, completedTutorials, accessMode, onboardingType]);

  // Store startTutorial in ref for use in useEffect
  useEffect(() => {
    startTutorialRef.current = startTutorial;
  }, [startTutorial]);

  // Start all tutorials from the beginning (dashboard)
  const startAllTutorials = useCallback(async () => {
    console.log('[TutorialContext] Starting all tutorials from dashboard');
    await startTutorial('dashboard');
  }, [startTutorial]);

  // Check if tutorial should be shown based on tutorial status
  useEffect(() => {
    const checkTutorialStatus = async () => {
      // Prevent running check while system is busy (e.g. completing a tutorial)
      if (isBusy) {
        console.log('[TutorialContext] System busy, skipping tutorial status check');
        return;
      }

      // CRITICAL: Strict early return if not in dashboard
      if (!isInDashboard) {
        console.log('[TutorialContext] Not in dashboard, strictly enforcing no tutorial actions.');
        setIsReady(true);
        return;
      }

      if (!currentUser) {
        setIsReady(true);
        return;
      }

      if (isDashboardLoading) {
        console.log('[TutorialContext] Dashboard is still loading, waiting for user data');
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

          // Check if onboarding is completed - BE ROBUST
          const onboardingProgress = userData.onboardingProgress || {};
          const professionalCompleted = onboardingProgress.professional?.completed === true;
          const facilityCompleted = onboardingProgress.facility?.completed === true;
          const legacyCompleted = userData.onboardingCompleted === true || onboardingProgress.completed === true;
          const onboardingStatusDone = userData.onboardingStatus === 'completed' || userData.onboardingStatus === 'done';
          const bypassedGLN = userData.bypassedGLN === true && userData.GLN_certified === false;

          const onboardingCompleted = professionalCompleted || facilityCompleted || legacyCompleted || onboardingStatusDone;
          const isVerifiedProfile = !!userData.GLN_certified || !!userData.isVerified || bypassedGLN;

          const isAdmin = !!(userData.adminData && userData.adminData.isActive !== false);
          
          console.log("[TutorialContext] Workspace status check details:", {
            uid: userData.uid,
            role: userData.role,
            onboardingCompleted,
            professionalCompleted,
            facilityCompleted,
            legacyCompleted,
            onboardingStatusDone,
            isVerifiedProfile,
            hasProfessionalProfile: userData.hasProfessionalProfile,
            hasFacilityProfile: userData.hasFacilityProfile,
            isAdmin
          });
          const hasProfessionalProfile = userData.hasProfessionalProfile;
          const hasFacilityProfile = userData.hasFacilityProfile;

          const hasEstablishedWorkspace = hasProfessionalProfile === true || hasFacilityProfile === true || isAdmin || onboardingCompleted;

          const isProfilePage = location.pathname.includes('/dashboard/profile');

          // Wait for flags only if we don't have enough info to determine if workspace exists
          if (!hasEstablishedWorkspace && (typeof hasProfessionalProfile !== 'boolean' || typeof hasFacilityProfile !== 'boolean')) {
            console.log("[TutorialContext] Waiting for profile flags to be ready...", { hasProf: hasProfessionalProfile, hasFac: hasFacilityProfile, onboardingCompleted });
            return;
          }

          if (!hasEstablishedWorkspace) {
            console.log("[TutorialContext] User has no established workspace. Redirecting to Onboarding Page.");
            // EXEMPT profile page - user might be completing it to establish workspace
            if (isInDashboard && !isProfilePage) {
              const lang = i18n.language || 'fr';
              navigate(`/${lang}/onboarding`);
            }
            return; // Stop here
          }

          // OPTIMIZATION: If workspace exists AND tutorial is already passed, skip the rest
          if (tutorialPassed && !isTutorialActive && !showFirstTimeModal) {
            console.log('[TutorialContext] Tutorial already passed, skipping rest of status check');
            setIsReady(true);
            return;
          }

          // PRIORITY CHECK 2: Workspace exists but Incomplete/Unverified
          if (!onboardingCompleted && !isVerifiedProfile && !isAdmin) {
            console.log("[TutorialContext] User not verified/completed and not an admin. Redirecting to Onboarding Page.");
            // EXEMPT profile page - user might be there to complete verification
            if (isInDashboard && !isProfilePage) {
              const lang = i18n.language || 'fr';
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
                console.log(`[TutorialContext] Tutorial '${savedTutorial}' is already active at step ${currentStep} (saved: ${savedStep}), skipping restoration.`);
                return;
              }
            }

            // CRITICAL FIX 1: Check if we are currently completing this tutorial
            if (completingTutorialRef.current === savedTutorial) {
              console.log(`[TutorialContext] Found saved tutorial '${savedTutorial}' but completion is in-flight. Ignoring restoration.`);
              return;
            }

            // CRITICAL FIX 2: Check if we just completed this tutorial locally
            if (completedTutorials[savedTutorial] === true || typeProgress.tutorials?.[savedTutorial]?.completed) {
              console.log(`[TutorialContext] Found saved tutorial '${savedTutorial}' but it is marked as completed. Ignoring restoration.`);

              if (isTutorialActive) {
                console.log(`[TutorialContext] Tutorial still active, forcing deactivation.`);
                setIsTutorialActive(false);
              }
              return;
            }

            // CRITICAL FIX: Check if tutorial is already passed for this account type
            if (typeProgress.completed) {
              console.log(`[TutorialContext] Tutorial for ${onboardingType} already completed, skipping restoration.`);

              // Clean up the stale activeTutorial field
              if (savedTutorial) {
                const profileCollection = onboardingType === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
                const profileRef = doc(db, profileCollection, currentUser.uid);
                updateDoc(profileRef, {
                  [`tutorialProgress.${onboardingType}.activeTutorial`]: null
                }).catch(err => console.error("Error clearing stale activeTutorial:", err));
              }
              return;
            }

            const savedStep = typeProgress.currentStepIndex || 0;

            // CRITICAL FIX 4: Check if we already restored this exact state
            if (lastRestoredStateRef.current.tutorial === savedTutorial &&
              lastRestoredStateRef.current.step === savedStep) {
              console.log(`[TutorialContext] Already restored ${savedTutorial}:${savedStep}, skipping redundant restoration.`);
              return;
            }

            console.log("[TutorialContext] Found in-progress tutorial, restoring state:", typeProgress);

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

            if (!isTutorialCompletedForAccount && !isTutorialActive && !showFirstTimeModal) {
              console.log(`[TutorialContext] Onboarding done but tutorial for ${onboardingType} not completed. Starting tutorial automatically.`);

              // Determine which tutorial to start based on what's already completed
              const completedInType = typeProgress.tutorials || {};

              if (!completedInType.dashboard?.completed) {
                startTutorial('dashboard');
              } else if (!completedInType.profileTabs?.completed && !completedInType.facilityProfileTabs?.completed) {
                const userRole = user?.role;
                const tutorialName = (userRole === 'facility' || userRole === 'company') ? 'facilityProfileTabs' : 'profileTabs';
                startTutorial(tutorialName);
              } else {
                // If core ones are done but the account isn't marked as complete, do it now or start the next one in sequence
                const nextFeature = ['messages', 'contracts', 'calendar', 'marketplace', 'settings'].find(f => !completedInType[f]?.completed);
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
              console.log("[TutorialContext] Modal already showing or tutorial active, skipping check");
              return;
            }

            if (onboardingCompleted) {
              // Onboarding completed - allow access
              console.log("[TutorialContext] Onboarding completed");
              setShowFirstTimeModal(false);
            } else {
              // Onboarding not completed - check verification status
              if (isVerifiedProfile) {
                // Profile is verified but onboarding not completed - allow access
                console.log("[TutorialContext] Profile verified, onboarding not completed - allowing access");
                setShowFirstTimeModal(false);
              }
              // Verification check handled above already
            }
          } else if (isInDashboard && tutorialPassed) {
            // Hide modal if tutorial is already passed
            if (showFirstTimeModal) {
              console.log("[TutorialContext] Modal is showing but tutorial passed - keeping modal open (explicitly requested)");
              return;
            }
            setShowFirstTimeModal(false);
          }
        } else {
          // No user data (user is null but isLoading is false)
          if (isInDashboard && !tutorialPassed) {
            const lang = i18n.language || 'fr';
            navigate(`/${lang}/onboarding`);
          }
        }
      } catch (error) {
        console.error('[TutorialContext] Error checking tutorial status:', error);

        // Fallback: If we can't determine status (e.g. timeout or offline), assume onboarding needed
        console.log(`[TutorialContext] Fallback Check - isInDashboard: ${isInDashboard}, showFirstTimeModal: ${showFirstTimeModal}, tutorialPassed: ${tutorialPassed}`);

        if (isInDashboard) {
          console.log('[TutorialContext] Error fetch fallback: Redirecting to Onboarding Page');
          const lang = i18n.language || 'fr';
          navigate(`/${lang}/onboarding`);
        } else {
          console.log('[TutorialContext] Error fetch fallback: NOT showing modal because not in dashboard');
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
        console.log("[TutorialContext] Forcing sidebar open during tutorial");
        setIsMainSidebarCollapsed(false);
      }
    }
  }, [isTutorialActive, isMainSidebarCollapsed, setIsMainSidebarCollapsed]);

  // Restart the onboarding flow (Smart Restart)
  const restartOnboarding = useCallback(async (type = 'professional') => {
    console.log("[TutorialContext] Restart requested for type:", type);
    if (isBusy || !currentUser) return;

    // Toggle behavior: if tutorial is currently active, stop it
    if (isTutorialActive || showFirstTimeModal) {
      console.log("[TutorialContext] Tutorial is active, stopping it");

      // Check if currently in profile tutorial
      const isInProfileTutorial = activeTutorial === 'profileTabs' || activeTutorial === 'facilityProfileTabs';
      const isProfileTutorialComplete = completedTutorials?.profileTabs === true || completedTutorials?.facilityProfileTabs === true;
      
      // MANDATORY LIMITATION: Only apply restrictions for PROFILE tutorial (not dashboard or other tutorials)
      if (isInProfileTutorial && !isProfileTutorialComplete) {
        if (accessMode === 'team') {
          console.log("[TutorialContext] Team access mode - allowing tutorial stop");
          // Allow stopping tutorial with team access
        } else if (accessMode === 'full') {
          console.log("[TutorialContext] Full access mode - showing access popup");
          setAllowAccessLevelModalClose(true);
          setShowAccessLevelModal(true);
          return;
        } else {
          // accessMode is 'loading' or null - show access popup instead of error
          console.log("[TutorialContext] Access mode pending - showing access popup");
          setAllowAccessLevelModalClose(true);
          setShowAccessLevelModal(true);
          return;
        }
      }

      safelyUpdateTutorialState([
        [setIsTutorialActive, false],
        [setShowFirstTimeModal, false],
        [setActiveTutorial, null],
        [setCurrentStep, 0]
      ]);
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
        // Check the specific onboarding type progress
        const onboardingProgress = data.onboardingProgress || {};
        const typeProgress = onboardingProgress[type];
        isTypeCompleted = typeProgress?.completed === true || data.profileCompleted === true;

        // For professional, also check legacy fields if they were migrated
        if (type === 'professional') {
          const bypassedGLN = data.bypassedGLN === true && data.GLN_certified === false;
          isTypeCompleted = isTypeCompleted || !!data.GLN_certified || data.onboardingCompleted || (onboardingProgress.completed === true) || bypassedGLN;
        }
      }

      if (isTypeCompleted) {
        console.log(`[TutorialContext] ${type} onboarding already completed, starting dashboard tutorial`);
        startTutorial('dashboard');
      } else {
        console.log(`[TutorialContext] Redirecting to ${type} onboarding page`);
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
    console.log("[TutorialContext] Starting facility onboarding");
    await restartOnboarding('facility');
  }, [restartOnboarding]);

  // Reset tutorial state when leaving dashboard
  useEffect(() => {
    if (!isInDashboard) {
      console.log("[TutorialContext] User left dashboard, resetting tutorial state");
      resetTutorialState();
    }
  }, [isInDashboard, resetTutorialState]);


  // Update step data when current step or active tutorial changes
  useEffect(() => {
    if (isTutorialActive && tutorialSteps[activeTutorial]) {
      const steps = tutorialSteps[activeTutorial];
      
      // AUTO-SYNC: Detect correct step based on current URL for profile tutorials
      if ((activeTutorial === 'profileTabs' || activeTutorial === 'facilityProfileTabs') && location.pathname.includes('/dashboard/profile')) {
        let currentTab = location.pathname.split('/').pop();
        
        // If URL ends with 'profile', default to personalDetails
        if (currentTab === 'profile') {
          currentTab = 'personalDetails';
        }
        
        const tabToStepMap = {
          'personalDetails': 0,
          'professionalBackground': 1,
          'billingInformation': 2,
          'documentUploads': 4
        };
        
        const expectedStep = tabToStepMap[currentTab];
        if (expectedStep !== undefined && expectedStep !== currentStep && !showAccessLevelModal) {
          console.log('[TutorialContext] URL-based step sync: current URL tab =', currentTab, ', setting step to', expectedStep);
          setCurrentStep(expectedStep);
          saveTutorialProgress(activeTutorial, expectedStep);
          return;
        }
      }
      
      if (steps && steps[currentStep]) {
        let currentStepData = { ...steps[currentStep] };

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
          } else if (normalizedRequiredPath.includes('/dashboard/profile') && normalizedCurrentPath.includes('/dashboard/profile')) {
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
              } else if (normalizedCurrentPath === '/dashboard/profile' && requiredTab === 'personalDetails') {
                isOnCorrectPage = true;
              }
            } else {
              isOnCorrectPage = true;
            }
          }

          // Dynamic Override: If user is in profileTabs/facilityProfileTabs tutorial but NOT on profile page,
          // highlight the sidebar item to guide them back.
          if ((activeTutorial === 'profileTabs' || activeTutorial === 'facilityProfileTabs') && !isOnCorrectPage) {
            console.log("[TutorialContext] User away from profile, redirecting highlight to sidebar");
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
          // Dynamic Override: If user is in profileTabs/facilityProfileTabs tutorial but NOT on profile page,
          // highlight the sidebar item to guide them back.
          if ((activeTutorial === 'profileTabs' || activeTutorial === 'facilityProfileTabs') && !location.pathname.includes('/dashboard/profile')) {
            console.log("[TutorialContext] User away from profile, redirecting highlight to sidebar");
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
  }, [currentStep, activeTutorial, isTutorialActive, location.pathname, showAccessLevelModal]);

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
            console.log(`[TutorialContext] Tooltip hidden: Incorrect tab (Active: ${currentTab}, Required: ${stepData.requiredTab})`);
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
      console.log('[TutorialContext] Force updating element position');
      updateElementPositionRef.current();
    }
  }, []);

  // Complete the current tutorial
  const completeTutorial = useCallback(async () => {
    console.log("[TutorialContext] Completing tutorial:", activeTutorial);

    // Prevent completion while busy
    if (isBusy) {
      console.log("[TutorialContext] Cannot complete tutorial: system busy");
      return;
    }

    const previousTutorial = activeTutorial;

    // Clear restoration ref
    lastRestoredStateRef.current = { tutorial: null, step: null };

    // CRITICAL: Set the ref BEFORE any state changes to prevent race conditions
    completingTutorialRef.current = previousTutorial;
    console.log("[TutorialContext] Set completingTutorialRef to:", previousTutorial);

    try {
      await safelyUpdateTutorialState([
        [setIsTutorialActive, false],
        [setActiveTutorial, 'dashboard']
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
            const mandatoryOnboardingTutorials = ['dashboard', 'profileTabs', 'facilityProfileTabs', 'messages', 'contracts', 'calendar', 'marketplace', 'settings']
              .filter(tutorial => {
                // Filter out the profile tutorial that doesn't match the user's onboardingType
                if (onboardingType === 'professional' && tutorial === 'facilityProfileTabs') return false;
                if (onboardingType === 'facility' && tutorial === 'profileTabs') return false;
                return true;
              });

            const currentIndex = mandatoryOnboardingTutorials.indexOf(previousTutorial);

            // SPECIAL: If finishing profile tabs, mark tutorial as passed officially and set access mode to full
            if (previousTutorial === 'profileTabs' || previousTutorial === 'facilityProfileTabs') {
              console.log("[TutorialContext] Profile tutorial finished, marking as tutorialPassed and setting access mode to full");
              await setTutorialComplete(true);
              
              // ALWAYS upgrade to full access after profile completion (regardless of current mode)
              console.log("[TutorialContext] Setting access mode to 'full' after profile completion - saving to Firestore");
              setAccessModeState('full');
              
              try {
                await updateDoc(profileDocRef, {
                  tutorialAccessMode: 'full',
                  profileCompleted: true,
                  profileCompletedAt: serverTimestamp()
                });
                console.log("[TutorialContext] ✅ Access mode 'full' successfully saved to Firestore");
              } catch (saveError) {
                console.error("[TutorialContext] ❌ Error saving access mode 'full' to Firestore:", saveError);
              }
            }

            if (currentIndex !== -1 && currentIndex < mandatoryOnboardingTutorials.length - 1) {
              let nextFeature = mandatoryOnboardingTutorials[currentIndex + 1];
              
              // After profile completion, access mode is now 'full', so don't skip marketplace
              // Only skip marketplace if user completed profile with team mode AND didn't upgrade
              const shouldSkipMarketplace = (previousTutorial !== 'profileTabs' && previousTutorial !== 'facilityProfileTabs') && 
                                           accessMode === 'team' && 
                                           nextFeature === 'marketplace';
              
              if (shouldSkipMarketplace) {
                console.log(`[TutorialContext] Skipping marketplace tutorial (team access mode)`);
                const nextIndex = mandatoryOnboardingTutorials.indexOf('marketplace') + 1;
                if (nextIndex < mandatoryOnboardingTutorials.length) {
                  nextFeature = mandatoryOnboardingTutorials[nextIndex];
                } else {
                  nextFeature = null;
                }
              }
              
              if (nextFeature) {
                console.log(`[TutorialContext] Chaining next tutorial: ${nextFeature}`);
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
        console.log("[TutorialContext] Cleared completingTutorialRef");
      }, 1000);
    }
  }, [activeTutorial, isBusy, safelyUpdateTutorialState, currentUser, onboardingType, setTutorialComplete, accessMode]);

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
      console.log("[TutorialContext] Cannot advance step: system busy");
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
            console.warn(`[TutorialContext] Navigation blocked: Tab ${currentTab} is incomplete.`);
            showWarning?.(i18n.t('validation:completePreviousSteps') || 'Please complete the required fields before continuing.');
            return;
          }
        }
      }

      console.log(`[TutorialContext] Navigating to: ${targetPath}`);
      navigate(targetPath);

      // Do NOT automatically advance to next step - user must click Next button
      console.log(`[TutorialContext] Navigation complete, waiting for user to click Next`);
    }
  }, [activeTutorial, completeTutorial, currentStep, navigate, location.pathname, showWarning]);

  // Skip the first-time modal (when user clicks "Skip")
  const skipFirstTimeModal = useCallback(() => {
    console.log("[TutorialContext] Skipping first-time modal");

    // Prevent multiple skips
    if (isBusy) {
      console.log("[TutorialContext] Cannot skip modal: system busy");
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
    console.log("[TutorialContext] Resetting profile tab access to personalDetails");
    setMaxAccessedProfileTab('personalDetails');
    try {
      localStorage.setItem('tutorial_maxAccessedProfileTab', 'personalDetails');
    } catch (error) {
      console.error('[TutorialContext] Error resetting maxAccessedProfileTab in localStorage:', error);
    }
  }, []);

  // Skip the entire tutorial
  const skipTutorial = useCallback(() => {
    console.log("[TutorialContext] Skipping entire tutorial");

    // Prevent multiple skips
    if (isBusy) {
      console.log("[TutorialContext] Cannot skip tutorial: system busy");
      return;
    }

    // Check if currently in profile tutorial
    const isInProfileTutorial = activeTutorial === 'profileTabs' || activeTutorial === 'facilityProfileTabs';
    const isProfileTutorialComplete = completedTutorials?.profileTabs === true || completedTutorials?.facilityProfileTabs === true;
    
    // MANDATORY LIMITATION: Only apply restrictions for PROFILE tutorial (not dashboard or other tutorials)
    if (isInProfileTutorial && !isProfileTutorialComplete) {
      if (accessMode === 'team') {
        console.log("[TutorialContext] Team access mode - allowing tutorial skip");
        // Allow skipping tutorial with team access
      } else if (accessMode === 'full') {
        console.log("[TutorialContext] Full access mode - showing access popup");
        setAllowAccessLevelModalClose(true);
        setShowAccessLevelModal(true);
        return;
      } else {
        // accessMode is 'loading' or null - show access popup instead of error
        console.log("[TutorialContext] Access mode pending - showing access popup");
        setAllowAccessLevelModalClose(true);
        setShowAccessLevelModal(true);
        return;
      }
    }

    // Reset profile tab access
    resetProfileTabAccess();

    safelyUpdateTutorialState([
      [setIsTutorialActive, false],
      [setShowFirstTimeModal, false]
    ], async () => {
      // Update user's tutorial status in Firestore
      if (currentUser) {
        try {
          const profileCollection = onboardingType === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
          const profileDocRef = doc(db, profileCollection, currentUser.uid);

          // Set cookie and update doc to remember tutorial was passed
          await setTutorialComplete(true);

          // CRITICAL: Clear any active tutorial progress and mark as completed for this account type
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
  }, [isBusy, currentUser, safelyUpdateTutorialState, setTutorialComplete, completedTutorials, onboardingType, showWarning, activeTutorial, currentStep, accessMode, resetProfileTabAccess, showError]);

  // Move to the previous step
  const prevStep = useCallback(() => {
    // Prevent step change while busy
    if (isBusy) {
      console.log("[TutorialContext] Cannot go back: system busy");
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
    console.log("[TutorialContext] Setting waiting for save:", waiting);
    setIsWaitingForSave(waiting);
  }, []);

  // Set access mode (team or full) and persist to Firestore
  const setAccessMode = useCallback(async (mode) => {
    if (!currentUser) return;

    console.log("[TutorialContext] Setting access mode:", mode);
    setAccessModeState(mode);
    setShowAccessLevelModal(false);
    setAllowAccessLevelModalClose(false);

    // 'loading' is a temporary state - don't save to Firestore, just close popup
    if (mode === 'loading') {
      console.log("[TutorialContext] Access mode set to 'loading' (temporary state, not saved to Firestore)");
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

      console.log("[TutorialContext] Access mode saved to Firestore:", mode);

      if (mode === 'team') {
        // Team mode: Mark profile as complete and skip to dashboard tutorials
        console.log("[TutorialContext] Team mode selected - completing profile tutorial");

        // Update profile completion status
        await updateDoc(profileRef, {
          profileCompleted: true,
          profileCompletedAt: serverTimestamp()
        });

        // Mark the profile tabs tutorial as completed in Firestore BEFORE calling completeTutorial
        // This prevents checkTutorialStatus from restoring it
        const tutorialName = onboardingType === 'facility' ? 'facilityProfileTabs' : 'profileTabs';
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

        // Complete the profile tabs tutorial (this will automatically chain to messages tutorial)
        // No need to manually start messages as completeTutorial handles chaining
        await completeTutorial();
      } else {
        // Full mode: User selected to continue with full access
        console.log("[TutorialContext] Full mode selected - user will manually navigate to next tab");
        // Don't automatically advance to step 2
        // User will click on the tab themselves
      }
    } catch (error) {
      console.error("[TutorialContext] Error saving access mode:", error);
      showError?.('Failed to save access preference. Please try again.');
    }
  }, [currentUser, onboardingType, completeTutorial, nextStep, showError, activeTutorial, currentStep, safelyUpdateTutorialState, saveTutorialProgress]);

  // Callback for when a tab/section is completed during tutorial
  const onTabCompleted = useCallback((tabId, isComplete) => {
    // Allow completion regardless of waiting state to support "Save & Continue" without clicking tooltip
    // Support both professional (profileTabs) and facility (facilityProfileTabs) tutorials
    const isProfileTutorial = activeTutorial === 'profileTabs' || activeTutorial === 'facilityProfileTabs';
    if (!isTutorialActive || !isProfileTutorial) {
      return;
    }

    if (isComplete) {
      console.log("[TutorialContext] Tab completed:", tabId, "- continuing tutorial (type:", activeTutorial, ")");

      const professionalTabOrder = ['personalDetails', 'professionalBackground', 'billingInformation', 'documentUploads'];
      const tabIndex = professionalTabOrder.indexOf(tabId);
      const currentMaxIndex = professionalTabOrder.indexOf(maxAccessedProfileTab);
      
      // RULE: When a tab is completed, unlock the next tab
      if (tabIndex >= currentMaxIndex && tabIndex < professionalTabOrder.length - 1) {
        const nextTab = professionalTabOrder[tabIndex + 1];
        
        console.log("[TutorialContext] Tab completed - updating maxAccessedProfileTab from", maxAccessedProfileTab, "to", nextTab);
        setMaxAccessedProfileTab(nextTab);
      }

      // Clear waiting state immediately
      setIsWaitingForSave(false);

      // Show AccessLevelChoicePopup when completing Personal Details for first time (only once)
      if (activeTutorial === 'profileTabs' && tabId === 'personalDetails') {
        const popupShownKey = `accessLevelPopup_${currentUser?.uid}_personalToProf`;
        const wasShown = localStorage.getItem(popupShownKey);
        
        if (!wasShown) {
          console.log("[TutorialContext] Personal Details completed - showing AccessLevelChoicePopup (first time)");
          localStorage.setItem(popupShownKey, 'true');
          setAllowAccessLevelModalClose(false);
          setShowAccessLevelModal(true);
          return;
        } else {
          console.log("[TutorialContext] Personal Details completed - popup already shown before, skipping");
        }
      }

      // URL-based sync will handle step advancement automatically
      console.log("[TutorialContext] Tab completed, URL-based sync will update step");
    }
  }, [isTutorialActive, activeTutorial, setAllowAccessLevelModalClose, setShowAccessLevelModal, maxAccessedProfileTab]);

  // Pause the tutorial (e.g., when a document upload popup is opened)
  const pauseTutorial = useCallback(() => {
    console.log("[TutorialContext] Pausing tutorial");

    if (isBusy) {
      console.log("[TutorialContext] Cannot pause tutorial: system busy");
      return;
    }

    safelyUpdateTutorialState([
      [setIsPaused, true],
      [setShowFirstTimeModal, false],
      [setIsTutorialActive, false]
    ]);
  }, [isBusy, safelyUpdateTutorialState]);

  // Resume the tutorial (e.g., when "Save and Continue" is clicked)
  const resumeTutorial = useCallback(() => {
    console.log("[TutorialContext] Resuming tutorial");

    if (isBusy) {
      console.log("[TutorialContext] Cannot resume tutorial: system busy");
      return;
    }

    // Resume by restarting the tutorial from where it was paused
    safelyUpdateTutorialState([
      [setIsPaused, false]
    ], async () => {
      // Check if onboarding was completed
      if (currentUser) {
        try {
          const profileCollection = onboardingType === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
          const profileDocRef = doc(db, profileCollection, currentUser.uid);
          const profileDoc = await getDoc(profileDocRef);

          if (profileDoc.exists()) {
            const profileData = profileDoc.data();
            const onboardingCompleted = profileData.profileCompleted || (profileData.onboardingProgress && profileData.onboardingProgress.completed);

            if (onboardingCompleted) {
              // Resume tutorial
              setTimeout(() => {
                if (startTutorialRef.current) {
                  startTutorialRef.current(activeTutorial || 'dashboard');
                }
              }, 100);
            } else {
              // Resume onboarding page
              if (isInDashboard) {
                const lang = i18n.language || 'fr';
                navigate(`/${lang}/onboarding`);
              }
            }
          }
        } catch (error) {
          console.error('[TutorialContext] Error resuming tutorial:', error);
        }
      }
    });
  }, [isBusy, safelyUpdateTutorialState, currentUser, activeTutorial]);

  // Check if a sidebar item should be accesssible during onboarding
  const isSidebarItemAccessible = useCallback((itemPath) => {
    // If tutorial has been explicitly passed (e.g. Skipped), allow full access UNLESS team mode restricts it
    if (tutorialPassed) {
      const itemName = itemPath.split('/').pop();
      // Marketplace is locked for team access even if tutorial is passed
      if (itemName === 'marketplace' && accessMode === 'team') {
        return false;
      }
      return true;
    }

    // If First Time Modal is showing, strictly lock everything except overview and profile
    if (showFirstTimeModal) {
      return itemPath.includes('overview') || itemPath.includes('profile');
    }

    // Check if profile tutorial is complete (either professional or facility)
    const isProfileTutorialComplete = completedTutorials?.profileTabs === true || completedTutorials?.facilityProfileTabs === true;

    // If profile tutorial is complete, full access is restored (except marketplace for team access)
    if (isProfileTutorialComplete) {
      const itemName = itemPath.split('/').pop();
      if (itemName === 'marketplace' && accessMode === 'team') {
        return false;
      }
      return true;
    }

    // Extract item name
    const itemName = itemPath.split('/').pop();

    // 1. Dashboard/Overview is ALWAYS accessible
    if (itemName === 'overview') {
      return true;
    }

    // 2. Profile is accessible BY DEFAULT during the tutorial flow starting from dashboard
    if (itemName === 'profile') {
      return true;
    }

    // 3. Shared items (messages, contracts, calendar) are ALWAYS accessible regardless of tutorial progress
    const sharedItems = ['messages', 'contracts', 'calendar'];
    if (sharedItems.includes(itemName)) {
      return true;
    }

    // 4. Other items follow tutorial advancement
    const tutorialOrder = ['overview', 'profile', 'messages', 'contracts', 'calendar', 'marketplace', 'payroll', 'organization', 'settings'];
    const itemIndex = tutorialOrder.indexOf(itemName);

    if (itemIndex !== -1) {
      // Marketplace is locked for team access
      if (itemName === 'marketplace' && accessMode === 'team') {
        return false;
      }

      // If the current tutorial is this item, it's accessible
      if (activeTutorial === itemName || (itemName === 'profile' && (activeTutorial === 'profileTabs' || activeTutorial === 'facilityProfileTabs'))) {
        return true;
      }

      // If previous item in order is completed, this one is accessible
      const prevItem = tutorialOrder[itemIndex - 1];
      const prevTutorialKey = prevItem === 'profile' ? (user?.role === 'facility' || user?.role === 'company' ? 'facilityProfileTabs' : 'profileTabs') : prevItem;
      if (completedTutorials[prevTutorialKey]) {
        return true;
      }
    }

    // Locked until progress reaches it
    return false;

  }, [activeTutorial, completedTutorials, tutorialPassed, showFirstTimeModal, accessMode]);

  // Route guard: Enforce strict navigation during mandatory onboarding
  useEffect(() => {
    // 1. Safety & Exemption Checks
    if (!isInDashboard) return; // Allow navigation outside dashboard (e.g. login)
    if (tutorialPassed) return; // If passed, allow all

    // If not in a tutorial, we rely on checkTutorialStatus to start one.
    if (!isTutorialActive) return;

    // Special Exception: If completing Dashboard tutorial by reaching Profile page, allow it even if busy
    if (activeTutorial === 'dashboard' && currentStep >= 3 && location.pathname.includes('/dashboard/profile')) {
      console.log("[TutorialContext] User reached profile, completing dashboard tutorial (Priority Override)");

      // Force update if busy to ensure completion
      if (isBusy) {
        console.log("[TutorialContext] Bypassing busy flag for completion");
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
    if (activeTutorial === 'profileTabs' || activeTutorial === 'facilityProfileTabs') {
      // SYNC: Check if current URL matches any step's navigationPath and switch to it
      // This allows users to click tabs without getting stuck on previous steps
      // Use a ref to prevent infinite sync loops
      try {
        const steps = tutorialSteps[activeTutorial];
        if (steps) {
          const currentPath = location.pathname;
          const matchingStepIndex = steps.findIndex(step =>
            step.navigationPath && currentPath.includes(step.navigationPath)
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
            console.log(`[TutorialContext] URL Sync: Switching to step ${matchingStepIndex} for path ${currentPath}`);
            syncTimestampRef.current[lastSyncKey] = now;
            setCurrentStep(matchingStepIndex);
            return;
          } else if (matchingStepIndex !== -1 && timeSinceLastSync <= 500) {
            console.log(`[TutorialContext] Skipping sync - too soon since last sync (${timeSinceLastSync}ms)`);
          }
        }
      } catch (err) {
        console.error('[TutorialContext] Error syncing tutorial step:', err);
      }

      if (!path.includes('/dashboard/profile')) {
        console.log("[TutorialContext] User trying to leave profile during tutorial");
        
        // If team access, allow navigation and show access popup
        if (accessMode === 'team') {
          console.log("[TutorialContext] Team access mode - showing Access Level popup");
          setAllowAccessLevelModalClose(true);
          setShowAccessLevelModal(true);
          return;
        }
        
        // If full access and past first step, show Access Level popup
        if (accessMode === 'full' && currentStep >= 1) {
          console.log("[TutorialContext] Full access selected, showing Access Level popup");
          setAllowAccessLevelModalClose(true);
          setShowAccessLevelModal(true);
          return;
        }
        
        // No access mode set - redirect back to profile
        showWarning("Please complete your profile configuration to continue.");
        const profileUrl = selectedWorkspace?.id
          ? `/dashboard/profile?workspace=${selectedWorkspace.id}`
          : '/dashboard/profile';
        navigate(profileUrl);
      }
      return;
    }

    // Case B: Dashboard Intro Tutorial
    if (activeTutorial === 'dashboard') {
      const isOverview = path === '/dashboard' || path === '/dashboard/' || path.includes('/dashboard/overview');
      const isProfile = path.includes('/dashboard/profile');
      const isSharedFeature = path.includes('/dashboard/messages') || path.includes('/dashboard/calendar') || path.includes('/dashboard/contracts');

      // Allow profile and shared features (messages, calendar, contracts) during dashboard tutorial
      if (isProfile || isSharedFeature) {
        console.log("[TutorialContext] Profile or shared feature access allowed during dashboard tutorial");
        // If user navigates to profile, complete the dashboard tutorial since that's the goal
        if (isProfile && currentStep >= 3) {
          console.log("[TutorialContext] User reached profile, completing dashboard tutorial");
          completeTutorial();
        }
        return;
      }

      // Steps before "Navigate to Profile" (Step 3) -> Must stay on Overview
      if (currentStep < 3) {
        if (!isOverview) {
          console.log("[TutorialContext] Redirecting strict onboarding: Must be in dashboard overview");
          showWarning("Please follow the onboarding guide.");
          // Preserve workspace param to prevent DashboardContext re-initialization
          const dashboardUrl = selectedWorkspace?.id
            ? `/dashboard?workspace=${selectedWorkspace.id}`
            : '/dashboard';
          navigate(dashboardUrl);
        }
      } else {
        // Step 3+ but not on profile, overview, or shared features - redirect to dashboard
        if (!isOverview && !isProfile && !isSharedFeature) {
          console.log("[TutorialContext] Redirecting strict onboarding: Invalid path during profile transition");
          showWarning("Please click on Profile to proceed.");
          // Preserve workspace param to prevent DashboardContext re-initialization
          const dashboardUrl = selectedWorkspace?.id
            ? `/dashboard?workspace=${selectedWorkspace.id}`
            : '/dashboard';
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
    setOnboardingType, // Allow changing onboarding type
    setWaitingForSave,
    onTabCompleted,
    isSidebarItemAccessible,
    forceUpdateElementPosition, // Allow manual position refresh
    registerValidation,
    validationRef,
    showWarning,
    showError,
    accessMode,
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