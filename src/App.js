import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate, useNavigate, useParams } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { TutorialProvider } from './dashboard/contexts/TutorialContext';
import { DashboardProvider } from './dashboard/contexts/DashboardContext';
import { SidebarProvider } from './dashboard/contexts/SidebarContext';
import NetworkStatus from './components/NetworkStatus';
import ScrollToTop from './components/ScrollToTop';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner/LoadingSpinner';
import Notification from './components/Notification/Notification';
import Dialog from './components/Dialog/Dialog';
import Tutorial from './dashboard/onboarding/Tutorial';
import { useTranslation } from 'react-i18next';
import { ProtectedRoute } from './components/ProtectedRoute';

import Layout from './components/Layout/Layout';
import './i18n';
import './styles/app.css';
import './styles/notifications.css';
// import './styles/global.css';
import './styles/variables.css';
import DashboardRoot from './dashboard/DashboardRoot';
import Footer from './components/Footer/Footer';
import BlogPost from './pages/Blog/BlogPost';
import VerificationSentPage from './pages/Auth/VerificationSentPage';
import LoadingPage from './pages/LoadingPage'; // Import the new LoadingPage
import { getLocalizedRoute } from './i18n';

import {
  LoginPage,
  SignupPage,
  ForgotPasswordPage
} from './pages/Auth';

import {
  HomePage,
  AboutPage,
  FacilitiesPage,
  ProfessionalsPage,
  FAQPage,
  ContactPage,
  BlogPage,
  PrivacyPolicyPage,
  TermsOfServicePage,
  SitemapPage,
  NotFoundPage,
  TestPage
} from './pages';

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
        <Router>
          <ScrollToTop />
          <AuthProvider>
            <NotificationProvider>
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
            </NotificationProvider>
          </AuthProvider>
        </Router>
      </HelmetProvider>
    </ErrorBoundary>
  );
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

  // Dashboard access flag
  const DASHBOARD_DISABLED = false;

  // Set default language to French
  const DEFAULT_LANGUAGE = 'fr';

  // Extract language from URL
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const currentLang = pathSegments[0];

  // Check if we're on a dashboard page to hide header
  useEffect(() => {
    const isDashboardPage = location.pathname.includes('/dashboard') ||
      location.pathname.includes('login') ||
      location.pathname.includes('signup');
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
      // No valid language in URL, redirect to preferred language
      const userPreferredLang = localStorage.getItem('preferredLanguage') ||
        navigator.language.split('-')[0] || DEFAULT_LANGUAGE;
      const lang = SUPPORTED_LANGUAGES.includes(userPreferredLang) ? userPreferredLang : DEFAULT_LANGUAGE;

      // Set language in i18n
      i18n.changeLanguage(lang);

      // Redirect to same path but with language prefix
      const newPath = path === '/' ? `/${lang}` : `/${lang}${path}`;
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

  // Use a more direct check for dashboard pages
  const isDashboardPage =
    path.includes('/dashboard') ||
    path.includes('/login') ||
    path.includes('/signup') ||
    path.includes('/forgot-password') ||
    // Add localized versions
    path.includes(`/${currentLang}/${getLocalizedRoute('dashboard', currentLang)}`) ||
    path.includes(`/${currentLang}/${getLocalizedRoute('login', currentLang)}`) ||
    path.includes(`/${currentLang}/${getLocalizedRoute('signup', currentLang)}`) ||
    path.includes(`/${currentLang}/${getLocalizedRoute('forgotPassword', currentLang)}`);


  // If we're still initializing, show a loading page
  if (isInitialLoad) {
    return <LoadingSpinner />;
  }

  return (
    <div className={`${isDashboardPage ? '' : 'with-header'} min-h-screen bg-background font-sans antialiased text-foreground`}>
      {showHeader && <Header />}
      <main className="content">
        <Routes>
          <Route path="/:lang" element={<Layout />}>
            <Route index element={<Navigate to={`/${DEFAULT_LANGUAGE}/home`} replace />} />

            {/* Pages routes - simplified to use standard English routes */}
            <Route path="home" element={<HomePage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="professionals" element={<ProfessionalsPage />} />
            <Route path="facilities" element={<FacilitiesPage />} />
            <Route path="faq" element={<FAQPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="blog" element={<BlogPage />} />
            <Route path="blog/:slug" element={<BlogPost />} />
            <Route path="privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="terms-of-service" element={<TermsOfServicePage />} />
            <Route path="sitemap" element={<SitemapPage />} />

            {/* Auth routes */}
            <Route path="login" element={<LoginPage />} />
            <Route path="signup" element={<SignupPage />} />
            <Route path="signup/:step" element={<SignupPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="verification-sent" element={<VerificationSentPage />} />

            {/* Protected dashboard routes - fixed routing */}
            <Route path="dashboard/*" element={
              DASHBOARD_DISABLED ?
                <Navigate to={`/${i18n.language}/not-found`} replace /> :
                <ProtectedRoute>
                  <DashboardRoot />
                </ProtectedRoute>
            } />

            {/* Add direct access to dashboard profile */}
            <Route path="dashboard/profile" element={
              DASHBOARD_DISABLED ?
                <Navigate to={`/${i18n.language}/not-found`} replace /> :
                <ProtectedRoute>
                  <DashboardRoot />
                </ProtectedRoute>
            } />

            {/* Loading page */}
            <Route path="loading" element={<LoadingPage />} />

            {/* Test page */}
            <Route path="test" element={<TestPage />} />

            {/* Not found route */}
            <Route path="not-found" element={<NotFoundPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          {/* Add direct access to dashboard without language prefix */}
          <Route path="/dashboard/*" element={
            DASHBOARD_DISABLED ?
              <Navigate to={`/${i18n.language}/not-found`} replace /> :
              <ProtectedRoute>
                <DashboardRoot />
              </ProtectedRoute>
          } />

          {/* Add direct access to dashboard profile without language prefix */}
          <Route path="/dashboard/profile" element={
            DASHBOARD_DISABLED ?
              <Navigate to={`/${i18n.language}/not-found`} replace /> :
              <ProtectedRoute>
                <DashboardRoot />
              </ProtectedRoute>
          } />

          {/* Root redirects to language-prefixed path */}
          <Route path="/" element={<Navigate to={`/${DEFAULT_LANGUAGE}`} replace />} />

          {/* Catch any other routes and redirect to language-prefixed 404 */}
          <Route path="*" element={<Navigate to={`/${DEFAULT_LANGUAGE || 'fr'}/${getLocalizedRoute('notFound', DEFAULT_LANGUAGE || 'fr')}`} replace />} />
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
