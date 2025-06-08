// Performance Monitoring Utility for Calendar System
import { useEffect, useRef } from 'react';

/**
 * Performance metrics collection and monitoring
 */
class CalendarPerformanceMonitor {
  constructor() {
    this.metrics = {
      renderTimes: [],
      eventOperations: [],
      memoryUsage: [],
      userInteractions: [],
      networkRequests: []
    };
    
    this.startTime = performance.now();
    this.isProduction = process.env.NODE_ENV === 'production';
    
    // Initialize performance observer for long tasks
    if (typeof PerformanceObserver !== 'undefined') {
      this.initLongTaskObserver();
    }
  }

  /**
   * Initialize observer for long tasks (>50ms)
   */
  initLongTaskObserver() {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // Tasks longer than 50ms
            this.logMetric('longTask', {
              duration: entry.duration,
              startTime: entry.startTime,
              type: entry.name
            });
          }
        }
      });
      
      observer.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      console.warn('Performance observer not supported:', error);
    }
  }

  /**
   * Log performance metric
   */
  logMetric(type, data) {
    const timestamp = performance.now() - this.startTime;
    const metric = {
      type,
      timestamp,
      data,
      memoryUsage: this.getMemoryUsage()
    };

    if (this.metrics[type]) {
      this.metrics[type].push(metric);
      
      // Limit array size to prevent memory leaks
      if (this.metrics[type].length > 1000) {
        this.metrics[type] = this.metrics[type].slice(-500);
      }
    }

    // Log to console in development
    if (!this.isProduction) {
      console.log(`📊 Calendar Performance [${type}]:`, metric);
    }
  }

  /**
   * Get memory usage information
   */
  getMemoryUsage() {
    if (performance.memory) {
      return {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
      };
    }
    return null;
  }

  /**
   * Track render performance
   */
  trackRender(componentName, renderTime) {
    this.logMetric('renderTimes', {
      component: componentName,
      duration: renderTime,
      isSlowRender: renderTime > 16 // 60fps threshold
    });
  }

  /**
   * Track event operations (CRUD)
   */
  trackEventOperation(operation, eventCount, duration) {
    this.logMetric('eventOperations', {
      operation,
      eventCount,
      duration,
      eventsPerMs: eventCount / duration
    });
  }

  /**
   * Track user interactions
   */
  trackUserInteraction(interaction, target, duration) {
    this.logMetric('userInteractions', {
      interaction,
      target,
      duration,
      isSlowInteraction: duration > 100
    });
  }

  /**
   * Track network requests
   */
  trackNetworkRequest(url, method, duration, success) {
    this.logMetric('networkRequests', {
      url,
      method,
      duration,
      success,
      isSlowRequest: duration > 1000
    });
  }

  /**
   * Get performance summary
   */
  getSummary() {
    const now = performance.now() - this.startTime;
    
    return {
      sessionDuration: Math.round(now),
      totalRenders: this.metrics.renderTimes.length,
      slowRenders: this.metrics.renderTimes.filter(r => r.data.isSlowRender).length,
      averageRenderTime: this.getAverageMetric('renderTimes', 'duration'),
      totalEventOperations: this.metrics.eventOperations.length,
      averageEventOpTime: this.getAverageMetric('eventOperations', 'duration'),
      userInteractions: this.metrics.userInteractions.length,
      slowInteractions: this.metrics.userInteractions.filter(i => i.data.isSlowInteraction).length,
      networkRequests: this.metrics.networkRequests.length,
      failedRequests: this.metrics.networkRequests.filter(r => !r.data.success).length,
      currentMemoryUsage: this.getMemoryUsage()
    };
  }

  /**
   * Get average for a specific metric
   */
  getAverageMetric(type, field) {
    const metrics = this.metrics[type];
    if (!metrics || metrics.length === 0) return 0;
    
    const sum = metrics.reduce((acc, metric) => acc + metric.data[field], 0);
    return Math.round(sum / metrics.length * 100) / 100;
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics() {
    return {
      summary: this.getSummary(),
      detailed: this.metrics,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Clear metrics
   */
  clearMetrics() {
    Object.keys(this.metrics).forEach(key => {
      this.metrics[key] = [];
    });
  }
}

// Global instance
const performanceMonitor = new CalendarPerformanceMonitor();

/**
 * React hook for tracking component render performance
 */
export const useRenderPerformance = (componentName) => {
  const renderStartTime = useRef(performance.now());

  useEffect(() => {
    const renderTime = performance.now() - renderStartTime.current;
    performanceMonitor.trackRender(componentName, renderTime);
  });

  // Update start time for each render
  renderStartTime.current = performance.now();
};

/**
 * React hook for tracking user interactions
 */
export const useInteractionTracking = () => {
  const trackInteraction = (interaction, target = 'unknown') => {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      performanceMonitor.trackUserInteraction(interaction, target, duration);
    };
  };

  return { trackInteraction };
};

/**
 * Higher-order component for automatic performance tracking
 */
export const withPerformanceTracking = (WrappedComponent, componentName) => {
  return function PerformanceTrackedComponent(props) {
    useRenderPerformance(componentName);
    return <WrappedComponent {...props} />;
  };
};

/**
 * Utility to measure function execution time
 */
export const measureExecutionTime = (fn, label) => {
  return (...args) => {
    const startTime = performance.now();
    const result = fn.apply(this, args);
    const duration = performance.now() - startTime;
    
    console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
    return result;
  };
};

/**
 * Debounced performance logger to prevent spam
 */
let logTimeout;
export const debouncedPerformanceLog = (type, data, delay = 1000) => {
  clearTimeout(logTimeout);
  logTimeout = setTimeout(() => {
    performanceMonitor.logMetric(type, data);
  }, delay);
};

/**
 * Performance budget checker
 */
export const checkPerformanceBudget = () => {
  const summary = performanceMonitor.getSummary();
  const budgets = {
    maxRenderTime: 16, // 60fps
    maxInteractionTime: 100,
    maxMemoryUsage: 50, // MB
    maxSlowRenders: 10
  };

  const violations = [];
  
  if (summary.averageRenderTime > budgets.maxRenderTime) {
    violations.push(`Average render time ${summary.averageRenderTime}ms exceeds budget ${budgets.maxRenderTime}ms`);
  }
  
  if (summary.slowRenders > budgets.maxSlowRenders) {
    violations.push(`Slow renders ${summary.slowRenders} exceeds budget ${budgets.maxSlowRenders}`);
  }
  
  if (summary.currentMemoryUsage?.used > budgets.maxMemoryUsage) {
    violations.push(`Memory usage ${summary.currentMemoryUsage.used}MB exceeds budget ${budgets.maxMemoryUsage}MB`);
  }

  if (violations.length > 0) {
    console.warn('🚨 Performance Budget Violations:', violations);
  } else {
    console.log('✅ Performance budget met');
  }

  return {
    passed: violations.length === 0,
    violations,
    summary
  };
};

// Export performance monitor instance and utilities
export {
  performanceMonitor,
  CalendarPerformanceMonitor
};

export default performanceMonitor; 