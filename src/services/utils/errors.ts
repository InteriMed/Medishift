const ERROR_MESSAGES: Record<string, string> = {
  'auth/user-not-found': 'No account found with this email address',
  'auth/wrong-password': 'Incorrect password',
  'auth/email-already-in-use': 'An account with this email already exists',
  'auth/weak-password': 'Password should be at least 6 characters',
  'auth/invalid-email': 'Please enter a valid email address',
  'auth/account-exists-with-different-credential': 'An account already exists with the same email address but different sign-in credentials',
  'auth/operation-not-allowed': 'This operation is not allowed',
  'auth/requires-recent-login': 'Please sign in again to complete this operation',
  'permission-denied': 'You don\'t have permission to access this data',
  'not-found': 'The requested document was not found',
  'already-exists': 'This document already exists',
  'functions/unauthenticated': 'You must be signed in to perform this action',
  'functions/invalid-argument': 'Invalid data was provided to this operation',
  'functions/permission-denied': 'You don\'t have permission to perform this action',
  'network-error': 'Network connection error. Please check your internet connection',
  'offline': 'You are currently offline. This action will be completed when you\'re back online',
  'default': 'An unexpected error occurred. Please try again later'
};

interface FormattedError {
  code: string;
  message: string;
  originalError: Error;
}

export const formatFirebaseError = (error: any): FormattedError => {
  const errorCode = error.code || 'default';

  console.error('Firebase Error:', error);

  return {
    code: errorCode,
    message: ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.default,
    originalError: error
  };
};

export const handleFirebaseOperation = async <T>(
  operation: () => Promise<T>,
  onSuccess?: (result: T) => void,
  onError?: (error: FormattedError) => void
): Promise<T | { error: FormattedError }> => {
  try {
    const result = await operation();
    if (onSuccess) {
      onSuccess(result);
    }
    return result;
  } catch (error: any) {
    const formattedError = formatFirebaseError(error);
    if (onError) {
      onError(formattedError);
    }
    return { error: formattedError };
  }
};

export const isNetworkError = (error: any): boolean => {
  if (!error) return false;

  return (
    error.code === 'network-error' ||
    error.code === 'offline' ||
    error.message?.includes('network') ||
    error.message?.includes('offline') ||
    error.message?.includes('connection') ||
    error.message?.includes('client is offline')
  );
};

export const getFirebaseErrorMessage = (error: any): string => {
  const errorCode = error.code || error.message;

  switch (errorCode) {
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
    case 'permission-denied':
      return 'You do not have permission to perform this action.';
    case 'not-found':
      return 'The requested document was not found.';
    case 'storage/unauthorized':
      return 'Not authorized to access this file.';
    default:
      return error.message || 'An unknown error occurred. Please try again.';
  }
};

export const logError = (error: Error, context: string = 'unknown'): void => {
  console.error(`[${context}]`, error);
};

export const handleError = (error: any, context: string, notify?: ((message: string) => void) | null): string => {
  logError(error, context);

  const message = getFirebaseErrorMessage(error);

  if (notify && typeof notify === 'function') {
    notify(message);
  }

  return message;
};

export default handleError;

