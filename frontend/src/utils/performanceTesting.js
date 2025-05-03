/**
 * Performance testing utility
 * Track and measure performance metrics for critical operations
 */

// Storage for measurements
const measurements = {};

/**
 * Start measuring a specific operation
 * @param {string} operationName Name of the operation to measure
 * @returns {void}
 */
export const startMeasurement = (operationName) => {
  if (!measurements[operationName]) {
    measurements[operationName] = {
      starts: [],
      ends: [],
      durations: []
    };
  }
  
  measurements[operationName].starts.push(performance.now());
  
  // Use Performance API when available
  if (window.performance && performance.mark) {
    performance.mark(`${operationName}_start`);
  }
};

/**
 * End measuring a specific operation
 * @param {string} operationName Name of the operation to measure
 * @returns {number} Duration of the operation in milliseconds
 */
export const endMeasurement = (operationName) => {
  if (!measurements[operationName] || measurements[operationName].starts.length === 0) {
    console.warn(`No measurement started for ${operationName}`);
    return 0;
  }
  
  const endTime = performance.now();
  const startTime = measurements[operationName].starts.pop();
  const duration = endTime - startTime;
  
  measurements[operationName].ends.push(endTime);
  measurements[operationName].durations.push(duration);
  
  // Use Performance API when available
  if (window.performance && performance.mark && performance.measure) {
    performance.mark(`${operationName}_end`);
    performance.measure(
      operationName,
      `${operationName}_start`,
      `${operationName}_end`
    );
  }
  
  return duration;
};

/**
 * Get statistics for a specific operation
 * @param {string} operationName Name of the operation
 * @returns {Object} Statistics including min, max, avg, count
 */
export const getPerformanceStats = (operationName) => {
  if (!measurements[operationName] || measurements[operationName].durations.length === 0) {
    return {
      min: 0,
      max: 0,
      avg: 0,
      count: 0
    };
  }
  
  const durations = measurements[operationName].durations;
  
  return {
    min: Math.min(...durations),
    max: Math.max(...durations),
    avg: durations.reduce((sum, val) => sum + val, 0) / durations.length,
    count: durations.length
  };
};

/**
 * Get performance report for all measured operations
 * @returns {Object} Performance report for all operations
 */
export const getPerformanceReport = () => {
  const report = {};
  
  for (const [operationName, data] of Object.entries(measurements)) {
    if (data.durations.length > 0) {
      report[operationName] = getPerformanceStats(operationName);
    }
  }
  
  return report;
};

/**
 * Measure the execution time of a function
 * @param {Function} fn Function to measure
 * @param {string} operationName Name of the operation
 * @returns {Function} Wrapped function that measures execution time
 */
export const measureFunction = (fn, operationName) => {
  return async (...args) => {
    startMeasurement(operationName);
    try {
      const result = await fn(...args);
      const duration = endMeasurement(operationName);
      console.debug(`${operationName} took ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      endMeasurement(operationName);
      throw error;
    }
  };
};

/**
 * Reset all measurements
 * @returns {void}
 */
export const resetMeasurements = () => {
  for (const key of Object.keys(measurements)) {
    delete measurements[key];
  }
}; 