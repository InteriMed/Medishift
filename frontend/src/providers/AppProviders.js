import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from '../features/auth/context/AuthContext';
import { NotificationProvider } from '../contexts/NotificationContext';

const AppProviders = ({ children }) => {
  return (
    <HelmetProvider>
      <AuthProvider>
        <NotificationProvider>
          <BrowserRouter>
            {children}
          </BrowserRouter>
        </NotificationProvider>
      </AuthProvider>
    </HelmetProvider>
  );
};

export default AppProviders; 