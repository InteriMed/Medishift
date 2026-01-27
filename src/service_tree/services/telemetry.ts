import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';
import { CustomClaims, TelemetryContext } from '../types/context';

let isInitialized = false;
let logRocketSessionUrl: string | null = null;

export const initializeTelemetry = (dsn?: string): void => {
  if (isInitialized) return;

  const environment = process.env.NODE_ENV || 'development';
  const release = process.env.REACT_APP_VERSION || 'unknown';

  Sentry.init({
    dsn: dsn || process.env.REACT_APP_SENTRY_DSN,
    environment,
    release,
    integrations: [
      new BrowserTracing(),
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event, hint) {
      if (event.exception) {
        const error = hint.originalException;
        if (error && typeof error === 'object' && 'message' in error) {
          const errorMessage = String(error.message).toLowerCase();
          if (
            errorMessage.includes('network') ||
            errorMessage.includes('fetch') ||
            errorMessage.includes('timeout')
          ) {
            return null;
          }
        }
      }
      return event;
    },
  });

  isInitialized = true;
};

export const setTelemetryUser = (context: TelemetryContext): void => {
  if (!isInitialized) {
    initializeTelemetry();
  }

  Sentry.setUser({
    id: context.userId,
    email: context.email,
    facilityId: context.facilityId,
    tier: context.tier,
    role: context.role,
  });

  Sentry.setContext('facility', {
    id: context.facilityId,
    tier: context.tier,
  });

  Sentry.setTag('facility_id', context.facilityId);
  Sentry.setTag('user_role', context.role);
  Sentry.setTag('subscription_tier', context.tier);
};

export const clearTelemetryUser = (): void => {
  Sentry.setUser(null);
};

export const captureError = (
  error: Error,
  context?: Record<string, any>,
  level?: Sentry.SeverityLevel
): void => {
  if (!isInitialized) {
    initializeTelemetry();
  }

  if (context) {
    Sentry.setContext('additional_context', context);
  }

  Sentry.captureException(error, {
    level: level || 'error',
  });
};

export const captureMessage = (
  message: string,
  level?: Sentry.SeverityLevel,
  context?: Record<string, any>
): void => {
  if (!isInitialized) {
    initializeTelemetry();
  }

  if (context) {
    Sentry.setContext('message_context', context);
  }

  Sentry.captureMessage(message, level || 'info');
};

export const addBreadcrumb = (
  category: string,
  message: string,
  data?: Record<string, any>,
  level?: Sentry.SeverityLevel
): void => {
  if (!isInitialized) return;

  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level: level || 'info',
    timestamp: Date.now() / 1000,
  });
};

export const startTransaction = (name: string, op: string): Sentry.Transaction | null => {
  if (!isInitialized) return null;

  return Sentry.startTransaction({
    name,
    op,
  });
};

export const withTelemetry = async <T>(
  operationName: string,
  operation: () => Promise<T>,
  context?: Record<string, any>
): Promise<T> => {
  const transaction = startTransaction(operationName, 'function');

  addBreadcrumb('operation', `Starting: ${operationName}`, context);

  try {
    const result = await operation();
    
    if (transaction) {
      transaction.setStatus('ok');
      transaction.finish();
    }
    
    addBreadcrumb('operation', `Completed: ${operationName}`, { success: true });
    
    return result;
  } catch (error) {
    if (transaction) {
      transaction.setStatus('internal_error');
      transaction.finish();
    }

    captureError(
      error as Error,
      {
        operation: operationName,
        ...context,
      },
      'error'
    );

    addBreadcrumb('operation', `Failed: ${operationName}`, {
      error: (error as Error).message,
    }, 'error');

    throw error;
  }
};

export const trackPerformance = (metricName: string, value: number, unit: string = 'ms'): void => {
  if (!isInitialized) return;

  Sentry.setMeasurement(metricName, value, unit);
  
  addBreadcrumb('performance', metricName, {
    value,
    unit,
  });
};

export const initializeLogRocket = (appId?: string): void => {
  if (typeof window === 'undefined') return;

  try {
    const LogRocket = require('logrocket');
    const logRocketAppId = appId || process.env.REACT_APP_LOGROCKET_APP_ID;

    if (!logRocketAppId) {
      console.warn('LogRocket app ID not configured');
      return;
    }

    LogRocket.init(logRocketAppId, {
      network: {
        requestSanitizer: (request: any) => {
          if (request.headers['Authorization']) {
            request.headers['Authorization'] = '[REDACTED]';
          }
          return request;
        },
      },
    });

    LogRocket.getSessionURL((sessionURL: string) => {
      logRocketSessionUrl = sessionURL;
      Sentry.setContext('logrocket', {
        sessionURL,
      });
    });
  } catch (error) {
    console.warn('LogRocket not available:', error);
  }
};

export const identifyUser = (userId: string, traits?: Record<string, any>): void => {
  try {
    const LogRocket = require('logrocket');
    LogRocket.identify(userId, traits);
  } catch (error) {
    console.warn('Could not identify user in LogRocket:', error);
  }
};

export const getSessionReplayUrl = (): string | null => {
  return logRocketSessionUrl;
};

export const trackEvent = (eventName: string, properties?: Record<string, any>): void => {
  try {
    const LogRocket = require('logrocket');
    LogRocket.track(eventName, properties);
  } catch (error) {
    console.warn('Could not track event in LogRocket:', error);
  }

  addBreadcrumb('event', eventName, properties);
};

export const setCustomContext = (key: string, value: Record<string, any>): void => {
  if (!isInitialized) return;
  
  Sentry.setContext(key, value);
};

export const flushTelemetry = async (timeout: number = 2000): Promise<boolean> => {
  if (!isInitialized) return false;

  try {
    await Sentry.flush(timeout);
    return true;
  } catch (error) {
    console.error('Failed to flush telemetry:', error);
    return false;
  }
};

