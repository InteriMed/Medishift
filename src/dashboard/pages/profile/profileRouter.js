import React from 'react';
import { useAuth } from '../../../contexts/authContext';
import { useWorkspaceAccess } from '../../../hooks/useWorkspaceAccess';
import ProfessionalProfile from '../../shared/profile/ProfessionalProfile';
import FacilityProfile from './pages/facilityProfile';
import OrganizationProfile from '../../shared/profile/OrganizationProfile';

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

