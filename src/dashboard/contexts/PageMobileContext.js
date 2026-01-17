import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';

const PageMobileContext = createContext(null);

export const PageMobileProvider = ({ children }) => {
  const [showBackButton, setShowBackButton] = useState(false);
  const [onBackButtonClick, setOnBackButtonClick] = useState(null);
  const [isMobileMode, setIsMobileMode] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobileMode(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const setPageMobileState = useCallback((show, callback) => {
    setShowBackButton(show);
    setOnBackButtonClick(() => callback); // Store the callback
  }, []);

  const contextValue = useMemo(() => ({
    isMobileMode,
    showBackButton,
    onBackButtonClick,
    setPageMobileState,
  }), [isMobileMode, showBackButton, onBackButtonClick, setPageMobileState]);

  return (
    <PageMobileContext.Provider value={contextValue}>
      {children}
    </PageMobileContext.Provider>
  );
};

export const usePageMobile = () => {
  const context = useContext(PageMobileContext);
  // Make context optional to avoid errors in components that don't need it
  if (!context) {
    return {
      isMobileMode: false,
      showBackButton: false,
      onBackButtonClick: null,
      setPageMobileState: () => {}
    };
  }
  return context;
};

PageMobileProvider.propTypes = {
  children: PropTypes.node.isRequired
};

