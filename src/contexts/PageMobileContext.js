import React, { createContext, useContext, useState } from 'react';

const PageMobileContext = createContext();

export const PageMobileProvider = ({ children }) => {
  const [isMobileView, setIsMobileView] = useState(false);
  const [mobileComponent, setMobileComponent] = useState(null);

  const value = {
    isMobileView,
    setIsMobileView,
    mobileComponent,
    setMobileComponent
  };

  return (
    <PageMobileContext.Provider value={value}>
      {children}
    </PageMobileContext.Provider>
  );
};

export const usePageMobile = () => {
  const context = useContext(PageMobileContext);
  if (!context) {
    throw new Error('usePageMobile must be used within PageMobileProvider');
  }
  return context;
};

export default PageMobileContext;

