import React, { useState, useEffect } from 'react';
import { Routes, Route, useParams, useNavigate, Navigate, Link } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import Calendar from './components/calendar/Calendar';
import Marketplace from './components/marketplace/Marketplace';
import HRCore from './components/hrcore/HRCore';
import Messages from './components/messages/Messages';
import Settings from './components/settings/Settings';
import './Dashboard.css';
import logo from '../../assets/img/logo.png';
import Sidebar from './components/sidebar/Sidebar';
import DashboardEmployee from './components/dashboard/Dashboard Employee';
import DashboardManager from './components/dashboard/Dashboard Manager';
import apiService from '../../services/apiService';
import authService from '../../services/authService';

// Mock user data to replace Firebase data
const MOCK_USER_DATA = {
  displayName: 'Demo User',
  email: 'demo@example.com',
  review_average: '4.8',
  experience: '5 years',
  missions: '12',
  title: 'Senior',
  specialization: 'Pharmacist',
  docId: 'mock-doc-id',
  firstName: 'Demo',
  lastName: 'User'
};

const Dashboard = () => {
  // Now section and uid are both params
  const { lang, section, uid } = useParams();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);
  const [error, setError] = useState(null);
  const auth = getAuth();
  
  // Test API connection first
  useEffect(() => {
    const testConnection = async () => {
      try {
        const result = await apiService.testApiConnection();
        console.log('API connection test result:', result);
        setApiConnected(true);
      } catch (error) {
        console.error('API connection test failed:', error);
        setApiConnected(false);
        setError('Failed to connect to API server. Please check if the backend is running.');
        setIsLoading(false);
      }
    };
    
    testConnection();
  }, []);
  
  // Check authentication status after confirming API connection
  useEffect(() => {
    if (!apiConnected) return; // Skip if API is not connected
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in
        setIsAuthenticated(true);
        
        // Fetch user data from backend using apiService
        apiService.getUserData(user.uid)
          .then(data => {
            console.log('User data fetched successfully:', data);
            setUserData(data);
            setIsLoading(false);
          })
          .catch(error => {
            console.error('Error fetching user data:', error);
            // Fallback to mock data if API fails
            const mockUserData = {
              ...MOCK_USER_DATA,
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || 'User'
            };
            console.log('Using mock user data:', mockUserData);
            setUserData(mockUserData);
            setIsLoading(false);
          });
      } else {
        // User is signed out
        setIsAuthenticated(false);
        setIsLoading(false);
        // Redirect to login page
        navigate(`/${lang}/login`, { replace: true });
      }
    });
    
    // Cleanup subscription
    return () => unsubscribe();
  }, [auth, navigate, lang, apiConnected]);

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="error-container">
        <h3>Connection Error</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  // If not authenticated, don't render the dashboard
  if (!isAuthenticated) {
    return null; // The navigate in useEffect will redirect to login
  }

  // Determine which dashboard content to show based on the section parameter
  const renderDashboardContent = () => {
    // If no specific section is provided, default to dashboard home
    if (!section || section === 'dashboard') {
      return <DashboardEmployee userData={userData} currentUser={userData} />;
    }

    // Render specific section content
    switch (section) {
      case 'calendar':
        return <Calendar userData={userData} />;
      case 'messages':
        return <Messages userData={userData} />;
      case 'hr-core':
        return <HRCore userData={userData} />;
      case 'marketplace':
        return <Marketplace userData={userData} />;
      case 'settings':
        return <Settings userData={userData} />;
      default:
        // Default to dashboard home if section is not recognized
        return <DashboardEmployee userData={userData} currentUser={userData} />;
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar 
        logo={logo}
        uid={uid}
        lang={lang}
        currentSection={section || 'dashboard'}
        userData={userData}
      />
      {/* Main Content */}
      <div className="main-content">
        <div className="content-area">
          {renderDashboardContent()}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
