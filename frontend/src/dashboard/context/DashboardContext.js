import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import useDashboardData from '../hooks/useDashboardData';

const DashboardContext = createContext(null);

export const DashboardProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [userPreferences, setUserPreferences] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        // We'll mock this for now - replace with actual API call
        // const data = await api.dashboard.getOverview();
        const mockData = {
          metrics: {
            totalContracts: 12,
            activeHours: 36,
            earnings: 3250,
            upcomingJobs: 3
          },
          recentActivity: [
            { id: 1, type: 'contract', title: 'New contract received', time: new Date() },
            { id: 2, type: 'message', title: 'Message from Pharmacy XYZ', time: new Date() }
          ]
        };
        
        setDashboardData(mockData);
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentUser]);

  // Load user preferences
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (!currentUser) return;
      
      try {
        // Replace with actual preferences loading
        const prefs = {
          theme: 'light',
          sidebar: 'expanded',
          notifications: 'all'
        };
        setUserPreferences(prefs);
      } catch (err) {
        console.error('Error loading user preferences:', err);
      }
    };

    loadUserPreferences();
  }, [currentUser]);

  // Fetch user data and workspaces when currentUser changes
  useEffect(() => {
    const fetchUserData = async () => {
      if (!currentUser) {
        setUser(null);
        setWorkspaces([]);
        setSelectedWorkspace(null);
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        
        // Example API call - replace with your actual API endpoint
        const userResponse = await fetch(`/api/users/${currentUser.uid}`);
        const userData = await userResponse.json();
        
        // Example workspaces data
        const workspacesData = [
          { id: 1, name: 'Personal Workspace' },
          { id: 2, name: 'Team Workspace' }
        ];
        
        setUser(userData);
        setWorkspaces(workspacesData);
        setSelectedWorkspace(workspacesData[0]);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserData();
  }, [currentUser]);

  const updateUserPreferences = async (newPrefs) => {
    if (!currentUser) return;
    
    try {
      // Replace with actual API call
      // await api.users.updatePreferences(currentUser.uid, newPrefs);
      setUserPreferences({ ...userPreferences, ...newPrefs });
      return true;
    } catch (err) {
      console.error('Error updating preferences:', err);
      return false;
    }
  };

  const refreshDashboardData = async () => {
    // Implement refresh logic
    // To be completed during development
  };

  // Function to switch between workspaces
  const switchWorkspace = (workspace) => {
    setSelectedWorkspace(workspace);
  };

  const value = {
    dashboardData,
    userPreferences,
    loading,
    error,
    notifications,
    refreshDashboardData,
    updateUserPreferences,
    user,
    workspaces,
    selectedWorkspace,
    switchWorkspace,
    isLoading
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}; 