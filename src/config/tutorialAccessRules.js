import { TUTORIAL_IDS, ACCESS_MODES, PROFILE_TAB_IDS, getTabOrder } from './tutorialConfig';
import { isProfileTutorial } from './tutorialSequences';

export const WORKSPACE_TYPES = {
    PERSONAL: 'personal',
    TEAM: 'team',
    ADMIN: 'admin'
};

export const FEATURE_ACCESS_RULES = {
    overview: {
        alwaysAccessible: true
    },
    dashboard: {
        alwaysAccessible: true
    },
    profile: {
        accessibleWhen: [
            { tutorialPassed: true },
            { tutorialNotActive: true },
            { activeTutorial: [TUTORIAL_IDS.PROFILE_TABS, TUTORIAL_IDS.FACILITY_PROFILE_TABS] },
            { tutorialCondition: { tutorial: TUTORIAL_IDS.DASHBOARD, minStep: 2 } }
        ]
    },
    messages: {
        requiresAccess: [ACCESS_MODES.FULL],
        orTutorialPassed: true,
        workspaceRestrictions: null
    },
    contracts: {
        requiresAccess: [ACCESS_MODES.FULL],
        orTutorialPassed: true,
        workspaceRestrictions: null
    },
    calendar: {
        requiresAccess: [ACCESS_MODES.FULL],
        orTutorialPassed: true,
        workspaceRestrictions: null
    },
    marketplace: {
        requiresAccess: [ACCESS_MODES.FULL],
        orTutorialPassed: true,
        workspaceRestrictions: {
            [WORKSPACE_TYPES.TEAM]: false
        }
    },
    payroll: {
        requiresAccess: [ACCESS_MODES.FULL, ACCESS_MODES.TEAM],
        orTutorialPassed: true,
        workspaceRestrictions: {
            [WORKSPACE_TYPES.PERSONAL]: false,
            [WORKSPACE_TYPES.TEAM]: true
        }
    },
    organization: {
        requiresAccess: [ACCESS_MODES.FULL, ACCESS_MODES.TEAM],
        orTutorialPassed: true,
        workspaceRestrictions: {
            [WORKSPACE_TYPES.PERSONAL]: false,
            [WORKSPACE_TYPES.TEAM]: true
        }
    },
    settings: {
        requiresAccess: [ACCESS_MODES.FULL],
        orTutorialPassed: true,
        workspaceRestrictions: null
    }
};

export const TEAM_ACCESS_LOCKED_TABS = [
    PROFILE_TAB_IDS.PROFESSIONAL_BACKGROUND,
    PROFILE_TAB_IDS.BILLING_INFORMATION,
    PROFILE_TAB_IDS.DOCUMENT_UPLOADS
];

export const PLATFORM_FEATURES = [
    'messages',
    'contracts',
    'calendar',
    'marketplace',
    'organization',
    'settings',
    'payroll'
];

export const evaluateFeatureAccess = (featureName, context) => {
    const {
        tutorialPassed,
        isTutorialActive,
        activeTutorial,
        currentStep,
        accessMode,
        workspaceType,
        completedTutorials
    } = context;

    const rule = FEATURE_ACCESS_RULES[featureName];

    if (!rule) {
        return true;
    }

    if (rule.alwaysAccessible) {
        return true;
    }

    if (tutorialPassed) {
        return true;
    }

    if (rule.accessibleWhen) {
        for (const condition of rule.accessibleWhen) {
            if (condition.tutorialPassed && tutorialPassed) return true;
            if (condition.tutorialNotActive && !isTutorialActive) return true;
            if (condition.activeTutorial && condition.activeTutorial.includes(activeTutorial)) return true;
            if (condition.tutorialCondition) {
                const { tutorial, minStep } = condition.tutorialCondition;
                if (activeTutorial === tutorial && currentStep >= minStep) return true;
            }
        }
        return false;
    }

    if (rule.requiresAccess) {
        if (rule.orTutorialPassed && tutorialPassed) return true;

        if (!rule.requiresAccess.includes(accessMode)) {
            return false;
        }

        if (rule.workspaceRestrictions && workspaceType) {
            const restriction = rule.workspaceRestrictions[workspaceType];
            if (restriction === false) return false;
        }

        return true;
    }

    return true;
};

export const isSidebarItemAccessible = (itemPath, context) => {
    const itemName = itemPath.split('/').pop();
    return evaluateFeatureAccess(itemName, context);
};

export const isProfileTabAccessible = (tabId, context) => {
    const { accessMode, isTutorialActive, maxAccessedProfileTab, highlightTab, onboardingType } = context;

    if (accessMode === ACCESS_MODES.TEAM && TEAM_ACCESS_LOCKED_TABS.includes(tabId)) {
        return false;
    }

    if (isTutorialActive) {
        // If full access, the user can navigate anywhere; only tooltips are active
        if (accessMode === ACCESS_MODES.FULL) {
            return true;
        }

        // 1. Always accessible if explicitly highlighted by the tutorial
        if (highlightTab && highlightTab === tabId) return true;

        // 2. Progressive Mode: Otherwise respect maxAccessedProfileTab
        if (maxAccessedProfileTab) {
            const tabOrder = getTabOrder(onboardingType);
            const currentMaxIndex = tabOrder.indexOf(maxAccessedProfileTab);
            const targetIndex = tabOrder.indexOf(tabId);

            if (targetIndex !== -1 && currentMaxIndex !== -1) {
                // Allow anything current or below
                return targetIndex <= currentMaxIndex;
            }
        }
    }

    return true;
};

export const shouldShowAccessLevelChoice = (context) => {
    const { isTutorialActive, activeTutorial, maxAccessedProfileTab, pendingTabId } = context;

    if (!isTutorialActive) return false;
    if (!isProfileTutorial(activeTutorial)) return false;

    if (maxAccessedProfileTab === PROFILE_TAB_IDS.PERSONAL_DETAILS &&
        pendingTabId === PROFILE_TAB_IDS.PROFESSIONAL_BACKGROUND) {
        return true;
    }

    return false;
};

export const canNavigateDuringTutorial = (targetPath, context) => {
    const { isTutorialActive, showFirstTimeModal, tutorialPassed } = context;

    if (tutorialPassed) return true;
    if (!isTutorialActive && !showFirstTimeModal) return true;

    if (showFirstTimeModal) {
        return targetPath.includes('overview') || targetPath.includes('profile');
    }

    return isSidebarItemAccessible(targetPath, context);
};

export const getLockedFeatures = (context) => {
    return PLATFORM_FEATURES.filter(feature => !evaluateFeatureAccess(feature, context));
};

export const getAccessibleFeatures = (context) => {
    return PLATFORM_FEATURES.filter(feature => evaluateFeatureAccess(feature, context));
};

export default {
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
};

