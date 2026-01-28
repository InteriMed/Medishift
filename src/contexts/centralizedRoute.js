import { useState, useEffect } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useDashboard } from '../dashboard/contexts/DashboardContext';
import { getAvailableWorkspaces, isAdminSync } from '../config/workspaceDefinitions';
import { buildDashboardUrl, getWorkspaceIdForUrl, getDefaultRouteForWorkspace } from '../config/routeUtils';
import { WORKSPACE_TYPES } from '../config/keysDatabase';
import LoadingSpinner from '../components/LoadingSpinner/LoadingSpinner';
import { useTranslation } from 'react-i18next';

const CentralizedRoute = () => {
  const { user, isLoading, selectedWorkspace } = useDashboard();
  const location = useLocation();
  const { lang } = useParams();
  const { i18n } = useTranslation();
  const [targetPath, setTargetPath] = useState(null);

  useEffect(() => {
    if (isLoading || !user) {
      return;
    }

    if (selectedWorkspace) {
      return;
    }

    const availableWorkspaces = getAvailableWorkspaces(user);

    if (availableWorkspaces.length === 0) {
      const userIsAdmin = isAdminSync(user);
      if (userIsAdmin) {
        return;
      }

      const onboardingProgress = user.onboardingProgress || {};
      const professionalCompleted = onboardingProgress.professional?.completed === true;
      const facilityCompleted = onboardingProgress.facility?.completed === true;
      const onboardingCompleted = professionalCompleted || facilityCompleted || user.onboardingCompleted === true;

      if (!onboardingCompleted) {
        const currentLang = lang || i18n.language || 'fr';
        const onboardingType = user.role === 'facility' || user.role === 'company' ? 'facility' : 'professional';
        setTargetPath(`/${currentLang}/onboarding?type=${onboardingType}`);
      }
      return;
    }

    const organizationWorkspace = availableWorkspaces.find(w => w.type === 'organization');
    const facilityWorkspace = availableWorkspaces.find(w => w.type === WORKSPACE_TYPES.FACILITY || w.type === WORKSPACE_TYPES.TEAM);
    const professionalWorkspace = availableWorkspaces.find(w => w.type === WORKSPACE_TYPES.PERSONAL);

    const workspaceToSelect = organizationWorkspace || facilityWorkspace || professionalWorkspace || availableWorkspaces[0];

    if (workspaceToSelect) {
      const workspaceId = getWorkspaceIdForUrl(workspaceToSelect);
      
      const segments = location.pathname.split('/').filter(Boolean);
      const dashboardIndex = segments.indexOf('dashboard');
      let pathToPreserve = '';
      
      if (dashboardIndex !== -1 && segments.length > dashboardIndex + 1) {
        const firstSegmentAfterDashboard = segments[dashboardIndex + 1];
        const isWorkspaceId = firstSegmentAfterDashboard === 'personal' ||
          firstSegmentAfterDashboard === 'admin' ||
          firstSegmentAfterDashboard === 'marketplace' ||
          firstSegmentAfterDashboard.length > 15;
        
        if (!isWorkspaceId) {
          const remainingPath = segments.slice(dashboardIndex + 1).join('/');
          pathToPreserve = remainingPath;
        }
      }
      
      const target = pathToPreserve 
        ? buildDashboardUrl(pathToPreserve, workspaceId)
        : buildDashboardUrl(getDefaultRouteForWorkspace(workspaceToSelect.type), workspaceId);
      
      setTargetPath(target);
    }
  }, [isLoading, user, selectedWorkspace, location.pathname, lang, i18n.language]);

  if (isLoading || !user) {
    return <LoadingSpinner />;
  }

  if (selectedWorkspace) {
    return null;
  }

  if (targetPath) {
    return <Navigate to={targetPath} replace />;
  }

  return <LoadingSpinner />;
};

export default CentralizedRoute;

