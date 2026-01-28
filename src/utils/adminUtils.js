import { httpsCallable, getFunctions } from 'firebase/functions';
import { functions } from '../services/services/firebase';

export const impersonateUser = async (targetUserId) => {
  try {
    const startImpersonation = httpsCallable(functions, 'startImpersonation');
    const result = await startImpersonation({ targetUserId });
    
    if (result.data && result.data.success) {
      return result.data;
    } else {
      throw new Error(result.data?.message || 'Failed to start impersonation');
    }
  } catch (error) {
    console.error('Error in impersonateUser:', error);
    throw error;
  }
};

export const stopImpersonation = async (sessionId) => {
  try {
    const stopImpersonationFn = httpsCallable(functions, 'stopImpersonation');
    const result = await stopImpersonationFn({ sessionId });
    
    if (result.data && result.data.success) {
      return result.data;
    } else {
      throw new Error(result.data?.message || 'Failed to stop impersonation');
    }
  } catch (error) {
    console.error('Error in stopImpersonation:', error);
    throw error;
  }
};

export const validateImpersonationSession = async (sessionId) => {
  try {
    const validateSessionFn = httpsCallable(functions, 'validateImpersonationSession');
    const result = await validateSessionFn({ sessionId });
    
    return result.data || { isValid: false, reason: 'Unknown error' };
  } catch (error) {
    console.error('Error in validateImpersonationSession:', error);
    return { isValid: false, reason: error.message || 'Validation error' };
  }
};

