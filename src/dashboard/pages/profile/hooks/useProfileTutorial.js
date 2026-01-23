import { useEffect, useRef } from 'react';
import { useTutorial } from '../../../contexts/TutorialContext';
import { useLocation } from 'react-router-dom';
import { TUTORIAL_IDS, isProfileTutorial, getProfileTutorialForType, ONBOARDING_TYPES } from '../../../../config/tutorialSystem';

export const useProfileTutorial = (formData) => {
    const { tutorialPassed, startTutorial, activeTutorial, completedTutorials, isTutorialActive, stepData, onTabCompleted, maxAccessedProfileTab } = useTutorial();
    const location = useLocation();
    const profileTutorialStartedRef = useRef(false);

    useEffect(() => {
        const isFacility = formData?.role === 'facility' || formData?.role === 'company';
        const onboardingType = isFacility ? ONBOARDING_TYPES.FACILITY : ONBOARDING_TYPES.PROFESSIONAL;
        const tutorialName = getProfileTutorialForType(onboardingType);
        const isTutorialComplete = isFacility
            ? completedTutorials?.[TUTORIAL_IDS.FACILITY_PROFILE_TABS]
            : completedTutorials?.[TUTORIAL_IDS.PROFILE_TABS];
        const isInTutorial = isProfileTutorial(activeTutorial);

        const shouldStartProfileTutorial =
            formData &&
            !tutorialPassed &&
            !isTutorialComplete &&
            !isInTutorial &&
            !profileTutorialStartedRef.current &&
            (activeTutorial === TUTORIAL_IDS.DASHBOARD || location.pathname.includes('/profile'));

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

