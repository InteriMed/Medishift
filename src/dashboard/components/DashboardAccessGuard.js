import React from 'react';
import { Navigate } from 'react-router-dom';
import { useDashboard } from '../contexts/DashboardContext';
import { hasAdminAccess } from '../../utils/sessionAuth';
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner';

const DashboardAccessGuard = ({ children }) => {
  const { user, isLoading } = useDashboard();

  if (isLoading || !user) {
    return <LoadingSpinner />;
  }

  const hasFacilityProfile = user.hasFacilityProfile === true;
  const hasProfessionalProfile = user.hasProfessionalProfile === true;
  const isAdmin = hasAdminAccess(user);

  // Check onboarding completion status as well
  const onboardingCompleted =
    user.onboardingCompleted === true ||
    user.onboardingProgress?.professional?.completed === true ||
    user.onboardingProgress?.facility?.completed === true;

  const profileFlagsReady = typeof user.hasFacilityProfile !== 'undefined' && typeof user.hasProfessionalProfile !== 'undefined';

  if (!profileFlagsReady) {
    return <LoadingSpinner />;
  }

  const hasAccess = hasFacilityProfile || hasProfessionalProfile || isAdmin || onboardingCompleted;

  if (!hasAccess) {
    const lang = window.location.pathname.split('/')[1] || 'fr';
    const onboardingType = user.role === 'facility' || user.role === 'company' ? 'facility' : 'professional';
    console.log('[DashboardAccessGuard] No profile access found, redirecting to onboarding:', {
      hasFacilityProfile,
      hasProfessionalProfile,
      isAdmin,
      onboardingCompleted,
      onboardingType,
      userRole: user.role
    });
    return <Navigate to={`/${lang}/onboarding?type=${onboardingType}`} replace />;
  }

  return children;
};

export default DashboardAccessGuard;

