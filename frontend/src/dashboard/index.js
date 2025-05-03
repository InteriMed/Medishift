import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardProvider } from './context/DashboardContext';
import DashboardLayout from './components/Layout/DashboardLayout';
import Loading from '../components/Loading';

// Lazy-load dashboard features for better performance
const PersonalDashboard = lazy(() => import('./features/personalDashboard/PersonalDashboard'));
const Calendar = lazy(() => import('./features/calendar/Calendar'));
const Messages = lazy(() => import('./features/messages/Messages'));
const Contracts = lazy(() => import('./features/contracts/Contracts'));
const Profile = lazy(() => import('./features/profile/Profile'));

const Dashboard = () => {
  return (
    <DashboardProvider>
      <DashboardLayout>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<PersonalDashboard />} />
            <Route path="calendar/*" element={<Calendar />} />
            <Route path="messages/*" element={<Messages />} />
            <Route path="contracts/*" element={<Contracts />} />
            <Route path="profile/*" element={<Profile />} />
          </Routes>
        </Suspense>
      </DashboardLayout>
    </DashboardProvider>
  );
};

export default Dashboard; 