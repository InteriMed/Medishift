import { useCallback } from 'react';
import { isSidebarItemAccessible as checkAccess } from '../config/tutorialSystem';

export const useSidebarAccess = (state) => {
    const {
        tutorialPassed,
        user,
        selectedWorkspace,
        accessLevelChoice,
        showFirstTimeModal,
        completedTutorials,
        activeTutorial,
        onboardingType,
        isTutorialActive,
        currentStep
    } = state;

    const isSidebarItemAccessible = useCallback((itemPath) => {
        return checkAccess(itemPath, {
            tutorialPassed,
            isTutorialActive,
            activeTutorial,
            currentStep,
            accessMode: accessLevelChoice,
            workspaceType: selectedWorkspace?.type,
            completedTutorials,
            showFirstTimeModal,
            user,
            onboardingType
        });
    }, [tutorialPassed, isTutorialActive, activeTutorial, currentStep, accessLevelChoice, 
        selectedWorkspace, completedTutorials, showFirstTimeModal, user, onboardingType]);

    return { isSidebarItemAccessible };
};
