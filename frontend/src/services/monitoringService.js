import { logEvent, setUserId, setUserProperties } from 'firebase/analytics';
import { analytics } from './firebaseService';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from './firebaseService';

// Initialize functions
const functions = getFunctions();

/**
 * Log error to Firebase Analytics and Error Reporting
 * @param {Error} error - The error that occurred
 * @param {Object} errorInfo - Additional error info (e.g., from React componentDidCatch)
 * @param {Object} metadata - Additional context metadata
 */
export const logError = (error, errorInfo, metadata = {}) => {
  try {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', error);
      console.error('Error Info:', errorInfo);
      console.error('Metadata:', metadata);
    }

    // Get user info if available
    const user = auth.currentUser;
    const userInfo = user ? {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName
    } : { uid: 'anonymous' };

    // Log to Firebase Analytics
    logEvent(analytics, 'error', {
      error_name: error.name,
      error_message: error.message,
      error_stack: error.stack,
      component_stack: errorInfo?.componentStack,
      ...metadata,
      timestamp: new Date().toISOString()
    });

    // Log to custom error reporting function
    const logErrorFn = httpsCallable(functions, 'logClientError');
    logErrorFn({
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      errorInfo: errorInfo,
      metadata: {
        ...metadata,
        url: window.location.href,
        userAgent: navigator.userAgent,
        user: userInfo
      }
    });
  } catch (loggingError) {
    // Fallback if error logging fails
    console.error('Error while logging error:', loggingError);
    console.error('Original error:', error);
  }
};

/**
 * Track user identification for analytics
 * @param {string} userId - User ID to track
 * @param {Object} properties - Additional user properties
 */
export const identifyUser = (userId, properties = {}) => {
  if (!userId) return;
  
  // Set user ID for analytics
  setUserId(analytics, userId);
  
  // Set additional user properties
  setUserProperties(analytics, properties);
};

/**
 * Track application event
 * @param {string} eventName - Name of the event to track
 * @param {Object} params - Event parameters
 */
export const trackEvent = (eventName, params = {}) => {
  try {
    logEvent(analytics, eventName, {
      ...params,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error tracking event:', error);
  }
};

/**
 * Track page view
 * @param {string} pageName - Name of the page
 * @param {Object} params - Additional parameters
 */
export const trackPageView = (pageName, params = {}) => {
  trackEvent('page_view', {
    page_name: pageName,
    page_path: window.location.pathname,
    ...params
  });
}; 