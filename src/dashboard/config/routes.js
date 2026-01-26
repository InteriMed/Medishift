import { lazy } from 'react';
import { WORKSPACE_TYPES } from '../../utils/sessionAuth';
import { RIGHTS as PERMISSIONS } from '../admin/utils/rbac';

// Lazy-loaded components
const PersonalDashboard = lazy(() => import('../pages/personalDashboard/PersonalDashboard'));
const Calendar = lazy(() => import('../pages/calendar/Calendar'));
const Messages = lazy(() => import('../pages/messages/Messages'));
const Contracts = lazy(() => import('../pages/contracts/Contracts'));
const Profile = lazy(() => import('../pages/profile/Profile'));
const Marketplace = lazy(() => import('../pages/marketplace/Marketplace'));
const PayrollDashboard = lazy(() => import('../pages/payroll/PayrollDashboard'));
const OrganizationDashboard = lazy(() => import('../pages/organization/OrganizationDashboard'));
const PricingPage = lazy(() => import('../pages/pricing/PricingPage'));
const SupportPage = lazy(() => import('../pages/support/SupportPage'));

// Admin pages
const ExecutiveDashboard = lazy(() => import('../admin/pages/ExecutiveDashboard'));
const UserVerificationQueue = lazy(() => import('../admin/UserVerificationQueue'));
const UserCRM = lazy(() => import('../admin/pages/operations/UserCRM'));
const ShiftCommandCenter = lazy(() => import('../admin/pages/operations/ShiftCommandCenter'));
const RevenueAnalysis = lazy(() => import('../admin/pages/finance/RevenueAnalysis'));
const SpendingsTracker = lazy(() => import('../admin/pages/finance/SpendingsTracker'));
const AccountsReceivable = lazy(() => import('../admin/pages/finance/AccountsReceivable'));
const BalanceSheet = lazy(() => import('../admin/pages/finance/BalanceSheet'));
const AuditLogs = lazy(() => import('../admin/pages/system/AuditLogs'));
const NotificationsCenter = lazy(() => import('../admin/pages/system/NotificationsCenter'));
const RolesAndPermissions = lazy(() => import('../admin/pages/system/RolesAndPermissions'));
const PayrollExport = lazy(() => import('../admin/pages/payroll/PayrollExport'));
const AdminManagement = lazy(() => import('../admin/pages/management/AdminManagement'));
const LinkedInJobScraper = lazy(() => import('../admin/pages/operations/LinkedInJobScraper'));
const GLNTestPage = lazy(() => import('../pages/glnTest/GLNTestPage'));
const EmailCenter = lazy(() => import('../pages/admin/EmailCenter'));

/**
 * Route access types
 */
export const ACCESS_TYPES = {
  PUBLIC: 'public',           // No workspace required
  PERSONAL: 'personal',       // Personal workspace only
  FACILITY: 'facility',       // Facility/Team workspace only
  ADMIN: 'admin',             // Admin workspace only
  PERSONAL_OR_FACILITY: 'personal_or_facility',  // Either personal or facility
  ALL: 'all',                 // All workspace types
};

/**
 * Centralized route configuration
 * Each route defines:
 * - path: Route path (relative to /dashboard)
 * - component: React component to render
 * - access: Which workspace types can access this route
 * - permission: Admin permission required (optional, for admin routes)
 * - exact: Whether to match exactly (default: false for nested routes)
 * - passUserData: Whether to pass userData prop to component
 */
export const SHARED_ROUTES = [
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
    hidden: true, // Hidden from navigation
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
    component: SupportPage,
    access: ACCESS_TYPES.ALL,
    label: 'Support',
    icon: 'HelpCircle',
  },
];

export const PROFESSIONAL_ROUTES = [
  {
    id: 'calendar',
    path: 'calendar/*',
    component: Calendar,
    access: ACCESS_TYPES.PERSONAL_OR_FACILITY,
    label: 'Calendar',
    icon: 'Calendar',
    passUserData: true,
  },
  {
    id: 'messages',
    path: 'messages/*',
    component: Messages,
    access: ACCESS_TYPES.PERSONAL_OR_FACILITY,
    label: 'Messages',
    icon: 'MessageSquare',
    passUserData: true,
  },
  {
    id: 'contracts',
    path: 'contracts/*',
    component: Contracts,
    access: ACCESS_TYPES.PERSONAL_OR_FACILITY,
    label: 'Contracts',
    icon: 'FileText',
    passUserData: true,
  },
];

export const FACILITY_ROUTES = [
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
];

export const ADMIN_ROUTES = [
  {
    id: 'admin-portal',
    path: 'portal',
    component: ExecutiveDashboard,
    access: ACCESS_TYPES.ADMIN,
    permission: PERMISSIONS.VIEW_DASHBOARD,
    label: 'Executive Dashboard',
    icon: 'LayoutDashboard',
    isDefault: true,
  },
  {
    id: 'admin-verification',
    path: 'verification',
    component: UserVerificationQueue,
    access: ACCESS_TYPES.ADMIN,
    permission: PERMISSIONS.VERIFY_USERS,
    label: 'Verification Queue',
    icon: 'Users',
  },
  {
    id: 'admin-crm',
    path: 'operations/users',
    component: UserCRM,
    access: ACCESS_TYPES.ADMIN,
    permission: PERMISSIONS.VIEW_USER_PROFILES,
    label: 'Search - CRM',
    icon: 'Search',
  },
  {
    id: 'admin-shifts',
    path: 'operations/shifts',
    component: ShiftCommandCenter,
    access: ACCESS_TYPES.ADMIN,
    permission: PERMISSIONS.MANAGE_SHIFTS,
    label: 'Shift List',
    icon: 'Calendar',
  },
  {
    id: 'admin-job-scraper',
    path: 'operations/job-scraper',
    component: LinkedInJobScraper,
    access: ACCESS_TYPES.ADMIN,
    permission: PERMISSIONS.MANAGE_SYSTEM,
    label: 'LinkedIn Job Scraper',
    icon: 'Briefcase',
  },
  {
    id: 'admin-revenue',
    path: 'finance/revenue',
    component: RevenueAnalysis,
    access: ACCESS_TYPES.ADMIN,
    permission: PERMISSIONS.VIEW_REVENUE,
    label: 'Revenue & Commissions',
    icon: 'DollarSign',
  },
  {
    id: 'admin-spendings',
    path: 'finance/spendings',
    component: SpendingsTracker,
    access: ACCESS_TYPES.ADMIN,
    permission: PERMISSIONS.VIEW_FINANCE,
    label: 'Referral Payouts',
    icon: 'DollarSign',
  },
  {
    id: 'admin-ar',
    path: 'finance/ar',
    component: AccountsReceivable,
    access: ACCESS_TYPES.ADMIN,
    permission: PERMISSIONS.VIEW_FINANCE,
    label: 'Invoices (SaaS)',
    icon: 'FileText',
  },
  {
    id: 'admin-balance-sheet',
    path: 'finance/balance-sheet',
    component: BalanceSheet,
    access: ACCESS_TYPES.ADMIN,
    permission: PERMISSIONS.VIEW_BALANCE_SHEET,
    label: 'Balance Sheet',
    icon: 'DollarSign',
  },
  {
    id: 'admin-audit',
    path: 'system/audit',
    component: AuditLogs,
    access: ACCESS_TYPES.ADMIN,
    permission: PERMISSIONS.VIEW_AUDIT_LOGS,
    label: 'Audit Logs',
    icon: 'AlertCircle',
  },
  {
    id: 'admin-roles-permissions',
    path: 'system/roles-permissions',
    component: RolesAndPermissions,
    access: ACCESS_TYPES.ADMIN,
    permission: PERMISSIONS.VIEW_AUDIT_LOGS,
    label: 'Roles & Permissions',
    icon: 'Shield',
  },
  {
    id: 'admin-notifications',
    path: 'system/notifications',
    component: NotificationsCenter,
    access: ACCESS_TYPES.ADMIN,
    permission: PERMISSIONS.SEND_NOTIFICATIONS,
    label: 'Notifications',
    icon: 'Bell',
  },
  {
    id: 'admin-email',
    path: 'email',
    component: EmailCenter,
    access: ACCESS_TYPES.ADMIN,
    permission: PERMISSIONS.SEND_NOTIFICATIONS,
    label: 'Email Center',
    icon: 'Mail',
  },
  {
    id: 'admin-gln-test',
    path: 'system/gln-test',
    component: GLNTestPage,
    access: ACCESS_TYPES.ADMIN,
    permission: PERMISSIONS.VIEW_AUDIT_LOGS,
    label: 'GLN Test',
    icon: 'FlaskConical',
  },
  {
    id: 'admin-payroll-export',
    path: 'payroll/export',
    component: PayrollExport,
    access: ACCESS_TYPES.ADMIN,
    permission: PERMISSIONS.EXPORT_PAYROLL,
    label: 'Payroll Export',
    icon: 'FileText',
  },
  {
    id: 'admin-management',
    path: 'management/admins',
    component: AdminManagement,
    access: ACCESS_TYPES.ADMIN,
    permission: PERMISSIONS.MANAGE_ADMINS,
    label: 'Admin Management',
    icon: 'Shield',
  },
];

/**
 * Get all routes for a specific workspace type
 */
export const getRoutesForWorkspace = (workspaceType) => {
  const routes = [...SHARED_ROUTES];

  if (workspaceType === WORKSPACE_TYPES.PERSONAL) {
    routes.push(...PROFESSIONAL_ROUTES);
  } else if (workspaceType === WORKSPACE_TYPES.TEAM) {
    routes.push(...PROFESSIONAL_ROUTES.filter(r => r.access !== ACCESS_TYPES.PERSONAL));
    routes.push(...FACILITY_ROUTES);
  } else if (workspaceType === WORKSPACE_TYPES.ADMIN) {
    // Admin workspace uses its own layout and routes
    return ADMIN_ROUTES;
  }

  return routes;
};

/**
 * Check if a route is accessible for a given workspace type
 */
export const canAccessRoute = (route, workspaceType) => {
  if (!workspaceType) return route.access === ACCESS_TYPES.PUBLIC || route.access === ACCESS_TYPES.ALL;

  switch (route.access) {
    case ACCESS_TYPES.PUBLIC:
    case ACCESS_TYPES.ALL:
      return true;
    case ACCESS_TYPES.PERSONAL:
      return workspaceType === WORKSPACE_TYPES.PERSONAL;
    case ACCESS_TYPES.FACILITY:
      return workspaceType === WORKSPACE_TYPES.FACILITY || workspaceType === WORKSPACE_TYPES.TEAM;
    case ACCESS_TYPES.ADMIN:
      return workspaceType === WORKSPACE_TYPES.ADMIN;
    case ACCESS_TYPES.PERSONAL_OR_FACILITY:
      return workspaceType === WORKSPACE_TYPES.PERSONAL || workspaceType === WORKSPACE_TYPES.FACILITY || workspaceType === WORKSPACE_TYPES.TEAM;
    default:
      return false;
  }
};

/**
 * Get the default route for a workspace type
 */
export const getDefaultRoute = (workspaceType) => {
  if (workspaceType === WORKSPACE_TYPES.ADMIN) {
    const defaultAdminRoute = ADMIN_ROUTES.find(r => r.isDefault);
    return defaultAdminRoute ? `/dashboard/admin/${defaultAdminRoute.path}` : '/dashboard/admin/portal';
  }
  return '/dashboard/overview';
};

/**
 * Get route by ID
 */
export const getRouteById = (routeId) => {
  const allRoutes = [...SHARED_ROUTES, ...PROFESSIONAL_ROUTES, ...FACILITY_ROUTES, ...ADMIN_ROUTES];
  return allRoutes.find(r => r.id === routeId);
};

/**
 * Get route by path
 */
export const getRouteByPath = (path) => {
  const cleanPath = path.replace('/dashboard/', '').replace('/dashboard', '');
  const allRoutes = [...SHARED_ROUTES, ...PROFESSIONAL_ROUTES, ...FACILITY_ROUTES, ...ADMIN_ROUTES];
  return allRoutes.find(r => {
    const routePath = r.path.replace('/*', '');
    return cleanPath === routePath || cleanPath.startsWith(routePath + '/');
  });
};

/**
 * Build full URL for a route
 */
export const buildRouteUrl = (routeId, workspaceId, params = {}) => {
  const route = getRouteById(routeId);
  if (!route) return '/dashboard/overview';

  const isAdminRoute = ADMIN_ROUTES.some(r => r.id === routeId);
  const basePath = isAdminRoute ? `/dashboard/admin/${route.path}` : `/dashboard/${route.path}`;
  const cleanPath = basePath.replace('/*', '');

  const searchParams = new URLSearchParams(params);
  if (workspaceId) {
    searchParams.set('workspace', workspaceId);
  }

  const queryString = searchParams.toString();
  return `${cleanPath}${queryString ? `?${queryString}` : ''}`;
};

export const DASHBOARD_ROUTE_IDS = {
  OVERVIEW: 'overview',
  PROFILE: 'profile',
  CALENDAR: 'calendar',
  MESSAGES: 'messages',
  CONTRACTS: 'contracts',
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

export default {
  SHARED_ROUTES,
  PROFESSIONAL_ROUTES,
  FACILITY_ROUTES,
  ADMIN_ROUTES,
  ACCESS_TYPES,
  DASHBOARD_ROUTE_IDS,
  getRoutesForWorkspace,
  canAccessRoute,
  getDefaultRoute,
  getRouteById,
  getRouteByPath,
  buildRouteUrl,
};
