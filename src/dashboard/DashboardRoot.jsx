import React, { Suspense } from 'react';
import Dashboard from './index';
import LoadingSpinner from '../components/LoadingSpinner/LoadingSpinner';

const DashboardRoot = () => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Dashboard />
    </Suspense>
  );
};

export default DashboardRoot; 