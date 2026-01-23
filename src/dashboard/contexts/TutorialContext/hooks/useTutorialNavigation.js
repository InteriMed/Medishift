import { useEffect, useCallback } from 'react';
import { TUTORIAL_IDS, isProfileTutorial, getProfileTutorialForType, ONBOARDING_TYPES } from '../../../../config/tutorialSystem';

/**
 * Tutorial navigation and route guards
 * Handles navigation restrictions and sidebar accessibility during tutorials
 */
export const useTutorialNavigation = ({
    user,
    tutorialPassed,
    completedTutorials,
    activeTutorial,
    currentStep,
    isTutorialActive,
    isPaused,
    isBusy,
    isInDashboard,
    showFirstTimeModal,
    location,
    navigate,
    selectedWorkspace,
    showWarning,
    completeTutorial,
    setCurrentStep,
    setIsBusy,
    syncTimestampRef,
    tutorialSteps,
    accessLevelChoice,
    setShowAccessLevelModal,
    setAllowAccessLevelModalClose
}) => {

    /**
     * Check if a sidebar item is accessible based on tutorial progress
     */
    const isSidebarItemAccessible = useCallback((itemPath) => {
        // If tutorial has been explicitly passed, allow full access
        if (tutorialPassed) {
            return true;
        }

        // If First Time Modal is showing, strictly lock everything except overview and profile
        if (showFirstTimeModal) {
            return itemPath.includes('overview') || itemPath.includes('profile');
        }

        // Check if profile tutorial is complete
        const isProfileTutorialComplete = completedTutorials?.profileTabs === true || completedTutorials?.facilityProfileTabs === true;

        // If profile tutorial is complete, full access is restored
        if (isProfileTutorialComplete) {
            return true;
        }

        // Extract item name
        const itemName = itemPath.split('/').pop();

        // Dashboard/Overview is ALWAYS accessible
        if (itemName === 'overview') {
            return true;
        }

        // Profile is accessible BY DEFAULT during the tutorial flow
        if (itemName === 'profile') {
            return true;
        }

        // Other items follow tutorial advancement
        const tutorialOrder = ['overview', 'profile', TUTORIAL_IDS.MESSAGES, TUTORIAL_IDS.CONTRACTS, TUTORIAL_IDS.CALENDAR, TUTORIAL_IDS.MARKETPLACE, TUTORIAL_IDS.PAYROLL, TUTORIAL_IDS.ORGANIZATION, TUTORIAL_IDS.SETTINGS];
        const itemIndex = tutorialOrder.indexOf(itemName);

        if (itemIndex !== -1) {
            // If the current tutorial is this item, it's accessible
            if (activeTutorial === itemName || (itemName === 'profile' && isProfileTutorial(activeTutorial))) {
                return true;
            }

            // If previous item is completed, this one is accessible
            const prevItem = tutorialOrder[itemIndex - 1];
            const onboardingType = user?.role === 'facility' || user?.role === 'company' ? ONBOARDING_TYPES.FACILITY : ONBOARDING_TYPES.PROFESSIONAL;
            const prevTutorialKey = prevItem === 'profile' ? getProfileTutorialForType(onboardingType) : prevItem;
            if (completedTutorials[prevTutorialKey]) {
                return true;
            }
        }

        // Locked until progress reaches it
        return false;
    }, [activeTutorial, completedTutorials, tutorialPassed, showFirstTimeModal, user]);

    /**
     * Route guard: Enforce strict navigation during mandatory onboarding
     */
    useEffect(() => {
        // Safety & Exemption Checks
        if (!isInDashboard) return;
        if (tutorialPassed) return;
        if (!isTutorialActive) return;

        // Special Exception: Dashboard tutorial completion
        if (activeTutorial === TUTORIAL_IDS.DASHBOARD && currentStep >= 3 && location.pathname.includes('/dashboard/profile')) {
            if (isBusy) {
                setIsBusy(false);
                return;
            }

            completeTutorial();
            return;
        }

        // Pause allows temporary deviation
        if (isPaused || isBusy) return;

        const path = location.pathname;

        // Profile Tutorial - must stay in profile
        if (isProfileTutorial(activeTutorial)) {
            // URL Sync: Switch to matching step if user navigates directly
            try {
                const steps = tutorialSteps[activeTutorial];
                if (steps) {
                    const currentPath = location.pathname;
                    const matchingStepIndex = steps.findIndex(step =>
                        step.navigationPath && currentPath.includes(step.navigationPath)
                    );

                    const now = Date.now();
                    const lastSyncKey = `${matchingStepIndex}_${currentPath}`;
                    const lastSyncTime = syncTimestampRef.current[lastSyncKey] || 0;
                    const timeSinceLastSync = now - lastSyncTime;

                    if (matchingStepIndex !== -1 &&
                        matchingStepIndex !== currentStep &&
                        !isBusy &&
                        timeSinceLastSync > 500) {
                        syncTimestampRef.current[lastSyncKey] = now;
                        setCurrentStep(matchingStepIndex);
                        return;
                    }
                }
            } catch (err) {
                // Error syncing tutorial step
            }

            if (!path.includes('/dashboard/profile')) {
                if (accessLevelChoice === 'full' && currentStep >= 1) {
                    setAllowAccessLevelModalClose(true);
                    setShowAccessLevelModal(true);
                }
                
                showWarning("Please complete your profile configuration to continue.");
                const profileUrl = selectedWorkspace?.id
                    ? `/dashboard/profile?workspace=${selectedWorkspace.id}`
                    : '/dashboard/profile';
                navigate(profileUrl);
            }
            return;
        }

        // Dashboard Tutorial
        if (activeTutorial === TUTORIAL_IDS.DASHBOARD) {
            const isOverview = path === '/dashboard' || path === '/dashboard/' || path.includes('/dashboard/overview');
            const isProfile = path.includes('/dashboard/profile');

            if (isProfile) {
                if (currentStep >= 3) {
                    completeTutorial();
                }
                return;
            }

            if (currentStep < 3) {
                if (!isOverview) {
                    showWarning("Please follow the onboarding guide.");
                    const dashboardUrl = selectedWorkspace?.id
                        ? `/dashboard?workspace=${selectedWorkspace.id}`
                        : '/dashboard';
                    navigate(dashboardUrl);
                }
            } else {
                if (!isOverview && !isProfile) {
                    showWarning("Please click on Profile to proceed.");
                    const dashboardUrl = selectedWorkspace?.id
                        ? `/dashboard?workspace=${selectedWorkspace.id}`
                        : '/dashboard';
                    navigate(dashboardUrl);
                }
            }
            return;
        }
    }, [
        isTutorialActive, tutorialPassed, isPaused, isBusy, activeTutorial, currentStep,
        location.pathname, navigate, isInDashboard, showWarning, completeTutorial,
        selectedWorkspace, setCurrentStep, setIsBusy, syncTimestampRef, tutorialSteps
    ]);

    return {
        isSidebarItemAccessible
    };
};
