import { useEffect } from 'react';
import { TUTORIAL_IDS, isProfilePath } from '../config/tutorialSystem';

export const useDashboardSection = (state, actions) => {
    const {
        activeTutorial,
        isTutorialActive,
        currentStep,
        isBusy,
        selectedWorkspace,
        navigate,
        location
    } = state;

    const {
        completeTutorial,
        showWarning
    } = actions;

    useEffect(() => {
        // Only run for Dashboard Tutorial
        if (activeTutorial !== TUTORIAL_IDS.DASHBOARD || !isTutorialActive || isBusy) return;

        const path = location.pathname;
        const isProfile = isProfilePath(path);

        // Completion logic can remain, but redirects are removed.
        if (isProfile && currentStep >= 3) {
            completeTutorial();
        }
    }, [isTutorialActive, activeTutorial, currentStep, isBusy, location.pathname, selectedWorkspace, completeTutorial, navigate]);

};
