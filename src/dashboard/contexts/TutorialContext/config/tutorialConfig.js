import { DASHBOARD_ROUTE_IDS } from '../../../../config/routeHelpers';

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
    ACCOUNT: 'account',
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

export const WORKSPACE_TYPES = {
    PERSONAL: 'personal',
    TEAM: 'team',
    ADMIN: 'admin'
};

export const TARGET_AREAS = {
    HEADER: 'header',
    SIDEBAR: 'sidebar',
    CONTENT: 'content'
};

export const BUTTON_ACTIONS = {
    PAUSE_AND_FILL: 'pause_and_fill',
    START_MESSAGES_TUTORIAL: 'start_messages_tutorial',
    NAVIGATE: 'navigate',
    NEXT_STEP: 'next_step'
};

export const MESSAGE_TYPES = {
    DEFAULT: 'default',
    INFO: 'info',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error'
};

export const PROFILE_TAB_IDS = {
    PERSONAL_DETAILS: 'personalDetails',
    PROFESSIONAL_BACKGROUND: 'professionalBackground',
    BILLING_INFORMATION: 'billingInformation',
    DOCUMENT_UPLOADS: 'documentUploads',
    SETTINGS: 'settings',
    MARKETPLACE: 'marketplace',
    FACILITY_CORE_DETAILS: 'facilityCoreDetails',
    FACILITY_LEGAL_BILLING: 'facilityLegalBilling',
    ACCOUNT: 'account',
    DELETE_ACCOUNT: 'deleteAccount'
};

export const TAB_ORDERS = {
    [ONBOARDING_TYPES.PROFESSIONAL]: [
        PROFILE_TAB_IDS.PERSONAL_DETAILS,
        PROFILE_TAB_IDS.PROFESSIONAL_BACKGROUND,
        PROFILE_TAB_IDS.BILLING_INFORMATION,
        PROFILE_TAB_IDS.DOCUMENT_UPLOADS,
        PROFILE_TAB_IDS.MARKETPLACE,
        PROFILE_TAB_IDS.ACCOUNT
    ],
    [ONBOARDING_TYPES.FACILITY]: [
        PROFILE_TAB_IDS.FACILITY_CORE_DETAILS,
        PROFILE_TAB_IDS.FACILITY_LEGAL_BILLING,
        PROFILE_TAB_IDS.MARKETPLACE,
        PROFILE_TAB_IDS.ACCOUNT
    ]
};

export const TEAM_ACCESS_LOCKED_TABS = [
    PROFILE_TAB_IDS.PROFESSIONAL_BACKGROUND,
    PROFILE_TAB_IDS.BILLING_INFORMATION,
    PROFILE_TAB_IDS.DOCUMENT_UPLOADS
];

export const FALLBACK_SIDEBAR_TOOLTIP_POSITION = {
    top: '150px',
    left: 'calc(var(--sidebar-width, 250px) + 20px)'
};

export const CENTERED_TOOLTIP_POSITION = {
    top: '40%',
    left: '50%',
    transform: 'translate(-50%, -50%)'
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
            navigationPath: createDashboardPath('overview'),
            requiresInteraction: false,
            visualPreview: { type: 'header_help' }
        },
        {
            id: 'onboarding-intro',
            targetSelector: null,
            targetArea: TARGET_AREAS.CONTENT,
            navigationPath: createDashboardPath('overview'),
            tooltipPosition: CENTERED_TOOLTIP_POSITION
        },
        {
            id: 'expand-sidebar',
            targetSelector: 'aside[class*="fixed left-0"]',
            targetArea: TARGET_AREAS.SIDEBAR,
            tooltipPosition: { top: '50%', left: 'calc(250px + 20px)' },
            navigationPath: createDashboardPath('overview'),
            expandSidebar: true,
            highlightSidebar: true,
            requiresInteraction: false
        },
        {
            id: 'navigate-to-profile',
            targetSelector: `a[href="/dashboard/profile"]`,
            targetArea: TARGET_AREAS.SIDEBAR,
            tooltipPosition: FALLBACK_SIDEBAR_TOOLTIP_POSITION,
            navigationPath: createDashboardPath('overview'),
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
            tooltipPosition: { top: '150px', left: '50%', transform: 'translateX(-50%)' },
            requiresInteraction: true,
            customButtons: [{ textKey: 'buttons.iUnderstood', action: BUTTON_ACTIONS.PAUSE_AND_FILL, variant: 'primary' }],
            visualPreview: { type: 'autofill_button' },
            hidePrevious: true
        },
        {
            id: 'professional-background-tab',
            targetSelector: `button[data-tab="${PROFILE_TAB_IDS.PROFESSIONAL_BACKGROUND}"]`,
            targetArea: TARGET_AREAS.CONTENT,
            highlightTab: PROFILE_TAB_IDS.PROFESSIONAL_BACKGROUND,
            highlightUploadButton: true,
            navigationPath: createProfilePath(PROFILE_TAB_IDS.PROFESSIONAL_BACKGROUND),
            tooltipPosition: { top: '150px', left: '50%', transform: 'translateX(-50%)' },
            requiresInteraction: true,
            requiresFullAccess: true,
            customButtons: [{ textKey: 'buttons.iUnderstood', action: BUTTON_ACTIONS.PAUSE_AND_FILL, variant: 'primary' }],
            visualPreview: { type: 'profile_tab', icon: 'briefcase', tabId: 'professionalBackground' },
            hidePrevious: true
        },
        {
            id: 'billing-information-tab',
            targetSelector: `button[data-tab="${PROFILE_TAB_IDS.BILLING_INFORMATION}"]`,
            targetArea: TARGET_AREAS.CONTENT,
            highlightTab: PROFILE_TAB_IDS.BILLING_INFORMATION,
            highlightUploadButton: true,
            navigationPath: createProfilePath(PROFILE_TAB_IDS.BILLING_INFORMATION),
            tooltipPosition: { top: '150px', left: '50%', transform: 'translateX(-50%)' },
            requiresInteraction: true,
            customButtons: [{ textKey: 'buttons.iUnderstood', action: BUTTON_ACTIONS.PAUSE_AND_FILL, variant: 'primary' }],
            visualPreview: { type: 'profile_tab', icon: 'credit-card', tabId: 'billingInformation' },
            hidePrevious: true
        },
        {
            id: 'document-uploads-tab',
            targetSelector: `button[data-tab="${PROFILE_TAB_IDS.DOCUMENT_UPLOADS}"]`,
            targetArea: TARGET_AREAS.CONTENT,
            highlightTab: PROFILE_TAB_IDS.DOCUMENT_UPLOADS,
            navigationPath: createProfilePath(PROFILE_TAB_IDS.DOCUMENT_UPLOADS),
            tooltipPosition: { top: '150px', left: '50%', transform: 'translateX(-50%)' },
            requiresInteraction: true,
            customButtons: [{ textKey: 'buttons.iUnderstood', action: BUTTON_ACTIONS.PAUSE_AND_FILL, variant: 'primary' }],
            visualPreview: { type: 'profile_tab', icon: 'file-text', tabId: 'documentUploads' },
            hidePrevious: true
        },
        {
            id: 'marketplace-tab',
            targetSelector: `button[data-tab="${PROFILE_TAB_IDS.MARKETPLACE}"]`,
            targetArea: TARGET_AREAS.CONTENT,
            highlightTab: PROFILE_TAB_IDS.MARKETPLACE,
            navigationPath: createProfilePath(PROFILE_TAB_IDS.MARKETPLACE),
            tooltipPosition: { top: '150px', left: '50%', transform: 'translateX(-50%)' },
            requiresInteraction: false,
            visualPreview: { type: 'profile_tab', icon: 'briefcase', tabId: 'marketplace' },
            actionButton: { textKey: 'buttons.iUnderstood' },
            hidePrevious: true
        },
        {
            id: 'click-account-tab',
            targetSelector: `button[data-tab="${PROFILE_TAB_IDS.ACCOUNT}"]`,
            targetArea: TARGET_AREAS.CONTENT,
            highlightTab: PROFILE_TAB_IDS.ACCOUNT,
            tooltipPosition: { top: '150px', left: '50%', transform: 'translateX(-50%)' },
            requiresInteraction: true,
            hidePrevious: true,
            showTooltip: false
        },
        {
            id: 'account-tab',
            targetSelector: `button[data-tab="${PROFILE_TAB_IDS.ACCOUNT}"]`,
            targetArea: TARGET_AREAS.CONTENT,
            highlightTab: PROFILE_TAB_IDS.ACCOUNT,
            highlightSidebarItem: 'profile',
            navigationPath: createProfilePath(PROFILE_TAB_IDS.ACCOUNT),
            tooltipPosition: { top: '150px', left: '50%', transform: 'translateX(-50%)' },
            requiresInteraction: false,
            messageType: MESSAGE_TYPES.SUCCESS,
            actionButton: { textKey: 'buttons.finish' },
            hidePrevious: true
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
            tooltipPosition: { top: '150px', left: '50%', transform: 'translateX(-50%)' },
            requiresInteraction: true,
            customButtons: [{ textKey: 'buttons.iUnderstood', action: BUTTON_ACTIONS.PAUSE_AND_FILL, variant: 'primary' }],
            visualPreview: { type: 'autofill_button' },
            hidePrevious: true
        },
        {
            id: 'facility-legal-billing-tab',
            targetSelector: `button[data-tab="${PROFILE_TAB_IDS.FACILITY_LEGAL_BILLING}"]`,
            targetArea: TARGET_AREAS.CONTENT,
            highlightTab: PROFILE_TAB_IDS.FACILITY_LEGAL_BILLING,
            highlightUploadButton: true,
            navigationPath: createProfilePath(PROFILE_TAB_IDS.FACILITY_LEGAL_BILLING),
            tooltipPosition: { top: '150px', left: '50%', transform: 'translateX(-50%)' },
            requiresInteraction: true,
            customButtons: [{ textKey: 'buttons.iUnderstood', action: BUTTON_ACTIONS.PAUSE_AND_FILL, variant: 'primary' }],
            visualPreview: { type: 'profile_tab', icon: 'credit-card', tabId: 'facilityLegalBilling' },
            hidePrevious: true
        },
        {
            id: 'facility-profile-completion-info',
            targetSelector: '[data-tab="facilityLegalBilling"]',
            targetArea: TARGET_AREAS.CONTENT,
            messageType: MESSAGE_TYPES.SUCCESS,
            tooltipPosition: { top: '150px', left: '50%', transform: 'translateX(-50%)' },
            navigationPath: createProfilePath(PROFILE_TAB_IDS.FACILITY_LEGAL_BILLING),
            highlightTab: PROFILE_TAB_IDS.FACILITY_LEGAL_BILLING,
            requiresInteraction: false,
            actionButton: { textKey: 'buttons.continueToMessages', action: BUTTON_ACTIONS.START_MESSAGES_TUTORIAL },
            hidePrevious: true
        }
    ],

    [TUTORIAL_IDS.MESSAGES]: [
        {
            id: 'redirect-to-messages',
            targetSelector: null,
            targetArea: TARGET_AREAS.CONTENT,
            tooltipPosition: CENTERED_TOOLTIP_POSITION,
            requiresInteraction: false,
            messageType: MESSAGE_TYPES.INFO,
            actionButton: { textKey: 'buttons.startMessages', action: BUTTON_ACTIONS.NEXT_STEP },
            hidePrevious: true,
            highlightSidebarItem: DASHBOARD_ROUTE_IDS.MESSAGES
        },
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

    [TUTORIAL_IDS.ACCOUNT]: [
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

export const TUTORIAL_SEQUENCES = {
    [ONBOARDING_TYPES.PROFESSIONAL]: {
        mandatory: [
            { id: TUTORIAL_IDS.PROFILE_TABS, skippable: false, nextTutorial: TUTORIAL_IDS.DASHBOARD },
            { id: TUTORIAL_IDS.DASHBOARD, skippable: false, nextTutorial: TUTORIAL_IDS.MESSAGES },
            { id: TUTORIAL_IDS.MESSAGES, skippable: true, nextTutorial: TUTORIAL_IDS.CONTRACTS },
            { id: TUTORIAL_IDS.CONTRACTS, skippable: true, nextTutorial: TUTORIAL_IDS.CALENDAR },
            { id: TUTORIAL_IDS.CALENDAR, skippable: true, nextTutorial: TUTORIAL_IDS.MARKETPLACE },
            { id: TUTORIAL_IDS.MARKETPLACE, skippable: true, nextTutorial: TUTORIAL_IDS.ACCOUNT },
            { id: TUTORIAL_IDS.ACCOUNT, skippable: true, nextTutorial: null }
        ]
    },
    [ONBOARDING_TYPES.FACILITY]: {
        mandatory: [
            { id: TUTORIAL_IDS.FACILITY_PROFILE_TABS, skippable: false, nextTutorial: TUTORIAL_IDS.DASHBOARD },
            { id: TUTORIAL_IDS.DASHBOARD, skippable: false, nextTutorial: TUTORIAL_IDS.MESSAGES },
            { id: TUTORIAL_IDS.MESSAGES, skippable: true, nextTutorial: TUTORIAL_IDS.CONTRACTS },
            { id: TUTORIAL_IDS.CONTRACTS, skippable: true, nextTutorial: TUTORIAL_IDS.CALENDAR },
            { id: TUTORIAL_IDS.CALENDAR, skippable: true, nextTutorial: TUTORIAL_IDS.PAYROLL },
            { id: TUTORIAL_IDS.PAYROLL, skippable: true, nextTutorial: TUTORIAL_IDS.ORGANIZATION },
            { id: TUTORIAL_IDS.ORGANIZATION, skippable: true, nextTutorial: TUTORIAL_IDS.ACCOUNT },
            { id: TUTORIAL_IDS.ACCOUNT, skippable: true, nextTutorial: null }
        ]
    }
};

export const DASHBOARD_PATHS = {
    BASE: '/dashboard',
    OVERVIEW: '/dashboard/overview',
    PROFILE: '/dashboard/profile',
    MESSAGES: '/dashboard/messages',
    CONTRACTS: '/dashboard/contracts',
    CALENDAR: '/dashboard/calendar',
    MARKETPLACE: '/dashboard/marketplace',
    PAYROLL: '/dashboard/payroll',
    ORGANIZATION: '/dashboard/organization',
    SETTINGS: '/dashboard/settings'
};

export const PROFILE_TAB_PATHS = {
    [PROFILE_TAB_IDS.PERSONAL_DETAILS]: `${DASHBOARD_PATHS.PROFILE}/personalDetails`,
    [PROFILE_TAB_IDS.PROFESSIONAL_BACKGROUND]: `${DASHBOARD_PATHS.PROFILE}/professionalBackground`,
    [PROFILE_TAB_IDS.BILLING_INFORMATION]: `${DASHBOARD_PATHS.PROFILE}/billingInformation`,
    [PROFILE_TAB_IDS.DOCUMENT_UPLOADS]: `${DASHBOARD_PATHS.PROFILE}/documentUploads`,
    [PROFILE_TAB_IDS.SETTINGS]: `${DASHBOARD_PATHS.PROFILE}/settings`,
    [PROFILE_TAB_IDS.FACILITY_CORE_DETAILS]: `${DASHBOARD_PATHS.PROFILE}/facilityCoreDetails`,
    [PROFILE_TAB_IDS.FACILITY_LEGAL_BILLING]: `${DASHBOARD_PATHS.PROFILE}/facilityLegalBilling`,
    [PROFILE_TAB_IDS.ACCOUNT]: `${DASHBOARD_PATHS.PROFILE}/account`,
    [PROFILE_TAB_IDS.DELETE_ACCOUNT]: `${DASHBOARD_PATHS.PROFILE}/deleteAccount`
};

export const getTabOrder = (onboardingType) => {
    return TAB_ORDERS[onboardingType] || TAB_ORDERS[ONBOARDING_TYPES.PROFESSIONAL];
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

export const getSequenceForType = (onboardingType) => {
    return TUTORIAL_SEQUENCES[onboardingType] || TUTORIAL_SEQUENCES[ONBOARDING_TYPES.PROFESSIONAL];
};

export const getProfileTutorialForType = (onboardingType) => {
    return onboardingType === ONBOARDING_TYPES.FACILITY
        ? TUTORIAL_IDS.FACILITY_PROFILE_TABS
        : TUTORIAL_IDS.PROFILE_TABS;
};

export const isProfileTutorial = (tutorialId) => {
    return tutorialId === TUTORIAL_IDS.PROFILE_TABS || tutorialId === TUTORIAL_IDS.FACILITY_PROFILE_TABS;
};

export const getNextTutorial = (currentTutorialId, onboardingType, completedTutorials = {}) => {
    const sequence = getSequenceForType(onboardingType);
    const currentTutorial = sequence.mandatory.find(t => t.id === currentTutorialId);
    if (!currentTutorial || !currentTutorial.nextTutorial) return null;
    if (!completedTutorials[currentTutorial.nextTutorial]) return currentTutorial.nextTutorial;
    return getNextTutorial(currentTutorial.nextTutorial, onboardingType, completedTutorials);
};

export const getFirstIncompleteTutorial = (onboardingType, completedTutorials = {}) => {
    const sequence = getSequenceForType(onboardingType);
    for (const tutorial of sequence.mandatory) {
        if (!completedTutorials[tutorial.id]) return tutorial.id;
    }
    return null;
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

export const getMandatoryTutorials = (onboardingType) => {
    const sequence = getSequenceForType(onboardingType);
    return sequence.mandatory.map(t => t.id);
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

export const normalizePathForComparison = (path) => {
    let normalized = path.replace(/^\/(en|fr|de|it)\//, '/');
    normalized = normalized.replace(/\/dashboard\/(personal|team|admin)\//, '/dashboard/');
    return normalized;
};

export const isProfilePath = (path) => {
    return path.includes('/profile') && path.includes('/dashboard');
};

export const isDashboardPath = (path) => {
    return path.includes('/dashboard');
};

export const buildProfileTabPath = (tabId) => {
    return PROFILE_TAB_PATHS[tabId] || `${DASHBOARD_PATHS.PROFILE}/${tabId}`;
};

export const TUTORIAL_TO_ROUTE_MAP = {
    [TUTORIAL_IDS.DASHBOARD]: 'overview',
    [TUTORIAL_IDS.PROFILE_TABS]: 'profile',
    [TUTORIAL_IDS.FACILITY_PROFILE_TABS]: 'profile',
    [TUTORIAL_IDS.MESSAGES]: 'messages',
    [TUTORIAL_IDS.CONTRACTS]: 'contracts',
    [TUTORIAL_IDS.CALENDAR]: 'calendar',
    [TUTORIAL_IDS.MARKETPLACE]: 'marketplace',
    [TUTORIAL_IDS.PAYROLL]: 'payroll',
    [TUTORIAL_IDS.ORGANIZATION]: 'organization',
    [TUTORIAL_IDS.ACCOUNT]: 'settings',
    [TUTORIAL_IDS.PROFILE]: 'profile'
};

export const getRouteForTutorial = (tutorialId) => {
    return TUTORIAL_TO_ROUTE_MAP[tutorialId];
};

export const getPathForTutorial = (tutorialId) => {
    const routeId = TUTORIAL_TO_ROUTE_MAP[tutorialId];
    if (!routeId) return DASHBOARD_PATHS.OVERVIEW;

    const path = Object.entries(DASHBOARD_PATHS).find(([key]) =>
        key.toLowerCase() === routeId.toLowerCase()
    );

    return path ? path[1] : DASHBOARD_PATHS.OVERVIEW;
};

export const isOnCorrectPage = (currentPath, requiredPath) => {
    const normalizedCurrent = normalizePathForComparison(currentPath);
    const normalizedRequired = normalizePathForComparison(requiredPath);

    if (normalizedRequired === normalizedCurrent) return true;
    if (normalizedCurrent.startsWith(normalizedRequired + '/')) return true;

    if (normalizedRequired === '/dashboard/overview') {
        if (normalizedCurrent === '/dashboard' ||
            normalizedCurrent === '/dashboard/' ||
            normalizedCurrent.startsWith('/dashboard/overview')) {
            return true;
        }
    }

    if (isProfilePath(normalizedRequired) && isProfilePath(normalizedCurrent)) {
        return true;
    }

    return false;
};

export const isProfileTabAccessible = (tabId, context) => {
    const { accessMode, onboardingType } = context;

    // Default: All tabs are accessible
    return true;
};

export const isSidebarItemAccessible = (itemPath, context) => {
    const {
        workspaceType,
        user
    } = context;

    const isAdmin = !!(user?.adminData && user?.adminData.isActive !== false);
    if (isAdmin) return true;

    const itemName = itemPath.split('/').pop();
    const isTeamWorkspace = workspaceType === WORKSPACE_TYPES.TEAM;

    // RBAC: Organization is only for Team workspaces
    if (itemName === TUTORIAL_IDS.ORGANIZATION) {
        if (!isTeamWorkspace) return false;
        return true;
    }

    // Default: All sidebar items are accessible
    return true;
};

export const shouldShowAccessLevelChoice = (context) => {
    // Disabled access choice logic to prevent blocking
    return false;
};

export default {
    TUTORIAL_IDS,
    TUTORIAL_MODES,
    ACCESS_MODES,
    ONBOARDING_TYPES,
    WORKSPACE_TYPES,
    TARGET_AREAS,
    BUTTON_ACTIONS,
    MESSAGE_TYPES,
    PROFILE_TAB_IDS,
    TAB_ORDERS,
    TEAM_ACCESS_LOCKED_TABS,
    FALLBACK_SIDEBAR_TOOLTIP_POSITION,
    CENTERED_TOOLTIP_POSITION,
    TUTORIAL_STEP_DEFINITIONS,
    TUTORIAL_SEQUENCES,
    DASHBOARD_PATHS,
    PROFILE_TAB_PATHS,
    getTabOrder,
    getTutorialSteps,
    getStepById,
    getStepIndex,
    getTotalSteps,
    isLastStep,
    isFirstStep,
    getSequenceForType,
    getProfileTutorialForType,
    isProfileTutorial,
    getNextTutorial,
    getFirstIncompleteTutorial,
    isTutorialMandatory,
    isTutorialSkippable,
    getMandatoryTutorials,
    areAllMandatoryComplete,
    getCompletionPercentage,
    normalizePathForComparison,
    isProfilePath,
    isDashboardPath,
    buildProfileTabPath,
    TUTORIAL_TO_ROUTE_MAP,
    getRouteForTutorial,
    getPathForTutorial,
    isOnCorrectPage,
    isProfileTabAccessible,
    isSidebarItemAccessible,
    shouldShowAccessLevelChoice
};
