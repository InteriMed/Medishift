import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/authContext';
import { useAdminPermission } from '../hooks/useAdminPermission';
import LoadingSpinner from '../../../components/loadingSpinner/loadingSpinner';

const ProtectedRoute = ({ children, requiredRight }) => {
  const { currentUser, loading } = useAuth();
  const { hasRight } = useAdminPermission();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!currentUser) {
    return <Navigate to="/dashboard/overview" replace />;
  }

  if (requiredRight && !hasRight(requiredRight)) {
    return <Navigate to="/dashboard/admin" replace />;
  }

  return children;
};

export default ProtectedRoute;

