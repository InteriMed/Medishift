import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate, useNavigate, useParams } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import NetworkStatus from './components/NetworkStatus';
import ErrorBoundary from './components/ErrorBoundary';
import Loading from './components/Loading';
import Notification from './components/Notification/Notification';
import Dialog from './components/Dialog/Dialog';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './components/LanguageSwitcher';
import { ProtectedRoute } from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardLayout from './dashboard/layout/DashboardLayout';
import HomePage from './dashboard/pages/HomePage/HomePage';
import ContractsPage from './dashboard/pages/ContractsPage/ContractsPage';
import MessagesPage from './dashboard/pages/MessagesPage/MessagesPage';
import ProfilePage from './dashboard/pages/ProfilePage/ProfilePage';
import CalendarPage from './dashboard/pages/CalendarPage/CalendarPage';
import SettingsPage from './dashboard/pages/SettingsPage/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';
import MarketplacePage from './dashboard/pages/MarketplacePage/MarketplacePage';
import AppRoutes from './routes';

// Import i18n instance
import './i18n';

// Import styles
import './styles/app.css';
import './styles/login.css';
import './styles/notifications.css';
import './styles/global.css';

// Import header component
const Header = lazy(() => 
  import('./components/Header/Header').catch(() => ({ 
    default: () => <div className="header-placeholder">Header Placeholder</div> 
  }))
);

// Define all page components with error handling
const Homepage = lazy(() => 
  import('./pages/Homepage').catch(() => ({ 
    default: () => <div>Homepage Placeholder</div> 
  }))
);

const About = lazy(() => 
  import('./pages/About').catch(() => ({ 
    default: () => <div>About Page Placeholder</div> 
  }))
);

const FAQs = lazy(() => 
  import('./pages/FAQs').catch(() => ({ 
    default: () => <div>FAQs Page Placeholder</div> 
  }))
);

const Support = lazy(() => 
  import('./pages/Support').catch(() => ({ 
    default: () => <div>Support Page Placeholder</div> 
  }))
);

// Lazy load auth pages with error handling
const Login = lazy(() => 
  import('./pages/Login').catch(() => ({ 
    default: () => <div>Login Page Placeholder</div> 
  }))
);

const Signup = lazy(() => 
  import('./pages/Signup').catch(() => ({ 
    default: () => <div>Signup Page Placeholder</div> 
  }))
);

// Dashboard placeholder until dependencies are resolved
const Dashboard = () => <div className="dashboard-placeholder">Dashboard Placeholder - Install required packages first</div>;

// Supported languages
const SUPPORTED_LANGUAGES = ['en', 'fr', 'de', 'it'];

// App container with router
const AppContainer = () => {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <Router>
          <AuthProvider>
            <NotificationProvider>
              <Suspense fallback={<Loading />}>
                <NetworkStatus />
                <AppContent />
              </Suspense>
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
  const [showHeader, setShowHeader] = useState(true);

  // Extract language from URL
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const currentLang = pathSegments[0];

  // Check if we're on a dashboard page to hide header
  useEffect(() => {
    const isDashboardPage = location.pathname.includes('/dashboard') || location.pathname.includes('login') || location.pathname.includes('signup');
    setShowHeader(!isDashboardPage);
  }, [location.pathname]);

  // Redirect to supported language if needed
  useEffect(() => {
    // If URL doesn't start with a language code, redirect to default language
    if (!SUPPORTED_LANGUAGES.includes(currentLang)) {
      const defaultLang = i18n.language || 'en';
      const newPath = `/${defaultLang}${location.pathname}`;
      navigate(newPath, { replace: true });
    } else {
      // Make sure i18n language matches URL language
      if (i18n.language !== currentLang) {
        i18n.changeLanguage(currentLang);
      }
    }
  }, [currentLang, i18n, location.pathname, navigate]);

  // Simple redirect component for dashboard routes
  const DashboardRedirect = () => {
    const { lang } = useParams();
    return <Navigate to={`/${lang}/dashboard/dashboard/default-uid`} replace />;
  };

  return (
    <div className="App">
      {showHeader && <Header />}
      <LanguageSwitcher />
      <main className="content">
        <Routes>
          <Route path="/:lang">
            <Route index element={<Homepage />} />
            <Route path="about" element={<About />} />
            <Route path="faqs" element={<FAQs />} />
            <Route path="support" element={<Support />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="signup/*" element={<Signup />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            {/* Protected Dashboard Routes */}
            <Route 
              path="dashboard" 
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              } 
            >
              <Route index element={<HomePage />} />
              <Route path="contracts" element={<ContractsPage />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="marketplace" element={<MarketplacePage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route 
              path="dashboard/:section/:uid" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="dashboard/:uid" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
          </Route>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Notification />
      <Dialog />
    </div>
  );
}

export default AppContainer;
