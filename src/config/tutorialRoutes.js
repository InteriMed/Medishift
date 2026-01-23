import { DASHBOARD_ROUTE_IDS } from './routeHelpers';
import { TUTORIAL_IDS, PROFILE_TAB_IDS } from './tutorialConfig';

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

export const TUTORIAL_TO_ROUTE_MAP = {
    [TUTORIAL_IDS.DASHBOARD]: DASHBOARD_ROUTE_IDS.OVERVIEW,
    [TUTORIAL_IDS.PROFILE_TABS]: DASHBOARD_ROUTE_IDS.PROFILE,
    [TUTORIAL_IDS.FACILITY_PROFILE_TABS]: DASHBOARD_ROUTE_IDS.PROFILE,
    [TUTORIAL_IDS.MESSAGES]: DASHBOARD_ROUTE_IDS.MESSAGES,
    [TUTORIAL_IDS.CONTRACTS]: DASHBOARD_ROUTE_IDS.CONTRACTS,
    [TUTORIAL_IDS.CALENDAR]: DASHBOARD_ROUTE_IDS.CALENDAR,
    [TUTORIAL_IDS.MARKETPLACE]: DASHBOARD_ROUTE_IDS.MARKETPLACE,
    [TUTORIAL_IDS.PAYROLL]: DASHBOARD_ROUTE_IDS.PAYROLL,
    [TUTORIAL_IDS.ORGANIZATION]: DASHBOARD_ROUTE_IDS.ORGANIZATION,
    [TUTORIAL_IDS.SETTINGS]: 'settings',
    [TUTORIAL_IDS.PROFILE]: DASHBOARD_ROUTE_IDS.PROFILE
};

export const SIDEBAR_ITEM_SELECTORS = {
    [DASHBOARD_ROUTE_IDS.PROFILE]: 'a[href="/dashboard/profile"]',
    [DASHBOARD_ROUTE_IDS.MESSAGES]: 'a[href="/dashboard/messages"]',
    [DASHBOARD_ROUTE_IDS.CONTRACTS]: 'a[href="/dashboard/contracts"]',
    [DASHBOARD_ROUTE_IDS.CALENDAR]: 'a[href="/dashboard/calendar"]',
    [DASHBOARD_ROUTE_IDS.MARKETPLACE]: 'a[href="/dashboard/marketplace"]',
    [DASHBOARD_ROUTE_IDS.PAYROLL]: 'a[href="/dashboard/payroll"]',
    [DASHBOARD_ROUTE_IDS.ORGANIZATION]: 'a[href="/dashboard/organization"]',
    settings: 'a[href="/dashboard/settings"]'
};

export const buildTutorialDashboardPath = (feature) => {
    return DASHBOARD_PATHS[feature.toUpperCase()] || `${DASHBOARD_PATHS.BASE}/${feature}`;
};

export const buildProfileTabPath = (tabId) => {
    return PROFILE_TAB_PATHS[tabId] || `${DASHBOARD_PATHS.PROFILE}/${tabId}`;
};

export const buildSidebarSelector = (feature) => {
    return SIDEBAR_ITEM_SELECTORS[feature] || `a[href="/dashboard/${feature}"]`;
};

export const buildTabSelector = (tabId) => {
    return `button[data-tab="${tabId}"]`;
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

export const normalizePathForComparison = (path) => {
    return path.replace(/^\/(en|fr|de|it)\//, '/');
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
    
    if (normalizedRequired.includes('/dashboard/profile') && 
        normalizedCurrent.includes('/dashboard/profile')) {
        return true;
    }
    
    return false;
};

export const extractFeatureFromPath = (path) => {
    const normalizedPath = normalizePathForComparison(path);
    const match = normalizedPath.match(/\/dashboard\/([^\/]+)/);
    return match ? match[1] : 'overview';
};

export const extractTabFromPath = (path) => {
    const normalizedPath = normalizePathForComparison(path);
    const match = normalizedPath.match(/\/dashboard\/profile\/([^\/]+)/);
    return match ? match[1] : null;
};

export const isDashboardPath = (path) => {
    return path.includes('/dashboard');
};

export const isProfilePath = (path) => {
    return path.includes('/dashboard/profile');
};

export default {
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
};

