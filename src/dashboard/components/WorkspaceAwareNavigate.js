import React from 'react';
import { Navigate } from 'react-router-dom';
import { useDashboard } from '../contexts/DashboardContext';
import { buildDashboardUrl, getDefaultRouteForWorkspace, getWorkspaceIdForUrl } from '../utils/pathUtils';

export const WorkspaceAwareNavigate = ({ to, fallbackTo = null }) => {
  const { selectedWorkspace } = useDashboard();

  if (!selectedWorkspace) {
    const defaultRoute = fallbackTo || '/dashboard/personal/overview';
    return <Navigate to={defaultRoute} replace />;
  }

  const workspaceId = getWorkspaceIdForUrl(selectedWorkspace);
  const targetPath = to.startsWith('/dashboard') ? to.replace('/dashboard', '') : to;
  const finalPath = buildDashboardUrl(targetPath, workspaceId);

  return <Navigate to={finalPath} replace />;
};

export const WorkspaceDefaultRedirect = () => {
  const { selectedWorkspace } = useDashboard();

  if (!selectedWorkspace) {
    return <Navigate to="/dashboard/personal/overview" replace />;
  }

  const defaultRoute = getDefaultRouteForWorkspace(selectedWorkspace.type);
  const workspaceId = getWorkspaceIdForUrl(selectedWorkspace);
  const finalPath = buildDashboardUrl(defaultRoute, workspaceId);

  return <Navigate to={finalPath} replace />;
};

