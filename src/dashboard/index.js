import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useDashboard } from './contexts/DashboardContext';
import { SidebarProvider } from './contexts/SidebarContext';
import { PageMobileProvider } from './contexts/PageMobileContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import LoadingSpinner from '../components/LoadingSpinner/LoadingSpinner';
import AdminRoute from './admin/AdminRoute';
import ProtectedRoute from './admin/components/ProtectedRoute';
import AdminLayout from './admin/components/AdminLayout';
import { WORKSPACE_TYPES } from '../utils/sessionAuth';
import { WorkspaceDefaultRedirect } from './components/WorkspaceAwareNavigate';
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
                {/* Default redirect - handle global routes explicitly at index */}
                <Route index element={
                  location.pathname.endsWith('/marketplace') ? (
                    <RouteElement
                      route={SHARED_ROUTES.find(r => r.id === 'marketplace')}
                      userData={userData}
                    />
                  ) : (
                    <WorkspaceDefaultRedirect />
                  )
                } />

                {/* Shared routes */}
                {SHARED_ROUTES.filter(r => !(isAdminWorkspace && r.id === 'profile')).map(route => (
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

                {/* Professional routes */}
                {PROFESSIONAL_ROUTES.map(route => (
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

                {/* Facility routes */}
                {FACILITY_ROUTES.map(route => (
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
