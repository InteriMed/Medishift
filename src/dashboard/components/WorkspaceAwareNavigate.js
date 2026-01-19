import { Navigate } from 'react-router-dom';
import { useDashboard } from '../contexts/DashboardContext';
import { buildDashboardUrl, getDefaultRouteForWorkspace } from '../utils/pathUtils';
import { WORKSPACE_TYPES } from '../../utils/sessionAuth';

export const WorkspaceAwareNavigate = ({ to, fallbackTo = null }) => {
  const { selectedWorkspace } = useDashboard();
  
  if (!selectedWorkspace) {
    const defaultRoute = fallbackTo || '/dashboard/overview';
    return <Navigate to={defaultRoute} replace />;
  }

  const workspaceId = selectedWorkspace.id;
  const targetPath = to.startsWith('/dashboard') ? to.replace('/dashboard', '') : to;
  const finalPath = buildDashboardUrl(targetPath, workspaceId);
  
  return <Navigate to={finalPath} replace />;
};

export const WorkspaceDefaultRedirect = () => {
  const { selectedWorkspace } = useDashboard();
  
  if (!selectedWorkspace) {
    return <Navigate to="/dashboard/overview" replace />;
  }

  const defaultRoute = getDefaultRouteForWorkspace(selectedWorkspace.type);
  const workspaceId = selectedWorkspace.id;
  const finalPath = buildDashboardUrl(defaultRoute.replace('/dashboard', ''), workspaceId);
  
  return <Navigate to={finalPath} replace />;
};

