import { useEffect, useRef } from 'react';
import { useTutorial } from '../../../contexts/TutorialContext';
import { useLocation } from 'react-router-dom';
import { TUTORIAL_IDS, isProfileTutorial, getProfileTutorialForType, ONBOARDING_TYPES } from '../../../../config/tutorialSystem';

export const useProfileTutorial = (formData) => {
    const { tutorialPassed, startTutorial, activeTutorial, completedTutorials, isTutorialActive, stepData, onTabCompleted, maxAccessedProfileTab, accessLevelChoice } = useTutorial();
    const location = useLocation();
    const profileTutorialStartedRef = useRef(false);

    useEffect(() => {
        // AUTO-START CONDITIONS:
        // 1. accessLevelChoice is NOT 'team' or 'full' (ongoing/missing/loading)
        // 2. User is NOT in tutorial (isTutorialActive === false)
        
        const hasNoAccessChoice = !accessLevelChoice || (accessLevelChoice !== 'team' && accessLevelChoice !== 'full');
        
        if (!hasNoAccessChoice || isTutorialActive) {
            // Skip auto-start if user has team/full access OR already in tutorial
            return;
        }

        const isFacility = formData?.role === 'facility' || formData?.role === 'company';
        const onboardingType = isFacility ? ONBOARDING_TYPES.FACILITY : ONBOARDING_TYPES.PROFESSIONAL;
        const tutorialName = getProfileTutorialForType(onboardingType);
        const isTutorialComplete = isFacility
            ? completedTutorials?.[TUTORIAL_IDS.FACILITY_PROFILE_TABS]
            : completedTutorials?.[TUTORIAL_IDS.PROFILE_TABS];
        const isInTutorial = isProfileTutorial(activeTutorial);

        // Skip auto-start on account/settings tabs - these are end-of-tutorial tabs
        const currentTab = location.pathname.split('/').pop();
        if (currentTab === 'account' || currentTab === 'settings') {
            return;
        }

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
    }, [tutorialPassed, activeTutorial, startTutorial, formData, completedTutorials, location.pathname, accessLevelChoice, isTutorialActive]);

    return {
        isTutorialActive,
        activeTutorial,
        stepData,
        onTabCompleted,
        maxAccessedProfileTab
    };
};

