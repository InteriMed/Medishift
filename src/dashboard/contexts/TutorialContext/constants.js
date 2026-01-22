// Tutorial context constants
export const TUTORIAL_MODES = {
    ONBOARDING: 'onboarding',
    GUIDED: 'guided',
    FREE: 'free'
};

export const ACCESS_MODES = {
    FULL: 'full',
    TEAM: 'team'
};

export const ONBOARDING_TYPES = {
    PROFESSIONAL: 'professional',
    FACILITY: 'facility'
};

export const TUTORIAL_FEATURES = {
    DASHBOARD: 'dashboard',
    PROFILE_TABS: 'profileTabs',
    FACILITY_PROFILE_TABS: 'facilityProfileTabs',
    MESSAGES: 'messages',
    CONTRACTS: 'contracts',
    CALENDAR: 'calendar',
    MARKETPLACE: 'marketplace',
    PAYROLL: 'payroll',
    ORGANIZATION: 'organization',
    SETTINGS: 'settings'
};

export const MANDATORY_TUTORIALS = [
    TUTORIAL_FEATURES.DASHBOARD,
    TUTORIAL_FEATURES.PROFILE_TABS,
    TUTORIAL_FEATURES.FACILITY_PROFILE_TABS,
    TUTORIAL_FEATURES.MESSAGES,
    TUTORIAL_FEATURES.CONTRACTS,
    TUTORIAL_FEATURES.CALENDAR,
    TUTORIAL_FEATURES.MARKETPLACE,
    TUTORIAL_FEATURES.SETTINGS
];

export const DEFAULT_SIDEBAR_WIDTH = {
    COLLAPSED: 70,
    EXPANDED: 256
};
