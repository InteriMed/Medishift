import React from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from './authContext';
import { useWorkspaceAccess } from '../hooks/useWorkspaceAccess';
import LoadingSpinner from '../components/loadingSpinner/loadingSpinner';
import { buildLocalizedPath, ROUTE_IDS, DEFAULT_LANGUAGE } from '../config/routeHelpers';
import { useTranslation } from 'react-i18next';

const DashboardAccessGuard = ({ children }) => {
  const { currentUser, loading: authLoading } = useAuth();
  const { workspaces, loading: workspaceLoading, needsOnboarding } = useWorkspaceAccess();
  const location = useLocation();
  const { lang } = useParams();
  const { i18n } = useTranslation();
  const currentLang = lang || i18n.language || DEFAULT_LANGUAGE;

  if (authLoading || workspaceLoading) {
    return <LoadingSpinner />;
  }

  if (!currentUser) {
    return <Navigate to={buildLocalizedPath(ROUTE_IDS.LOGIN, currentLang)} replace />;
  }

  const isMarketplace = location.pathname.includes('/marketplace');
  const isOnboarding = location.pathname.includes('/onboarding');

  if (isOnboarding) {
    return children;
  }

  if (isMarketplace) {
    return children;
  }

  if (needsOnboarding || workspaces.length === 0) {
    return <Navigate to={`/${currentLang}/onboarding`} replace />;
  }

  return children;
};

export default DashboardAccessGuard;

