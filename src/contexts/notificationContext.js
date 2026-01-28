import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

// Create notification context
const NotificationContext = createContext();

/**
 * Notification Provider component
 */
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const notificationsShownRef = useRef(new Set());

  const addNotification = useCallback((notification) => {
    // Generate unique ID for new notification
    const id = Date.now() + Math.random();

    // Ensure message is a string
    const message = typeof notification.message === 'string'
      ? notification.message
      : JSON.stringify(notification.message);

    // Add notification only if we haven't shown it recently (avoid duplicates)
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

    // Add notification with proper structure
    const newNotification = {
      ...notification,
      id,
      message,
      type: notification.type || 'info',
      dismissible: true
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove after timeout
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, notification.timeout || 5000);
  }, []);

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

  const showWarning = useCallback((message) => {
    addNotification({ type: 'warning', message });
  }, [addNotification]);

  // Unified showNotification function
  const showNotification = useCallback((notificationData) => {
    // Handle both object and string inputs
    let notification;
    if (typeof notificationData === 'string') {
      notification = { message: notificationData, type: 'info' };
    } else {
      notification = { ...notificationData };
    }

    addNotification(notification);
  }, [addNotification]);

  const hideNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  // Simple notify function for backward compatibility
  const notify = useCallback((message, type = 'info') => {
    const stringMessage = typeof message === 'string' ? message : JSON.stringify(message);
    addNotification({ message: stringMessage, type });
  }, [addNotification]);

  const value = {
    notifications,
    addNotification,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    showNotification,
    hideNotification,
    notify,
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
  const { notifications, hideNotification } = useContext(NotificationContext);

  if (!notifications || notifications.length === 0) {
    return null;
  }

  return (
    <div className="notification-container">
      {notifications.map(notification => {
        // Ensure we have a valid notification object
        if (!notification || typeof notification !== 'object') {
          return null;
        }

        // Ensure message is a string
        const message = typeof notification.message === 'string'
          ? notification.message
          : JSON.stringify(notification.message || 'Unknown notification');

        return (
          <div
            key={notification.id}
            className={`notification ${notification.type || 'info'}`}
          >
            <div className="notification-content">
              {notification.title && (
                <div className="notification-title">
                  {typeof notification.title === 'string' ? notification.title : JSON.stringify(notification.title)}
                </div>
              )}
              <div className="notification-message">{message}</div>
              <button
                className="notification-close"
                onClick={() => hideNotification(notification.id)}
              >
                ×
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}