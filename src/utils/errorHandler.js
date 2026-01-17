/**
 * Firebase Error Handler
 * Centralized error handling for Firebase operations
 */

// Error codes mapping to user-friendly messages
const ERROR_MESSAGES = {
  // Auth errors
  'auth/user-not-found': 'No account found with this email address',
  'auth/wrong-password': 'Incorrect password',
  'auth/email-already-in-use': 'An account with this email already exists',
  'auth/weak-password': 'Password should be at least 6 characters',
  'auth/invalid-email': 'Please enter a valid email address',
  'auth/account-exists-with-different-credential': 'An account already exists with the same email address but different sign-in credentials',
  'auth/operation-not-allowed': 'This operation is not allowed',
  'auth/requires-recent-login': 'Please sign in again to complete this operation',
  
  // Firestore errors
  'permission-denied': 'You don\'t have permission to access this data',
  'not-found': 'The requested document was not found',
  'already-exists': 'This document already exists',
  
  // Functions errors
  'functions/unauthenticated': 'You must be signed in to perform this action',
  'functions/invalid-argument': 'Invalid data was provided to this operation',
  'functions/permission-denied': 'You don\'t have permission to perform this action',
  
  // Network errors
  'network-error': 'Network connection error. Please check your internet connection',
  'offline': 'You are currently offline. This action will be completed when you\'re back online',
  
  // Default error
  'default': 'An unexpected error occurred. Please try again later'
};

/**
 * Format Firebase error for display
 * @param {Error} error - The error object from Firebase
 * @returns {Object} Formatted error object with code and message
 */
export const formatFirebaseError = (error) => {
  // Get error code from Firebase error
  const errorCode = error.code || 'default';
  
  // Log the error for debugging
  console.error('Firebase Error:', error);
  
  // Return formatted error
  return {
    code: errorCode,
    message: ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.default,
    originalError: error
  };
};

/**
 * Handle Firebase operation with error catching
 * @param {Function} operation - Async Firebase operation to perform
 * @param {Function} onSuccess - Callback for successful operation
 * @param {Function} onError - Callback for error handling
 * @returns {Promise} Result of the operation
 */
export const handleFirebaseOperation = async (operation, onSuccess, onError) => {
  try {
    const result = await operation();
    if (onSuccess) {
      onSuccess(result);
    }
    return result;
  } catch (error) {
    const formattedError = formatFirebaseError(error);
    if (onError) {
      onError(formattedError);
    }
    return { error: formattedError };
  }
};

/**
 * Check if error is due to network connectivity
 * @param {Error} error - The error object
 * @returns {Boolean} Whether the error is due to network issues
 */
export const isNetworkError = (error) => {
  if (!error) return false;
  
  // Check for common network error patterns
  return (
    error.code === 'network-error' ||
    error.code === 'offline' ||
    error.message?.includes('network') ||
    error.message?.includes('offline') ||
    error.message?.includes('connection') ||
    // FirebaseError: Failed to get document because the client is offline.
    error.message?.includes('client is offline')
  );
};

/**
 * Firebase error handler utility
 * Formats Firebase error messages for user-friendly display
 */

/**
 * Get a user-friendly error message from Firebase error code
 * @param {Error} error - Firebase error object 
 * @returns {string} User-friendly error message
 */
export const getFirebaseErrorMessage = (error) => {
  // Extract code if this is a Firebase error object
  const errorCode = error.code || error.message;
  
  switch (errorCode) {
    // Authentication errors
    case 'auth/email-already-in-use':
      return 'This email is already in use. Please try signing in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/user-not-found':
      return 'No account found with this email. Please check your email or sign up.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again or reset your password.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use a stronger password.';
    case 'auth/requires-recent-login':
      return 'This operation requires a recent login. Please sign in again.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed before completing. Please try again.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for OAuth operations.';
    case 'auth/operation-not-allowed':
      return 'This operation is not allowed. Please contact support.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with the same email but different sign-in credentials.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    case 'auth/timeout':
      return 'Request timeout. Please try again.';
    case 'auth/invalid-verification-code':
      return 'Invalid verification code. Please try again.';
    case 'auth/invalid-verification-id':
      return 'Invalid verification ID. Please try again.';
    case 'auth/quota-exceeded':
      return 'Quota exceeded. Please try again later.';
      
    // Firestore errors
    case 'permission-denied':
      return 'You do not have permission to perform this action.';
    case 'not-found':
      return 'The requested document was not found.';
    case 'already-exists':
      return 'This document already exists.';
    case 'resource-exhausted':
      return 'Quota exceeded. Please try again later.';
    case 'failed-precondition':
      return 'Operation cannot be executed in the current system state.';
    case 'aborted':
      return 'The operation was aborted. Please try again.';
    case 'out-of-range':
      return 'Operation was attempted past the valid range.';
    case 'unimplemented':
      return 'This feature is not supported in this environment.';
    case 'internal':
      return 'Internal server error. Please try again later.';
    case 'unavailable':
      return 'Service unavailable. Please check your connection and try again.';
    case 'data-loss':
      return 'Unrecoverable data loss or corruption.';
    case 'unauthenticated':
      return 'Not authenticated. Please sign in and try again.';
      
    // Storage errors
    case 'storage/object-not-found':
      return 'File does not exist.';
    case 'storage/unauthorized':
      return 'Not authorized to access this file.';
    case 'storage/canceled':
      return 'Operation canceled.';
    case 'storage/unknown':
      return 'Unknown error occurred. Please try again.';
      
    // Default unknown error
    default:
      return error.message || 'An unknown error occurred. Please try again.';
  }
};

/**
 * Log error to console and analytics if available
 * @param {Error} error - Error object
 * @param {string} context - Context where error occurred
 */
export const logError = (error, context = 'unknown') => {
  // Log to console
  console.error(`[${context}]`, error);
  
  // Could also send to Firebase Analytics or other error tracking service
  // if (analytics) {
  //   analytics.logEvent('app_error', {
  //     error_code: error.code || 'unknown',
  //     error_message: error.message,
  //     context
  //   });
  // }
};

/**
 * Main error handler function
 * @param {Error} error - Error object
 * @param {string} context - Context where error occurred
 * @param {Function} notify - Function to notify user (optional)
 * @returns {string} User-friendly error message
 */
export const handleError = (error, context, notify = null) => {
  // Log the error
  logError(error, context);
  
  // Get user-friendly message
  const message = getFirebaseErrorMessage(error);
  
  // Notify user if callback provided
  if (notify && typeof notify === 'function') {
    notify(message);
  }
  
  return message;
};

export default handleError; 