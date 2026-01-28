const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { verifyAdminAccess, ADMIN_PERMISSIONS } = require('../middleware/verifyAdminAccess');
const { logAuditEvent, AUDIT_EVENT_TYPES } = require('../services/auditLog');
const { checkRateLimit } = require('../middleware/rateLimit');
const { logger } = require('firebase-functions');

async function bulkExport(input, context) {
  const { facilityIds, period, format = 'CSV_GENERIC' } = input;

  if (!facilityIds || !Array.isArray(facilityIds) || facilityIds.length === 0) {
    throw new HttpsError('invalid-argument', 'facilityIds array is required');
  }

  if (!period) {
    throw new HttpsError('invalid-argument', 'period is required');
  }

  const db = admin.firestore();

  try {
    const userDoc = await db.collection('users').doc(context.userId).get();
    
    if (!userDoc.exists()) {
      throw new HttpsError('not-found', 'User not found');
    }

    const linkedFacilities = userDoc.data().linkedFacilities || [];

    const unauthorizedFacilities = facilityIds.filter(
      fid => !linkedFacilities.includes(fid)
    );

    if (unauthorizedFacilities.length > 0) {
      throw new HttpsError(
        'permission-denied',
        `Access denied to facilities: ${unauthorizedFacilities.join(', ')}`
      );
    }

    const exportData = [];

    for (const facilityId of facilityIds) {
      const payrollSnapshot = await db.collection('payroll_period_data')
        .where('facilityId', '==', facilityId)
        .where('period', '==', period)
        .get();

      if (!payrollSnapshot.empty) {
        const data = payrollSnapshot.docs[0].data();
        exportData.push({
          facilityId,
          data,
          format
        });
      }
    }

    const exportId = `export_${Date.now()}`;
    const storagePath = `fiduciary_exports/${context.userId}/${period}_${exportId}.zip`;

    await db.collection('fiduciary_exports').doc(exportId).set({
      userId: context.userId,
      facilityIds,
      period,
      format,
      exportedAt: admin.firestore.FieldValue.serverTimestamp(),
      filesIncluded: exportData.length,
      storagePath,
      status: 'COMPLETED'
    });

    logger.info(`[FIDUCIARY] Bulk export ${exportId} created by ${context.userId}`, {
      facilityCount: facilityIds.length,
      period,
      format
    });

    return {
      success: true,
      exportId,
      filesIncluded: exportData.length,
      downloadPath: storagePath
    };
  } catch (error) {
    logger.error('[FIDUCIARY] Error in bulk export:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Failed to export payroll data');
  }
}

async function flagDiscrepancy(input, context) {
  const { facilityId, userId, period, note } = input;

  if (!facilityId || !userId || !period || !note) {
    throw new HttpsError('invalid-argument', 'Missing required fields');
  }

  const db = admin.firestore();

  try {
    const discrepancyRef = db.collection('payroll_discrepancies').doc();
    await discrepancyRef.set({
      facilityId,
      userId,
      period,
      note,
      flaggedBy: context.userId,
      status: 'PENDING',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const periodRef = db.collection('payroll_periods').doc(`${facilityId}_${period}`);
    const periodDoc = await periodRef.get();

    if (periodDoc.exists()) {
      await periodRef.update({
        locked: false,
        status: 'DRAFT',
        reopenedAt: admin.firestore.FieldValue.serverTimestamp(),
        reopenedBy: context.userId,
        reopenReason: note
      });
    }

    const ticketRef = db.collection('support_tickets').doc();
    await ticketRef.set({
      userId: context.userId,
      facilityId,
      description: `Payroll Discrepancy: ${note}`,
      severity: 'HIGH',
      category: 'PAYROLL_CORRECTION',
      status: 'OPEN',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    logger.info(`[FIDUCIARY] Discrepancy flagged ${discrepancyRef.id} by ${context.userId}`, {
      facilityId,
      period
    });

    return {
      success: true,
      discrepancyId: discrepancyRef.id,
      ticketId: ticketRef.id,
      message: 'Discrepancy flagged and period reopened'
    };
  } catch (error) {
    logger.error('[FIDUCIARY] Error flagging discrepancy:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Failed to flag discrepancy');
  }
}

async function getClientDashboard(input, context) {
  const { facilityIds } = input;

  if (!facilityIds || !Array.isArray(facilityIds)) {
    throw new HttpsError('invalid-argument', 'facilityIds array is required');
  }

  const db = admin.firestore();

  try {
    const userDoc = await db.collection('users').doc(context.userId).get();
    
    if (!userDoc.exists()) {
      throw new HttpsError('not-found', 'User not found');
    }

    const linkedFacilities = userDoc.data().linkedFacilities || [];

    const unauthorizedFacilities = facilityIds.filter(
      fid => !linkedFacilities.includes(fid)
    );

    if (unauthorizedFacilities.length > 0) {
      throw new HttpsError(
        'permission-denied',
        `Access denied to facilities: ${unauthorizedFacilities.join(', ')}`
      );
    }

    const dashboard = [];

    for (const facilityId of facilityIds) {
      const periodsSnapshot = await db.collection('payroll_periods')
        .where('facilityId', '==', facilityId)
        .orderBy('year', 'desc')
        .orderBy('month', 'desc')
        .limit(6)
        .get();

      const periods = [];
      periodsSnapshot.forEach(doc => {
        periods.push({
          id: doc.id,
          ...doc.data()
        });
      });

      const facilityDoc = await db.collection('facilityProfiles').doc(facilityId).get();

      dashboard.push({
        facilityId,
        facilityName: facilityDoc.exists() ? facilityDoc.data().facilityDetails?.name : 'Unknown',
        recentPeriods: periods,
        status: periods[0]?.status || 'UNKNOWN'
      });
    }

    logger.info(`[FIDUCIARY] Dashboard accessed by ${context.userId}`, {
      facilityCount: facilityIds.length
    });

    return {
      success: true,
      dashboard
    };
  } catch (error) {
    logger.error('[FIDUCIARY] Error getting client dashboard:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Failed to get client dashboard');
  }
}

const FIDUCIARY_ACTION_HANDLERS = {
  'fiduciary.bulk_export': {
    handler: bulkExport,
    permission: 'fiduciary.access',
    riskLevel: 'HIGH'
  },
  'fiduciary.flag_discrepancy': {
    handler: flagDiscrepancy,
    permission: 'fiduciary.access',
    riskLevel: 'HIGH'
  },
  'fiduciary.get_client_dashboard': {
    handler: getClientDashboard,
    permission: 'fiduciary.access',
    riskLevel: 'LOW'
  }
};

exports.executeFiduciaryAction = onCall(async (request) => {
  const { actionId, input } = request.data;

  if (!actionId) {
    throw new HttpsError('invalid-argument', 'Action ID is required');
  }

  const actionConfig = FIDUCIARY_ACTION_HANDLERS[actionId];
  if (!actionConfig) {
    throw new HttpsError('not-found', `Fiduciary action ${actionId} not found`);
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
    action: `Started fiduciary action: ${actionId}`,
    resource: {
      type: 'fiduciary_action',
      id: actionId
    },
    details: {
      input,
      riskLevel: actionConfig.riskLevel
    },
    metadata: rateLimitContext,
    success: true
  });

  try {
    const context = {
      userId: adminVerification.userId,
      adminData: adminVerification.adminData,
      permissions: adminVerification.permissions,
      isSuperAdmin: adminVerification.isSuperAdmin,
      ipAddress: rateLimitContext.ipAddress
    };

    const result = await actionConfig.handler(input, context);

    await logAuditEvent({
      eventType: AUDIT_EVENT_TYPES.ADMIN_ACTION_SUCCESS,
      userId: adminVerification.userId,
      action: `Completed fiduciary action: ${actionId}`,
      resource: {
        type: 'fiduciary_action',
        id: actionId
      },
      details: {
        result
      },
      metadata: rateLimitContext,
      success: true
    });

    return result;
  } catch (error) {
    await logAuditEvent({
      eventType: AUDIT_EVENT_TYPES.ADMIN_ACTION_ERROR,
      userId: adminVerification.userId,
      action: `Failed fiduciary action: ${actionId}`,
      resource: {
        type: 'fiduciary_action',
        id: actionId
      },
      details: {
        error: error.message
      },
      metadata: rateLimitContext,
      success: false
    });

    logger.error(`[FIDUCIARY] Error executing action ${actionId}:`, error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError('internal', `Failed to execute ${actionId}: ${error.message}`);
  }
});

module.exports = {
  executeFiduciaryAction: exports.executeFiduciaryAction,
  bulkExport,
  flagDiscrepancy,
  getClientDashboard
};

