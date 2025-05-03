import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import '../styles/notifications.css'; // We'll create this later

// Create notification context
const NotificationContext = createContext();

// Sound files
const successSound = new Audio('/sounds/success.mp3');
const errorSound = new Audio('/sounds/error.mp3');
const infoSound = new Audio('/sounds/info.mp3');

/**
 * Notification Provider component
 */
export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const notificationSound = useRef(null);
  const notificationsShownRef = useRef(new Set());

  // Initialize the sound
  useEffect(() => {
    notificationSound.current = new Audio('/notification-sound.mp3'); // Adjust path as needed
  }, []);

  const playSound = useCallback(() => {
    try {
      if (notificationSound.current) {
        notificationSound.current.play().catch(error => {
          // Silent catch - browsers often block autoplay
          console.log("Error playing sound:", error);
        });
      }
    } catch (error) {
      console.log("Error playing sound:", error);
    }
  }, []);

  const addNotification = useCallback((notification) => {
    // Generate unique ID for new notification
    const id = Date.now();
    
    // Add notification only if we haven't shown it recently (avoid duplicates)
    const message = notification.message;
    if (message && notificationsShownRef.current.has(message)) {
      return; // Skip duplicate notifications
    }
    
    // Add to shown set with 10 second expiry
    if (message) {
      notificationsShownRef.current.add(message);
      setTimeout(() => {
        notificationsShownRef.current.delete(message);
      }, 10000);
    }
    
    // Add notification
    setNotifications(prev => [...prev, { ...notification, id }]);
    
    // Play sound
    playSound();
    
    // Auto-remove after timeout
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, notification.timeout || 5000);
  }, [playSound]);

  // Higher-level notification functions
  const showSuccess = useCallback((message) => {
    addNotification({ type: 'success', message });
  }, [addNotification]);

  const showError = useCallback((message) => {
    addNotification({ type: 'error', message });
  }, [addNotification]);

  const showInfo = useCallback((message) => {
    addNotification({ type: 'info', message });
  }, [addNotification]);

  const value = {
    notifications,
    addNotification,
    showSuccess,
    showError,
    showInfo,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
}

/**
 * Notification Container component
 */
const NotificationContainer = () => {
  const { notifications, dismissNotification } = useContext(NotificationContext);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="notification-container">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`notification notification-${notification.type}`}
        >
          <div className="notification-content">
            {notification.title && (
              <div className="notification-title">{notification.title}</div>
            )}
            <div className="notification-message">{notification.message}</div>
          </div>
          {notification.dismissible && (
            <button
              className="notification-dismiss"
              onClick={() => dismissNotification(notification.id)}
            >
              &times;
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

/**
 * Custom hook to use notification context
 */
export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
} 