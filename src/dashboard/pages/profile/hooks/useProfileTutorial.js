import { useEffect, useRef } from 'react';
import { useTutorial } from '../../../contexts/TutorialContext';
import { useLocation } from 'react-router-dom';

export const useProfileTutorial = (formData) => {
    const { tutorialPassed, startTutorial, activeTutorial, completedTutorials, isTutorialActive, stepData, onTabCompleted, maxAccessedProfileTab } = useTutorial();
    const location = useLocation();
    const profileTutorialStartedRef = useRef(false);

    useEffect(() => {
        const isFacility = formData?.role === 'facility' || formData?.role === 'company';
        const tutorialName = isFacility ? 'facilityProfileTabs' : 'profileTabs';
        const isTutorialComplete = isFacility
            ? completedTutorials?.facilityProfileTabs
            : completedTutorials?.profileTabs;
        const isInTutorial = activeTutorial === 'profileTabs' || activeTutorial === 'facilityProfileTabs';

        const shouldStartProfileTutorial =
            formData &&
            !tutorialPassed &&
            !isTutorialComplete &&
            !isInTutorial &&
            !profileTutorialStartedRef.current &&
            (activeTutorial === 'dashboard' || location.pathname.includes('/profile'));

        if (shouldStartProfileTutorial) {
            const timer = setTimeout(() => {
                profileTutorialStartedRef.current = true;
                startTutorial(tutorialName);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [tutorialPassed, activeTutorial, startTutorial, formData, completedTutorials, location.pathname]);

    return {
        isTutorialActive,
        activeTutorial,
        stepData,
        onTabCompleted,
        maxAccessedProfileTab
    };
};

