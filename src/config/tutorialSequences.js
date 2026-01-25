import { TUTORIAL_IDS, ONBOARDING_TYPES } from './tutorialConfig';

export const TUTORIAL_SEQUENCES = {
    [ONBOARDING_TYPES.PROFESSIONAL]: {
        mandatory: [
            { 
                id: TUTORIAL_IDS.PROFILE_TABS, 
                skippable: false,
                completionTriggers: ['allTabsComplete', 'manualComplete'],
                nextTutorial: TUTORIAL_IDS.DASHBOARD
            },
            { 
                id: TUTORIAL_IDS.DASHBOARD, 
                skippable: false,
                nextTutorial: TUTORIAL_IDS.MESSAGES
            },
            { 
                id: TUTORIAL_IDS.MESSAGES, 
                skippable: true,
                nextTutorial: TUTORIAL_IDS.CONTRACTS
            },
            { 
                id: TUTORIAL_IDS.CONTRACTS, 
                skippable: true,
                nextTutorial: TUTORIAL_IDS.CALENDAR
            },
            { 
                id: TUTORIAL_IDS.CALENDAR, 
                skippable: true,
                nextTutorial: TUTORIAL_IDS.MARKETPLACE
            },
            { 
                id: TUTORIAL_IDS.MARKETPLACE, 
                skippable: true,
                nextTutorial: TUTORIAL_IDS.ACCOUNT
            },
            { 
                id: TUTORIAL_IDS.ACCOUNT, 
                skippable: true,
                nextTutorial: null
            }
        ],
        optional: [
            { id: TUTORIAL_IDS.PROFILE }
        ]
    },
    [ONBOARDING_TYPES.FACILITY]: {
        mandatory: [
            { 
                id: TUTORIAL_IDS.FACILITY_PROFILE_TABS, 
                skippable: false,
                completionTriggers: ['allTabsComplete', 'manualComplete'],
                nextTutorial: TUTORIAL_IDS.DASHBOARD
            },
            { 
                id: TUTORIAL_IDS.DASHBOARD, 
                skippable: false,
                nextTutorial: TUTORIAL_IDS.MESSAGES
            },
            { 
                id: TUTORIAL_IDS.MESSAGES, 
                skippable: true,
                nextTutorial: TUTORIAL_IDS.CONTRACTS
            },
            { 
                id: TUTORIAL_IDS.CONTRACTS, 
                skippable: true,
                nextTutorial: TUTORIAL_IDS.CALENDAR
            },
            { 
                id: TUTORIAL_IDS.CALENDAR, 
                skippable: true,
                nextTutorial: TUTORIAL_IDS.PAYROLL
            },
            { 
                id: TUTORIAL_IDS.PAYROLL, 
                skippable: true,
                nextTutorial: TUTORIAL_IDS.ORGANIZATION
            },
            { 
                id: TUTORIAL_IDS.ORGANIZATION, 
                skippable: true,
                nextTutorial: TUTORIAL_IDS.ACCOUNT
            },
            { 
                id: TUTORIAL_IDS.ACCOUNT, 
                skippable: true,
                nextTutorial: null
            }
        ],
        optional: [
            { id: TUTORIAL_IDS.PROFILE }
        ]
    }
};

export const getSequenceForType = (onboardingType) => {
    return TUTORIAL_SEQUENCES[onboardingType] || TUTORIAL_SEQUENCES[ONBOARDING_TYPES.PROFESSIONAL];
};

export const getMandatoryTutorials = (onboardingType) => {
    const sequence = getSequenceForType(onboardingType);
    return sequence.mandatory.map(t => t.id);
};

export const getNextTutorial = (currentTutorialId, onboardingType, completedTutorials = {}) => {
    const sequence = getSequenceForType(onboardingType);
    const currentTutorial = sequence.mandatory.find(t => t.id === currentTutorialId);
    
    if (!currentTutorial) return null;
    
    if (currentTutorial.nextTutorial) {
        if (!completedTutorials[currentTutorial.nextTutorial]) {
            return currentTutorial.nextTutorial;
        }
        return getNextTutorial(currentTutorial.nextTutorial, onboardingType, completedTutorials);
    }
    
    return null;
};

export const getFirstIncompleteTutorial = (onboardingType, completedTutorials = {}) => {
    const sequence = getSequenceForType(onboardingType);
    
    for (const tutorial of sequence.mandatory) {
        if (!completedTutorials[tutorial.id]) {
            return tutorial.id;
        }
    }
    
    return null;
};

export const getTutorialIndex = (tutorialId, onboardingType) => {
    const sequence = getSequenceForType(onboardingType);
    return sequence.mandatory.findIndex(t => t.id === tutorialId);
};

export const isTutorialMandatory = (tutorialId, onboardingType) => {
    const sequence = getSequenceForType(onboardingType);
    return sequence.mandatory.some(t => t.id === tutorialId);
};

export const isTutorialSkippable = (tutorialId, onboardingType) => {
    const sequence = getSequenceForType(onboardingType);
    const tutorial = sequence.mandatory.find(t => t.id === tutorialId);
    return tutorial?.skippable ?? true;
};

export const areAllMandatoryComplete = (onboardingType, completedTutorials = {}) => {
    const mandatoryIds = getMandatoryTutorials(onboardingType);
    return mandatoryIds.every(id => completedTutorials[id] === true);
};

export const getCompletionPercentage = (onboardingType, completedTutorials = {}) => {
    const mandatoryIds = getMandatoryTutorials(onboardingType);
    const completedCount = mandatoryIds.filter(id => completedTutorials[id] === true).length;
    return Math.round((completedCount / mandatoryIds.length) * 100);
};

export const getProfileTutorialForType = (onboardingType) => {
    return onboardingType === ONBOARDING_TYPES.FACILITY 
        ? TUTORIAL_IDS.FACILITY_PROFILE_TABS 
        : TUTORIAL_IDS.PROFILE_TABS;
};

export const isProfileTutorial = (tutorialId) => {
    return tutorialId === TUTORIAL_IDS.PROFILE_TABS || tutorialId === TUTORIAL_IDS.FACILITY_PROFILE_TABS;
};

export default {
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
};

