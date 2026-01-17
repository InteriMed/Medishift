import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { hasPermission } from '../utils/rbac';
import LoadingSpinner from '../../../components/LoadingSpinner/LoadingSpinner';

const ProtectedRoute = ({ children, requiredPermission }) => {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!currentUser) {
    return <Navigate to="/dashboard/overview" replace />;
  }

  const userRoles = userProfile?.roles || [];
  
  if (requiredPermission && !hasPermission(userRoles, requiredPermission)) {
    return <Navigate to="/dashboard/admin" replace />;
  }

  return children;
};

export default ProtectedRoute;

