import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './pages/components/layout';
import LoadingSpinner from '../components/loadingSpinner/loadingSpinner';
import { ResponsiveProvider } from './contexts/responsiveContext';

const Overview = lazy(() => import('./pages/overview/overview'));
const Calendar = lazy(() => import('./pages/calendar/Calendar'));
const ProfileRouter = lazy(() => import('./pages/profile/profileRouter'));
const CommunicationsRouter = lazy(() => import('./pages/communication/CommunicationsRouter'));
const EntityRouter = lazy(() => import('./pages/entity/EntityRouter'));
const Marketplace = lazy(() => import('./pages/marketplace/marketplace'));
const SupportPage = lazy(() => import('./pages/support/supportPage'));

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
            <Route path="*" element={<Navigate to="overview" replace />} />
          </Routes>
        </Suspense>
      </DashboardLayout>
    </ResponsiveProvider>
  );
};

export default DashboardRoot;

