import React from 'react';
import { NavLink } from 'react-router-dom';
import { FiHome, FiFileText, FiMessageSquare, FiUser, FiCalendar, FiSettings, FiX, FiShoppingBag } from 'react-icons/fi';
import { useDashboard } from '../../context/DashboardContext';
import WorkspaceSelector from '../WorkspaceSelector/WorkspaceSelector';
import styles from './sidebar.module.css';

const Sidebar = ({ isOpen, onClose }) => {
  const { workspaces, selectedWorkspace, switchWorkspace } = useDashboard();
  
  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
      <div className={styles.sidebarHeader}>
        <div className={styles.logo}>
          <img src="/logo.svg" alt="Logo" />
          <span>Company Name</span>
        </div>
        <button className={styles.closeButton} onClick={onClose}>
          <FiX />
        </button>
      </div>
      
      <WorkspaceSelector 
        workspaces={workspaces} 
        selectedWorkspace={selectedWorkspace}
        onSelectWorkspace={switchWorkspace}
      />
      
      <nav className={styles.navigation}>
        <NavLink 
          to="/dashboard" 
          end
          className={({ isActive }) => 
            `${styles.navItem} ${isActive ? styles.active : ''}`
          }
        >
          <FiHome />
          <span>Home</span>
        </NavLink>
        
        <NavLink 
          to="/dashboard/contracts" 
          className={({ isActive }) => 
            `${styles.navItem} ${isActive ? styles.active : ''}`
          }
        >
          <FiFileText />
          <span>Contracts</span>
        </NavLink>
        
        <NavLink 
          to="/dashboard/messages" 
          className={({ isActive }) => 
            `${styles.navItem} ${isActive ? styles.active : ''}`
          }
        >
          <FiMessageSquare />
          <span>Messages</span>
        </NavLink>
        
        <NavLink 
          to="/dashboard/calendar" 
          className={({ isActive }) => 
            `${styles.navItem} ${isActive ? styles.active : ''}`
          }
        >
          <FiCalendar />
          <span>Calendar</span>
        </NavLink>
        
        <NavLink 
          to="/dashboard/marketplace" 
          className={({ isActive }) => 
            `${styles.navItem} ${isActive ? styles.active : ''}`
          }
        >
          <FiShoppingBag />
          <span>Marketplace</span>
        </NavLink>
        
        <NavLink 
          to="/dashboard/profile" 
          className={({ isActive }) => 
            `${styles.navItem} ${isActive ? styles.active : ''}`
          }
        >
          <FiUser />
          <span>Profile</span>
        </NavLink>
        
        <NavLink 
          to="/dashboard/settings" 
          className={({ isActive }) => 
            `${styles.navItem} ${isActive ? styles.active : ''}`
          }
        >
          <FiSettings />
          <span>Settings</span>
        </NavLink>
      </nav>
    </aside>
  );
};

export default Sidebar; 