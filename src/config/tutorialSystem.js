export {
    TUTORIAL_IDS,
    TUTORIAL_MODES,
    ACCESS_MODES,
    ONBOARDING_TYPES,
    TARGET_AREAS,
    BUTTON_ACTIONS,
    PROFILE_TAB_IDS,
    TUTORIAL_STEP_DEFINITIONS,
    getTutorialSteps,
    getStepById,
    getStepIndex,
    getTotalSteps,
    isLastStep,
    isFirstStep
} from './tutorialConfig';

export {
    TUTORIAL_SEQUENCES,
    getSequenceForType,
    getMandatoryTutorials,
    getNextTutorial,
    getFirstIncompleteTutorial,
    getTutorialIndex,
    isTutorialMandatory,
    isTutorialSkippable,
    areAllMandatoryComplete,
    getCompletionPercentage,
    getProfileTutorialForType,
    isProfileTutorial
} from './tutorialSequences';

export {
    WORKSPACE_TYPES,
    FEATURE_ACCESS_RULES,
    TEAM_ACCESS_LOCKED_TABS,
    PLATFORM_FEATURES,
    evaluateFeatureAccess,
    isSidebarItemAccessible,
    isProfileTabAccessible,
    shouldShowAccessLevelChoice,
    canNavigateDuringTutorial,
    getLockedFeatures,
    getAccessibleFeatures
} from './tutorialAccessRules';

export {
    DASHBOARD_PATHS,
    PROFILE_TAB_PATHS,
    TUTORIAL_TO_ROUTE_MAP,
    SIDEBAR_ITEM_SELECTORS,
    buildTutorialDashboardPath,
    buildProfileTabPath,
    buildSidebarSelector,
    buildTabSelector,
    getRouteForTutorial,
    getPathForTutorial,
    normalizePathForComparison,
    isOnCorrectPage,
    extractFeatureFromPath,
    extractTabFromPath,
    isDashboardPath,
    isProfilePath
} from './tutorialRoutes';

export const getTutorialStepWithTranslation = (tutorialId, stepId, t) => {
    const { getStepById: getStep } = require('./tutorialConfig');
    const step = getStep(tutorialId, stepId);
    
    if (!step) return null;
    
    const translationKey = `tutorials.${tutorialId}.steps.${stepId}`;
    const title = t(`${translationKey}.title`, { ns: 'tutorial' });
    const content = t(`${translationKey}.content`, { ns: 'tutorial' });
    
    return {
        ...step,
        title: title !== `${translationKey}.title` ? title : step.title,
        content: content !== `${translationKey}.content` ? content : step.content
    };
};

export const getTutorialStepsWithTranslations = (tutorialId, t) => {
    const { getTutorialSteps: getSteps } = require('./tutorialConfig');
    const steps = getSteps(tutorialId);
    
    return steps.map(step => {
        const translationKey = `tutorials.${tutorialId}.steps.${step.id}`;
        const title = t(`${translationKey}.title`, { ns: 'tutorial' });
        const content = t(`${translationKey}.content`, { ns: 'tutorial' });
        
        return {
            ...step,
            title: title !== `${translationKey}.title` ? title : undefined,
            content: content !== `${translationKey}.content` ? content : undefined
        };
    });
};

export const getButtonText = (textKey, t) => {
    const translated = t(textKey, { ns: 'tutorial' });
    return translated !== textKey ? translated : textKey.split('.').pop();
};

export const createTutorialContext = (context) => {
    const {
        tutorialPassed = false,
        isTutorialActive = false,
        activeTutorial = null,
        currentStep = 0,
        accessMode = null,
        workspaceType = null,
        completedTutorials = {},
        maxAccessedProfileTab = null,
        showFirstTimeModal = false
    } = context;

    return {
        tutorialPassed,
        isTutorialActive,
        activeTutorial,
        currentStep,
        accessMode,
        workspaceType,
        completedTutorials,
        maxAccessedProfileTab,
        showFirstTimeModal
    };
};

export default {
    getTutorialStepWithTranslation,
    getTutorialStepsWithTranslations,
    getButtonText,
    createTutorialContext
};

