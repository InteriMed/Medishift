import React from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useWorkspaceAccess } from '../../../hooks/useWorkspaceAccess';
import ProfessionalProfile from './pages/ProfessionalProfile';
import FacilityProfile from './pages/facilityProfile';
import OrganizationProfile from './pages/OrganizationProfile';

const ProfileRouter = () => {
  const { currentUser } = useAuth();
  const { workspaces } = useWorkspaceAccess();

  const activeWorkspace = workspaces.find(w => w.id === currentUser?.activeWorkspace);
  const workspaceType = activeWorkspace?.type || 'personal';

  switch (workspaceType) {
    case 'personal':
      return <ProfessionalProfile />;
    
    case 'facility':
    case 'team':
      return <FacilityProfile />;
    
    case 'organization':
    case 'chain':
      return <OrganizationProfile />;
    
    default:
      return <ProfessionalProfile />;
  }
};

export default ProfileRouter;

