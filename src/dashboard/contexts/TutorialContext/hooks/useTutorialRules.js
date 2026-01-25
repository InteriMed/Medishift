import { useCallback } from 'react';
import { isTabCompleted } from '../../../pages/profile/Profile';
import {
    TUTORIAL_IDS,
    PROFILE_TAB_IDS,
    isProfileTutorial,
    normalizePathForComparison,
    isProfilePath,
    PLATFORM_FEATURES,
    WORKSPACE_TYPES,
    evaluateFeatureAccess
} from '../../../../config/tutorialSystem';

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
        normalizePathForComparison(path), []);

    // Check if a sidebar item is accessible
    const isSidebarItemAccessible = useCallback((itemPath) => {
        const itemName = itemPath.split('/').pop();

        // Prepare context for evaluation - map hook props to expected context keys
        const context = {
            tutorialPassed,
            isTutorialActive,
            activeTutorial,
            currentStep,
            accessMode: access, // Rename 'access' to 'accessMode'
            workspaceType: selectedWorkspace?.type,
            completedTutorials
        };

        return evaluateFeatureAccess(itemName, context);
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
        } else if (isProfilePath(normalizedRequiredPath) && isProfilePath(normalizedCurrentPath)) {
            const requiredTab = currentStepData.requiredTab || currentStepData.highlightTab;
            if (currentStepData.highlightTab) {
                isOnCorrectPage = true;
            } else if (requiredTab) {
                const currentTab = normalizedCurrentPath.split('/').pop();
                if (currentTab === requiredTab || normalizedCurrentPath.endsWith(`/${requiredTab}`)) {
                    isOnCorrectPage = true;
                } else if (normalizedCurrentPath === '/dashboard/profile' && requiredTab === PROFILE_TAB_IDS.PERSONAL_DETAILS) {
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
