import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useDashboard } from './contexts/dashboardContext';
import { SidebarProvider } from './onboarding/sidebarContext';
import { PageMobileProvider } from './contexts/PageMobileContext';
import { DashboardLayout } from './layouts/dashboardLayout';
import LoadingSpinner from '../components/loadingSpinner/loadingSpinner';
import AdminRoute from '../dashboards/admin/AdminRoute';
import ProtectedRoute from '../dashboards/admin/components/ProtectedRoute';
import AdminLayout from '../dashboards/admin/components/AdminLayout';
import { WORKSPACE_TYPES } from '../utils/sessionAuth';
import { WorkspaceDefaultRedirect } from '../contexts/workspaceAwareNavigate';
import {
  SHARED_ROUTES,
  PROFESSIONAL_ROUTES,
  FACILITY_ROUTES,
  ADMIN_ROUTES,
} from './config/routes';

const RouteElement = ({ route, userData }) => {
  const Component = route.component;
  return route.passUserData ? <Component userData={userData} /> : <Component />;
};

const Dashboard = () => {
  const location = useLocation();
  const { isLoading, user, userProfile, selectedWorkspace } = useDashboard();

  // Combine user data for compatibility with existing components
  const userData = user ? {
    ...user,
    ...userProfile,
    uid: user.uid,
    firebase_uid: user.uid,
    userId: user.uid,
    id: user.uid,
    basicInfo: {
      accountType: user.accountType || user.role || 'worker'
    }
  } : null;

  const workspaceType = selectedWorkspace?.type;
  const isAdminWorkspace = workspaceType === WORKSPACE_TYPES.ADMIN;
  
  // Check if URL indicates admin workspace (even if not selected yet)
  const isAdminUrl = location.pathname.includes('/dashboard/admin');
  const isAdminPathOnly = location.pathname === '/dashboard/admin' || location.pathname === '/dashboard/admin/';

  // Check if we're waiting for admin workspace to be set from URL
  const urlParams = new URLSearchParams(location.search);
  const requestedWorkspace = urlParams.get('workspace');
  const isWaitingForAdminWorkspace = (requestedWorkspace === 'admin' || isAdminUrl) && !selectedWorkspace;

  return (
    <SidebarProvider>
      <PageMobileProvider>
        <DashboardLayout>
          <Suspense fallback={<LoadingSpinner />}>
            {isLoading ? (
              <LoadingSpinner />
            ) : (
              <Routes>
                {/* Default redirect - handle global routes explicitly at index */}
                <Route index element={
                  (isAdminWorkspace || isAdminPathOnly) ? (
                    <Navigate to="/dashboard/admin/portal" replace />
                  ) : location.pathname.endsWith('/marketplace') ? (
                    <RouteElement
                      route={SHARED_ROUTES.find(r => r.id === 'marketplace')}
                      userData={userData}
                    />
                  ) : location.pathname.includes('/profile') ? (
                    null
                  ) : (
                    <WorkspaceDefaultRedirect />
                  )
                } />

                {/* Shared routes - exclude when in admin workspace or admin URL */}
                {!isAdminWorkspace && !isAdminUrl && SHARED_ROUTES.map(route => (
                  <Route
                    key={route.id}
                    path={route.path}
                    element={
                      <RouteElement
                        route={route}
                        userData={userData}
                      />
                    }
                  />
                ))}

                {/* Professional routes - exclude when in admin workspace or admin URL */}
                {!isAdminWorkspace && !isAdminUrl && PROFESSIONAL_ROUTES.map(route => (
                  <Route
                    key={route.id}
                    path={route.path}
                    element={
                      <RouteElement
                        route={route}
                        userData={userData}
                      />
                    }
                  />
                ))}

                {/* Facility routes - exclude when in admin workspace or admin URL */}
                {!isAdminWorkspace && !isAdminUrl && FACILITY_ROUTES.map(route => (
                  <Route
                    key={route.id}
                    path={route.path}
                    element={
                      <RouteElement
                        route={route}
                        userData={userData}
                      />
                    }
                  />
                ))}

                {/* Admin routes - accessible from admin workspace only */}
                {/* When workspace is 'admin', remaining path is already without 'admin/' prefix */}
                {isAdminWorkspace && ADMIN_ROUTES.map(route => (
                  <Route
                    key={route.id}
                    path={route.path}
                    element={
                      <AdminRoute>
                        <ProtectedRoute requiredRight={route.permission}>
                          <AdminLayout>
                            <route.component />
                          </AdminLayout>
                        </ProtectedRoute>
                      </AdminRoute>
                    }
                  />
                ))}

                {/* Catch-all for unknown paths - exclude profile paths */}
                <Route path="*" element={
                  location.pathname.includes('/profile') ? (
                    null
                  ) : (isAdminWorkspace || isAdminUrl) ? (
                    <Navigate to={`/dashboard/admin/portal${location.search}`} replace />
                  ) : isAdminPathOnly ? (
                    <Navigate to={`/dashboard/admin/portal${location.search}`} replace />
                  ) : isWaitingForAdminWorkspace ? (
                    <LoadingSpinner />
                  ) : (
                    <div>Path not found: {location.pathname}</div>
                  )
                } />
              </Routes>
            )}
          </Suspense>
        </DashboardLayout>
      </PageMobileProvider>
    </SidebarProvider>
  );
};

export default Dashboard;
