import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner/LoadingSpinner';

// Protected Route component that redirects to login if not authenticated
export const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

  // Show loading indicator while checking auth state
  if (loading) {
    return <LoadingSpinner />;
  }

  // Redirect to login if not authenticated
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Render children if authenticated
  return children;
}; 