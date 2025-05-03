import React, { createContext, useContext, useState, useEffect } from 'react';

const NetworkContext = createContext();

export const NetworkProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectivity, setConnectivity] = useState('unknown');
  
  useEffect(() => {
    // Update network status when it changes
    const handleOnline = () => {
      setIsOnline(true);
      setConnectivity('online');
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setConnectivity('offline');
    };
    
    // Initial check
    setIsOnline(navigator.onLine);
    setConnectivity(navigator.onLine ? 'online' : 'offline');
    
    // Listen for changes
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return (
    <NetworkContext.Provider value={{ isOnline, connectivity }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => useContext(NetworkContext); 