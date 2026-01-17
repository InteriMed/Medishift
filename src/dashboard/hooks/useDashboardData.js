import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { showNotification } from '../utils/notifications';

/**
 * Hook to provide core dashboard data and functionality
 * This serves as the central data provider for the Dashboard context
 */
const useDashboardData = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [error, setError] = useState(null);
  
  // Load user workspaces
  const loadWorkspaces = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const response = await api.get('/workspaces');
      setWorkspaces(response.data);
      
      // Set default workspace if none selected
      if (response.data.length > 0 && !selectedWorkspace) {
        setSelectedWorkspace(response.data[0]);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error loading workspaces:', err);
      setError(err);
      showNotification(t('dashboard.errors.failedToLoadWorkspaces'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedWorkspace, t]);
  
  // Initial load of workspaces
  useEffect(() => {
    if (user) {
      loadWorkspaces();
    }
  }, [user, loadWorkspaces]);
  
  // Create a new workspace
  const createWorkspace = async (workspaceData) => {
    try {
      const response = await api.post('/workspaces', workspaceData);
      const newWorkspace = response.data;
      
      setWorkspaces(prev => [...prev, newWorkspace]);
      setSelectedWorkspace(newWorkspace);
      
      showNotification(t('dashboard.workspace.created'), 'success');
      return newWorkspace;
    } catch (err) {
      console.error('Error creating workspace:', err);
      showNotification(t('dashboard.errors.failedToCreateWorkspace'), 'error');
      throw err;
    }
  };
  
  // Update a workspace
  const updateWorkspace = async (workspaceId, workspaceData) => {
    try {
      const response = await api.put(`/workspaces/${workspaceId}`, workspaceData);
      const updatedWorkspace = response.data;
      
      setWorkspaces(prev => 
        prev.map(workspace => 
          workspace.id === workspaceId ? updatedWorkspace : workspace
        )
      );
      
      if (selectedWorkspace?.id === workspaceId) {
        setSelectedWorkspace(updatedWorkspace);
      }
      
      showNotification(t('dashboard.workspace.updated'), 'success');
      return updatedWorkspace;
    } catch (err) {
      console.error('Error updating workspace:', err);
      showNotification(t('dashboard.errors.failedToUpdateWorkspace'), 'error');
      throw err;
    }
  };
  
  // Delete a workspace
  const deleteWorkspace = async (workspaceId) => {
    try {
      await api.delete(`/workspaces/${workspaceId}`);
      
      const updatedWorkspaces = workspaces.filter(w => w.id !== workspaceId);
      setWorkspaces(updatedWorkspaces);
      
      if (selectedWorkspace?.id === workspaceId) {
        setSelectedWorkspace(updatedWorkspaces[0] || null);
      }
      
      showNotification(t('dashboard.workspace.deleted'), 'success');
    } catch (err) {
      console.error('Error deleting workspace:', err);
      showNotification(t('dashboard.errors.failedToDeleteWorkspace'), 'error');
      throw err;
    }
  };
  
  // Switch to a different workspace
  const switchWorkspace = (workspaceId) => {
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (workspace) {
      setSelectedWorkspace(workspace);
    }
  };
  
  return {
    isLoading,
    error,
    userId: user?.id,
    user,
    workspaces,
    selectedWorkspace,
    workspaceId: selectedWorkspace?.id,
    loadWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    switchWorkspace,
    logout
  };
};

export default useDashboardData; 