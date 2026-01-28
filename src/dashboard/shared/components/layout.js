import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import { Header } from '../Header/Header';
import { useLocation } from 'react-router-dom';
import './DashboardLayout.css';

/**
 * DashboardLayout Component
 * This is the main layout for all dashboard pages
 */
const DashboardLayout = ({ children }) => {
  const location = useLocation();
  // Initialize sidebar state based on screen size
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1350);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarDisabled, setIsSidebarDisabled] = useState(false);
  const sidebarRef = useRef(null);

  // Function to get CSS variable value
  const getCssVariable = (variableName) => {
    const rootStyle = getComputedStyle(document.documentElement);
    return rootStyle.getPropertyValue(variableName).trim();
  };
  const maxWidthSidebarDashboard = getCssVariable('--max-width-sidebar-dashboard');

  // Styles object
  const styles = {
    dashboardContainer: {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      overflow: 'visible',
      position: window.innerWidth <= 1110 ? 'relative' : undefined,
    },
    dashboardContent: {
      display: 'flex',
      flex: 1,
      overflow: 'visible',
      height: 'calc(100vh - 3.5rem)',
    },
    mainContent: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 3.5rem)',
      overflow: 'visible',
      transition: 'margin-left 0.3s ease',
      marginLeft:
        isSidebarOpen && window.innerWidth >= 1350
          ? (isSidebarCollapsed ? '70px' : (maxWidthSidebarDashboard || '256px'))
          : 0,
      margin: 0,
      padding: 0,
    },
    contentArea: {
      flex: 1,
      overflow: 'visible',
      padding: 0,
      margin: 0,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    },
    sidebarOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 999,
      display: window.innerWidth <= 1110 ? 'block' : 'none',
    },
  };

  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (window.innerWidth < 1350) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname]);

  // Check if we're in a tutorial step that requires the sidebar to remain open
  useEffect(() => {
    if (false) {
      // Determine if the current step is related to the sidebar
      const isSidebarStep = false;

      // If it's a sidebar step, ensure the sidebar is open and disable closing
      if (isSidebarStep) {
        setIsSidebarOpen(true);
        setIsSidebarDisabled(true);
      } else {
        setIsSidebarDisabled(false);
      }
    } else {
      setIsSidebarDisabled(false);
    }
  }, []);

  // Listen for window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1350) {
        setIsSidebarCollapsed(false);
        // Keep sidebar closed on mobile by default
        setIsSidebarOpen(false);
      } else {
        // Keep sidebar open on desktop by default
        setIsSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle clicks outside the sidebar to close it on mobile
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only close if sidebar is open, we're on mobile, and sidebar isn't disabled
      if (
        isSidebarOpen &&
        window.innerWidth < 1350 &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target) &&
        !isSidebarDisabled
      ) {
        // Make sure we're not clicking on the toggle button
        if (!event.target.closest('[aria-label="Toggle sidebar"]')) {
          setIsSidebarOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSidebarOpen, isSidebarDisabled]);

  const toggleSidebar = () => {
    if (isSidebarDisabled && isSidebarOpen) {
      return;
    }

    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleCollapse = () => {
    if (isSidebarDisabled) {
      return;
    }
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="dashboard-layout-wrapper">
      <div className="dashboard-layout-content" style={styles.dashboardContainer}>
        <Header
          sidebarDisabled={isSidebarDisabled}
        />

      <div style={styles.dashboardContent}>
        <div ref={sidebarRef}>
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={toggleSidebar}
            collapsed={isSidebarCollapsed}
            disabled={isSidebarDisabled}
            onToggleCollapse={toggleCollapse}
          />
        </div>

        {isSidebarOpen && window.innerWidth < 1350 && (
          <div
            style={styles.sidebarOverlay}
            onClick={isSidebarDisabled ? null : () => setIsSidebarOpen(false)}
          />
        )}

        <div style={styles.mainContent}>
          <main style={styles.contentArea} data-dashboard="true">
            {children}
          </main>
        </div>
      </div>
    </div>
    </div>
  );
};

export default DashboardLayout; 