import React from 'react';
import { Link } from 'react-router-dom';
import { FiMenu, FiBell, FiUser, FiSettings, FiLogOut } from 'react-icons/fi';
import { useDashboard } from '../../context/DashboardContext';
import UserMenu from '../UserMenu/UserMenu';
import styles from './header.module.css';

const Header = ({ sidebarOpen, toggleSidebar }) => {
  const { user, selectedWorkspace } = useDashboard();
  
  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        <button 
          className={styles.menuButton} 
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          <FiMenu />
        </button>
        
        {selectedWorkspace && (
          <div className={styles.workspaceInfo}>
            <h2 className={styles.workspaceName}>{selectedWorkspace.name}</h2>
          </div>
        )}
      </div>
      
      <div className={styles.rightSection}>
        <button className={styles.notificationButton} aria-label="Notifications">
          <FiBell />
          <span className={styles.notificationBadge}>3</span>
        </button>
        
        <UserMenu user={user} />
      </div>
    </header>
  );
};

export default Header; 