import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboard } from '../contexts/DashboardContext';
import { isAdmin } from '../../utils/adminUtils';
import { WORKSPACE_TYPES } from '../../utils/sessionAuth';
import { buildDashboardUrl } from '../utils/pathUtils';
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner';

const AdminRoute = ({ children }) => {
  const { currentUser, userProfile, loading } = useAuth();
  const { selectedWorkspace } = useDashboard();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!currentUser) {
    const redirectPath = selectedWorkspace ? buildDashboardUrl('/overview', selectedWorkspace.id) : '/dashboard/overview';
    return <Navigate to={redirectPath} replace />;
  }

  if (!isAdmin(userProfile)) {
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

