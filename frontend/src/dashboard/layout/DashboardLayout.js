import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { FiMenu, FiX } from 'react-icons/fi';
import Header from '../components/Header/Header';
import Sidebar from '../components/Sidebar/Sidebar';
import { DashboardProvider } from '../context/DashboardContext';
import styles from './dashboardLayout.module.css';

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  return (
    <DashboardProvider>
      <div className={styles.dashboardLayout}>
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />
        
        <div className={styles.mainContent}>
          <Header 
            sidebarOpen={sidebarOpen} 
            toggleSidebar={toggleSidebar} 
          />
          
          <main className={styles.content}>
            <Outlet />
          </main>
        </div>
      </div>
    </DashboardProvider>
  );
};

export default DashboardLayout; 