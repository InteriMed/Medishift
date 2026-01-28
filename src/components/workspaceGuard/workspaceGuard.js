import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useWorkspaceAccess } from '../../hooks/useWorkspaceAccess';
import LoadingSpinner from '../loadingSpinner/loadingSpinner';

const WorkspaceGuard = ({ children, requiredWorkspaceType = null }) => {
  const { lang } = useParams();
  const { workspaces, loading, needsOnboarding, hasAnyWorkspace } = useWorkspaceAccess();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (needsOnboarding || !hasAnyWorkspace) {
    return <Navigate to={`/${lang}/onboarding`} replace />;
  }

  if (requiredWorkspaceType) {
    const hasRequiredWorkspace = workspaces.some(
      w => w.type === requiredWorkspaceType
    );

    if (!hasRequiredWorkspace) {
      return <Navigate to={`/${lang}/dashboard/overview`} replace />;
    }
  }

  return <>{children}</>;
};

export default WorkspaceGuard;

