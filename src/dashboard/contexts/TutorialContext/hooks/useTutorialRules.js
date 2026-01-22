import { useCallback } from 'react';
import { isTabCompleted } from '../../../pages/profile/Profile';
import { tutorialSteps } from '../config/tutorialSteps';

export const useTutorialRules = ({
    isTutorialActive,
    activeTutorial,
    currentStep,
    userProfile,
    profileConfig,
    tutorialPassed,
    completedTutorials,
    location,
    tutorialMode,
    access,
    selectedWorkspace
}) => {


    // Normalize path for comparison
    const normalizeForComparison = useCallback((path) =>
        path.replace(/^\/(en|fr|de|it)\//, '/'), []);

    // Check if a sidebar item is accessible
    const isSidebarItemAccessible = useCallback((itemPath) => {
        const itemName = itemPath.split('/').pop();
        const path = itemPath.startsWith('/') ? itemPath.substring(1).split('/')[1] : itemName;
        const isFacilityWorkspace = selectedWorkspace?.type === 'team';

        // Dashboard/Overview always accessible
        if (itemName === 'overview' || itemName === 'dashboard') {
            return true;
        }

        // Profile accessible during profile tutorial or after
        if (itemName === 'profile') {
            return activeTutorial === 'profileTabs' ||
                activeTutorial === 'facilityProfileTabs' ||
                (activeTutorial === 'dashboard' && currentStep >= 2) ||
                !isTutorialActive ||
                tutorialPassed;
        }

        // --- PLATFORM FEATURES: Require full access ---
        // All platform features (Messages, Contracts, Calendar, Marketplace, Organization, Settings)
        // are locked until user completes full profile and gets full access
        const platformFeatures = ['messages', 'contracts', 'calendar', 'marketplace', 'organization', 'settings', 'payroll'];

        if (platformFeatures.includes(itemName)) {
            // Full access unlocks everything
            if (access === 'full') return true;

            // Team Access Logic
            if (access === 'team') {
                if (isFacilityWorkspace) {
                    // Facility: Everything unlocked at Team access
                    return true;
                } else {
                    // Professional: Everything unlocked EXCEPT Marketplace
                    if (itemName === 'marketplace') return false;
                    return true;
                }
            }

            // Otherwise, platform features are locked
            return false;
        }

        // Any other items are accessible by default
        return true;
    }, [tutorialPassed, isTutorialActive, activeTutorial, currentStep, completedTutorials, access, selectedWorkspace]);

    // Check if user is on the correct page for the current step
    const checkPageAlignment = useCallback((currentStepData) => {
        const requiredPath = currentStepData.navigationPath || currentStepData.requiredPage;
        if (!requiredPath) return { isOnCorrectPage: true };

        const currentPath = location.pathname;
        const normalizedCurrentPath = normalizeForComparison(currentPath);
        const normalizedRequiredPath = normalizeForComparison(requiredPath);

        let isOnCorrectPage = false;
        if (normalizedRequiredPath === normalizedCurrentPath) {
            isOnCorrectPage = true;
        } else if (normalizedCurrentPath.startsWith(normalizedRequiredPath + '/')) {
            isOnCorrectPage = true;
        } else if (normalizedRequiredPath === '/dashboard/overview') {
            if (normalizedCurrentPath === '/dashboard' ||
                normalizedCurrentPath === '/dashboard/' ||
                normalizedCurrentPath.startsWith('/dashboard/overview')) {
                isOnCorrectPage = true;
            }
        } else if (normalizedRequiredPath.includes('/dashboard/profile') && normalizedCurrentPath.includes('/dashboard/profile')) {
            const requiredTab = currentStepData.requiredTab || currentStepData.highlightTab;
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

        return { isOnCorrectPage, normalizedCurrentPath, normalizedRequiredPath };
    }, [location.pathname, normalizeForComparison]);

    // Find the next incomplete tab step
    const getNextIncompleteTabStep = useCallback((currentTabId, steps) => {
        if (!profileConfig || !userProfile) return -1;

        const tabOrder = profileConfig.tabs?.map(t => t.id).filter(id => id !== 'deleteAccount') || [];
        const currentTabIndex = tabOrder.indexOf(currentTabId);
        let nextTabIndex = currentTabIndex + 1;

        while (nextTabIndex < tabOrder.length) {
            const nextTabId = tabOrder[nextTabIndex];
            // Treat professionalBackground as "incomplete" for skip logic purposes, so we don't jump over it
            if (nextTabId === 'professionalBackground' || !isTabCompleted(userProfile, nextTabId, profileConfig)) {
                const targetStepIndex = steps.findIndex(step =>
                    step.requiredTab === nextTabId || step.highlightTab === nextTabId
                );
                if (targetStepIndex !== -1) return targetStepIndex;
            }
            nextTabIndex++;
        }

        return -1; // All subsequent tabs complete
    }, [profileConfig, userProfile]);

    // Process step data for display (always return data to ensure highlight rendering)
    const getProcessedStepData = useCallback((currentStepData) => {
        return currentStepData;
    }, []);

    return {
        isSidebarItemAccessible,
        checkPageAlignment,
        getNextIncompleteTabStep,
        normalizeForComparison,
        getProcessedStepData
    };
};

export default useTutorialRules;
