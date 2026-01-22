export const IMPERSONATION_WRITE_MODE = {
  READ_ONLY: 'read_only',
  LIMITED_WRITE: 'limited_write',
  FULL_WRITE: 'full_write'
};

const DEFAULT_WRITE_MODE = IMPERSONATION_WRITE_MODE.READ_ONLY;

export const checkImpersonationWritePermission = (isImpersonating, writeMode = DEFAULT_WRITE_MODE) => {
  if (!isImpersonating) {
    return { allowed: true };
  }

  if (writeMode === IMPERSONATION_WRITE_MODE.READ_ONLY) {
    return {
      allowed: false,
      reason: 'Write operations are disabled in Ghost Mode (Read-Only mode).',
      mode: 'read_only'
    };
  }

  if (writeMode === IMPERSONATION_WRITE_MODE.LIMITED_WRITE) {
    return {
      allowed: true,
      warning: 'You are performing this action in Ghost Mode. This will be logged.',
      mode: 'limited_write'
    };
  }

  return { allowed: true, mode: 'full_write' };
};

export const withImpersonationProtection = (operation, isImpersonating, writeMode = DEFAULT_WRITE_MODE) => {
  return async (...args) => {
    if (isImpersonating && writeMode === IMPERSONATION_WRITE_MODE.READ_ONLY) {
      throw new Error('Write operations are disabled in Ghost Mode. Please exit Ghost Mode to perform this action.');
    }

    if (isImpersonating && writeMode === IMPERSONATION_WRITE_MODE.LIMITED_WRITE) {
      console.warn('[IMPERSONATION] Performing write operation in Ghost Mode - this will be logged');
    }

    return operation(...args);
  };
};

export const logImpersonationAction = async (action, impersonationContext, details = {}) => {
  const { isImpersonating, impersonationSession, originalUserProfile, impersonatedUser } = impersonationContext || {};
  
  if (!isImpersonating) {
    return;
  }

  try {
    const { logAdminAction, ADMIN_AUDIT_EVENTS } = await import('./auditLogger');
    
    await logAdminAction({
      eventType: ADMIN_AUDIT_EVENTS.USER_IMPERSONATED,
      action: `[Ghost Mode] ${action}`,
      resource: {
        type: 'impersonation_action',
        id: impersonationSession?.sessionId,
        name: action
      },
      details: {
        ...details,
        performedBy: originalUserProfile?.uid || originalUserProfile?.id,
        onBehalfOf: impersonatedUser?.uid || impersonatedUser?.id,
        sessionId: impersonationSession?.sessionId,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[IMPERSONATION] Error logging action:', error);
  }
};

