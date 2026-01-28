import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import '../pages/components/layout.css';

const BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
};

const ResponsiveContext = createContext(null);

export const ResponsiveProvider = ({ children }) => {
  const [windowWidth, setWindowWidth] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth : 1024;
  });

  const [windowHeight, setWindowHeight] = useState(() => {
    return typeof window !== 'undefined' ? window.innerHeight : 768;
  });

  const [showBackButton, setShowBackButton] = useState(false);
  const [onBackButtonClick, setOnBackButtonClick] = useState(null);
  const [isMainSidebarCollapsed, setIsMainSidebarCollapsed] = useState(false);
  const [isSecondarySidebarCollapsed, setIsSecondarySidebarCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = useMemo(() => windowWidth < BREAKPOINTS.tablet, [windowWidth]);
  const isTablet = useMemo(() => windowWidth >= BREAKPOINTS.tablet && windowWidth < BREAKPOINTS.desktop, [windowWidth]);
  const isDesktop = useMemo(() => windowWidth >= BREAKPOINTS.desktop, [windowWidth]);
  const isWideScreen = useMemo(() => windowWidth >= BREAKPOINTS.wide, [windowWidth]);

  const setPageMobileState = useCallback((show, callback) => {
    setShowBackButton(show);
    setOnBackButtonClick(() => callback);
  }, []);

  const clearPageMobileState = useCallback(() => {
    setShowBackButton(false);
    setOnBackButtonClick(null);
  }, []);

  const toggleMainSidebar = useCallback(() => {
    setIsMainSidebarCollapsed(prev => !prev);
  }, []);

  const toggleSecondarySidebar = useCallback(() => {
    setIsSecondarySidebarCollapsed(prev => !prev);
  }, []);

  const contextValue = useMemo(() => ({
    windowWidth,
    windowHeight,
    isMobile,
    isTablet,
    isDesktop,
    isWideScreen,
    breakpoints: BREAKPOINTS,
    showBackButton,
    onBackButtonClick,
    setPageMobileState,
    clearPageMobileState,
    isMainSidebarCollapsed,
    setIsMainSidebarCollapsed,
    toggleMainSidebar,
    isSecondarySidebarCollapsed,
    setIsSecondarySidebarCollapsed,
    toggleSecondarySidebar
  }), [
    windowWidth,
    windowHeight,
    isMobile,
    isTablet,
    isDesktop,
    isWideScreen,
    showBackButton,
    onBackButtonClick,
    setPageMobileState,
    clearPageMobileState,
    isMainSidebarCollapsed,
    setIsMainSidebarCollapsed,
    toggleMainSidebar,
    isSecondarySidebarCollapsed,
    setIsSecondarySidebarCollapsed,
    toggleSecondarySidebar
  ]);

  return (
    <ResponsiveContext.Provider value={contextValue}>
      {children}
    </ResponsiveContext.Provider>
  );
};

ResponsiveProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export const useResponsive = () => {
  const context = useContext(ResponsiveContext);
  if (!context) {
    return {
      windowWidth: typeof window !== 'undefined' ? window.innerWidth : 1024,
      windowHeight: typeof window !== 'undefined' ? window.innerHeight : 768,
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isWideScreen: false,
      breakpoints: BREAKPOINTS,
      showBackButton: false,
      onBackButtonClick: null,
      setPageMobileState: () => {},
      clearPageMobileState: () => {},
      isMainSidebarCollapsed: false,
      setIsMainSidebarCollapsed: () => {},
      toggleMainSidebar: () => {},
      isSecondarySidebarCollapsed: false,
      setIsSecondarySidebarCollapsed: () => {},
      toggleSecondarySidebar: () => {}
    };
  }
  return context;
};

export const usePageMobile = useResponsive;

export default ResponsiveContext;

