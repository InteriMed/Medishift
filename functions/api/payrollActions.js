const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { verifyAdminAccess, ADMIN_PERMISSIONS } = require('../middleware/verifyAdminAccess');
const { logAuditEvent, AUDIT_EVENT_TYPES } = require('../services/auditLog');
const { checkRateLimit } = require('../middleware/rateLimit');
const { logger } = require('firebase-functions');

async function calculatePeriodVariables(input, context) {
  const { facilityId, month, year } = input;

  if (!facilityId || !month || !year) {
    throw new HttpsError('invalid-argument', 'Missing required fields');
  }

  const db = admin.firestore();
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  try {
    const shiftsSnapshot = await db.collection('shifts')
      .where('facilityId', '==', facilityId)
      .where('status', '==', 'COMPLETED')
      .where('date', '>=', startDateStr)
      .where('date', '<=', endDateStr)
      .get();

    const userVariables = {};
    const warnings = [];

    shiftsSnapshot.forEach(doc => {
      const shift = doc.data();
      if (!shift.userId) return;

      if (!userVariables[shift.userId]) {
        userVariables[shift.userId] = {
          userId: shift.userId,
          standardHours: 0,
          overtimeHours: 0,
          sundayHours: 0,
          nightHours: 0,
          vacationDaysTaken: 0,
          sickDays: 0
        };
      }

      const startTime = parseTime(shift.startTime);
      const endTime = parseTime(shift.endTime);
      const duration = calculateDuration(startTime, endTime);

      const shiftDate = new Date(shift.date);
      const isSunday = shiftDate.getDay() === 0;
      const isNight = startTime >= 20 || endTime <= 6;

      if (shift.type === 'OVERTIME') {
        userVariables[shift.userId].overtimeHours += duration;
      } else if (isSunday) {
        userVariables[shift.userId].sundayHours += duration;
      } else if (isNight) {
        userVariables[shift.userId].nightHours += duration;
      } else {
        userVariables[shift.userId].standardHours += duration;
      }
    });

    const leaveSnapshot = await db.collection('leave_requests')
      .where('facilityId', '==', facilityId)
      .where('status', '==', 'APPROVED')
      .get();

    leaveSnapshot.forEach(doc => {
      const leave = doc.data();
      const leaveStart = new Date(leave.startDate);
      const leaveEnd = new Date(leave.endDate);

      if (leaveStart <= endDate && leaveEnd >= startDate) {
        if (!userVariables[leave.userId]) {
          userVariables[leave.userId] = {
            userId: leave.userId,
            standardHours: 0,
            overtimeHours: 0,
            sundayHours: 0,
            nightHours: 0,
            vacationDaysTaken: 0,
            sickDays: 0
          };
        }

        if (leave.type === 'VACATION') {
          userVariables[leave.userId].vacationDaysTaken += leave.daysRequested || 0;
        } else if (leave.type === 'SICK') {
          userVariables[leave.userId].sickDays += leave.daysRequested || 0;
        }
      }
    });

    const draftSnapshot = await db.collection('shifts')
      .where('facilityId', '==', facilityId)
      .where('status', '==', 'DRAFT')
      .where('date', '>=', startDateStr)
      .where('date', '<=', endDateStr)
      .get();

    if (!draftSnapshot.empty) {
      warnings.push(`${draftSnapshot.size} DRAFT shifts still exist for this period. Lock will fail.`);
    }

    let totalStandardHours = 0;
    let totalOvertimeHours = 0;

    Object.values(userVariables).forEach(v => {
      totalStandardHours += v.standardHours;
      totalOvertimeHours += v.overtimeHours;
    });

    logger.info(`[PAYROLL] Calculated variables for ${facilityId}/${year}-${month}`, {
      employeeCount: Object.keys(userVariables).length,
      totalStandardHours,
      totalOvertimeHours
    });

    return {
      success: true,
      variables: userVariables,
      totalEmployees: Object.keys(userVariables).length,
      totalStandardHours,
      totalOvertimeHours,
      warnings
    };
  } catch (error) {
    logger.error('[PAYROLL] Error calculating period variables:', error);
    throw new HttpsError('internal', 'Failed to calculate payroll variables');
  }
}

async function lockPeriod(input, context) {
  const { facilityId, month, year } = input;

  if (!facilityId || !month || !year) {
    throw new HttpsError('invalid-argument', 'Missing required fields');
  }

  const db = admin.firestore();
  const periodId = `${facilityId}_${year}_${String(month).padStart(2, '0')}`;

  try {
    const periodDoc = await db.collection('payroll_periods').doc(periodId).get();
    
    if (periodDoc.exists() && periodDoc.data().locked) {
      throw new HttpsError('failed-precondition', 'Period is already locked');
    }

    const draftShifts = await db.collection('shifts')
      .where('facilityId', '==', facilityId)
      .where('status', '==', 'DRAFT')
      .where('date', '>=', `${year}-${String(month).padStart(2, '0')}-01`)
      .where('date', '<=', `${year}-${String(month).padStart(2, '0')}-31`)
      .get();

    if (!draftShifts.empty) {
      throw new HttpsError('failed-precondition', 'Cannot lock period with DRAFT shifts');
    }

    await db.collection('payroll_periods').doc(periodId).set({
      facilityId,
      month,
      year,
      locked: true,
      lockedAt: admin.firestore.FieldValue.serverTimestamp(),
      lockedBy: context.userId
    }, { merge: true });

    logger.info(`[PAYROLL] Locked period ${periodId} by ${context.userId}`);

    return {
      success: true,
      periodId,
      message: 'Period locked successfully'
    };
  } catch (error) {
    logger.error('[PAYROLL] Error locking period:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Failed to lock payroll period');
  }
}

async function exportPayrollData(input, context) {
  const { facilityId, month, year, format = 'CSV' } = input;

  if (!facilityId || !month || !year) {
    throw new HttpsError('invalid-argument', 'Missing required fields');
  }

  const db = admin.firestore();
  const periodId = `${facilityId}_${year}_${String(month).padStart(2, '0')}`;

  try {
    const periodDoc = await db.collection('payroll_periods').doc(periodId).get();
    
    if (!periodDoc.exists() || !periodDoc.data().locked) {
      throw new HttpsError('failed-precondition', 'Period must be locked before export');
    }

    const variablesDoc = await db.collection('payroll_variables').doc(periodId).get();
    
    if (!variablesDoc.exists()) {
      throw new HttpsError('not-found', 'No payroll data found for this period');
    }

    const variables = variablesDoc.data().variables || {};
    
    const exportId = `export_${Date.now()}`;
    await db.collection('payroll_exports').doc(exportId).set({
      facilityId,
      month,
      year,
      periodId,
      format,
      exportedAt: admin.firestore.FieldValue.serverTimestamp(),
      exportedBy: context.userId,
      recordCount: Object.keys(variables).length,
      status: 'COMPLETED'
    });

    logger.info(`[PAYROLL] Exported payroll data for ${periodId} by ${context.userId}`);

    return {
      success: true,
      exportId,
      periodId,
      format,
      recordCount: Object.keys(variables).length,
      data: variables
    };
  } catch (error) {
    logger.error('[PAYROLL] Error exporting payroll data:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Failed to export payroll data');
  }
}

const PAYROLL_ACTION_HANDLERS = {
  'payroll.calculate_period_variables': {
    handler: calculatePeriodVariables,
    permission: 'payroll.calculate',
    riskLevel: 'MEDIUM'
  },
  'payroll.lock_period': {
    handler: lockPeriod,
    permission: 'payroll.lock',
    riskLevel: 'HIGH'
  },
  'payroll.export_data': {
    handler: exportPayrollData,
    permission: 'payroll.export',
    riskLevel: 'HIGH'
  }
};

exports.executePayrollAction = onCall(async (request) => {
  const { actionId, input } = request.data;

  if (!actionId) {
    throw new HttpsError('invalid-argument', 'Action ID is required');
  }

  const actionConfig = PAYROLL_ACTION_HANDLERS[actionId];
  if (!actionConfig) {
    throw new HttpsError('not-found', `Payroll action ${actionId} not found`);
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
    action: `Started payroll action: ${actionId}`,
    resource: {
      type: 'payroll_action',
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
      action: `Completed payroll action: ${actionId}`,
      resource: {
        type: 'payroll_action',
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
      action: `Failed payroll action: ${actionId}`,
      resource: {
        type: 'payroll_action',
        id: actionId
      },
      details: {
        error: error.message
      },
      metadata: rateLimitContext,
      success: false
    });

    logger.error(`[PAYROLL] Error executing action ${actionId}:`, error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError('internal', `Failed to execute ${actionId}: ${error.message}`);
  }
});

function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours + minutes / 60;
}

function calculateDuration(start, end) {
  if (end < start) {
    return (24 - start) + end;
  }
  return end - start;
}

module.exports = {
  executePayrollAction: exports.executePayrollAction,
  calculatePeriodVariables,
  lockPeriod,
  exportPayrollData
};

