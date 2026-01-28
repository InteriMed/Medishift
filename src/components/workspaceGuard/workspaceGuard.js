import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useWorkspaceAccess } from '../../hooks/useWorkspaceAccess';
import LoadingSpinner from '../loadingSpinner/loadingSpinner';
import { DEFAULT_LANGUAGE } from '../../config/routeHelpers';

const WorkspaceGuard = ({ children, requiredWorkspaceType = null }) => {
  const { lang } = useParams();
  const { i18n } = useTranslation();
  const { workspaces, loading, needsOnboarding, hasAnyWorkspace } = useWorkspaceAccess();
  
  const currentLang = lang || i18n.language || DEFAULT_LANGUAGE;

  if (loading) {
    return <LoadingSpinner />;
  }

  if (needsOnboarding || !hasAnyWorkspace) {
    return <Navigate to={`/${currentLang}/onboarding`} replace />;
  }

  if (requiredWorkspaceType) {
    const hasRequiredWorkspace = workspaces.some(
      w => w.type === requiredWorkspaceType
    );

    if (!hasRequiredWorkspace) {
      return <Navigate to={`/${currentLang}/dashboard/overview`} replace />;
    }
  }

  return <>{children}</>;
};

export default WorkspaceGuard;

