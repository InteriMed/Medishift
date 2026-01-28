import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchCompleteUserData, getAvailableWorkspaces } from '../config/workspaceDefinitions';

export const useWorkspaceAccess = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { lang } = useParams();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);

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

  const switchWorkspace = useCallback((workspaceId) => {
    const workspace = workspaces.find(w => w.id === workspaceId);
    
    if (!workspace) {
      console.error('Workspace not found:', workspaceId);
      return false;
    }

    setCurrentWorkspace(workspace);
    
    switch (workspace.type) {
      case 'personal':
        navigate(`/${lang}/dashboard/personal/overview`);
        break;
      case 'facility':
        navigate(`/${lang}/dashboard/${workspace.facilityId}/overview`);
        break;
      case 'organization':
        navigate(`/${lang}/dashboard/${workspace.organizationId}/organization`);
        break;
      case 'admin':
        navigate(`/${lang}/dashboard/admin/portal`);
        break;
      default:
        navigate(`/${lang}/dashboard/overview`);
    }
    
    return true;
  }, [workspaces, lang, navigate]);

  const refreshWorkspaces = useCallback(() => {
    return checkWorkspaces();
  }, [checkWorkspaces]);

  return {
    workspaces,
    loading,
    needsOnboarding,
    currentWorkspace,
    switchWorkspace,
    refreshWorkspaces,
    hasAnyWorkspace: workspaces.length > 0
  };
};

export default useWorkspaceAccess;

