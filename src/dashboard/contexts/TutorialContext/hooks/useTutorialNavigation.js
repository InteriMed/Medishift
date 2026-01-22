import { useEffect, useCallback } from 'react';

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
    accessMode,
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
        const tutorialOrder = ['overview', 'profile', 'messages', 'contracts', 'calendar', 'marketplace', 'payroll', 'organization', 'settings'];
        const itemIndex = tutorialOrder.indexOf(itemName);

        if (itemIndex !== -1) {
            // If the current tutorial is this item, it's accessible
            if (activeTutorial === itemName || (itemName === 'profile' && (activeTutorial === 'profileTabs' || activeTutorial === 'facilityProfileTabs'))) {
                return true;
            }

            // If previous item is completed, this one is accessible
            const prevItem = tutorialOrder[itemIndex - 1];
            const prevTutorialKey = prevItem === 'profile' ? (user?.role === 'facility' || user?.role === 'company' ? 'facilityProfileTabs' : 'profileTabs') : prevItem;
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
        if (activeTutorial === 'dashboard' && currentStep >= 3 && location.pathname.includes('/dashboard/profile')) {
            console.log("[useTutorialNavigation] User reached profile, completing dashboard tutorial");

            if (isBusy) {
                console.log("[useTutorialNavigation] Bypassing busy flag for completion");
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
        if (activeTutorial === 'profileTabs' || activeTutorial === 'facilityProfileTabs') {
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
                        console.log(`[useTutorialNavigation] URL Sync: Switching to step ${matchingStepIndex} for path ${currentPath}`);
                        syncTimestampRef.current[lastSyncKey] = now;
                        setCurrentStep(matchingStepIndex);
                        return;
                    }
                }
            } catch (err) {
                console.error('[useTutorialNavigation] Error syncing tutorial step:', err);
            }

            if (!path.includes('/dashboard/profile')) {
                console.log("[useTutorialNavigation] User trying to leave profile during tutorial, showing Access Level popup");
                
                if (accessMode === 'full' && currentStep >= 1) {
                    console.log("[useTutorialNavigation] Full access selected, showing Access Level popup");
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
        if (activeTutorial === 'dashboard') {
            const isOverview = path === '/dashboard' || path === '/dashboard/' || path.includes('/dashboard/overview');
            const isProfile = path.includes('/dashboard/profile');

            if (isProfile) {
                console.log("[useTutorialNavigation] Profile access allowed during dashboard tutorial");
                if (currentStep >= 3) {
                    console.log("[useTutorialNavigation] User reached profile, completing dashboard tutorial");
                    completeTutorial();
                }
                return;
            }

            if (currentStep < 3) {
                if (!isOverview) {
                    console.log("[useTutorialNavigation] Redirecting to dashboard overview");
                    showWarning("Please follow the onboarding guide.");
                    const dashboardUrl = selectedWorkspace?.id
                        ? `/dashboard?workspace=${selectedWorkspace.id}`
                        : '/dashboard';
                    navigate(dashboardUrl);
                }
            } else {
                if (!isOverview && !isProfile) {
                    console.log("[useTutorialNavigation] Redirecting to dashboard");
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
