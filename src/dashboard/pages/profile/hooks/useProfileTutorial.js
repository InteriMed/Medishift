import { useTutorial } from '../../../contexts/TutorialContext';

// AUTO-START REMOVED: Tutorial must be started manually by user clicking the header button
export const useProfileTutorial = () => {
    const { isTutorialActive, activeTutorial, stepData, onTabCompleted, maxAccessedProfileTab, syncProfileInitialState } = useTutorial();

    return {
        isTutorialActive,
        activeTutorial,
        stepData,
        onTabCompleted,
        maxAccessedProfileTab,
        syncProfileInitialState
    };
};
