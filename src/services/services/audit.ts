import { db } from './firebase';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { AuditLogPayload } from '../types/context';

const SYSTEM_LOGS_COLLECTION = 'system_logs';

export const logAudit = async (
  actionId: string,
  status: 'START' | 'SUCCESS' | 'ERROR',
  metadata?: Record<string, any>
): Promise<void> => {
  try {
    const payload: Omit<AuditLogPayload, 'timestamp'> & { timestamp: ReturnType<typeof serverTimestamp> } = {
      userId: metadata?.userId || 'SYSTEM',
      facilityId: metadata?.facilityId || 'NONE',
      actionId,
      status,
      ipAddress: metadata?.ipAddress || await getClientIP(),
      metadata: metadata || {},
      timestamp: serverTimestamp(),
    };

    if (status === 'ERROR' && metadata?.error) {
      payload.error = typeof metadata.error === 'string' 
        ? metadata.error 
        : metadata.error.message || JSON.stringify(metadata.error);
    }

    await addDoc(collection(db, SYSTEM_LOGS_COLLECTION), payload);
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
};

export const logUserAction = async (
  userId: string,
  facilityId: string,
  actionId: string,
  status: 'START' | 'SUCCESS' | 'ERROR',
  metadata?: Record<string, any>
): Promise<void> => {
  await logAudit(actionId, status, {
    ...metadata,
    userId,
    facilityId,
  });
};

export const logSystemEvent = async (
  eventName: string,
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL',
  details: Record<string, any>
): Promise<void> => {
  try {
    const logPayload = {
      eventName,
      severity,
      details,
      timestamp: serverTimestamp(),
      source: 'FRONTEND',
    };

    await addDoc(collection(db, 'system_events'), logPayload);
  } catch (error) {
    console.error('Failed to log system event:', error);
  }
};

const getClientIP = async (): Promise<string> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || 'UNKNOWN';
  } catch {
    return 'UNKNOWN';
  }
};

export const createAuditLogger = (userId: string, facilityId: string) => {
  return async (
    actionId: string,
    status: 'START' | 'SUCCESS' | 'ERROR',
    metadata?: Record<string, any>
  ): Promise<void> => {
    await logUserAction(userId, facilityId, actionId, status, metadata);
  };
};

export const logSecurityEvent = async (
  eventType: 'LOGIN' | 'LOGOUT' | 'FAILED_LOGIN' | 'PERMISSION_DENIED' | 'TOKEN_REFRESH',
  userId: string,
  metadata?: Record<string, any>
): Promise<void> => {
  try {
    const securityLog = {
      eventType,
      userId,
      timestamp: serverTimestamp(),
      ipAddress: await getClientIP(),
      userAgent: navigator.userAgent,
      metadata: metadata || {},
    };

    await addDoc(collection(db, 'security_logs'), securityLog);
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
};

export const logDataAccess = async (
  userId: string,
  facilityId: string,
  resourceType: string,
  resourceId: string,
  action: 'READ' | 'WRITE' | 'DELETE',
  metadata?: Record<string, any>
): Promise<void> => {
  try {
    const accessLog = {
      userId,
      facilityId,
      resourceType,
      resourceId,
      action,
      timestamp: serverTimestamp(),
      metadata: metadata || {},
    };

    await addDoc(collection(db, 'data_access_logs'), accessLog);
  } catch (error) {
    console.error('Failed to log data access:', error);
  }
};

