import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { isAdmin } from '../../utils/adminUtils';
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner';

const AdminRoute = ({ children }) => {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!currentUser) {
    return <Navigate to="/dashboard/overview" replace />;
  }

  if (!isAdmin(userProfile)) {
    return <Navigate to="/dashboard/overview" replace />;
  }

  return children;
};

export default AdminRoute;

