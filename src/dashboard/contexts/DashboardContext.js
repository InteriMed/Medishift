import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../../contexts/authContext';
import { useWorkspaceAccess } from '../../hooks/useWorkspaceAccess';

const DashboardContext = createContext(null);

export const DashboardProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const { 
    workspaces, 
    loading: workspacesLoading, 
    currentWorkspace, 
    switchWorkspace,
    refreshWorkspaces 
  } = useWorkspaceAccess();

  const [userPreferences, setUserPreferences] = useState(null);
  const [nextIncompleteProfileSection, setNextIncompleteProfileSection] = useState(null);

  useEffect(() => {
    if (currentUser && !userPreferences) {
      const loadPreferences = async () => {
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('../../services/services/firebase');
          const { FIRESTORE_COLLECTIONS } = await import('../../config/keysDatabase');
          
          const userDoc = await getDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, currentUser.uid));
          if (userDoc.exists()) {
            setUserPreferences(userDoc.data().preferences || {});
          }
        } catch (error) {
          console.error('[DashboardContext] Error loading user preferences:', error);
        }
      };
      
      loadPreferences();
    }
  }, [currentUser, userPreferences]);

  const updateUserPreferences = useCallback(async (newPreferences) => {
    if (!currentUser) return false;

    try {
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../../services/services/firebase');
      const { FIRESTORE_COLLECTIONS } = await import('../../config/keysDatabase');

      await updateDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, currentUser.uid), {
        preferences: newPreferences,
        updatedAt: serverTimestamp()
      });

      setUserPreferences(newPreferences);
      return true;
    } catch (error) {
      console.error('[DashboardContext] Error updating preferences:', error);
      return false;
    }
  }, [currentUser]);

  const contextValue = useMemo(() => ({
    currentUser,
    workspaces,
    currentWorkspace,
    workspacesLoading,
    switchWorkspace,
    refreshWorkspaces,
    userPreferences,
    updateUserPreferences,
    nextIncompleteProfileSection,
    setNextIncompleteProfileSection
  }), [
    currentUser,
    workspaces,
    currentWorkspace,
    workspacesLoading,
    switchWorkspace,
    refreshWorkspaces,
    userPreferences,
    updateUserPreferences,
    nextIncompleteProfileSection
  ]);

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  );
};

DashboardProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};

export default DashboardContext;
