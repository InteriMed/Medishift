import { useEffect, useRef } from 'react';
import { useNotification } from '../../contexts/notificationContext';
import { useNetwork } from '../../contexts/networkContext';

const NetworkStatus = () => {
  const { showInfo } = useNotification();
  const { isOnline } = useNetwork();
  const prevOnlineStatusRef = useRef(isOnline);
  const hasNotifiedRef = useRef(false);

  useEffect(() => {
    if (prevOnlineStatusRef.current === false && isOnline === true) {
      if (!hasNotifiedRef.current) {
        hasNotifiedRef.current = true;
        showInfo('You are back online');
      }
    }

    if (isOnline === false) {
      hasNotifiedRef.current = false;
    }

    prevOnlineStatusRef.current = isOnline;
  }, [isOnline, showInfo]);

  return null;
};

export default NetworkStatus; 