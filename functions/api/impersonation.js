const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const { logAuditEvent, AUDIT_EVENT_TYPES } = require('../services/auditLog');

const IMPERSONATION_SESSION_EXPIRY_MINUTES = 30;
const IMPERSONATION_COOKIE_NAME = 'medishift_impersonation_session';

const ADMIN_ROLES = {
  SUPER_ADMIN: 'super_admin',
  OPS_MANAGER: 'ops_manager',
  SUPPORT: 'support'
};

const PERMISSIONS = {
  IMPERSONATE_USERS: 'impersonate_users'
};

const ROLE_PERMISSIONS = {
  [ADMIN_ROLES.SUPER_ADMIN]: [PERMISSIONS.IMPERSONATE_USERS],
  [ADMIN_ROLES.OPS_MANAGER]: [PERMISSIONS.IMPERSONATE_USERS],
  [ADMIN_ROLES.SUPPORT]: [PERMISSIONS.IMPERSONATE_USERS]
};

const hasPermission = (adminRoles, permission) => {
  if (!adminRoles || !Array.isArray(adminRoles)) return false;
  const validAdminRoles = adminRoles.filter(role => Object.values(ADMIN_ROLES).includes(role));
  for (const role of validAdminRoles) {
    const rolePermissions = ROLE_PERMISSIONS[role] || [];
    if (rolePermissions.includes(permission)) {
      return true;
    }
  }
  return false;
};

const extractMetadata = (req) => {
  const metadata = {};
  if (req) {
    metadata.ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress;
    metadata.userAgent = req.headers['user-agent'];
    metadata.referer = req.headers['referer'];
  }
  return metadata;
};

exports.startImpersonation = onCall({ database: 'medishift', cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in to impersonate users');
  }

  const adminId = request.auth.uid;
  const { targetUserId } = request.data;

  if (!targetUserId) {
    throw new HttpsError('invalid-argument', 'Target user ID is required');
  }

  if (adminId === targetUserId) {
    throw new HttpsError('invalid-argument', 'You cannot impersonate yourself');
  }

  try {
    const db = admin.firestore();

    const adminDoc = await db.collection('admins').doc(adminId).get();
    if (!adminDoc.exists || adminDoc.data().isActive === false) {
      throw new HttpsError('permission-denied', 'You do not have permission to impersonate users');
    }

    const adminData = adminDoc.data();
    const adminRoles = adminData.roles || [];

    if (!hasPermission(adminRoles, PERMISSIONS.IMPERSONATE_USERS)) {
      throw new HttpsError('permission-denied', 'You do not have permission to impersonate users');
    }

    const targetUserDoc = await db.collection('users').doc(targetUserId).get();
    if (!targetUserDoc.exists) {
      throw new HttpsError('not-found', 'Target user not found');
    }

    const targetUserData = targetUserDoc.data();

    const sessionId = `impersonation_${adminId}_${Date.now()}`;
    const expiresAt = Date.now() + (IMPERSONATION_SESSION_EXPIRY_MINUTES * 60 * 1000);

    const impersonationSession = {
      sessionId,
      adminId,
      targetUserId,
      adminEmail: adminData.email || adminData.mainEmail,
      adminName: adminData.displayName || `${adminData.firstName || ''} ${adminData.lastName || ''}`.trim(),
      targetUserEmail: targetUserData.email || targetUserData.mainEmail,
      targetUserName: targetUserData.displayName || `${targetUserData.firstName || ''} ${targetUserData.lastName || ''}`.trim(),
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromMillis(expiresAt),
      isActive: true,
      metadata: extractMetadata(request.rawRequest)
    };

    await db.collection('impersonation_sessions').doc(sessionId).set(impersonationSession);

    await logAuditEvent({
      eventType: AUDIT_EVENT_TYPES.ADMIN_USER_IMPERSONATED,
      userId: adminId,
      action: `Started impersonation session for user ${targetUserData.email || targetUserId}`,
      resource: {
        type: 'user',
        id: targetUserId,
        name: targetUserData.displayName || targetUserData.email
      },
      details: {
        sessionId,
        adminEmail: adminData.email,
        targetUserEmail: targetUserData.email,
        expiresAt: new Date(expiresAt).toISOString()
      },
      metadata: extractMetadata(request.rawRequest),
      success: true
    });

    logger.info(`[IMPERSONATION] Admin ${adminId} started impersonation session for user ${targetUserId}`);

    return {
      success: true,
      sessionId,
      targetUser: {
        uid: targetUserId,
        email: targetUserData.email || targetUserData.mainEmail,
        displayName: targetUserData.displayName || `${targetUserData.firstName || ''} ${targetUserData.lastName || ''}`.trim(),
        firstName: targetUserData.firstName,
        lastName: targetUserData.lastName,
        roles: targetUserData.roles || [],
        photoURL: targetUserData.photoURL || targetUserData.picture
      },
      expiresAt: new Date(expiresAt).toISOString(),
      expiresInMinutes: IMPERSONATION_SESSION_EXPIRY_MINUTES
    };
  } catch (error) {
    logger.error('[IMPERSONATION] Error starting impersonation:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', error.message || 'Failed to start impersonation');
  }
});

exports.stopImpersonation = onCall({ database: 'medishift', cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in');
  }

  const { sessionId } = request.data;

  if (!sessionId) {
    throw new HttpsError('invalid-argument', 'Session ID is required');
  }

  try {
    const db = admin.firestore();
    const sessionDoc = await db.collection('impersonation_sessions').doc(sessionId).get();

    if (!sessionDoc.exists) {
      throw new HttpsError('not-found', 'Impersonation session not found');
    }

    const sessionData = sessionDoc.data();

    if (sessionData.adminId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'You can only stop your own impersonation sessions');
    }

    if (!sessionData.isActive) {
      throw new HttpsError('failed-precondition', 'This impersonation session is already inactive');
    }

    const endedAt = admin.firestore.FieldValue.serverTimestamp();
    await db.collection('impersonation_sessions').doc(sessionId).update({
      isActive: false,
      endedAt,
      endedBy: request.auth.uid
    });

    await logAuditEvent({
      eventType: AUDIT_EVENT_TYPES.ADMIN_USER_IMPERSONATED,
      userId: sessionData.adminId,
      action: `Ended impersonation session for user ${sessionData.targetUserEmail || sessionData.targetUserId}`,
      resource: {
        type: 'user',
        id: sessionData.targetUserId,
        name: sessionData.targetUserName
      },
      details: {
        sessionId,
        duration: sessionData.startedAt ? Math.round((Date.now() - sessionData.startedAt.toMillis()) / 1000 / 60) : null
      },
      metadata: extractMetadata(request.rawRequest),
      success: true
    });

    logger.info(`[IMPERSONATION] Session ${sessionId} ended by admin ${request.auth.uid}`);

    return {
      success: true,
      message: 'Impersonation session ended successfully'
    };
  } catch (error) {
    logger.error('[IMPERSONATION] Error stopping impersonation:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', error.message || 'Failed to stop impersonation');
  }
});

exports.getImpersonationSession = onCall({ database: 'medishift', cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in');
  }

  const { sessionId } = request.data;

  if (!sessionId) {
    throw new HttpsError('invalid-argument', 'Session ID is required');
  }

  try {
    const db = admin.firestore();
    const sessionDoc = await db.collection('impersonation_sessions').doc(sessionId).get();

    if (!sessionDoc.exists) {
      throw new HttpsError('not-found', 'Impersonation session not found');
    }

    const sessionData = sessionDoc.data();

    if (sessionData.adminId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'You can only view your own impersonation sessions');
    }

    if (!sessionData.isActive) {
      return {
        success: true,
        session: null,
        message: 'Session is no longer active'
      };
    }

    const now = Date.now();
    const expiresAt = sessionData.expiresAt.toMillis();

    if (now >= expiresAt) {
      await db.collection('impersonation_sessions').doc(sessionId).update({
        isActive: false,
        endedAt: admin.firestore.FieldValue.serverTimestamp(),
        endedBy: 'system'
      });

      return {
        success: true,
        session: null,
        message: 'Session has expired'
      };
    }

    const remainingMinutes = Math.max(0, Math.floor((expiresAt - now) / 1000 / 60));

    return {
      success: true,
      session: {
        sessionId: sessionData.sessionId,
        adminId: sessionData.adminId,
        targetUserId: sessionData.targetUserId,
        adminName: sessionData.adminName,
        targetUserName: sessionData.targetUserName,
        startedAt: sessionData.startedAt.toDate().toISOString(),
        expiresAt: sessionData.expiresAt.toDate().toISOString(),
        remainingMinutes
      }
    };
  } catch (error) {
    logger.error('[IMPERSONATION] Error getting session:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', error.message || 'Failed to get impersonation session');
  }
});

exports.validateImpersonationSession = onCall({ database: 'medishift', cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in');
  }

  const { sessionId } = request.data;

  if (!sessionId) {
    return { isValid: false, reason: 'No session ID provided' };
  }

  try {
    const db = admin.firestore();
    const sessionDoc = await db.collection('impersonation_sessions').doc(sessionId).get();

    if (!sessionDoc.exists) {
      return { isValid: false, reason: 'Session not found' };
    }

    const sessionData = sessionDoc.data();

    if (!sessionData.isActive) {
      return { isValid: false, reason: 'Session is inactive' };
    }

    if (sessionData.adminId !== request.auth.uid) {
      return { isValid: false, reason: 'Session does not belong to current user' };
    }

    const now = Date.now();
    const expiresAt = sessionData.expiresAt.toMillis();

    if (now >= expiresAt) {
      await db.collection('impersonation_sessions').doc(sessionId).update({
        isActive: false,
        endedAt: admin.firestore.FieldValue.serverTimestamp(),
        endedBy: 'system'
      });

      return { isValid: false, reason: 'Session has expired' };
    }

    return {
      isValid: true,
      session: {
        sessionId: sessionData.sessionId,
        targetUserId: sessionData.targetUserId,
        targetUserName: sessionData.targetUserName,
        remainingMinutes: Math.max(0, Math.floor((expiresAt - now) / 1000 / 60))
      }
    };
  } catch (error) {
    logger.error('[IMPERSONATION] Error validating session:', error);
    return { isValid: false, reason: 'Validation error: ' + error.message };
  }
});

