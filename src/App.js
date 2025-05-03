import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/context/AuthContext';
import ProtectedRoute from './features/auth/components/common/ProtectedRoute';
import Login from './features/auth/pages/Login/Login';
import SignUp from './features/auth/pages/SignUp/SignUp';
import ForgotPassword from './features/auth/pages/ForgotPassword/ForgotPassword';
import VerifyEmail from './features/auth/pages/VerifyEmail/VerifyEmail';
import DashboardLayout from './dashboard/components/DashboardLayout/DashboardLayout';
import HomePage from './dashboard/pages/HomePage/HomePage';
import MarketplacePage from './dashboard/pages/MarketplacePage/MarketplacePage';
// Import other dashboard pages

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          
          {/* Protected Dashboard Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<HomePage />} />
            <Route path="marketplace" element={<MarketplacePage />} />
            {/* Add other dashboard routes */}
          </Route>
          
          {/* Redirect root to dashboard or login */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* 404 Route */}
          <Route path="*" element={<div>Page Not Found</div>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App; 