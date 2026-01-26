import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useDashboard } from '../contexts/DashboardContext';
import { isAdminSync } from '../../config/workspaceDefinitions';
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner';

const DashboardAccessGuard = ({ children }) => {
  const { user, isLoading } = useDashboard();
  const location = useLocation();

  // Allow marketplace access without profile check
  const isMarketplace = location.pathname.includes('/marketplace');

  if (isLoading || !user) {
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
    const lang = window.location.pathname.split('/')[1] || 'fr';
    const onboardingType = (user.roles || []).some(r => r.facility_uid) ? 'facility' : 'professional';
    return <Navigate to={`/${lang}/onboarding?type=${onboardingType}`} replace />;
  }

  return children;
};

export default DashboardAccessGuard;

