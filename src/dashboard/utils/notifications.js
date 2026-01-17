import { useContext } from 'react';
import { useNotification } from '../../contexts/NotificationContext';

/**
 * Show a notification message
 * @param {string} message - The message to display
 * @param {string} type - The notification type (success, error, info, warning)
 * @param {Object} options - Additional toast options
 */
export const showNotification = (message, type = 'info', options = {}) => {
  // This is a placeholder function that logs to console
  // In a component, you should use the useNotification hook instead
  console.log(`[${type}] ${message}`);
  return Math.random().toString(36).substring(2, 9); // Return a fake ID
};

/**
 * Show a confirmation dialog
 * @param {string} message - The confirmation message
 * @param {Function} onConfirm - Function to call when confirmed
 * @param {Function} onCancel - Function to call when cancelled
 */
export const showConfirmation = (message, onConfirm, onCancel = () => {}) => {
  if (window.confirm(message)) {
    onConfirm();
  } else {
    onCancel();
  }
};

// Hook to use notifications in components
export const useNotifications = () => {
  const context = useNotification();
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default showNotification;
