import { getPerformance } from 'firebase/performance';
import { app } from './firebaseService';

// Initialize Firebase Performance Monitoring
const perf = getPerformance(app);

/**
 * Track a custom trace for performance monitoring
 * @param {string} traceName - Name of the trace to create
 * @param {Function} callback - Function to execute and track
 * @param {Object} metrics - Custom metrics to record with the trace
 * @returns {Promise} Result of the callback function
 */
export const trackPerformance = async (traceName, callback, metrics = {}) => {
  // Start the trace
  const trace = perf.trace(traceName);
  trace.start();
  
  // Add custom metrics if provided
  Object.keys(metrics).forEach(key => {
    trace.putMetric(key, metrics[key]);
  });
  
  try {
    // Execute the callback function
    const result = await callback();
    
    // Stop the trace
    trace.stop();
    
    return result;
  } catch (error) {
    // Record the error and stop the trace
    trace.putMetric('error_count', 1);
    trace.stop();
    
    // Re-throw the error for handling elsewhere
    throw error;
  }
};

/**
 * Track Firestore query performance
 * @param {string} collectionName - Name of the Firestore collection
 * @param {string} queryType - Type of query (e.g., 'list', 'get', 'create')
 * @param {Function} queryFn - The query function to execute
 * @returns {Promise} Result of the query
 */
export const trackFirestoreQuery = async (collectionName, queryType, queryFn) => {
  return trackPerformance(`firestore_${collectionName}_${queryType}`, queryFn, {
    collection_size: 0, // This will be updated in the callback if possible
    query_type: queryType === 'list' ? 1 : 0
  });
};

/**
 * Track authentication operation performance
 * @param {string} operationType - Type of auth operation (e.g., 'signIn', 'signUp')
 * @param {Function} operationFn - The operation function to execute
 * @returns {Promise} Result of the operation
 */
export const trackAuthOperation = async (operationType, operationFn) => {
  return trackPerformance(`auth_${operationType}`, operationFn);
};

export default perf; 