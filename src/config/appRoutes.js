import React, { lazy } from 'react';
import {
  LoginPage,
  SignupPage,
  ForgotPasswordPage
} from '../websitePages/Auth';
import {
  HomePage,
  AboutPage,
  FacilitiesPage,
  ProfessionalsPage,
  FAQPage,
  ContactPage,
  BlogPage,
  SupportPage,
  PrivacyPolicyPage,
  TermsOfServicePage,
  SitemapPage,
  NotFoundPage,
  OnboardingPage
} from '../websitePages';

/**
 * CENTRALIZED APP ROUTE CONFIGURATION
 * Single source of truth for all main application routes
 * 
 * This file centralizes:
 * - Public routes (home, about, blog, etc.)
 * - Authentication routes (login, signup, etc.)
 * - Protected routes (onboarding, dashboard)
 * - Test routes (development only)
 * 
 * IMPORTANT: All route definitions MUST be in this file.
 * Use routeHelpers.js for building paths with language prefixes.
 * Use dashboard/config/routes.js for dashboard-specific routes.
 */

export const ROUTE_TYPES = {
  PUBLIC: 'public',
  PROTECTED: 'protected',
  AUTH: 'auth',
  TEST: 'test'
};

export const PUBLIC_ROUTES = [
  {
    id: 'home',
    path: 'home',
    component: HomePage,
    type: ROUTE_TYPES.PUBLIC,
    label: 'Home'
  },
  {
    id: 'about',
    path: 'about',
    component: AboutPage,
    type: ROUTE_TYPES.PUBLIC,
    label: 'About'
  },
  {
    id: 'professionals',
    path: 'professionals',
    component: ProfessionalsPage,
    type: ROUTE_TYPES.PUBLIC,
    label: 'Professionals'
  },
  {
    id: 'facilities',
    path: 'facilities',
    component: FacilitiesPage,
    type: ROUTE_TYPES.PUBLIC,
    label: 'Facilities'
  },
  {
    id: 'faq',
    path: 'faq',
    component: FAQPage,
    type: ROUTE_TYPES.PUBLIC,
    label: 'FAQ'
  },
  {
    id: 'contact',
    path: 'contact',
    component: ContactPage,
    type: ROUTE_TYPES.PUBLIC,
    label: 'Contact'
  },
  {
    id: 'blog',
    path: 'blog',
    component: BlogPage,
    type: ROUTE_TYPES.PUBLIC,
    label: 'Blog'
  },
  {
    id: 'blog-post',
    path: 'blog/:slug',
    component: lazy(() => import('../websitePages/Blog/BlogPost').catch(() => ({ default: () => <div>Blog post not found</div> }))),
    type: ROUTE_TYPES.PUBLIC,
    label: 'Blog Post',
    hidden: true
  },
  {
    id: 'support',
    path: 'support',
    component: SupportPage,
    type: ROUTE_TYPES.PUBLIC,
    label: 'Support'
  },
  {
    id: 'privacy-policy',
    path: 'privacy-policy',
    component: PrivacyPolicyPage,
    type: ROUTE_TYPES.PUBLIC,
    label: 'Privacy Policy'
  },
  {
    id: 'terms-of-service',
    path: 'terms-of-service',
    component: TermsOfServicePage,
    type: ROUTE_TYPES.PUBLIC,
    label: 'Terms of Service'
  },
  {
    id: 'sitemap',
    path: 'sitemap',
    component: SitemapPage,
    type: ROUTE_TYPES.PUBLIC,
    label: 'Sitemap'
  },
  {
    id: 'loading',
    path: 'loading',
    component: LoadingPage,
    type: ROUTE_TYPES.PUBLIC,
    label: 'Loading',
    hidden: true
  },
  {
    id: 'not-found',
    path: 'not-found',
    component: NotFoundPage,
    type: ROUTE_TYPES.PUBLIC,
    label: 'Not Found',
    hidden: true
  }
];

export const AUTH_ROUTES = [
  {
    id: 'login',
    path: 'login',
    component: LoginPage,
    type: ROUTE_TYPES.AUTH,
    label: 'Login',
    requiresAuth: false
  },
  {
    id: 'signup',
    path: 'signup',
    component: SignupPage,
    type: ROUTE_TYPES.AUTH,
    label: 'Sign Up',
    requiresAuth: false
  },
  {
    id: 'signup-step',
    path: 'signup/:step',
    component: SignupPage,
    type: ROUTE_TYPES.AUTH,
    label: 'Sign Up Step',
    requiresAuth: false,
    hidden: true
  },
  {
    id: 'forgot-password',
    path: 'forgot-password',
    component: ForgotPasswordPage,
    type: ROUTE_TYPES.AUTH,
    label: 'Forgot Password',
    requiresAuth: false
  },
  {
    id: 'verification-sent',
    path: 'verification-sent',
    component: VerificationSentPage,
    type: ROUTE_TYPES.AUTH,
    label: 'Verification Sent',
    requiresAuth: false,
    hidden: true
  }
];

export const PROTECTED_ROUTES = [
  {
    id: 'onboarding',
    path: 'onboarding',
    component: OnboardingPage,
    type: ROUTE_TYPES.PROTECTED,
    label: 'Onboarding',
    requiresAuth: true,
    skipWorkspaceCheck: true
  },
  {
    id: 'dashboard',
    path: 'dashboard/*',
    component: lazy(() => import('../dashboard/dashboardRoot')),
    type: ROUTE_TYPES.PROTECTED,
    label: 'Dashboard',
    requiresAuth: true,
    requiresWorkspace: true,
    hidden: true
  }
];

export const ACCESS_TYPES = {
  PUBLIC: 'public',
  PERSONAL: 'personal',
  FACILITY: 'facility',
  ADMIN: 'admin',
  PERSONAL_OR_FACILITY: 'personal_or_facility',
  ALL: 'all',
};

export const WORKSPACE_TYPES = {
  PERSONAL: 'personal',
  TEAM: 'team',
  FACILITY: 'facility',
  ADMIN: 'admin'
};

const PersonalDashboard = lazy(() => import('../dashboard/pages/dashboard/personalDashboard'));
const Calendar = lazy(() => import('../dashboard/pages/calendar/Calendar'));
const Profile = lazy(() => import('../dashboard/pages/profile/profile'));
const Marketplace = lazy(() => import('../dashboard/pages/marketplace/marketplace'));
const OrganizationDashboard = lazy(() => import('../dashboard/pages/organization/OrganizationDashboard'));
const PricingPage = lazy(() => import('../websitePages/pricing/PricingPage'));
const DashboardSupportPage = lazy(() => import('../dashboard/pages/support/SupportPage'));
const ServicesPage = lazy(() => import('../dashboard/pages/support/tabs/SupportTicketsTab'));

export const DASHBOARD_SHARED_ROUTES = [
  {
    id: 'overview',
    path: 'overview',
    component: PersonalDashboard,
    access: ACCESS_TYPES.ALL,
    label: 'Overview',
    icon: 'LayoutDashboard',
  },
  {
    id: 'personal',
    path: 'personal',
    component: PersonalDashboard,
    access: ACCESS_TYPES.ALL,
    label: 'Dashboard',
    hidden: true,
  },
  {
    id: 'profile',
    path: 'profile/*',
    component: Profile,
    access: ACCESS_TYPES.ALL,
    label: 'Profile',
    icon: 'User',
  },
  {
    id: 'pricing',
    path: 'pricing',
    component: PricingPage,
    access: ACCESS_TYPES.ALL,
    label: 'Pricing',
    icon: 'DollarSign',
  },
  {
    id: 'marketplace',
    path: 'marketplace',
    component: Marketplace,
    access: ACCESS_TYPES.ALL,
    label: 'Marketplace',
    icon: 'ShoppingBag',
    passUserData: true,
  },
  {
    id: 'support',
    path: 'support',
    component: DashboardSupportPage,
    access: ACCESS_TYPES.ALL,
    label: 'Support',
    icon: 'HelpCircle',
  },
  {
    id: 'services',
    path: 'services',
    component: ServicesPage,
    access: ACCESS_TYPES.PERSONAL_OR_FACILITY,
    label: 'Services',
    icon: 'Briefcase',
  },
];

export const DASHBOARD_PROFESSIONAL_ROUTES = [
  {
    id: 'calendar',
    path: 'calendar/*',
    component: Calendar,
    access: ACCESS_TYPES.PERSONAL_OR_FACILITY,
    label: 'Calendar',
    icon: 'Calendar',
    passUserData: true,
  },
];

export const DASHBOARD_FACILITY_ROUTES = [
  {
    id: 'payroll',
    path: 'payroll/*',
    component: PayrollDashboard,
    access: ACCESS_TYPES.FACILITY,
    label: 'Payroll',
    icon: 'DollarSign',
  },
  {
    id: 'organization',
    path: 'organization/*',
    component: OrganizationDashboard,
    access: ACCESS_TYPES.FACILITY,
    label: 'Organization',
    icon: 'Building2',
  },
  {
    id: 'facility',
    path: 'facility/*',
    component: OrganizationDashboard,
    access: ACCESS_TYPES.FACILITY,
    label: 'Facility',
    icon: 'Building2',
    hidden: true,
  },
];

export const DASHBOARD_ADMIN_ROUTES = [];

export const getRoutesForWorkspace = (workspaceType) => {
  const routes = [...DASHBOARD_SHARED_ROUTES];

  if (workspaceType === WORKSPACE_TYPES.PERSONAL) {
    routes.push(...DASHBOARD_PROFESSIONAL_ROUTES);
  } else if (workspaceType === WORKSPACE_TYPES.TEAM || workspaceType === 'organization') {
    routes.push(...DASHBOARD_PROFESSIONAL_ROUTES.filter(r => r.access !== ACCESS_TYPES.PERSONAL));
    routes.push(...DASHBOARD_FACILITY_ROUTES);
  } else if (workspaceType === WORKSPACE_TYPES.ADMIN) {
    return DASHBOARD_ADMIN_ROUTES;
  }

  return routes;
};

export const canAccessRoute = (route, workspaceType) => {
  if (!workspaceType) return route.access === ACCESS_TYPES.PUBLIC || route.access === ACCESS_TYPES.ALL;

  switch (route.access) {
    case ACCESS_TYPES.PUBLIC:
    case ACCESS_TYPES.ALL:
      return true;
    case ACCESS_TYPES.PERSONAL:
      return workspaceType === WORKSPACE_TYPES.PERSONAL;
    case ACCESS_TYPES.FACILITY:
      return workspaceType === WORKSPACE_TYPES.FACILITY || workspaceType === WORKSPACE_TYPES.TEAM || workspaceType === 'organization';
    case ACCESS_TYPES.ADMIN:
      return workspaceType === WORKSPACE_TYPES.ADMIN;
    case ACCESS_TYPES.PERSONAL_OR_FACILITY:
      return workspaceType === WORKSPACE_TYPES.PERSONAL || workspaceType === WORKSPACE_TYPES.FACILITY || workspaceType === WORKSPACE_TYPES.TEAM || workspaceType === 'organization';
    default:
      return false;
  }
};

export const getDefaultRoute = (workspaceType) => {
  if (workspaceType === WORKSPACE_TYPES.ADMIN) {
    return '/dashboard/admin/portal';
  }
  return '/dashboard/overview';
};

export const getDashboardRouteById = (routeId) => {
  const allDashboardRoutes = [...DASHBOARD_SHARED_ROUTES, ...DASHBOARD_PROFESSIONAL_ROUTES, ...DASHBOARD_FACILITY_ROUTES, ...DASHBOARD_ADMIN_ROUTES];
  return allDashboardRoutes.find(r => r.id === routeId);
};

export const getDashboardRouteByPath = (path) => {
  const cleanPath = path.replace('/dashboard/', '').replace('/dashboard', '');
  const allDashboardRoutes = [...DASHBOARD_SHARED_ROUTES, ...DASHBOARD_PROFESSIONAL_ROUTES, ...DASHBOARD_FACILITY_ROUTES, ...DASHBOARD_ADMIN_ROUTES];
  return allDashboardRoutes.find(r => {
    const routePath = r.path.replace('/*', '');
    return cleanPath === routePath || cleanPath.startsWith(routePath + '/');
  });
};

export const buildRouteUrl = (routeId, workspaceId, params = {}) => {
  const route = getDashboardRouteById(routeId);
  if (!route) {
    return `/dashboard/${workspaceId || 'personal'}/overview`;
  }

  const cleanPath = route.path.replace('/*', '');
  const baseUrl = `/dashboard/${workspaceId || 'personal'}/${cleanPath}`;

  const searchParams = new URLSearchParams(params);
  const queryString = searchParams.toString();
  return `${baseUrl}${queryString ? `?${queryString}` : ''}`;
};

export const DASHBOARD_ROUTE_IDS = {
  OVERVIEW: 'overview',
  PROFILE: 'profile',
  CALENDAR: 'calendar',
  MESSAGES: 'messages',
  ANNOUNCEMENTS: 'announcements',
  INTERNAL_TICKET: 'internal-ticket',
  REPORTING: 'reporting',
  MARKETPLACE: 'marketplace',
  PAYROLL: 'payroll',
  ORGANIZATION: 'organization',
  ADMIN_PORTAL: 'admin-portal',
  ADMIN_VERIFICATION: 'admin-verification',
  ADMIN_CRM: 'admin-crm',
  ADMIN_SHIFTS: 'admin-shifts',
  ADMIN_JOB_SCRAPER: 'admin-job-scraper',
  ADMIN_REVENUE: 'admin-revenue',
  ADMIN_SPENDINGS: 'admin-spendings',
  ADMIN_AR: 'admin-ar',
  ADMIN_BALANCE_SHEET: 'admin-balance-sheet',
  ADMIN_AUDIT: 'admin-audit',
  ADMIN_NOTIFICATIONS: 'admin-notifications',
  ADMIN_EMAIL: 'admin-email',
  ADMIN_GLN_TEST: 'admin-gln-test',
  ADMIN_PAYROLL_EXPORT: 'admin-payroll-export',
  ADMIN_EMPLOYEES: 'admin-employees',
  FACILITY_EMPLOYEES: 'employees'
};

export const SPECIAL_ROUTES = {
  ROOT: {
    id: 'root',
    path: '/',
    type: 'special',
    label: 'Root'
  },
  LANG_ROOT: {
    id: 'lang-root',
    path: '/:lang',
    type: 'special',
    label: 'Language Root'
  },
  CATCH_ALL: {
    id: 'catch-all',
    path: '*',
    type: 'special',
    label: 'Catch All'
  },
  DASHBOARD_DIRECT: {
    id: 'dashboard-direct',
    path: '/dashboard/*',
    type: 'special',
    label: 'Dashboard Direct'
  }
};

export const ALL_ROUTES = [
  ...PUBLIC_ROUTES,
  ...AUTH_ROUTES,
  ...PROTECTED_ROUTES,
];

export const getRouteById = (routeId) => {
  return ALL_ROUTES.find(route => route.id === routeId);
};

export const getRouteByPath = (path) => {
  const cleanPath = path.replace(/^\/[a-z]{2}\//, '').replace(/^\//, '');
  return ALL_ROUTES.find(route => {
    if (route.path.includes(':')) {
      const routePattern = route.path.replace(/:[^/]+/g, '[^/]+');
      const regex = new RegExp(`^${routePattern}$`);
      return regex.test(cleanPath);
    }
    return route.path === cleanPath || cleanPath.startsWith(route.path);
  });
};

export const getRoutesByType = (type) => {
  return ALL_ROUTES.filter(route => route.type === type);
};

export const buildRoutePath = (routeId, params = {}) => {
  const route = getRouteById(routeId);
  if (!route) return '/';
  
  let path = route.path;
  Object.keys(params).forEach(key => {
    path = path.replace(`:${key}`, params[key]);
  });
  
  return path;
};

const exportedRoutes = {
  ROUTE_TYPES,
  PUBLIC_ROUTES,
  AUTH_ROUTES,
  PROTECTED_ROUTES,
  ALL_ROUTES,
  getRouteById,
  getRouteByPath,
  getRoutesByType,
  buildRoutePath
};

export default exportedRoutes;

