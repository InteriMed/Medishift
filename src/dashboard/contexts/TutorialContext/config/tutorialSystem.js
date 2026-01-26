export { LOCALSTORAGE_KEYS } from '../../../../config/keysDatabase';

export * from './tutorialConfig';

export { 
    isOnCorrectPage,
    getPathForTutorial,
    getRouteForTutorial,
    TUTORIAL_TO_ROUTE_MAP
} from './tutorialConfig';

export const getTutorialStepWithTranslation = (tutorialId, stepId, t) => {
    const { getStepById } = require('./tutorialConfig');
    const step = getStepById(tutorialId, stepId);
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
    const { getTutorialSteps } = require('./tutorialConfig');
    const steps = getTutorialSteps(tutorialId);

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
