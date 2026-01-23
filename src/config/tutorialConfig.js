import { DASHBOARD_ROUTE_IDS } from './routeHelpers';

export const TUTORIAL_IDS = {
    DASHBOARD: 'dashboard',
    PROFILE_TABS: 'profileTabs',
    FACILITY_PROFILE_TABS: 'facilityProfileTabs',
    MESSAGES: 'messages',
    CONTRACTS: 'contracts',
    CALENDAR: 'calendar',
    MARKETPLACE: 'marketplace',
    PAYROLL: 'payroll',
    ORGANIZATION: 'organization',
    SETTINGS: 'settings',
    PROFILE: 'profile'
};

export const TUTORIAL_MODES = {
    ONBOARDING: 'onboarding',
    GUIDED: 'guided',
    FREE: 'free'
};

export const ACCESS_MODES = {
    FULL: 'full',
    TEAM: 'team',
    LOADING: 'loading'
};

export const ONBOARDING_TYPES = {
    PROFESSIONAL: 'professional',
    FACILITY: 'facility'
};

export const TARGET_AREAS = {
    HEADER: 'header',
    SIDEBAR: 'sidebar',
    CONTENT: 'content'
};

export const BUTTON_ACTIONS = {
    PAUSE_AND_FILL: 'pause_and_fill',
    START_MESSAGES_TUTORIAL: 'start_messages_tutorial',
    NAVIGATE: 'navigate'
};

export const PROFILE_TAB_IDS = {
    PERSONAL_DETAILS: 'personalDetails',
    PROFESSIONAL_BACKGROUND: 'professionalBackground',
    BILLING_INFORMATION: 'billingInformation',
    DOCUMENT_UPLOADS: 'documentUploads',
    SETTINGS: 'settings',
    FACILITY_CORE_DETAILS: 'facilityCoreDetails',
    FACILITY_LEGAL_BILLING: 'facilityLegalBilling',
    ACCOUNT: 'account',
    DELETE_ACCOUNT: 'deleteAccount'
};

const createDashboardPath = (feature, subPath = null) => {
    const basePath = `/dashboard/${feature}`;
    return subPath ? `${basePath}/${subPath}` : basePath;
};

const createProfilePath = (tabId) => createDashboardPath('profile', tabId);

export const TUTORIAL_STEP_DEFINITIONS = {
    [TUTORIAL_IDS.DASHBOARD]: [
        {
            id: 'onboarding-help-button',
            targetSelector: '[data-tutorial="onboarding-help-button"]',
            targetArea: TARGET_AREAS.HEADER,
            tooltipPosition: { top: '80px', right: '120px' },
            requiresInteraction: false,
            visualPreview: { type: 'header_help' }
        },
        {
            id: 'onboarding-intro',
            targetSelector: null,
            targetArea: TARGET_AREAS.CONTENT,
            tooltipPosition: { top: '40%', left: '50%', transform: 'translate(-50%, -50%)' }
        },
        {
            id: 'expand-sidebar',
            targetSelector: 'aside[class*="fixed left-0"]',
            targetArea: TARGET_AREAS.SIDEBAR,
            tooltipPosition: { top: '50%', left: 'calc(250px + 20px)' },
            expandSidebar: true,
            highlightSidebar: true,
            requiresInteraction: false
        },
        {
            id: 'navigate-to-profile',
            targetSelector: `a[href="/dashboard/profile"]`,
            targetArea: TARGET_AREAS.SIDEBAR,
            tooltipPosition: { top: '150px', left: 'calc(250px + 20px)' },
            highlightSidebarItem: DASHBOARD_ROUTE_IDS.PROFILE,
            makeOtherTabsInactive: true,
            requiresInteraction: false
        }
    ],

    [TUTORIAL_IDS.PROFILE_TABS]: [
        {
            id: 'personal-details-tab',
            targetSelector: '[data-tutorial="profile-upload-button"]',
            targetArea: TARGET_AREAS.CONTENT,
            highlightTab: PROFILE_TAB_IDS.PERSONAL_DETAILS,
            highlightUploadButton: true,
            navigationPath: createProfilePath(PROFILE_TAB_IDS.PERSONAL_DETAILS),
            requiresInteraction: true,
            customButtons: [{ textKey: 'buttons.iUnderstood', action: BUTTON_ACTIONS.PAUSE_AND_FILL, variant: 'primary' }],
            visualPreview: { type: 'autofill_button' }
        },
        {
            id: 'professional-background-tab',
            targetSelector: `button[data-tab="${PROFILE_TAB_IDS.PROFESSIONAL_BACKGROUND}"]`,
            targetArea: TARGET_AREAS.CONTENT,
            highlightTab: PROFILE_TAB_IDS.PROFESSIONAL_BACKGROUND,
            highlightUploadButton: true,
            navigationPath: createProfilePath(PROFILE_TAB_IDS.PROFESSIONAL_BACKGROUND),
            requiresInteraction: true,
            requiresFullAccess: true,
            customButtons: [{ textKey: 'buttons.iUnderstood', action: BUTTON_ACTIONS.PAUSE_AND_FILL, variant: 'primary' }],
            visualPreview: { type: 'profile_tab', icon: 'briefcase', tabId: 'professionalBackground' }
        },
        {
            id: 'billing-information-tab',
            targetSelector: `button[data-tab="${PROFILE_TAB_IDS.BILLING_INFORMATION}"]`,
            targetArea: TARGET_AREAS.CONTENT,
            highlightTab: PROFILE_TAB_IDS.BILLING_INFORMATION,
            highlightUploadButton: true,
            navigationPath: createProfilePath(PROFILE_TAB_IDS.BILLING_INFORMATION),
            requiresInteraction: true,
            customButtons: [{ textKey: 'buttons.iUnderstood', action: BUTTON_ACTIONS.PAUSE_AND_FILL, variant: 'primary' }],
            visualPreview: { type: 'profile_tab', icon: 'credit-card', tabId: 'billingInformation' }
        },
        {
            id: 'document-uploads-tab',
            targetSelector: `button[data-tab="${PROFILE_TAB_IDS.DOCUMENT_UPLOADS}"]`,
            targetArea: TARGET_AREAS.CONTENT,
            highlightTab: PROFILE_TAB_IDS.DOCUMENT_UPLOADS,
            highlightUploadButton: true,
            navigationPath: createProfilePath(PROFILE_TAB_IDS.DOCUMENT_UPLOADS),
            requiresInteraction: true,
            customButtons: [{ textKey: 'buttons.iUnderstood', action: BUTTON_ACTIONS.PAUSE_AND_FILL, variant: 'primary' }],
            visualPreview: { type: 'profile_tab', icon: 'file-text', tabId: 'documentUploads' }
        },
        {
            id: 'full-access-unlocked',
            targetSelector: null,
            targetArea: TARGET_AREAS.CONTENT,
            messageType: 'success',
            tooltipPosition: { top: '40%', left: '50%', transform: 'translate(-50%, -50%)' },
            requiresInteraction: false
        },
        {
            id: 'account-tab',
            targetSelector: `button[data-tab="${PROFILE_TAB_IDS.ACCOUNT}"]`,
            targetArea: TARGET_AREAS.CONTENT,
            highlightTab: PROFILE_TAB_IDS.ACCOUNT,
            navigationPath: createProfilePath(PROFILE_TAB_IDS.ACCOUNT),
            requiresInteraction: false,
            visualPreview: { type: 'profile_tab', icon: 'user', tabId: 'account' }
        },
        {
            id: 'settings-tab',
            targetSelector: `button[data-tab="${PROFILE_TAB_IDS.SETTINGS}"]`,
            targetArea: TARGET_AREAS.CONTENT,
            highlightTab: PROFILE_TAB_IDS.SETTINGS,
            navigationPath: createProfilePath(PROFILE_TAB_IDS.SETTINGS),
            requiresInteraction: false,
            visualPreview: { type: 'profile_tab', icon: 'settings', tabId: 'settings' }
        },
        {
            id: 'profile-completion-info',
            targetSelector: '.profileContainer',
            targetArea: TARGET_AREAS.CONTENT,
            tooltipPosition: { top: '150px', left: '50%' },
            navigationPath: createProfilePath(PROFILE_TAB_IDS.SETTINGS),
            highlightTab: PROFILE_TAB_IDS.SETTINGS,
            actionButton: { textKey: 'buttons.continueToMessages', action: BUTTON_ACTIONS.START_MESSAGES_TUTORIAL },
            visualPreview: { type: 'profile_tab', icon: 'settings', tabId: 'settings' }
        }
    ],

    [TUTORIAL_IDS.FACILITY_PROFILE_TABS]: [
        {
            id: 'facility-core-details-tab',
            targetSelector: '[data-tutorial="profile-upload-button"]',
            targetArea: TARGET_AREAS.CONTENT,
            highlightTab: PROFILE_TAB_IDS.FACILITY_CORE_DETAILS,
            highlightUploadButton: true,
            navigationPath: createProfilePath(PROFILE_TAB_IDS.FACILITY_CORE_DETAILS),
            requiresInteraction: true,
            customButtons: [{ textKey: 'buttons.iUnderstood', action: BUTTON_ACTIONS.PAUSE_AND_FILL, variant: 'primary' }],
            visualPreview: { type: 'autofill_button' }
        },
        {
            id: 'facility-legal-billing-tab',
            targetSelector: `button[data-tab="${PROFILE_TAB_IDS.FACILITY_LEGAL_BILLING}"]`,
            targetArea: TARGET_AREAS.CONTENT,
            highlightTab: PROFILE_TAB_IDS.FACILITY_LEGAL_BILLING,
            highlightUploadButton: true,
            navigationPath: createProfilePath(PROFILE_TAB_IDS.FACILITY_LEGAL_BILLING),
            requiresInteraction: true,
            customButtons: [{ textKey: 'buttons.iUnderstood', action: BUTTON_ACTIONS.PAUSE_AND_FILL, variant: 'primary' }],
            visualPreview: { type: 'profile_tab', icon: 'credit-card', tabId: 'facilityLegalBilling' }
        },
        {
            id: 'facility-profile-completion-info',
            targetSelector: '.profileContainer',
            targetArea: TARGET_AREAS.CONTENT,
            tooltipPosition: { top: '150px', left: '50%' },
            navigationPath: createProfilePath(PROFILE_TAB_IDS.SETTINGS),
            highlightTab: PROFILE_TAB_IDS.SETTINGS,
            actionButton: { textKey: 'buttons.continueToMessages', action: BUTTON_ACTIONS.START_MESSAGES_TUTORIAL },
            visualPreview: { type: 'profile_tab', icon: 'settings', tabId: 'settings' }
        }
    ],

    [TUTORIAL_IDS.MESSAGES]: [
        {
            id: 'messages-overview',
            targetSelector: `a[href="/dashboard/messages"]`,
            targetArea: TARGET_AREAS.SIDEBAR,
            tooltipPosition: { top: '210px', left: 'calc(250px + 20px)' },
            highlightSidebarItem: DASHBOARD_ROUTE_IDS.MESSAGES,
            actionButton: { textKey: 'buttons.showMe', path: createDashboardPath('messages') },
            visualPreview: { type: 'sidebar_item', icon: 'message-square', textKey: 'dashboard.sidebar.messages' }
        },
        {
            id: 'messages-conversations',
            targetSelector: '.conversations-list',
            targetArea: TARGET_AREAS.CONTENT,
            tooltipPosition: { top: '200px', left: '30%' },
            requiredPage: createDashboardPath('messages'),
            requiresInteraction: false
        },
        {
            id: 'messages-compose',
            targetSelector: '.new-message-button',
            targetArea: TARGET_AREAS.CONTENT,
            tooltipPosition: { top: '150px', left: '70%' },
            requiredPage: createDashboardPath('messages'),
            requiresInteraction: false,
            hasRoleContent: true
        }
    ],

    [TUTORIAL_IDS.CONTRACTS]: [
        {
            id: 'contracts-overview',
            targetSelector: `a[href="/dashboard/contracts"]`,
            targetArea: TARGET_AREAS.SIDEBAR,
            tooltipPosition: { top: '180px', left: 'calc(250px + 20px)' },
            highlightSidebarItem: DASHBOARD_ROUTE_IDS.CONTRACTS,
            actionButton: { textKey: 'buttons.showMe', path: createDashboardPath('contracts') },
            visualPreview: { type: 'sidebar_item', icon: 'file-text', textKey: 'dashboard.sidebar.contracts' }
        },
        {
            id: 'contracts-list',
            targetSelector: '.contracts-list',
            targetArea: TARGET_AREAS.CONTENT,
            tooltipPosition: { top: '300px', left: '50%' },
            requiredPage: createDashboardPath('contracts'),
            requiresInteraction: false
        }
    ],

    [TUTORIAL_IDS.CALENDAR]: [
        {
            id: 'calendar-overview',
            targetSelector: `a[href="/dashboard/calendar"]`,
            targetArea: TARGET_AREAS.SIDEBAR,
            tooltipPosition: { top: '240px', left: 'calc(250px + 20px)' },
            highlightSidebarItem: DASHBOARD_ROUTE_IDS.CALENDAR,
            actionButton: { textKey: 'buttons.showMe', path: createDashboardPath('calendar') },
            visualPreview: { type: 'sidebar_item', icon: 'calendar', textKey: 'dashboard.sidebar.calendar' }
        },
        {
            id: 'calendar-view',
            targetSelector: '.calendar-view-options',
            targetArea: TARGET_AREAS.CONTENT,
            tooltipPosition: { top: '150px', left: '70%' },
            requiredPage: createDashboardPath('calendar'),
            requiresInteraction: false
        },
        {
            id: 'calendar-appointment',
            targetSelector: '.new-appointment-button',
            targetArea: TARGET_AREAS.HEADER,
            tooltipPosition: { top: '80px', right: '20px' },
            requiredPage: createDashboardPath('calendar'),
            requiresInteraction: false
        }
    ],

    [TUTORIAL_IDS.MARKETPLACE]: [
        {
            id: 'marketplace-overview',
            targetSelector: `a[href="/dashboard/marketplace"]`,
            targetArea: TARGET_AREAS.SIDEBAR,
            tooltipPosition: { top: '270px', left: 'calc(250px + 20px)' },
            highlightSidebarItem: DASHBOARD_ROUTE_IDS.MARKETPLACE,
            actionButton: { textKey: 'buttons.showMe', path: createDashboardPath('marketplace') },
            visualPreview: { type: 'sidebar_item', icon: 'briefcase', textKey: 'dashboard.sidebar.marketplace' }
        },
        {
            id: 'marketplace-search',
            targetSelector: '.marketplace-search',
            targetArea: TARGET_AREAS.CONTENT,
            tooltipPosition: { top: '200px', left: '30%' },
            requiredPage: createDashboardPath('marketplace'),
            requiresInteraction: false
        },
        {
            id: 'marketplace-apply',
            targetSelector: '.job-card',
            targetArea: TARGET_AREAS.CONTENT,
            tooltipPosition: { top: '350px', left: '60%' },
            requiredPage: createDashboardPath('marketplace'),
            requiresInteraction: false
        }
    ],

    [TUTORIAL_IDS.PAYROLL]: [
        {
            id: 'payroll-overview',
            targetSelector: `a[href="/dashboard/payroll"]`,
            targetArea: TARGET_AREAS.SIDEBAR,
            tooltipPosition: { top: '330px', left: 'calc(250px + 20px)' },
            highlightSidebarItem: DASHBOARD_ROUTE_IDS.PAYROLL,
            actionButton: { textKey: 'buttons.showMe', path: createDashboardPath('payroll') },
            visualPreview: { type: 'sidebar_item', icon: 'dollar-sign', textKey: 'dashboard.sidebar.payroll' }
        },
        {
            id: 'payroll-requests',
            targetSelector: '.payroll-requests-list',
            targetArea: TARGET_AREAS.CONTENT,
            tooltipPosition: { top: '250px', left: '50%' },
            requiredPage: createDashboardPath('payroll'),
            requiresInteraction: false
        },
        {
            id: 'payroll-status',
            targetSelector: '.status-filters',
            targetArea: TARGET_AREAS.CONTENT,
            tooltipPosition: { top: '150px', left: '60%' },
            requiredPage: createDashboardPath('payroll'),
            requiresInteraction: false
        }
    ],

    [TUTORIAL_IDS.ORGANIZATION]: [
        {
            id: 'organization-overview',
            targetSelector: `a[href="/dashboard/organization"]`,
            targetArea: TARGET_AREAS.SIDEBAR,
            tooltipPosition: { top: '360px', left: 'calc(250px + 20px)' },
            highlightSidebarItem: DASHBOARD_ROUTE_IDS.ORGANIZATION,
            actionButton: { textKey: 'buttons.showMe', path: createDashboardPath('organization') },
            visualPreview: { type: 'sidebar_item', icon: 'users', textKey: 'dashboard.sidebar.organization' }
        },
        {
            id: 'organization-facilities',
            targetSelector: '.facilities-list',
            targetArea: TARGET_AREAS.CONTENT,
            tooltipPosition: { top: '250px', left: '50%' },
            requiredPage: createDashboardPath('organization'),
            requiresInteraction: false
        },
        {
            id: 'organization-settings',
            targetSelector: '.organization-settings',
            targetArea: TARGET_AREAS.CONTENT,
            tooltipPosition: { top: '200px', left: '50%' },
            requiredPage: createDashboardPath('organization'),
            requiresInteraction: false
        }
    ],

    [TUTORIAL_IDS.SETTINGS]: [
        {
            id: 'settings-overview',
            targetSelector: `a[href="/dashboard/settings"]`,
            targetArea: TARGET_AREAS.SIDEBAR,
            tooltipPosition: { top: '300px', left: 'calc(250px + 20px)' },
            highlightSidebarItem: 'settings',
            actionButton: { textKey: 'buttons.showMe', path: createDashboardPath('settings') },
            visualPreview: { type: 'sidebar_item', icon: 'settings', textKey: 'dashboard.sidebar.settings' }
        },
        {
            id: 'settings-account',
            targetSelector: '.settings-account',
            targetArea: TARGET_AREAS.CONTENT,
            tooltipPosition: { top: '200px', left: '50%' },
            requiredPage: createDashboardPath('settings'),
            requiresInteraction: false
        },
        {
            id: 'settings-notifications',
            targetSelector: '.settings-notifications',
            targetArea: TARGET_AREAS.CONTENT,
            tooltipPosition: { top: '300px', left: '50%' },
            requiredPage: createDashboardPath('settings'),
            requiresInteraction: false
        }
    ],

    [TUTORIAL_IDS.PROFILE]: [
        {
            id: 'profile-overview',
            targetSelector: `a[href="/dashboard/profile"]`,
            targetArea: TARGET_AREAS.SIDEBAR,
            tooltipPosition: { top: '150px', left: 'calc(250px + 20px)' },
            highlightSidebarItem: DASHBOARD_ROUTE_IDS.PROFILE,
            actionButton: { textKey: 'buttons.showMe', path: createDashboardPath('profile') },
            visualPreview: { type: 'sidebar_item', icon: 'user', textKey: 'dashboard.sidebar.profile' }
        },
        {
            id: 'profile-edit',
            targetSelector: '.profile-tabs',
            targetArea: TARGET_AREAS.CONTENT,
            tooltipPosition: { top: '200px', left: '50%' },
            requiredPage: createDashboardPath('profile'),
            requiresInteraction: false
        }
    ]
};

export const getTutorialSteps = (tutorialId) => {
    return TUTORIAL_STEP_DEFINITIONS[tutorialId] || [];
};

export const getStepById = (tutorialId, stepId) => {
    const steps = getTutorialSteps(tutorialId);
    return steps.find(step => step.id === stepId);
};

export const getStepIndex = (tutorialId, stepId) => {
    const steps = getTutorialSteps(tutorialId);
    return steps.findIndex(step => step.id === stepId);
};

export const getTotalSteps = (tutorialId) => {
    return getTutorialSteps(tutorialId).length;
};

export const isLastStep = (tutorialId, stepIndex) => {
    return stepIndex >= getTotalSteps(tutorialId) - 1;
};

export const isFirstStep = (stepIndex) => {
    return stepIndex <= 0;
};

export default {
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
};

