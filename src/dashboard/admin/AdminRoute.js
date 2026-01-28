import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/authContext';
import { useDashboard } from '../contexts/dashboardContext';
import { isAdmin } from '../../utils/adminUtils';
import { WORKSPACE_TYPES } from '../../config/workspaceDefinitions';
import { buildDashboardUrl } from '../../config/routeUtils';
import LoadingSpinner from '../../components/loadingSpinner/loadingSpinner';

const AdminRoute = ({ children }) => {
  const { currentUser, userProfile, loading } = useAuth();
  const { selectedWorkspace, user } = useDashboard();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!currentUser) {
    const redirectPath = selectedWorkspace ? buildDashboardUrl('/overview', selectedWorkspace.id) : '/dashboard/overview';
    return <Navigate to={redirectPath} replace />;
  }

  // Check admin status from both AuthContext userProfile and DashboardContext user
  const hasAdminAccess = isAdmin(userProfile) || isAdmin(user);
  
  if (!hasAdminAccess) {
    // If workspace is admin type, wait a bit for adminData to load
    if (selectedWorkspace?.type === WORKSPACE_TYPES.ADMIN) {
      return <LoadingSpinner />;
    }
    const redirectPath = selectedWorkspace ? buildDashboardUrl('/overview', selectedWorkspace.id) : '/dashboard/overview';
    return <Navigate to={redirectPath} replace />;
  }

  if (selectedWorkspace?.type !== WORKSPACE_TYPES.ADMIN) {
    const redirectPath = selectedWorkspace ? buildDashboardUrl('/overview', selectedWorkspace.id) : '/dashboard/overview';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

export default AdminRoute;

