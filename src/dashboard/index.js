import React, { Suspense } from 'react';
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
import {
  SHARED_ROUTES,
  PROFESSIONAL_ROUTES,
  FACILITY_ROUTES,
  ADMIN_ROUTES,
  ACCESS_TYPES,
  canAccessRoute,
} from './config/routes';

/**
 * Renders a route element with proper workspace access control
 * Note: Marketplace and Organization routes are always allowed to load
 * Access control is handled at the UI level with popups
 */
const RouteElement = ({ route, workspaceType, userData }) => {
  const isAccessible = canAccessRoute(route, workspaceType);

  // Allow marketplace and organization to load even if not fully accessible
  // They will show access popups at the UI level
  const isMarketplaceOrOrg = route.id === 'marketplace' || route.id === 'organization';

  if (!isAccessible && !isMarketplaceOrOrg) {
    return <WorkspaceAwareNavigate to="/dashboard/overview" />;
  }

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

  // Check if we're waiting for admin workspace to be set from URL
  const urlParams = new URLSearchParams(location.search);
  const requestedWorkspace = urlParams.get('workspace');
  const isWaitingForAdminWorkspace = requestedWorkspace === 'admin' && !selectedWorkspace;

  return (
    <SidebarProvider>
      <PageMobileProvider>
        <DashboardLayout>
          <Suspense fallback={<LoadingSpinner />}>
            {isLoading ? (
              <LoadingSpinner />
            ) : (
              <Routes>
                {/* Default redirect */}
                <Route path="/" element={<WorkspaceDefaultRedirect />} />

                {/* Shared routes - accessible from all workspace types */}
                {SHARED_ROUTES.map(route => (
                  <Route
                    key={route.id}
                    path={route.path}
                    element={
                      <RouteElement
                        route={route}
                        workspaceType={workspaceType}
                        userData={userData}
                      />
                    }
                  />
                ))}

                {/* Professional routes - accessible from personal and facility workspaces */}
                {PROFESSIONAL_ROUTES.map(route => (
                  <Route
                    key={route.id}
                    path={route.path}
                    element={
                      <RouteElement
                        route={route}
                        workspaceType={workspaceType}
                        userData={userData}
                      />
                    }
                  />
                ))}

                {/* Facility routes - accessible from facility workspace only */}
                {FACILITY_ROUTES.map(route => (
                  <Route
                    key={route.id}
                    path={route.path}
                    element={
                      <RouteElement
                        route={route}
                        workspaceType={workspaceType}
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
                        <AdminLayout>
                          <route.component />
                        </AdminLayout>
                      </AdminRoute>
                    }
                  />
                ))}

                {/* Catch-all for unknown paths */}
                <Route path="*" element={
                  isWaitingForAdminWorkspace ? (
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
