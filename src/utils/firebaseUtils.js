import { Timestamp } from 'firebase/firestore';

/**
 * Converts a Firebase Timestamp to a JavaScript Date
 * @param {Timestamp} timestamp - Firebase Timestamp
 * @returns {Date} JavaScript Date object
 */
export const timestampToDate = (timestamp) => {
  if (!timestamp) return null;
  return timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
};

/**
 * Formats a Firebase Timestamp or JavaScript Date to a display string
 * @param {Timestamp|Date} timestamp - Firebase Timestamp or Date
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatDate = (timestamp, options = {}) => {
  const date = timestampToDate(timestamp);
  if (!date) return '';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(date);
};

/**
 * Formats a Firebase Timestamp or JavaScript Date to a date-only string
 * @param {Timestamp|Date} timestamp - Firebase Timestamp or Date
 * @returns {string} Formatted date string (e.g., "Jan 1, 2023")
 */
export const formatDateOnly = (timestamp) => {
  return formatDate(timestamp, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: undefined,
    minute: undefined
  });
};

/**
 * Formats a Firebase Timestamp or JavaScript Date to a time-only string
 * @param {Timestamp|Date} timestamp - Firebase Timestamp or Date
 * @returns {string} Formatted time string (e.g., "14:30")
 */
export const formatTimeOnly = (timestamp) => {
  return formatDate(timestamp, {
    year: undefined,
    month: undefined,
    day: undefined,
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Prepares a data object for Firestore by removing undefined values
 * and converting Date objects to Firebase Timestamps
 * @param {Object} data - Data object to prepare
 * @returns {Object} Prepared data object
 */
export const prepareForFirestore = (data) => {
  const prepared = { ...data };
  
  // Remove undefined values (Firestore doesn't accept them)
  Object.keys(prepared).forEach(key => {
    if (prepared[key] === undefined) {
      delete prepared[key];
    }
  });
  
  return prepared;
};

/**
 * Transforms a Firestore document snapshot to a plain object
 * @param {DocumentSnapshot} doc - Firestore document snapshot
 * @returns {Object|null} Document data with ID, or null if document doesn't exist
 */
export const transformDoc = (doc) => {
  if (!doc || !doc.exists) return null;
  return { id: doc.id, ...doc.data() };
};

/**
 * Gets error message from a Firebase error
 * @param {Error} error - Firebase error
 * @returns {string} User-friendly error message
 */
export const getFirebaseErrorMessage = (error) => {
  if (!error || !error.code) return 'An unknown error occurred';
  
  // Map Firebase auth error codes to user-friendly messages
  const errorMessages = {
    'auth/invalid-email': 'The email address is not valid.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/email-already-in-use': 'This email is already in use.',
    'auth/weak-password': 'The password is too weak.',
    'auth/operation-not-allowed': 'This operation is not allowed.',
    'auth/popup-closed-by-user': 'The authentication popup was closed.',
    'auth/unauthorized-domain': 'This domain is not authorized.',
    'auth/requires-recent-login': 'Please log in again to complete this action.',
    'permission-denied': 'You do not have permission to perform this action.'
  };
  
  return errorMessages[error.code] || error.message || 'An error occurred';
}; 