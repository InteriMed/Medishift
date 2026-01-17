import React, { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const SidebarContext = createContext(null);

const SIDEBAR_COLLAPSED_KEY = 'dashboard_sidebar_collapsed';

export const SidebarProvider = ({ children }) => {
  const [isMainSidebarCollapsed, setIsMainSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify(isMainSidebarCollapsed));
  }, [isMainSidebarCollapsed]);

  const value = {
    isMainSidebarCollapsed,
    setIsMainSidebarCollapsed
  };

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};

SidebarProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

