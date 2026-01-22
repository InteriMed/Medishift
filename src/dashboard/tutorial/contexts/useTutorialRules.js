import { useCallback } from 'react';
import { isTabCompleted } from '../../../pages/profile/Profile';
import { tutorialSteps } from '../tutorialSteps';

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

    const normalizeForComparison = useCallback((path) =>
        path.replace(/^\/(en|fr|de|it)\//, '/'), []);

    const isSidebarItemAccessible = useCallback((itemPath) => {
        const itemName = itemPath.split('/').pop();
        const path = itemPath.startsWith('/') ? itemPath.substring(1).split('/')[1] : itemName;
        const isFacilityWorkspace = selectedWorkspace?.type === 'team';

        if (itemName === 'overview' || itemName === 'dashboard') {
            return true;
        }

        if (itemName === 'profile') {
            return activeTutorial === 'profileTabs' ||
                activeTutorial === 'facilityProfileTabs' ||
                (activeTutorial === 'dashboard' && currentStep >= 2) ||
                !isTutorialActive ||
                tutorialPassed;
        }

        const platformFeatures = ['messages', 'contracts', 'calendar', 'marketplace', 'organization', 'settings', 'payroll'];

        if (platformFeatures.includes(itemName)) {
            if (access === 'full') return true;

            if (access === 'team') {
                if (isFacilityWorkspace) {
                    return true;
                } else {
                    if (itemName === 'marketplace') return false;
                    return true;
                }
            }

            return false;
        }

        return true;
    }, [tutorialPassed, isTutorialActive, activeTutorial, currentStep, completedTutorials, access, selectedWorkspace]);

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

    const getNextIncompleteTabStep = useCallback((currentTabId, steps) => {
        if (!profileConfig || !userProfile) return -1;

        const tabOrder = profileConfig.tabs?.map(t => t.id).filter(id => id !== 'deleteAccount') || [];
        const currentTabIndex = tabOrder.indexOf(currentTabId);
        let nextTabIndex = currentTabIndex + 1;

        while (nextTabIndex < tabOrder.length) {
            const nextTabId = tabOrder[nextTabIndex];
            if (nextTabId === 'professionalBackground' || !isTabCompleted(userProfile, nextTabId, profileConfig)) {
                const targetStepIndex = steps.findIndex(step =>
                    step.requiredTab === nextTabId || step.highlightTab === nextTabId
                );
                if (targetStepIndex !== -1) return targetStepIndex;
            }
            nextTabIndex++;
        }

        return -1;
    }, [profileConfig, userProfile]);

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

