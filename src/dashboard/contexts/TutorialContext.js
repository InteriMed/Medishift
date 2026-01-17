import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp, collection } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { tutorialSteps } from '../onboarding/tutorialSteps';
import { useDashboard } from './DashboardContext';
import { useSidebar } from './SidebarContext';
import { debounce } from '../../utils/debounce';

const TutorialContext = createContext(null);

export const TutorialProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    profileComplete,
    tutorialPassed,
    setTutorialComplete
  } = useDashboard();
  const { isMainSidebarCollapsed, setIsMainSidebarCollapsed } = useSidebar();
  const { showWarning } = useNotification();

  // Busy flag to prevent concurrent updates
  const [isBusy, setIsBusy] = useState(false);

  // Tutorial state variables
  const [completedTutorials, setCompletedTutorials] = useState({});
  const [showFirstTimeModal, setShowFirstTimeModal] = useState(false);
  const [showTutorialSelectionModal, setShowTutorialSelectionModal] = useState(false);

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

  // Dual onboarding type: 'professional' or 'facility'
  const [onboardingType, setOnboardingType] = useState('professional');

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

  // Save tutorial progress to Firestore
  const saveTutorialProgress = useCallback(async (tutorialName, step) => {
    if (!currentUser) return;

    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        tutorialProgress: {
          activeTutorial: tutorialName,
          currentStep: step,
          updatedAt: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error saving tutorial progress:', error);
    }
  }, [currentUser]);

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
          const userDocRef = doc(db, 'users', currentUser.uid);
          await updateDoc(userDocRef, {
            [`completedTutorials.${feature}`]: null
          });
        } catch (error) {
          console.error('Error clearing completed tutorial status:', error);
        }
      }
    }

    // Load saved progress for this tutorial
    let startStep = 0;
    if (currentUser) {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.tutorialProgress && userData.tutorialProgress.activeTutorial === feature) {
            const savedStep = userData.tutorialProgress.currentStep || 0;
            // For profileTabs tutorial, ensure we start at step 0 (Personal Details) 
            // unless the tutorial was already completed
            if (feature === 'profileTabs' && !completedTutorials?.profileTabs) {
              // Always start at step 0 for profileTabs if not completed
              startStep = 0;
              console.log('[TutorialContext] Resetting profileTabs tutorial to step 0');
            } else {
              startStep = savedStep;
            }
          }
        }
      } catch (error) {
        console.error('Error loading tutorial progress:', error);
      }
    }

    // Check if we're on mobile and ensure sidebar is open if needed
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      // Check if sidebar is closed
      const sidebar = document.querySelector('.sidebar');
      const isSidebarOpen = sidebar && sidebar.classList.contains('open');

      if (!isSidebarOpen) {
        // Find and click the sidebar toggle button
        const toggleButton = document.querySelector('.menu-toggle-btn');
        if (toggleButton) {
          console.log('[TutorialContext] Opening sidebar for mobile tutorial');
          toggleButton.click();

          // Give time for the sidebar to open before proceeding
          setTimeout(() => {
            safelyUpdateTutorialState([
              [setActiveTutorial, feature],
              [setCurrentStep, startStep],
              [setIsTutorialActive, true],
              [setShowFirstTimeModal, false]
            ], async () => {
              await saveTutorialProgress(feature, startStep);
            });
            setIsBusy(false);
          }, 300);
          return;
        }
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
  }, [isBusy, safelyUpdateTutorialState, currentUser, saveTutorialProgress, completedTutorials]);

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

      if (!currentUser) {
        setIsReady(true);
        return;
      }

      // OPTIMIZATION: If tutorial is already passed and we're not showing modal/active tutorial,
      // no need to check status again - this prevents infinite loops
      if (tutorialPassed && !isTutorialActive && !showFirstTimeModal) {
        console.log('[TutorialContext] Tutorial already passed, skipping status check');
        setIsReady(true);
        return;
      }

      // CRITICAL: If tutorial is currently active, skip all restoration/status checks
      // This prevents the effect from interfering with an ongoing tutorial session
      if (isTutorialActive) {
        console.log('[TutorialContext] Tutorial currently active, skipping status check to avoid interference');
        setIsReady(true);
        return;
      }

      // OPTIMIZATION: If not in dashboard, don't check tutorial status
      if (!isInDashboard) {
        console.log('[TutorialContext] Not in dashboard, skipping status check');
        setIsReady(true);
        return;
      }

      try {
        // Check tutorial status
        // console.log("[TutorialContext] Profile complete:", profileComplete, "Tutorial passed:", tutorialPassed, "In dashboard:", isInDashboard, "Modal showing:", showFirstTimeModal, "Tutorial active:", isTutorialActive);

        // Load user data to check onboarding completion
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();

          // Load completed tutorials
          if (userData.completedTutorials) {
            setCompletedTutorials(prev => {
              // Merge remote data with local state
              // Priority: if local is TRUE, keep it TRUE (even if remote is undefined/false yet)
              // This prevents zombie restart race conditions
              const merged = { ...userData.completedTutorials };
              Object.keys(prev).forEach(key => {
                if (prev[key] === true) {
                  merged[key] = true;
                }
              });
              return merged;
            });
          }

          // Check if onboarding is completed (new structure supports professional/facility)
          const onboardingProgress = userData.onboardingProgress || {};

          // Check professional onboarding completion (primary for initial access)
          const professionalProgress = onboardingProgress.professional || {};
          const professionalCompleted = professionalProgress.completed === true;

          // Legacy check for backward compatibility
          const legacyCompleted = userData.onboardingCompleted || onboardingProgress.completed === true;
          const onboardingCompleted = professionalCompleted || legacyCompleted;

          // Check profile verification status
          const isVerifiedProfile = !!userData.GLN_certified;

          /**
           * Onboarding Trigger:
           * Once a user logs in, if its uid is not in professionalProfiles, facilityProfiles or has admin role,
           * it means we fire up onboarding.
           */
          const isAdmin = userData.role === 'admin' || (userData.roles && userData.roles.includes('admin'));

          let hasProfessionalProfile = false;
          let hasFacilityProfile = false;

          try {
            const profDoc = await getDoc(doc(db, 'professionalProfiles', currentUser.uid));
            hasProfessionalProfile = profDoc.exists();

            const facDoc = await getDoc(doc(db, 'facilityProfiles', currentUser.uid));
            hasFacilityProfile = facDoc.exists();
          } catch (e) {
            console.error("[TutorialContext] Error checking profile existence:", e);
          }

          const hasEstablishedWorkspace = hasProfessionalProfile || hasFacilityProfile || isAdmin;

          // PRIORITY CHECK: Mandatory Onboarding Trigger
          if (!hasEstablishedWorkspace && !onboardingCompleted && !isVerifiedProfile) {
            console.log("[TutorialContext] User has no established workspace. Forcing First Time Modal.");
            if (isInDashboard && !showFirstTimeModal) {
              setOnboardingType('professional'); // Default to professional onboarding
              setShowFirstTimeModal(true);
              // Ensure tutorial is considered inactive so modal takes precedence
              if (isTutorialActive) setIsTutorialActive(false);
            }
            return; // Stop here, do not restore tutorial
          }

          // Check for in-progress tutorial first - Restoration has priority (Now safe as verified)
          if (userData.tutorialProgress && userData.tutorialProgress.activeTutorial) {
            const savedTutorial = userData.tutorialProgress.activeTutorial;

            // CRITICAL FIX 0: If tutorial is already active and matches the saved state, don't restore
            // This prevents infinite restoration loops
            if (isTutorialActive && activeTutorial === savedTutorial) {
              const savedStep = userData.tutorialProgress.currentStep || 0;

              // Skip restoration if:
              // 1. We're on the exact same step
              // 2. OR we're ahead of the saved step (tutorial is progressing normally)
              // This prevents restoration from "rewinding" an active tutorial
              if (currentStep >= savedStep) {
                console.log(`[TutorialContext] Tutorial '${savedTutorial}' is already active at step ${currentStep} (saved: ${savedStep}), skipping restoration.`);
                return; // Stop here, no need to restore
              }
            }

            // CRITICAL FIX 1: Check if we are currently completing this tutorial (ref-based check)
            // This solves the race condition where state hasn't updated yet but the completion is in-flight
            if (completingTutorialRef.current === savedTutorial) {
              console.log(`[TutorialContext] Found saved tutorial '${savedTutorial}' but completion is in-flight. Ignoring restoration.`);
              return; // Stop here, do not restore
            }

            // CRITICAL FIX 2: Check if we just completed this tutorial locally (state-based check)
            // This prevents "zombie" tutorials from re-opening due to stale Firestore data
            if (completedTutorials[savedTutorial] === true) {
              console.log(`[TutorialContext] Found saved tutorial '${savedTutorial}' but it is marked as completed locally. Ignoring restoration.`);

              // CRITICAL FIX 3: If tutorial is still stuck as "active", force deactivate it
              if (isTutorialActive) {
                console.log(`[TutorialContext] Tutorial still active, forcing deactivation.`);
                setIsTutorialActive(false);
              }
              return; // Stop here, do not restore
            }

            // CRITICAL FIX 4: Only restore if the tutorial hasn't been explicitly dismissed/completed
            // We can check if the user recently interacted or if there's a flag, but for now, 
            // let's assume if it's not completed, it should be resumed.
            // HOWEVER, if the user refreshed and it auto-starts, they might find it annoying.
            // There isn't a "dismissed" flag in the schema yet.

            // CRITICAL FIX: Check if tutorial is already passed in the fetched data
            // This prevents restoration if the user already skipped/completed it but the activeTutorial field wasn't cleared
            if (userData.tutorialPassed) {
              console.log("[TutorialContext] Tutorial already passed (in doc), skipping restoration.");

              // Clean up the stale activeTutorial field
              if (savedTutorial) {
                updateDoc(userDocRef, {
                  'tutorialProgress.activeTutorial': null
                }).catch(err => console.error("Error clearing stale activeTutorial:", err));
              }
              return;
            }

            const savedStep = userData.tutorialProgress.currentStep || 0;

            // CRITICAL FIX 4: Check if we already restored this exact state
            // This prevents the effect from re-restoring the same state redundantly
            if (lastRestoredStateRef.current.tutorial === savedTutorial &&
              lastRestoredStateRef.current.step === savedStep) {
              console.log(`[TutorialContext] Already restored ${savedTutorial}:${savedStep}, skipping redundant restoration.`);
              return;
            }

            console.log("[TutorialContext] Found in-progress tutorial, restoring state:", userData.tutorialProgress);

            // Track that we are restoring this state
            lastRestoredStateRef.current = { tutorial: savedTutorial, step: savedStep };

            // Restore state
            safelyUpdateTutorialState([
              [setActiveTutorial, savedTutorial],
              [setCurrentStep, savedStep],
              [setIsTutorialActive, true],
              [setShowFirstTimeModal, false]
            ]);
            return; // Stop here, we are restoring
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
            // Hide modal if tutorial is already passed, BUT only if it wasn't explicitly shown
            // (e.g., via restartOnboarding - in that case, respect the user's explicit action)
            // If the modal is already showing, don't close it - it was explicitly requested
            if (showFirstTimeModal) {
              console.log("[TutorialContext] Modal is showing but tutorial passed - keeping modal open (explicitly requested)");
              return;
            }
            setShowFirstTimeModal(false);
          }
        } else {
          // No user document, show onboarding modal only if not already showing
          if (isInDashboard && !tutorialPassed && !showFirstTimeModal) {
            setShowFirstTimeModal(true);
          }
        }
      } catch (error) {
        if (error.code === 'unavailable' || (error.message && error.message.includes('offline'))) {
          console.warn('[TutorialContext] Offline or unavailable, skipping tutorial check');
        } else {
          console.error('[TutorialContext] Error checking tutorial status:', error);
        }
      } finally {
        setIsReady(true);
      }
    };

    checkTutorialStatus();
  }, [currentUser, tutorialPassed, isInDashboard, profileComplete, showFirstTimeModal, isTutorialActive, isBusy, activeTutorial, completedTutorials, currentStep, safelyUpdateTutorialState]);
  // Removed: currentStep (now handled by ref-based restoration check)
  // Removed: activeTutorial (now handled by ref-based restoration check)
  // Removed: completedTutorials (now handled by ref-based restoration check)
  // Removed: safelyUpdateTutorialState (only used in conditional branches, wrapped in try-catch, and its stability is assumed)

  // Force sidebar open when tutorial is active
  useEffect(() => {
    if (isTutorialActive && isMainSidebarCollapsed) {
      console.log("[TutorialContext] Forcing sidebar open during tutorial");
      setIsMainSidebarCollapsed(false);
    }
  }, [isTutorialActive, isMainSidebarCollapsed, setIsMainSidebarCollapsed]);

  // Restart the onboarding flow (Smart Restart)
  const restartOnboarding = useCallback(async (type = 'professional') => {
    console.log("[TutorialContext] Restart requested for type:", type);
    if (isBusy || !currentUser) return;

    // Toggle behavior: if tutorial is currently active, stop it
    if (isTutorialActive || showFirstTimeModal) {
      console.log("[TutorialContext] Tutorial is active, stopping it");
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
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      let isTypeCompleted = false;
      if (userDoc.exists()) {
        const data = userDoc.data();
        // Check the specific onboarding type progress
        const onboardingProgress = data.onboardingProgress || {};
        const typeProgress = onboardingProgress[type];
        isTypeCompleted = typeProgress?.completed === true;

        // For professional, also check legacy fields
        if (type === 'professional') {
          isTypeCompleted = isTypeCompleted || !!data.GLN_certified || data.onboardingCompleted || (onboardingProgress.completed === true);
        }
      }

      if (isTypeCompleted) {
        console.log(`[TutorialContext] ${type} onboarding already completed, starting dashboard tutorial`);
        startTutorial('dashboard');
      } else {
        console.log(`[TutorialContext] Starting ${type} onboarding modal`);
        safelyUpdateTutorialState([
          [setIsTutorialActive, false],
          [setActiveTutorial, 'dashboard'],
          [setCurrentStep, 0],
          [setOnboardingType, type],
          [setShowFirstTimeModal, true]
        ]);
      }
    } catch (e) {
      console.error("Error checking status for restart:", e);
      // Fallback to show onboarding modal
      safelyUpdateTutorialState([
        [setOnboardingType, type],
        [setShowFirstTimeModal, true]
      ]);
    }
  }, [isBusy, safelyUpdateTutorialState, currentUser, startTutorial, isTutorialActive, showFirstTimeModal]);

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
            if (currentStepData.highlightTab) {
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

          // Dynamic Override: If user is in profileTabs tutorial but NOT on profile page,
          // highlight the sidebar item to guide them back.
          if (activeTutorial === 'profileTabs' && !isOnCorrectPage) {
            console.log("[TutorialContext] User away from profile, redirecting highlight to sidebar");
            currentStepData = {
              ...currentStepData,
              targetSelector: 'a[href="/dashboard/profile"]',
              highlightSidebarItem: 'profile',
              highlightTab: null,
              requiredTab: null,
              tooltipPosition: { top: '150px', left: 'calc(250px + 20px)' }
            };
            setStepData(currentStepData);
            return;
          }

          // If not on correct page and not a navigation step, don't set stepData
          if (!isOnCorrectPage) {
            console.log("[TutorialContext] Step requires different page, not setting stepData:", {
              requiredPath: normalizedRequiredPath,
              currentPath: normalizedCurrentPath,
              stepIndex: currentStep
            });
            setStepData(null);
            return;
          }
        } else {
          // Dynamic Override: If user is in profileTabs tutorial but NOT on profile page,
          // highlight the sidebar item to guide them back.
          if (activeTutorial === 'profileTabs' && !location.pathname.includes('/dashboard/profile')) {
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
  }, [currentStep, activeTutorial, isTutorialActive, location.pathname]);

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

    // Initial position update
    updateElementPosition();

    // Set up ResizeObserver for the target element
    const targetSelector = stepData.highlightSidebarItem
      ? `[data-tutorial="${stepData.highlightSidebarItem}-link"]`
      : stepData.highlightTab
        ? `[data-tab="${stepData.highlightTab}"]`
        : stepData.targetSelector;

    let resizeObserver = null;
    const targetElement = targetSelector ? document.querySelector(targetSelector) : null;

    if (targetElement && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        // Use requestAnimationFrame for smooth updates
        requestAnimationFrame(updateElementPosition);
      });
      resizeObserver.observe(targetElement);
    }

    // Debounced window resize handler
    const debouncedResize = debounce(updateElementPosition, 150);
    window.addEventListener('resize', debouncedResize);

    // Sidebar transition handler (listen for transitionend instead of setTimeout)
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
    // This ref persists across renders, so checkTutorialStatus will see it immediately
    completingTutorialRef.current = previousTutorial;
    console.log("[TutorialContext] Set completingTutorialRef to:", previousTutorial);

    try {
      await safelyUpdateTutorialState([
        [setIsTutorialActive, false],
        [setActiveTutorial, 'dashboard'] // Reset to dashboard or cleared state
      ], async () => {
        // Update user's completed tutorials in Firestore
        if (currentUser) {
          try {
            const userDocRef = doc(db, 'users', currentUser.uid);

            // Update completedTutorials in Firestore AND clear activeTutorial
            await updateDoc(userDocRef, {
              [`completedTutorials.${previousTutorial}`]: true,
              'tutorialProgress.activeTutorial': null // Clear active tutorial
            });

            // Update local state
            setCompletedTutorials(prev => ({
              ...prev,
              [previousTutorial]: true
            }));

            // Chain next tutorial if applicable
            if (previousTutorial === 'profileTabs') {
              console.log("[TutorialContext] Chaining next tutorial: messages");
              // Small delay to ensure state settles
              setTimeout(() => {
                if (startTutorialRef.current) {
                  startTutorialRef.current('messages');
                }
              }, 500);
            }
          } catch (error) {
            console.error('Error updating tutorial completion status:', error);
          }
        }
      });
    } finally {
      // Clear the ref after completion (success or failure)
      // Keep it set for a short time to ensure all re-renders have processed
      setTimeout(() => {
        completingTutorialRef.current = null;
        console.log("[TutorialContext] Cleared completingTutorialRef");
      }, 1000); // 1 second delay to ensure Firestore write completes
    }
  }, [activeTutorial, isBusy, safelyUpdateTutorialState, currentUser]);

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
    isBusy, currentStep, activeTutorial, safelyUpdateTutorialState, completeTutorial, saveTutorialProgress
  ]);

  // Navigate to the feature if "Show me" button is clicked or if step has navigationPath
  const navigateToFeature = useCallback(() => {
    let targetPath = null;

    // Get the current step to check for special actions
    const stepData = tutorialSteps[activeTutorial]?.[currentStep];

    // Handle special action: start_calendar_tutorial (from profile completion)
    if (stepData?.actionButton?.action === 'start_calendar_tutorial') {

      // Complete current tutorial (profileTabs)
      completeTutorial();

      // Start calendar tutorial after small delay
      setTimeout(() => {
        startTutorialRef.current('calendar');
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
      console.log(`[TutorialContext] Navigating to: ${targetPath}`);
      navigate(targetPath);

      // Give time for navigation to complete before moving to next step
      setTimeout(() => {
        nextStep();
      }, 500);
    }
  }, [activeTutorial, completeTutorial, currentStep, navigate, nextStep, stepData]);

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
          const userDocRef = doc(db, 'users', currentUser.uid);
          await updateDoc(userDocRef, {
            tutorialPassed: true
          });

          // Set cookie to remember tutorial was passed
          await setTutorialComplete(true);
        } catch (error) {
          console.error('Error updating tutorial status:', error);
        }
      }
    });
  }, [isBusy, currentUser, safelyUpdateTutorialState, setTutorialComplete]);

  // Skip the entire tutorial
  const skipTutorial = useCallback(() => {
    console.log("[TutorialContext] Skipping entire tutorial");

    // Prevent multiple skips
    if (isBusy) {
      console.log("[TutorialContext] Cannot skip tutorial: system busy");
      return;
    }

    safelyUpdateTutorialState([
      [setIsTutorialActive, false],
      [setShowFirstTimeModal, false]
    ], async () => {
      // Update user's tutorial status in Firestore
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          // Set cookie to remember tutorial was passed
          await setTutorialComplete(true);

          // CRITICAL: Clear any active tutorial progress to prevent restoration on refresh
          await updateDoc(userDocRef, {
            tutorialPassed: true,
            'tutorialProgress.activeTutorial': null
          });
        } catch (error) {
          console.error('Error updating tutorial status:', error);
        }
      }
    });
  }, [isBusy, currentUser, safelyUpdateTutorialState, setTutorialComplete]);

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

  // Callback for when a tab/section is completed during tutorial
  const onTabCompleted = useCallback((tabId, isComplete) => {
    // Allow completion regardless of waiting state to support "Save & Continue" without clicking tooltip
    if (!isTutorialActive || activeTutorial !== 'profileTabs') {
      return;
    }

    if (isComplete) {
      console.log("[TutorialContext] Tab completed:", tabId, "- continuing tutorial");

      // Determine the specific next step index based on the completed tab
      const tabStepMap = {
        'personalDetails': 1,        // After Personal -> Go to Step 1 (Professional Background)
        'professionalBackground': 2, // After Professional -> Go to Step 2 (Billing)
        'billingInformation': 3,     // After Billing -> Go to Step 3 (Documents)
        'documentUploads': 4         // After Docs -> Go to Step 4 (Completion)
      };

      const targetStep = tabStepMap[tabId];

      // Clear waiting state immediately (no delay)
      setIsWaitingForSave(false);

      if (targetStep !== undefined) {
        const totalSteps = tutorialSteps[activeTutorial]?.length || 0;
        // Check if within bounds
        if (targetStep < totalSteps) {
          safelyUpdateTutorialState([
            [setCurrentStep, targetStep]
          ], async () => {
            await saveTutorialProgress(activeTutorial, targetStep);
          });
        } else {
          completeTutorial();
        }
      } else {
        nextStep();
      }
    }
  }, [isTutorialActive, activeTutorial, nextStep, safelyUpdateTutorialState, completeTutorial, saveTutorialProgress]);

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
      // Check if onboarding was completed, if so start tutorial, otherwise show modal
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            const onboardingCompleted = userData.onboardingCompleted || (userData.onboardingProgress && userData.onboardingProgress.completed);

            if (onboardingCompleted) {
              // Resume tutorial
              setTimeout(() => {
                if (startTutorialRef.current) {
                  startTutorialRef.current(activeTutorial || 'dashboard');
                }
              }, 100);
            } else {
              // Resume onboarding modal
              setShowFirstTimeModal(true);
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
    // If tutorial has been explicitly passed (e.g. Skipped), allow full access
    if (tutorialPassed) {
      return true;
    }

    // Bug Fix: If First Time Modal is showing, we should allow profile accessibility 
    // if the user is somehow clicking it or if they are in the transition phase.
    if (showFirstTimeModal) {
      return true;
    }

    // Check if we are in the initial onboarding/tutorial phase
    // This includes:
    // 1. First time modal showing
    // 2. Active tutorial (any)
    // 3. Paused tutorial
    // 4. Specifically, if profileTabs tutorial is NOT complete, we are in onboarding mode
    //    regardless of other flags, to ensure the lock persists until the end.
    const isProfileTutorialComplete = completedTutorials?.profileTabs === true;

    // If profile tutorial is complete, everything is accessible
    if (isProfileTutorialComplete) {
      return true;
    }

    // Extract the item name from the path
    const itemName = itemPath.split('/').pop();

    // 1. Dashboard/Overview is ALWAYS accessible
    if (itemName === 'overview') {
      return true;
    }

    // 2. Profile is accessible ONLY when:
    //    a) We are in 'profileTabs' tutorial
    //    b) We are in 'dashboard' tutorial AND step is >= 3 (navigate-to-profile)
    //    c) It was previously completed (though caught by isProfileTutorialComplete above, good for safety)
    if (itemName === 'profile') {
      const isAccessible =
        activeTutorial === 'profileTabs' ||
        (activeTutorial === 'dashboard' && currentStep >= 3) ||
        isProfileTutorialComplete;

      return isAccessible;
    }

    // 3. All other items are LOCKED until profile tutorial is complete
    return false;

  }, [activeTutorial, currentStep, completedTutorials, tutorialPassed, showFirstTimeModal]);

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
    if (activeTutorial === 'profileTabs') {
      // SYNC: Check if current URL matches any step's navigationPath and switch to it
      // This allows users to click tabs without getting stuck on previous steps
      // Use a ref to prevent infinite sync loops
      try {
        const steps = tutorialSteps['profileTabs'];
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
        console.log("[TutorialContext] Redirecting strict onboarding: Must be in profile");
        showWarning("Please complete your profile configuration to continue.");
        navigate('/dashboard/profile');
      }
      return;
    }

    // Case B: Dashboard Intro Tutorial
    if (activeTutorial === 'dashboard') {
      // Steps before "Navigate to Profile" (Step 3) -> Must stay on Overview
      if (currentStep < 3) {
        const isOverview = path === '/dashboard' || path === '/dashboard/' || path.includes('/dashboard/overview');
        if (!isOverview) {
          console.log("[TutorialContext] Redirecting strict onboarding: Must be in dashboard overview");
          showWarning("Please follow the onboarding guide.");
          navigate('/dashboard');
        }
      } else {
        // Step 3 (Navigate to Profile) -> allow Overview OR Profile
        // They need to click Profile, so we must allow Profile path.
        const isOverview = path === '/dashboard' || path === '/dashboard/' || path.includes('/dashboard/overview');
        const isProfile = path.includes('/dashboard/profile');

        if (isProfile) {
          console.log("[TutorialContext] User reached profile, completing dashboard tutorial");
          // Complete the dashboard tutorial as the goal (navigating to profile) is achieved
          completeTutorial();
          return;
        }

        if (!isOverview && !isProfile) {
          console.log("[TutorialContext] Redirecting strict onboarding: Invalid path during profile transition");
          showWarning("Please click on Profile to proceed.");
          navigate('/dashboard');
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
    completedTutorials,
    stepData,
    elementPosition,
    isBusy,
    isPaused,
    isWaitingForSave,
    isReady,
    sidebarWidth, // Expose sidebar width for overlay components
    onboardingType, // 'professional' or 'facility'

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
    setOnboardingType, // Allow changing onboarding type
    setWaitingForSave,
    onTabCompleted,
    isSidebarItemAccessible,
    forceUpdateElementPosition // Allow manual position refresh
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