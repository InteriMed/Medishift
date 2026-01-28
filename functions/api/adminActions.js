const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { verifyAdminAccess, ADMIN_PERMISSIONS } = require('../middleware/verifyAdminAccess');
const { logAuditEvent, AUDIT_EVENT_TYPES } = require('../services/auditLog');
const { checkRateLimit } = require('../middleware/rateLimit');
const { logger } = require('firebase-functions');

async function provisionTenant(input, context) {
  const { organizationName, plan, contactEmail } = input;

  if (!organizationName || !plan || !contactEmail) {
    throw new HttpsError('invalid-argument', 'Missing required fields');
  }

  const db = admin.firestore();
  const organizationId = `org_${Date.now()}`;

  try {
    await db.collection('organizations').doc(organizationId).set({
      name: organizationName,
      plan,
      contactEmail,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: context.userId,
      status: 'active',
      settings: {
        maxFacilities: plan === 'enterprise' ? 50 : plan === 'pro' ? 10 : 3,
        maxUsers: plan === 'enterprise' ? 1000 : plan === 'pro' ? 100 : 20,
      }
    });

    logger.info(`[ADMIN] Organization ${organizationId} provisioned by ${context.userId}`);

    return {
      success: true,
      organizationId,
      name: organizationName,
      plan
    };
  } catch (error) {
    logger.error('[ADMIN] Error provisioning tenant:', error);
    throw new HttpsError('internal', 'Failed to provision tenant');
  }
}

async function manageBilling(input, context) {
  const { organizationId, action, reason } = input;

  if (!organizationId || !action) {
    throw new HttpsError('invalid-argument', 'Missing required fields');
  }

  const validActions = ['activate', 'suspend', 'cancel', 'upgrade', 'downgrade'];
  if (!validActions.includes(action)) {
    throw new HttpsError('invalid-argument', `Invalid action. Must be one of: ${validActions.join(', ')}`);
  }

  const db = admin.firestore();

  try {
    const orgDoc = await db.collection('organizations').doc(organizationId).get();
    if (!orgDoc.exists()) {
      throw new HttpsError('not-found', 'Organization not found');
    }

    const updateData = {
      'billing.status': action === 'cancel' ? 'cancelled' : action === 'suspend' ? 'suspended' : 'active',
      'billing.lastModifiedAt': admin.firestore.FieldValue.serverTimestamp(),
      'billing.lastModifiedBy': context.userId,
      'billing.lastAction': action
    };

    if (reason) {
      updateData['billing.lastActionReason'] = reason;
    }

    await db.collection('organizations').doc(organizationId).update(updateData);

    logger.info(`[ADMIN] Billing ${action} for ${organizationId} by ${context.userId}`);

    return {
      success: true,
      organizationId,
      action,
      newStatus: updateData['billing.status']
    };
  } catch (error) {
    logger.error('[ADMIN] Error managing billing:', error);
    throw new HttpsError('internal', 'Failed to manage billing');
  }
}

async function broadcastSystemAlert(input, context) {
  const { title, message, severity, targetAudience } = input;

  if (!title || !message || !severity) {
    throw new HttpsError('invalid-argument', 'Missing required fields');
  }

  const validSeverities = ['info', 'warning', 'critical'];
  if (!validSeverities.includes(severity)) {
    throw new HttpsError('invalid-argument', `Invalid severity. Must be one of: ${validSeverities.join(', ')}`);
  }

  const db = admin.firestore();
  const alertId = `alert_${Date.now()}`;

  try {
    await db.collection('system_alerts').doc(alertId).set({
      title,
      message,
      severity,
      targetAudience: targetAudience || 'all',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: context.userId,
      isActive: true,
      dismissedBy: []
    });

    logger.info(`[ADMIN] System alert ${alertId} broadcast by ${context.userId}`);

    return {
      success: true,
      alertId,
      title,
      severity
    };
  } catch (error) {
    logger.error('[ADMIN] Error broadcasting alert:', error);
    throw new HttpsError('internal', 'Failed to broadcast system alert');
  }
}

const ADMIN_ACTION_HANDLERS = {
  'admin.provision_tenant': {
    handler: provisionTenant,
    permission: ADMIN_PERMISSIONS.PROVISION_TENANT,
    riskLevel: 'CRITICAL'
  },
  'admin.manage_billing': {
    handler: manageBilling,
    permission: ADMIN_PERMISSIONS.MANAGE_BILLING,
    riskLevel: 'CRITICAL'
  },
  'admin.broadcast_system_alert': {
    handler: broadcastSystemAlert,
    permission: ADMIN_PERMISSIONS.SEND_NOTIFICATIONS,
    riskLevel: 'HIGH'
  }
};

exports.executeAdminAction = onCall(async (request) => {
  const { actionId, input } = request.data;

  if (!actionId) {
    throw new HttpsError('invalid-argument', 'Action ID is required');
  }

  const actionConfig = ADMIN_ACTION_HANDLERS[actionId];
  if (!actionConfig) {
    throw new HttpsError('not-found', `Action ${actionId} not found or not available`);
  }

  const adminVerification = await verifyAdminAccess(request, actionConfig.permission);

  const rateLimitContext = {
    ipAddress: request.rawRequest?.ip || 'unknown',
    userAgent: request.rawRequest?.headers?.['user-agent'] || 'unknown'
  };

  await checkRateLimit(adminVerification.userId, actionId, rateLimitContext);

  await logAuditEvent({
    eventType: AUDIT_EVENT_TYPES.ADMIN_ACTION_START,
    userId: adminVerification.userId,
    action: `Started admin action: ${actionId}`,
    resource: {
      type: 'admin_action',
      id: actionId
    },
    details: {
      input,
      riskLevel: actionConfig.riskLevel
    },
    metadata: {
      ipAddress: request.rawRequest?.ip || 'unknown',
      userAgent: request.rawRequest?.headers?.['user-agent'] || 'unknown'
    },
    success: true
  });

  try {
    const context = {
      userId: adminVerification.userId,
      adminData: adminVerification.adminData,
      permissions: adminVerification.permissions,
      isSuperAdmin: adminVerification.isSuperAdmin,
      ipAddress: request.rawRequest?.ip || 'unknown'
    };

    const result = await actionConfig.handler(input, context);

    await logAuditEvent({
      eventType: AUDIT_EVENT_TYPES.ADMIN_ACTION_SUCCESS,
      userId: adminVerification.userId,
      action: `Completed admin action: ${actionId}`,
      resource: {
        type: 'admin_action',
        id: actionId
      },
      details: {
        resultId: result?.id || result?.organizationId || result?.alertId,
        result
      },
      metadata: {
        ipAddress: request.rawRequest?.ip || 'unknown'
      },
      success: true
    });

    return {
      success: true,
      data: result
    };
  } catch (error) {
    await logAuditEvent({
      eventType: AUDIT_EVENT_TYPES.ADMIN_ACTION_ERROR,
      userId: adminVerification.userId,
      action: `Failed admin action: ${actionId}`,
      resource: {
        type: 'admin_action',
        id: actionId
      },
      details: {
        error: error.message
      },
      metadata: {
        ipAddress: request.rawRequest?.ip || 'unknown'
      },
      success: false
    });

    logger.error(`[ADMIN] Error executing action ${actionId}:`, error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError('internal', `Failed to execute ${actionId}: ${error.message}`);
  }
});

module.exports = {
  executeAdminAction: exports.executeAdminAction,
  provisionTenant,
  manageBilling,
  broadcastSystemAlert
};

