import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner';
import { buildLocalizedPath, ROUTE_IDS, DEFAULT_LANGUAGE } from '../../config/routeHelpers';
import { useTranslation } from 'react-i18next';

export const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const { i18n } = useTranslation();
  const lang = i18n.language || DEFAULT_LANGUAGE;

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!currentUser) {
    return <Navigate to={buildLocalizedPath(ROUTE_IDS.LOGIN, lang)} replace />;
  }

  return children;
}; 