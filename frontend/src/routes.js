import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/context/AuthContext';
import ProtectedRoute from './features/auth/components/common/ProtectedRoute';

// Import auth pages from new structure
import { Login, SignUp, ForgotPassword, VerifyEmail } from './features/auth';

// Import regular pages
import Homepage from './pages/Homepage';
import About from './pages/About';
import FAQs from './pages/FAQs';
import Support from './pages/Support';
import NotFound from './pages/NotFound';
import PharmacistsDashboard from './pages/PharmacistsDashboard';

const AppRoutes = () => {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Homepage />} />
        <Route path="/about" element={<About />} />
        <Route path="/faqs" element={<FAQs />} />
        <Route path="/support" element={<Support />} />
        
        {/* Auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        
        {/* Protected routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <PharmacistsDashboard />
          </ProtectedRoute>
        } />
        
        {/* Language-specific routes */}
        <Route path="/:lang" element={<Homepage />} />
        <Route path="/:lang/about" element={<About />} />
        
        {/* 404 route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
};

export default AppRoutes; 