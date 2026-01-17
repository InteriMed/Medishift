import { useEffect, useRef } from 'react';
import { useNotification } from '../contexts/NotificationContext';

const NetworkStatus = () => {
  const { showInfo } = useNotification();
  // No need for state if not used in JSX or other logic
  const hasNotifiedRef = useRef(false);

  useEffect(() => {
    const handleOnline = () => {
      // Only show notification if we were previously offline
      if (!hasNotifiedRef.current) {
        hasNotifiedRef.current = true;
        showInfo('You are back online');
      }
    };

    const handleOffline = () => {
      hasNotifiedRef.current = false;
      // No need to show notification here - will show when back online
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showInfo]); // Only depend on showInfo function

  return null; // This component doesn't render anything
};

export default NetworkStatus; 