import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, Navigate, useNavigate, useParams } from 'react-router-dom';
import Header from './Features/website/components/Header/Header';
import './i18n';
import LanguageSwitcher from './components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { HelmetProvider } from 'react-helmet-async';
import ProtectedRoute from './components/ProtectedRoute';

// Import your page components
import Homepage from './Features/website/Homepage';
import About from './Features/website/About';
import FAQs from './Features/website/FAQs';
import Support from './Features/website/Support';
import Login from './Features/auth/Login';
import Signup from './Features/auth/Signup';
import Dashboard from './Features/dashboard/Dashboard';

const SUPPORTED_LANGUAGES = ['en', 'fr', 'de', 'it'];

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
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

  // Simple redirect for dashboard routes
  const DashboardRedirect = () => {
    const { lang } = useParams();
    return <Navigate to={`/${lang}/dashboard/dashboard/default-uid`} replace />;
  };

  return (
    <HelmetProvider>
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
              <Route path="login" element={<Login />} />
              <Route path="signup/*" element={<Signup />} />
              {/* Protected Dashboard Routes */}
              <Route 
                path="dashboard" 
                element={
                  <ProtectedRoute>
                    <DashboardRedirect />
                  </ProtectedRoute>
                } 
              />
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
          </Routes>
        </main>
      </div>
    </HelmetProvider>
  );
}

export default App;
