import React, { lazy } from 'react';

const PersonalDashboard = lazy(() => import('../pages/dashboard/personalDashboard'));
const Calendar = lazy(() => import('../pages/calendar'));
const Profile = lazy(() => import('../pages/profile/profile'));
const Marketplace = lazy(() => import('../pages/marketplace/marketplace'));
const PayrollDashboard = lazy(() => import('../admin/payroll/payrollDashboard'));
const OrganizationDashboard = lazy(() => import('../pages/organization/OrganizationDashboard'));
const DashboardSupportPage = lazy(() => import('../pages/support/supportPage'));

const AdminDashboard = lazy(() => import('../admin/pages/dashboard'));
const ExecutiveDashboard = lazy(() => import('../admin/pages/executiveDashboard'));
const VerificationQueue = lazy(() => import('../admin/UserVerificationQueue'));
const ShiftCommandCenter = lazy(() => import('../admin/pages/operations/shiftCommandCenter'));
const UserCRM = lazy(() => import('../admin/pages/operations/userCRM'));
const RevenueAnalysis = lazy(() => import('../admin/pages/finance/revenueAnalysis'));
const AccountsReceivable = lazy(() => import('../admin/pages/finance/accountsReceivable'));
const SpendingsTracker = lazy(() => import('../admin/pages/finance/spendingsTracker'));
const BalanceSheet = lazy(() => import('../admin/pages/finance/balanceSheet'));
const AuditLogs = lazy(() => import('../admin/pages/system/auditLogs'));
const NotificationsCenter = lazy(() => import('../admin/pages/system/notificationsCenter'));
const EmployeeManagement = lazy(() => import('../admin/pages/management/employeeManagement'));
const JobScraper = lazy(() => import('../admin/pages/operations/jobScraper'));

export const SHARED_ROUTES = [
  {
    id: 'overview',
    path: 'overview',
    component: PersonalDashboard,
    label: 'Overview',
    icon: 'LayoutDashboard',
  },
  {
    id: 'personal',
    path: 'personal',
    component: PersonalDashboard,
    label: 'Dashboard',
    hidden: true,
  },
  {
    id: 'profile',
    path: 'profile/*',
    component: Profile,
    label: 'Profile',
    icon: 'User',
  },
  {
    id: 'marketplace',
    path: 'marketplace',
    component: Marketplace,
    label: 'Marketplace',
    icon: 'ShoppingBag',
    passUserData: true,
  },
  {
    id: 'support',
    path: 'support',
    component: DashboardSupportPage,
    label: 'Support',
    icon: 'HelpCircle',
  },
];

export const PROFESSIONAL_ROUTES = [
  {
    id: 'calendar',
    path: 'calendar/*',
    component: Calendar,
    label: 'Calendar',
    icon: 'Calendar',
    passUserData: true,
  },
];

export const FACILITY_ROUTES = [
  {
    id: 'payroll',
    path: 'payroll/*',
    component: PayrollDashboard,
    label: 'Payroll',
    icon: 'DollarSign',
  },
  {
    id: 'organization',
    path: 'organization/*',
    component: OrganizationDashboard,
    label: 'Organization',
    icon: 'Building2',
  },
  {
    id: 'facility',
    path: 'facility/*',
    component: OrganizationDashboard,
    label: 'Facility',
    icon: 'Building2',
    hidden: true,
  },
];

export const ADMIN_ROUTES = [
  {
    id: 'portal',
    path: 'portal',
    component: ExecutiveDashboard,
    label: 'Executive Dashboard',
    icon: 'LayoutDashboard',
    permission: 'VIEW_DASHBOARD',
  },
  {
    id: 'verification',
    path: 'verification',
    component: VerificationQueue,
    label: 'Verification Queue',
    icon: 'Users',
    permission: 'VERIFY_USERS',
  },
  {
    id: 'operations-users',
    path: 'operations/users',
    component: UserCRM,
    label: 'User CRM',
    icon: 'Search',
    permission: 'VIEW_USER_PROFILES',
  },
  {
    id: 'operations-shifts',
    path: 'operations/shifts',
    component: ShiftCommandCenter,
    label: 'Shift Command Center',
    icon: 'Calendar',
    permission: 'MANAGE_SHIFTS',
  },
  {
    id: 'operations-job-scraper',
    path: 'operations/job-scraper',
    component: JobScraper,
    label: 'LinkedIn Job Scraper',
    icon: 'Briefcase',
    permission: 'MANAGE_SYSTEM',
  },
  {
    id: 'finance-revenue',
    path: 'finance/revenue',
    component: RevenueAnalysis,
    label: 'Revenue & Commissions',
    icon: 'DollarSign',
    permission: 'VIEW_REVENUE',
  },
  {
    id: 'finance-ar',
    path: 'finance/ar',
    component: AccountsReceivable,
    label: 'Accounts Receivable',
    icon: 'FileText',
    permission: 'VIEW_FINANCE',
  },
  {
    id: 'finance-spendings',
    path: 'finance/spendings',
    component: SpendingsTracker,
    label: 'Referral Payouts',
    icon: 'TrendingDown',
    permission: 'VIEW_FINANCE',
  },
  {
    id: 'finance-balance-sheet',
    path: 'finance/balance-sheet',
    component: BalanceSheet,
    label: 'Balance Sheet',
    icon: 'BarChart',
    permission: 'VIEW_BALANCE_SHEET',
  },
  {
    id: 'system-audit',
    path: 'system/audit',
    component: AuditLogs,
    label: 'Audit Logs',
    icon: 'FileText',
    permission: 'VIEW_AUDIT',
  },
  {
    id: 'system-notifications',
    path: 'system/notifications',
    component: NotificationsCenter,
    label: 'Notifications Center',
    icon: 'Bell',
    permission: 'MANAGE_SYSTEM',
  },
  {
    id: 'management-employees',
    path: 'management/employees',
    component: EmployeeManagement,
    label: 'Employee Management',
    icon: 'Users',
    permission: 'MANAGE_ADMINS',
  },
];

