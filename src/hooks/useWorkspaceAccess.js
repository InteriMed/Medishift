import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/authContext';
import { fetchCompleteUserData, getAvailableWorkspaces } from '../config/workspaceDefinitions';
import { auth, functions } from '../services/firebase';
import { signInWithCustomToken } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';

export const useWorkspaceAccess = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { lang } = useParams();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [switching, setSwitching] = useState(false);

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
        navigate(`/${lang}/onboarding`);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error checking workspaces:', error);
      setLoading(false);
    }
  }, [currentUser, lang, navigate]);

  useEffect(() => {
    checkWorkspaces();
  }, [checkWorkspaces]);

  const switchWorkspace = useCallback(async (workspaceId) => {
    const workspace = workspaces.find(w => w.id === workspaceId);
    
    if (!workspace) {
      console.error('Workspace not found:', workspaceId);
      return false;
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
        
        // Navigate to appropriate dashboard
        switch (workspace.type) {
          case 'personal':
            navigate(`/${lang}/dashboard/personal/overview`);
            break;
          case 'facility':
            navigate(`/${lang}/dashboard/${workspace.id}/overview`);
            break;
          case 'organization':
            navigate(`/${lang}/dashboard/${workspace.id}/organization`);
            break;
          case 'admin':
            navigate(`/${lang}/dashboard/admin/portal`);
            break;
          default:
            navigate(`/${lang}/dashboard/overview`);
        }
        
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
  }, [workspaces, lang, navigate]);

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

