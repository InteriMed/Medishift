import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useDashboard } from './contexts/DashboardContext';
import { SidebarProvider } from './contexts/SidebarContext';
import { PageMobileProvider } from './contexts/PageMobileContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import LoadingSpinner from '../components/LoadingSpinner/LoadingSpinner';
import AdminRoute from './admin/AdminRoute';
import AdminLayout from './admin/components/AdminLayout';
import { WORKSPACE_TYPES } from '../utils/sessionAuth';
import { WorkspaceAwareNavigate, WorkspaceDefaultRedirect } from './components/WorkspaceAwareNavigate';

// Import PersonalDashboard directly instead of lazy-loading
import PersonalDashboard from './pages/personalDashboard/PersonalDashboard';

// Lazy-load other dashboard pages for better performance
const Calendar = lazy(() => import('./pages/calendar/Calendar'));
const Messages = lazy(() => import('./pages/messages/Messages'));
const Contracts = lazy(() => import('./pages/contracts/Contracts'));
const Profile = lazy(() => import('./pages/profile/Profile'));
const Marketplace = lazy(() => import('./pages/marketplace/Marketplace'));

// Phase 1 & 2 - Swiss Compliance Features
const PayrollDashboard = lazy(() => import('./pages/payroll/PayrollDashboard'));
const OrganizationDashboard = lazy(() => import('./pages/organization/OrganizationDashboard'));

// Admin pages
const ExecutiveDashboard = lazy(() => import('./admin/pages/ExecutiveDashboard'));
const UserVerificationQueue = lazy(() => import('./admin/UserVerificationQueue'));
const UserCRM = lazy(() => import('./admin/pages/operations/UserCRM'));
const ShiftCommandCenter = lazy(() => import('./admin/pages/operations/ShiftCommandCenter'));
const RevenueAnalysis = lazy(() => import('./admin/pages/finance/RevenueAnalysis'));
const SpendingsTracker = lazy(() => import('./admin/pages/finance/SpendingsTracker'));
const AccountsReceivable = lazy(() => import('./admin/pages/finance/AccountsReceivable'));
const BalanceSheet = lazy(() => import('./admin/pages/finance/BalanceSheet'));
const AuditLogs = lazy(() => import('./admin/pages/system/AuditLogs'));
const NotificationsCenter = lazy(() => import('./admin/pages/system/NotificationsCenter'));
const PayrollExport = lazy(() => import('./admin/pages/payroll/PayrollExport'));
const EmployeeManagement = lazy(() => import('./admin/pages/management/EmployeeManagement'));

const Dashboard = () => {
  const location = useLocation();
  const { profileComplete, isLoading, user, userProfile, selectedWorkspace } = useDashboard();

  // Combine user data from both user and userProfile for compatibility with existing components
  const userData = user ? {
    ...user,
    ...userProfile,
    // Ensure common fields are accessible
    uid: user.uid,
    firebase_uid: user.uid,
    userId: user.uid,
    id: user.uid,
    basicInfo: {
      accountType: user.accountType || user.role || 'worker'
    }
  } : null;

  const isPersonalWorkspace = selectedWorkspace?.type === WORKSPACE_TYPES.PERSONAL;
  const isTeamWorkspace = selectedWorkspace?.type === WORKSPACE_TYPES.TEAM;
  const isAdminWorkspace = selectedWorkspace?.type === WORKSPACE_TYPES.ADMIN;

  return (
    <SidebarProvider>
      <PageMobileProvider>
        <DashboardLayout>
          <Suspense fallback={<LoadingSpinner />}>
            {isLoading ? (
              <LoadingSpinner />
            ) : (
              <Routes>
                <Route path="/" element={<WorkspaceDefaultRedirect />} />
                <Route path="overview" element={<PersonalDashboard />} />

                <Route path="personal" element={<PersonalDashboard />} />

                <Route path="profile/*" element={<Profile />} />

                <Route
                  path="calendar/*"
                  element={isPersonalWorkspace ? <Calendar userData={userData} /> : <WorkspaceAwareNavigate to="/dashboard/overview" />}
                />
                <Route
                  path="messages/*"
                  element={isPersonalWorkspace ? <Messages userData={userData} /> : <WorkspaceAwareNavigate to="/dashboard/overview" />}
                />
                <Route
                  path="contracts/*"
                  element={isPersonalWorkspace ? <Contracts userData={userData} /> : <WorkspaceAwareNavigate to="/dashboard/overview" />}
                />
                <Route
                  path="marketplace/*"
                  element={isPersonalWorkspace ? <Marketplace userData={userData} /> : <WorkspaceAwareNavigate to="/dashboard/overview" />}
                />

                <Route
                  path="payroll/*"
                  element={isTeamWorkspace ? <PayrollDashboard /> : <WorkspaceAwareNavigate to="/dashboard/overview" />}
                />

                <Route
                  path="organization/*"
                  element={isTeamWorkspace ? <OrganizationDashboard /> : <WorkspaceAwareNavigate to="/dashboard/overview" />}
                />

                <Route
                  path="admin/*"
                  element={
                    isAdminWorkspace ? (
                      <AdminRoute>
                        <AdminLayout />
                      </AdminRoute>
                    ) : (
                      <WorkspaceAwareNavigate to="/dashboard/overview" />
                    )
                  }
                >
                  <Route index element={<Navigate to="portal" replace />} />
                  <Route path="portal" element={<ExecutiveDashboard />} />
                  <Route path="verification" element={<UserVerificationQueue />} />
                  <Route path="operations/users" element={<UserCRM />} />
                  <Route path="operations/shifts" element={<ShiftCommandCenter />} />
                  <Route path="finance/revenue" element={<RevenueAnalysis />} />
                  <Route path="finance/spendings" element={<SpendingsTracker />} />
                  <Route path="finance/ar" element={<AccountsReceivable />} />
                  <Route path="finance/balance-sheet" element={<BalanceSheet />} />
                  <Route path="system/audit" element={<AuditLogs />} />
                  <Route path="system/notifications" element={<NotificationsCenter />} />
                  <Route path="payroll/export" element={<PayrollExport />} />
                  <Route path="management/employees" element={<EmployeeManagement />} />
                </Route>

                <Route path="*" element={<div>Path not found: {location.pathname}</div>} />
              </Routes>
            )}
          </Suspense>
        </DashboardLayout>
      </PageMobileProvider>
    </SidebarProvider>
  );
};

export default Dashboard; 