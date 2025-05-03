import { toast } from 'react-toastify';

/**
 * Show a notification message
 * @param {string} message - The message to display
 * @param {string} type - The notification type (success, error, info, warning)
 * @param {Object} options - Additional toast options
 */
export const showNotification = (message, type = 'info', options = {}) => {
  const defaultOptions = {
    position: 'top-right',
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  };
  
  const toastOptions = { ...defaultOptions, ...options };
  
  switch (type) {
    case 'success':
      toast.success(message, toastOptions);
      break;
    case 'error':
      toast.error(message, toastOptions);
      break;
    case 'warning':
      toast.warning(message, toastOptions);
      break;
    case 'info':
    default:
      toast.info(message, toastOptions);
      break;
  }
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