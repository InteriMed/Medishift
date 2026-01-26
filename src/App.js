import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate, useNavigate, useParams, Outlet } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { NetworkProvider } from './contexts/NetworkContext';
import { TutorialProvider } from './dashboard/contexts/TutorialContext';
import { DashboardProvider } from './dashboard/contexts/DashboardContext';
import { SidebarProvider } from './dashboard/contexts/SidebarContext';
import NetworkStatus from './components/NetworkStatus';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner/LoadingSpinner';
import Notification from './components/Header/Notification/Notification';
import Dialog from './components/Dialog/Dialog';
import Tutorial from './dashboard/tutorial/Tutorial';
import GhostModeBanner from './components/GhostModeBanner/GhostModeBanner';
import { useTranslation } from 'react-i18next';
import { ProtectedRoute } from './components/ProtectedRoute';

import Layout from './components/Layout/Layout';
import './i18n';
import './styles/app.css';
import './styles/notifications.css';
// import './styles/global.css';
import './styles/variables.css';
import DashboardRoot from './dashboard/DashboardRoot';
import { testFirestoreConnection } from './utils/testFirestoreConnection';
import { resetFirestoreCache } from './utils/resetFirestoreCache';
import Footer from './components/Footer/Footer';
import { NotFoundPage } from './pages';
import { getLocalizedRoute } from './i18n';

import {
  PUBLIC_ROUTES,
  AUTH_ROUTES,
  PROTECTED_ROUTES,
  TEST_ROUTES,
  ROUTE_TYPES,
  getRouteById
} from './config/appRoutes';
import { buildLocalizedPath, ROUTE_IDS, DEFAULT_LANGUAGE as DEFAULT_LANG } from './config/routeHelpers';

// Import header component
const Header = lazy(() =>
  import('./components/Header/Header').catch(() => ({
    default: () => <div className="header-placeholder">Header Placeholder</div>
  }))
);

// Supported languages
const SUPPORTED_LANGUAGES = ['en', 'fr', 'de', 'it'];

// App container with router
const AppContainer = () => {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <Router future={{ v7_startTransition: true }}>
          <AuthProvider>
            <NotificationProvider>
              <NetworkProvider>
                <DashboardProvider>
                  <SidebarProvider>
                    <TutorialProvider>
                      <Suspense fallback={<LoadingSpinner />}>
                        <NetworkStatus />
                        <AppContent />
                      </Suspense>
                    </TutorialProvider>
                  </SidebarProvider>
                </DashboardProvider>
              </NetworkProvider>
            </NotificationProvider>
          </AuthProvider>
        </Router>
      </HelmetProvider>
    </ErrorBoundary>
  );
};

// Make test and utility functions available globally in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  window.testFirestore = testFirestoreConnection;
  window.resetFirestoreCache = resetFirestoreCache;
}

// App content with language handling
function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { loading: authLoading } = useAuth();
  const [showHeader, setShowHeader] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isLanguageSetup, setIsLanguageSetup] = useState(false);

  // Dashboard access flag
  const DASHBOARD_DISABLED = false;

  // Helper component for dashboard routing and redirects
  const DashboardGuard = () => {
    const segments = location.pathname.split('/').filter(Boolean);
    const dashboardIndex = segments.indexOf('dashboard');

    // Handle /dashboard with no trailing slash or subpath
    if (segments.length === dashboardIndex + 1) {
      return <Navigate to="/dashboard/personal/overview" replace />;
    }

    const firstSegmentAfterDashboard = segments[dashboardIndex + 1];

    // Known workspace types/patterns
    const isWorkspaceId = firstSegmentAfterDashboard === 'personal' ||
      firstSegmentAfterDashboard === 'admin' ||
      firstSegmentAfterDashboard === 'marketplace' ||
      firstSegmentAfterDashboard.length > 15; // Firestore IDs are ~20 chars

    // If it's a valid workspace URL, allow Outlet to render children
    if (isWorkspaceId) {
      return <Outlet />;
    }

    // If it's a legacy URL (e.g., /dashboard/profile/...), redirect to personal workspace
    // Preserve language prefix if present
    const langPrefix = dashboardIndex > 0 ? `/${segments[0]}` : '';
    const subPath = segments.slice(dashboardIndex + 1).join('/');
    return <Navigate to={`${langPrefix}/dashboard/personal/${subPath}${location.search}${location.hash}`} replace />;
  };

  const DEFAULT_LANGUAGE = DEFAULT_LANG;

  // Extract language from URL
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const currentLang = pathSegments[0];

  // Check if we're on a dashboard page to hide header
  useEffect(() => {
    const isDashboardPage = location.pathname.includes('/dashboard') ||
      location.pathname.includes('login') ||
      location.pathname.includes('signup') ||
      location.pathname.includes('/onboarding');
    setShowHeader(!isDashboardPage);
  }, [location.pathname]);

  // Language detection and handling for direct URL access and reloads
  useEffect(() => {
    // Only run once on initial render
    if (isLanguageSetup) return;

    // Wait for i18n to be initialized
    if (!i18n.isInitialized) return;

    // Extract language from URL or use browser language or default to 'fr'
    const path = location.pathname;
    const pathSegments = path.split('/').filter(Boolean);

    // Check if the first segment is a valid language code
    const langFromUrl = pathSegments[0];

    if (!langFromUrl || !SUPPORTED_LANGUAGES.includes(langFromUrl)) {
      const userPreferredLang = navigator.language.split('-')[0] || DEFAULT_LANGUAGE;
      const lang = SUPPORTED_LANGUAGES.includes(userPreferredLang) ? userPreferredLang : DEFAULT_LANGUAGE;

      // Set language in i18n
      i18n.changeLanguage(lang);

      // Redirect to same path but with language prefix
      // IMPORTANT: Preserve search (query params) and hash to prevent losing workspace state
      const search = location.search;
      const hash = location.hash;
      const newPath = path === '/' ? `/${lang}${search}${hash}` : `/${lang}${path}${search}${hash}`;

      navigate(newPath, { replace: true });
    } else {
      // Language is in URL, just set it in i18n
      i18n.changeLanguage(langFromUrl);
    }

    setIsLanguageSetup(true);
  }, [location.pathname, i18n, navigate, isLanguageSetup]);

  // Wait for both auth and language setup to complete before showing content
  useEffect(() => {
    if (!authLoading && isLanguageSetup && i18n.isInitialized) {
      setIsInitialLoad(false);
    }
  }, [authLoading, isLanguageSetup, i18n.isInitialized]);

  // This effect runs on subsequent route changes after initial load
  useEffect(() => {
    if (!isInitialLoad && currentLang && SUPPORTED_LANGUAGES.includes(currentLang)) {
      i18n.changeLanguage(currentLang);
    }
  }, [currentLang, i18n, isInitialLoad]);


  const path = location.pathname;

  const isDashboardPage =
    path.includes('/dashboard') ||
    path.includes('/login') ||
    path.includes('/signup') ||
    path.includes('/forgot-password') ||
    path.includes('/onboarding') ||
    path.includes(`/${currentLang}/dashboard`) ||
    path.includes(`/${currentLang}/${getLocalizedRoute('login', currentLang)}`) ||
    path.includes(`/${currentLang}/${getLocalizedRoute('signup', currentLang)}`) ||
    path.includes(`/${currentLang}/${getLocalizedRoute('forgotPassword', currentLang)}`) ||
    path.includes(`/${currentLang}/onboarding`);


  // If we're still initializing, show a loading page
  if (isInitialLoad) {
    return <LoadingSpinner />;
  }

  return (
    <div className={`${isDashboardPage ? '' : 'with-header'} min-h-screen bg-background font-sans antialiased text-foreground`}>
      <GhostModeBanner />
      {showHeader && <Header />}
      <main className="content">
        <Routes>
          <Route path="/:lang" element={<Layout />}>
            <Route index element={<Navigate to={buildLocalizedPath(ROUTE_IDS.HOME, DEFAULT_LANGUAGE)} replace />} />

            {PUBLIC_ROUTES.map(route => (
              <Route
                key={route.id}
                path={route.path}
                element={<route.component />}
              />
            ))}

            {AUTH_ROUTES.map(route => (
              <Route
                key={route.id}
                path={route.path}
                element={<route.component />}
              />
            ))}

            {PROTECTED_ROUTES.filter(r => r.id !== 'dashboard').map(route => {
              return (
                <Route
                  key={route.id}
                  path={route.path}
                  element={
                    route.requiresAuth ? (
                      <ProtectedRoute>
                        <route.component />
                      </ProtectedRoute>
                    ) : (
                      <route.component />
                    )
                  }
                />
              );
            })}

            {process.env.NODE_ENV === 'development' && TEST_ROUTES.map(route => (
              <Route
                key={route.id}
                path={route.path}
                element={<route.component />}
              />
            ))}

            <Route path="*" element={<NotFoundPage />} />
          </Route>
          {/* Unified Dashboard Routing with Workspace Guard */}
          {/* Supports both /dashboard/... and /:lang/dashboard/... */}
          <Route path="/dashboard" element={<DashboardGuard />}>
            <Route path=":workspaceId/*" element={
              DASHBOARD_DISABLED ?
                <Navigate to={buildLocalizedPath(ROUTE_IDS.NOT_FOUND, i18n.language)} replace /> :
                <ProtectedRoute>
                  <DashboardRoot />
                </ProtectedRoute>
            } />
          </Route>

          <Route path="/:lang/dashboard" element={<DashboardGuard />}>
            <Route path=":workspaceId/*" element={
              DASHBOARD_DISABLED ?
                <Navigate to={buildLocalizedPath(ROUTE_IDS.NOT_FOUND, i18n.language)} replace /> :
                <ProtectedRoute>
                  <DashboardRoot />
                </ProtectedRoute>
            } />
          </Route>

          {/* Catch-all for dashboard paths that might need redirect */}
          <Route path="/dashboard/*" element={<DashboardGuard />} />
          <Route path="/:lang/dashboard/*" element={<DashboardGuard />} />

          <Route path="/" element={<Navigate to={`/${DEFAULT_LANGUAGE}`} replace />} />

          <Route path="*" element={<Navigate to={buildLocalizedPath(ROUTE_IDS.NOT_FOUND, DEFAULT_LANGUAGE)} replace />} />
        </Routes>
      </main>
      <Notification />
      <Dialog />
      {/* Only render the Tutorial component once at the root level */}
      <Tutorial />
      {!isDashboardPage && <Footer />}
    </div>
  );
}

export default AppContainer;
