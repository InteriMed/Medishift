import React, { Suspense } from 'react';
import Dashboard from './index';
import LoadingSpinner from '../components/LoadingSpinner/LoadingSpinner';
import DashboardAccessGuard from './components/DashboardAccessGuard';

const DashboardRoot = () => {
  return (
    <DashboardAccessGuard>
      <Suspense fallback={<LoadingSpinner />}>
        <Dashboard />
      </Suspense>
    </DashboardAccessGuard>
  );
};

export default DashboardRoot; 