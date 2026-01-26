export const useProfileTutorial = () => {
    return {
        isTutorialActive: false,
        activeTutorial: null,
        stepData: null,
        onTabCompleted: () => {},
        maxAccessedProfileTab: null,
        syncProfileInitialState: () => {}
    };
};
