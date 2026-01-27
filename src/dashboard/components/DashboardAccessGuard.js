import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useDashboard } from '../contexts/DashboardContext';
import { useAuth } from '../../contexts/AuthContext';
import { isAdminSync } from '../../config/workspaceDefinitions';
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner';
import { buildLocalizedPath, ROUTE_IDS, DEFAULT_LANGUAGE } from '../../config/routeHelpers';
import { useTranslation } from 'react-i18next';

const DashboardAccessGuard = ({ children }) => {
  const { user, isLoading } = useDashboard();
  const { currentUser, loading: authLoading } = useAuth();
  const location = useLocation();
  const { i18n } = useTranslation();
  const lang = i18n.language || DEFAULT_LANGUAGE;

  if (authLoading || isLoading) {
    return <LoadingSpinner />;
  }

  if (!currentUser) {
    return <Navigate to={buildLocalizedPath(ROUTE_IDS.LOGIN, lang)} replace />;
  }

  const isMarketplace = location.pathname.includes('/marketplace');

  if (!user) {
    return <LoadingSpinner />;
  }

  // Marketplace is accessible to all authenticated users
  if (isMarketplace) {
    return children;
  }

  const hasFacilityProfile = (user.roles || []).some(r => r.facility_uid);
  const hasProfessionalProfile = user.hasProfessionalProfile === true || user._professionalProfileExists === true;
  const isAdmin = isAdminSync(user);

  // Check onboarding completion status as well
  const onboardingCompleted =
    user.onboardingCompleted === true ||
    user.onboardingProgress?.professional?.completed === true ||
    user.onboardingProgress?.facility?.completed === true;

  const profileFlagsReady = typeof user.hasProfessionalProfile !== 'undefined' || typeof user._professionalProfileExists !== 'undefined';

  if (!profileFlagsReady) {
    return <LoadingSpinner />;
  }

  // Admins are always safe
  const hasAccess = isAdmin || hasFacilityProfile || hasProfessionalProfile || onboardingCompleted;

  if (!hasAccess) {
    // Rerouting removed as per user request to avoid automatic redirects
    console.warn('[DashboardAccessGuard] User lacks formal access but automatic rerouting is disabled');
  }

  return children;
};

export default DashboardAccessGuard;

