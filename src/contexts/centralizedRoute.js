import { useState, useEffect } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useDashboard } from '../dashboard/contexts/dashboardContext';
import { getAvailableWorkspaces, isAdminSync } from '../config/workspaceDefinitions';
import { buildDashboardUrl, getWorkspaceIdForUrl, getDefaultRouteForWorkspace } from '../config/routeUtils';
import { WORKSPACE_TYPES } from '../config/keysDatabase';
import LoadingSpinner from '../components/loadingSpinner/loadingSpinner';
import { useTranslation } from 'react-i18next';
import { buildLocalizedPath, ROUTE_IDS } from '../config/routeHelpers';

const SUPPORTED_LANGUAGES = ['en', 'fr', 'de', 'it'];

const VALID_DASHBOARD_ROUTES = ['overview', 'calendar', 'profile', 'communications', 'entity', 'marketplace', 'support'];

const CentralizedRoute = () => {
  const { user, isLoading, selectedWorkspace } = useDashboard();
  const location = useLocation();
  const { lang } = useParams();
  const { i18n } = useTranslation();
  const [targetPath, setTargetPath] = useState(null);

  useEffect(() => {
    console.log('[CentralizedRoute] Effect running', { isLoading, hasUser: !!user, pathname: location.pathname });
    
    if (isLoading || !user) {
      console.log('[CentralizedRoute] Waiting for user/auth', { isLoading, hasUser: !!user });
      return;
    }

    const segments = location.pathname.split('/').filter(Boolean);
    const dashboardIndex = segments.indexOf('dashboard');
    const hasWorkspaceInUrl = dashboardIndex !== -1 && 
      segments.length > dashboardIndex + 1 && 
      (segments[dashboardIndex + 1] === 'personal' ||
       segments[dashboardIndex + 1] === 'admin' ||
       segments[dashboardIndex + 1] === 'marketplace' ||
       (segments[dashboardIndex + 1] && segments[dashboardIndex + 1].length > 15));

    console.log('[CentralizedRoute] Workspace check', { hasWorkspaceInUrl, selectedWorkspace: !!selectedWorkspace });

    if (selectedWorkspace && hasWorkspaceInUrl) {
      console.log('[CentralizedRoute] Workspace already selected and in URL, returning');
      return;
    }

    const availableWorkspaces = getAvailableWorkspaces(user);
    console.log('[CentralizedRoute] Available workspaces', availableWorkspaces.length);

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
      
      const langFromUrl = segments[0] && SUPPORTED_LANGUAGES.includes(segments[0]) ? segments[0] : null;
      const currentLang = lang || langFromUrl || i18n.language || 'fr';
      
      let pathToPreserve = '';
      let isValidRoute = true;
      
      if (dashboardIndex !== -1 && segments.length > dashboardIndex + 1) {
        const firstSegmentAfterDashboard = segments[dashboardIndex + 1];
        const isWorkspaceId = firstSegmentAfterDashboard === 'personal' ||
          firstSegmentAfterDashboard === 'admin' ||
          firstSegmentAfterDashboard === 'marketplace' ||
          firstSegmentAfterDashboard.length > 15;
        
        if (!isWorkspaceId) {
          const remainingPath = segments.slice(dashboardIndex + 1).join('/');
          
          if (remainingPath) {
            const firstRouteSegment = remainingPath.split('/')[0];
            const isValidDashboardRoute = VALID_DASHBOARD_ROUTES.some(route => 
              firstRouteSegment === route || remainingPath.startsWith(route + '/')
            );
            
            if (!isValidDashboardRoute) {
              isValidRoute = false;
            } else {
              pathToPreserve = remainingPath;
            }
          }
        }
      }
      
      if (!isValidRoute) {
        setTargetPath(buildLocalizedPath(ROUTE_IDS.NOT_FOUND, currentLang));
        return;
      }
      
      const baseTarget = pathToPreserve 
        ? buildDashboardUrl(pathToPreserve, workspaceId)
        : buildDashboardUrl(getDefaultRouteForWorkspace(workspaceToSelect.type), workspaceId);
      
      const target = langFromUrl || lang ? `/${currentLang}${baseTarget}` : baseTarget;
      
      console.log('[CentralizedRoute] Setting target path', target);
      setTargetPath(target);
    } else {
      const segments = location.pathname.split('/').filter(Boolean);
      const langFromUrl = segments[0] && SUPPORTED_LANGUAGES.includes(segments[0]) ? segments[0] : null;
      const currentLang = lang || langFromUrl || i18n.language || 'fr';
      setTargetPath(buildLocalizedPath(ROUTE_IDS.NOT_FOUND, currentLang));
    }
  }, [isLoading, user, selectedWorkspace, location.pathname, lang, i18n.language]);

  if (isLoading || !user) {
    return <LoadingSpinner />;
  }

  const segments = location.pathname.split('/').filter(Boolean);
  const dashboardIndex = segments.indexOf('dashboard');
  const hasWorkspaceInUrl = dashboardIndex !== -1 && 
    segments.length > dashboardIndex + 1 && 
    (segments[dashboardIndex + 1] === 'personal' ||
     segments[dashboardIndex + 1] === 'admin' ||
     segments[dashboardIndex + 1] === 'marketplace' ||
     (segments[dashboardIndex + 1] && segments[dashboardIndex + 1].length > 15));

  if (selectedWorkspace && hasWorkspaceInUrl) {
    return null;
  }

  if (targetPath) {
    console.log('[CentralizedRoute] Redirecting to', targetPath);
    return <Navigate to={targetPath} replace />;
  }

  console.log('[CentralizedRoute] No target path, showing spinner');
  return <LoadingSpinner />;
};

export default CentralizedRoute;

