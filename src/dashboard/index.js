import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useDashboard } from './contexts/DashboardContext';
import { SidebarProvider } from './contexts/SidebarContext';
import { PageMobileProvider } from './contexts/PageMobileContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import LoadingSpinner from '../components/LoadingSpinner/LoadingSpinner';

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

const Dashboard = () => {
  const location = useLocation();
  const { profileComplete, isLoading, user, userProfile } = useDashboard();

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

  // Check if user is a facility (for payroll/organization access)
  const isFacility = userData?.role === 'facility' || userData?.accountType === 'facility';

  return (
    <SidebarProvider>
      <PageMobileProvider>
        <DashboardLayout>
          <Suspense fallback={<LoadingSpinner />}>
            {isLoading ? (
              <LoadingSpinner />
            ) : (
              <Routes>
                <Route path="/" element={<Navigate to="overview" replace />} />
                <Route path="overview" element={<PersonalDashboard />} />

                {/* Fallback route specifically for the dashboard homepage */}
                <Route path="personal" element={<PersonalDashboard />} />

                {/* Always allow access to the profile page so users can complete their profile */}
                <Route path="profile/*" element={<Profile />} />

                {/* Restrict access to other routes if profile is not complete */}
                <Route
                  path="calendar/*"
                  element={profileComplete ? <Calendar userData={userData} /> : <Navigate to="/dashboard/overview" replace />}
                />
                <Route
                  path="messages/*"
                  element={profileComplete ? <Messages userData={userData} /> : <Navigate to="/dashboard/overview" replace />}
                />
                <Route
                  path="contracts/*"
                  element={profileComplete ? <Contracts userData={userData} /> : <Navigate to="/dashboard/overview" replace />}
                />
                <Route
                  path="marketplace/*"
                  element={profileComplete ? <Marketplace userData={userData} /> : <Navigate to="/dashboard/overview" replace />}
                />

                {/* 🇨🇭 Swiss Compliance - Phase 1: Payroll Management (Facilities only) */}
                <Route
                  path="payroll/*"
                  element={profileComplete && isFacility ? <PayrollDashboard /> : <Navigate to="/dashboard/overview" replace />}
                />

                {/* 🔵 Phase 2: Organization Management (Facilities only) */}
                <Route
                  path="organization/*"
                  element={profileComplete && isFacility ? <OrganizationDashboard /> : <Navigate to="/dashboard/overview" replace />}
                />

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