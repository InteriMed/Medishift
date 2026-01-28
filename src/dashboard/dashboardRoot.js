import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import DashboardLayout from './pages/components/layout';
import LoadingSpinner from '../components/loadingSpinner/loadingSpinner';
import { ResponsiveProvider } from './contexts/responsiveContext';
import { buildLocalizedPath, ROUTE_IDS, SUPPORTED_LANGUAGES } from '../config/routeHelpers';
import { useTranslation } from 'react-i18next';

const Overview = lazy(() => import('./pages/overview/overview'));
const Calendar = lazy(() => import('./pages/calendar/Calendar'));
const ProfileRouter = lazy(() => import('./pages/profile/profileRouter'));
const CommunicationsRouter = lazy(() => import('./pages/communication/CommunicationsRouter'));
const EntityRouter = lazy(() => import('./pages/entity/EntityRouter'));
const Marketplace = lazy(() => import('./pages/marketplace/marketplace'));
const SupportPage = lazy(() => import('./pages/support/supportPage'));

const DashboardNotFound = () => {
  const location = useLocation();
  const { i18n } = useTranslation();
  
  const segments = location.pathname.split('/').filter(Boolean);
  const langFromUrl = segments[0] && SUPPORTED_LANGUAGES.includes(segments[0]) ? segments[0] : null;
  const currentLang = langFromUrl || i18n.language || 'fr';
  
  return <Navigate to={buildLocalizedPath(ROUTE_IDS.NOT_FOUND, currentLang)} replace />;
};

const DashboardRoot = () => {
  return (
    <ResponsiveProvider>
      <DashboardLayout>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="overview" element={<Overview />} />
            <Route path="calendar/*" element={<Calendar />} />
            <Route path="profile/*" element={<ProfileRouter />} />
            <Route path="communications/*" element={<CommunicationsRouter />} />
            <Route path="entity/*" element={<EntityRouter />} />
            <Route path="marketplace" element={<Marketplace />} />
            <Route path="support" element={<SupportPage />} />
            
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="*" element={<DashboardNotFound />} />
          </Routes>
        </Suspense>
      </DashboardLayout>
    </ResponsiveProvider>
  );
};

export default DashboardRoot;

