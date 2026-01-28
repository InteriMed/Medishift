import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate, useNavigate, useParams, Outlet } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider, useAuth } from './contexts/authContext';
import { NotificationProvider } from './contexts/notificationContext';
import { NetworkProvider } from './contexts/networkContext';
import { DashboardProvider } from './dashboard/contexts/dashboardContext';
import { SidebarProvider } from './dashboard/onboarding/sidebarContext';
import LoadingSpinner from './components/loadingSpinner/loadingSpinner';
import GhostModeBanner from './components/ghostModeBanner/ghostModeBanner';
import { useTranslation } from 'react-i18next';
import ErrorBoundary from './components/modals/errorBoundary';
import NetworkStatus from './components/modals/networkStatus';
import { ProtectedRoute } from './components/modals/protectedRoute';
import Layout from './components/website/layout';
import CentralizedRoute from './contexts/centralizedRoute';

import './i18n';
// import './styles/global.css';
import './styles/variables.css';
import DashboardRoot from './dashboard/dashboardRoot';
import Footer from './components/website/footer/Footer';
import { NotFoundPage } from './websitePages';
import { getLocalizedRoute } from './i18n';

import {
  PUBLIC_ROUTES,
  AUTH_ROUTES,
  PROTECTED_ROUTES,
} from './config/appRoutes';
import { buildLocalizedPath, ROUTE_IDS, DEFAULT_LANGUAGE as DEFAULT_LANG } from './config/routeHelpers';

// Import header component
const Header = lazy(() =>
  import('./components/website/header/header').catch(() => 
    Promise.resolve({ default: () => <div className="header-placeholder">Header Placeholder</div> })
  )
);

// Supported languages
const SUPPORTED_LANGUAGES = ['en', 'fr', 'de', 'it'];

// Language guard component to redirect invalid language codes
const LanguageGuard = ({ children }) => {
  const location = useLocation();
  const { lang } = useParams();
  
  if (lang && !SUPPORTED_LANGUAGES.includes(lang)) {
    const search = location.search;
    const pathWithoutLang = location.pathname.replace(`/${lang}`, '');
    return <Navigate to={`/${DEFAULT_LANG}${pathWithoutLang}${search}`} replace />;
  }
  
  return children;
};

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
                    <Suspense fallback={<LoadingSpinner />}>
                      <NetworkStatus />
                      <AppContent />
                    </Suspense>
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

// App content with language handling
// Helper component for dashboard routing and redirects
const DashboardGuard = () => {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);
  const dashboardIndex = segments.indexOf('dashboard');

  console.log('[DashboardGuard] Checking route', { pathname: location.pathname, segments, dashboardIndex });

  // Handle /dashboard with no trailing slash or subpath
  if (segments.length === dashboardIndex + 1) {
    console.log('[DashboardGuard] No subpath, using CentralizedRoute');
    return <CentralizedRoute />;
  }

  const firstSegmentAfterDashboard = segments[dashboardIndex + 1];

  // Known workspace types/patterns
  const isWorkspaceId = firstSegmentAfterDashboard === 'personal' ||
    firstSegmentAfterDashboard === 'admin' ||
    firstSegmentAfterDashboard === 'marketplace' ||
    firstSegmentAfterDashboard.length > 15; // Firestore IDs are ~20 chars

  console.log('[DashboardGuard] First segment after dashboard', { firstSegmentAfterDashboard, isWorkspaceId });

  // If it's a valid workspace URL, allow Outlet to render children
  if (isWorkspaceId) {
    console.log('[DashboardGuard] Valid workspace ID, rendering Outlet');
    return <Outlet />;
  }

  // If it's a legacy URL (e.g., /dashboard/profile/...), check if user has workspaces
  // If no workspaces available, redirect to onboarding via CentralizedRoute
  console.log('[DashboardGuard] Legacy URL without workspace, using CentralizedRoute');
  return <CentralizedRoute />;
};

// App content with language handling
function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { loading: authLoading } = useAuth();
  const [showHeader, setShowHeader] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isLanguageSetup, setIsLanguageSetup] = useState(false);

  // Validate route components on mount
  useEffect(() => {
    console.log('=== Validating Route Components ===');
    [...PUBLIC_ROUTES, ...AUTH_ROUTES, ...PROTECTED_ROUTES].forEach(route => {
      const Component = route.component;
      const type = typeof Component;
      const isLazy = Component && Component.$$typeof;
      console.log(`Route ${route.id}: type=${type}, isLazy=${!!isLazy}, valid=${!!(Component && (type === 'function' || isLazy))}`);
      if (!Component || (type !== 'function' && !isLazy)) {
        console.error(`❌ INVALID COMPONENT for route "${route.id}":`, Component);
      }
    });
  }, []);

  // Dashboard access flag
  const DASHBOARD_DISABLED = false;

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

      // Set language in i18n but follow user instruction to remove rerouting/redirection
      i18n.changeLanguage(lang);
      console.log(`[LanguageSetup] Using language "${lang}" without URL redirection`);
    } else {
      // Language is in URL, just set it in i18n
      i18n.changeLanguage(langFromUrl);
    }

    setIsLanguageSetup(true);
  }, [location.pathname, i18n, navigate, isLanguageSetup, DEFAULT_LANGUAGE]);

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
          <Route path="/:lang" element={<LanguageGuard><Layout /></LanguageGuard>}>
            <Route index element={<Navigate to={buildLocalizedPath(ROUTE_IDS.HOME, DEFAULT_LANGUAGE)} replace />} />

            {PUBLIC_ROUTES.map(route => {
              const Component = route.component;
              if (!Component || (typeof Component !== 'function' && !Component.$$typeof)) {
                console.error(`Invalid component for route ${route.id}:`, Component);
                return null;
              }
              return (
                <Route
                  key={route.id}
                  path={route.path}
                  element={<Component />}
                />
              );
            })}

            {AUTH_ROUTES.map(route => {
              const Component = route.component;
              if (!Component || (typeof Component !== 'function' && !Component.$$typeof)) {
                console.error(`Invalid component for route ${route.id}:`, Component);
                return null;
              }
              return (
                <Route
                  key={route.id}
                  path={route.path}
                  element={<Component />}
                />
              );
            })}

            {PROTECTED_ROUTES.filter(r => r.id !== 'dashboard').map(route => {
              const Component = route.component;
              if (!Component || (typeof Component !== 'function' && !Component.$$typeof)) {
                console.error(`Invalid component for route ${route.id}:`, Component);
                return null;
              }
              return (
                <Route
                  key={route.id}
                  path={route.path}
                  element={
                    route.requiresAuth ? (
                      <ProtectedRoute>
                        <Component />
                      </ProtectedRoute>
                    ) : (
                      <Component />
                    )
                  }
                />
              );
            })}

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
      {!isDashboardPage && <Footer />}
    </div>
  );
}

export default AppContainer;
