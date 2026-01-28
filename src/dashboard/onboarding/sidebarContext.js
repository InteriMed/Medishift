import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';

const SidebarContext = createContext(null);

export const SidebarProvider = ({ children }) => {
  const [isMainSidebarCollapsed, setIsMainSidebarCollapsed] = useState(false);
  const [isSecondarySidebarCollapsed, setIsSecondarySidebarCollapsed] = useState(false);

  const toggleMainSidebar = useCallback(() => {
    setIsMainSidebarCollapsed(prev => !prev);
  }, []);

  const toggleSecondarySidebar = useCallback(() => {
    setIsSecondarySidebarCollapsed(prev => !prev);
  }, []);

  const contextValue = useMemo(() => ({
    isMainSidebarCollapsed,
    setIsMainSidebarCollapsed,
    toggleMainSidebar,
    isSecondarySidebarCollapsed,
    setIsSecondarySidebarCollapsed,
    toggleSecondarySidebar
  }), [
    isMainSidebarCollapsed,
    toggleMainSidebar,
    isSecondarySidebarCollapsed,
    toggleSecondarySidebar
  ]);

  return (
    <SidebarContext.Provider value={contextValue}>
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

