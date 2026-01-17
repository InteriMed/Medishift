import React from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import './Notification.css';

const Notification = () => {
  const { notifications, hideNotification } = useNotification();

  if (!notifications || notifications.length === 0) {
    return null;
  }

  return (
    <div className="notification-container">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`notification ${notification.type}`}
        >
          <div className="notification-content">
            {notification.title && (
              <div className="notification-title">{notification.title}</div>
            )}
            <div className="notification-message">{notification.message}</div>
            <button
              className="notification-close"
              onClick={() => hideNotification(notification.id)}
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Notification; 