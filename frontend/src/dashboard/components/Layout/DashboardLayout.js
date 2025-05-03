import React, { useState } from 'react';
import Header from '../Header/Header';
import Sidebar from '../Sidebar/Sidebar';
import { useDashboard } from '../../context/DashboardContext';
import styles from './layout.module.css';

const DashboardLayout = ({ children }) => {
  const { userPreferences } = useDashboard();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    userPreferences?.sidebar === 'collapsed'
  );

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => !prev);
  };

  return (
    <div className={styles.dashboardContainer}>
      <Sidebar collapsed={isSidebarCollapsed} />
      <div className={styles.mainContent}>
        <Header onToggleSidebar={toggleSidebar} />
        <main className={styles.contentArea}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout; 