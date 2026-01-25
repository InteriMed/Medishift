import { useCallback } from 'react';
import { TUTORIAL_IDS, getProfileTutorialForType, isProfileTutorial, WORKSPACE_TYPES } from '../../../../config/tutorialSystem';

export const useSidebarAccess = (state) => {
    const {
        tutorialPassed,
        user,
        selectedWorkspace,
        accessLevelChoice,
        showFirstTimeModal,
        completedTutorials,
        activeTutorial,
        onboardingType
    } = state;

    const isSidebarItemAccessible = useCallback((itemPath) => {
        const isAdmin = !!(user?.adminData && user?.adminData.isActive !== false);
        if (isAdmin) {
            return true;
        }

        const itemName = itemPath.split('/').pop();
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

    }, [activeTutorial, completedTutorials, tutorialPassed, showFirstTimeModal, accessLevelChoice, selectedWorkspace, user, onboardingType]);

    return { isSidebarItemAccessible };
};
