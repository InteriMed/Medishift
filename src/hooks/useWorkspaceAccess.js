import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/authContext';
import { useSmartAuth } from '../services/services/auth';
import { fetchCompleteUserData, getAvailableWorkspaces } from '../config/workspaceDefinitions';
import { auth, functions } from '../services/services/firebase';
import { signInWithCustomToken } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { DEFAULT_LANGUAGE } from '../config/routeHelpers';
import { buildDashboardUrl, getWorkspaceIdForUrl, getDefaultRouteForWorkspace } from '../config/routeUtils';

export const useWorkspaceAccess = () => {
  const { currentUser } = useAuth();
  const smartAuth = useSmartAuth();
  const navigate = useNavigate();
  const { lang } = useParams();
  const { i18n } = useTranslation();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [switching, setSwitching] = useState(false);
  
  const currentLang = lang || i18n.language || DEFAULT_LANGUAGE;

  useEffect(() => {
    if (smartAuth?.claims?.workspaceId && workspaces.length > 0) {
      const workspaceFromClaims = workspaces.find(w => {
        const workspaceIdForUrl = getWorkspaceIdForUrl(w);
        return workspaceIdForUrl === smartAuth.claims.workspaceId;
      });
      if (workspaceFromClaims && currentWorkspace?.id !== workspaceFromClaims.id) {
        setCurrentWorkspace(workspaceFromClaims);
      }
    }
  }, [smartAuth?.claims?.workspaceId, workspaces]);

  const checkWorkspaces = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const userData = await fetchCompleteUserData(currentUser.uid);
      
      if (!userData) {
        setNeedsOnboarding(true);
        setWorkspaces([]);
        setLoading(false);
        return;
      }

      const availableWorkspaces = getAvailableWorkspaces(userData);
      
      setWorkspaces(availableWorkspaces);
      setNeedsOnboarding(availableWorkspaces.length === 0);
      
      if (availableWorkspaces.length === 0) {
        navigate(`/${currentLang}/onboarding`);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error checking workspaces:', error);
      setLoading(false);
    }
  }, [currentUser, currentLang, navigate]);

  useEffect(() => {
    checkWorkspaces();
  }, [checkWorkspaces]);

  const switchWorkspace = useCallback(async (workspaceId) => {
    const workspace = workspaces.find(w => w.id === workspaceId);
    
    if (!workspace) {
      console.error('Workspace not found:', workspaceId);
      return false;
    }

    // Prevent switching to the same workspace
    if (currentWorkspace?.id === workspace.id) {
      return true;
    }

    try {
      setSwitching(true);

      // CALL BACKEND WORKSPACE.SWITCH ACTION
      const switchWorkspaceFunction = httpsCallable(functions, 'switchWorkspace');
      
      const result = await switchWorkspaceFunction({
        targetWorkspaceId: workspace.id,
        workspaceType: workspace.type
      });

      if (result.data && result.data.token) {
        // RE-AUTHENTICATE WITH NEW PASSPORT (Custom Token)
        await signInWithCustomToken(auth, result.data.token);
        
        // Force token refresh to update claims
        await auth.currentUser.getIdToken(true);

        // Update local state
        setCurrentWorkspace(workspace);
        
        // Small delay to ensure auth state propagates before navigation
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Navigate to appropriate dashboard using route utilities
        const workspaceId = getWorkspaceIdForUrl(workspace);
        const defaultRoute = getDefaultRouteForWorkspace(workspace.type);
        
        // Handle special cases for organization workspace
        let targetRoute = defaultRoute;
        if (workspace.type === 'organization') {
          targetRoute = 'organization';
        }
        
        const dashboardPath = buildDashboardUrl(targetRoute, workspaceId);
        const finalPath = `/${currentLang}${dashboardPath}`;
        
        navigate(finalPath);
        
        return true;
      } else {
        console.error('No token returned from workspace switch');
        return false;
      }

    } catch (error) {
      console.error('Error switching workspace:', error);
      // Show user-friendly error
      if (error.code === 'permission-denied') {
        alert('Access Denied: You do not have permission to access this workspace.');
      } else if (error.code === 'failed-precondition') {
        alert('Your account needs to be activated before accessing this workspace.');
      } else {
        alert('Failed to switch workspace. Please try again.');
      }
      return false;
    } finally {
      setSwitching(false);
    }
  }, [workspaces, currentWorkspace, currentLang, navigate]);

  const refreshWorkspaces = useCallback(() => {
    return checkWorkspaces();
  }, [checkWorkspaces]);

  return {
    workspaces,
    loading,
    switching,
    needsOnboarding,
    currentWorkspace,
    switchWorkspace,
    refreshWorkspaces,
    hasAnyWorkspace: workspaces.length > 0
  };
};

export default useWorkspaceAccess;

