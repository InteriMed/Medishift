const admin = require('firebase-admin');
const { HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');

const RATE_LIMITS = {
  'admin.provision_tenant': { maxCalls: 10, windowMinutes: 60 },
  'admin.manage_billing': { maxCalls: 20, windowMinutes: 60 },
  'admin.impersonate_user': { maxCalls: 20, windowMinutes: 60 },
  'admin.broadcast_system_alert': { maxCalls: 5, windowMinutes: 60 },
  'payroll.calculate_period_variables': { maxCalls: 50, windowMinutes: 60 },
  'payroll.lock_period': { maxCalls: 30, windowMinutes: 60 },
  'payroll.export_data': { maxCalls: 20, windowMinutes: 60 },
  'payroll.approve_global': { maxCalls: 10, windowMinutes: 60 },
  'fiduciary.bulk_export': { maxCalls: 10, windowMinutes: 60 },
  'pool.enroll_member': { maxCalls: 50, windowMinutes: 60 },
  'pool.dispatch_staff': { maxCalls: 20, windowMinutes: 60 },
  'pool.request_coverage': { maxCalls: 30, windowMinutes: 60 },
  'pool.search_network_availability': { maxCalls: 100, windowMinutes: 60 }
};

async function checkRateLimit(userId, actionId, context = {}) {
  const limit = RATE_LIMITS[actionId];
  if (!limit) {
    return;
  }

  const db = admin.firestore();
  const now = Date.now();
  const windowStart = now - (limit.windowMinutes * 60 * 1000);

  try {
    const rateLimitDoc = db.collection('rate_limits').doc(`${userId}_${actionId}`);
    const doc = await rateLimitDoc.get();

    let calls = [];
    if (doc.exists()) {
      const data = doc.data();
      calls = (data.calls || []).filter(timestamp => timestamp >= windowStart);
    }

    if (calls.length >= limit.maxCalls) {
      logger.warn(`[RATE_LIMIT] User ${userId} exceeded rate limit for ${actionId}`, {
        userId,
        actionId,
        callCount: calls.length,
        limit: limit.maxCalls,
        windowMinutes: limit.windowMinutes,
        ipAddress: context.ipAddress
      });

      throw new HttpsError(
        'resource-exhausted',
        `Rate limit exceeded for ${actionId}. Maximum ${limit.maxCalls} calls per ${limit.windowMinutes} minutes. Please try again later.`
      );
    }

    calls.push(now);
    await rateLimitDoc.set({
      userId,
      actionId,
      calls,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    logger.info(`[RATE_LIMIT] Rate limit check passed for ${actionId}`, {
      userId,
      actionId,
      currentCalls: calls.length,
      limit: limit.maxCalls
    });

  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    logger.error('[RATE_LIMIT] Error checking rate limit:', error);
  }
}

async function getRateLimitStatus(userId, actionId) {
  const limit = RATE_LIMITS[actionId];
  if (!limit) {
    return {
      limited: false,
      message: 'No rate limit configured for this action'
    };
  }

  const db = admin.firestore();
  const now = Date.now();
  const windowStart = now - (limit.windowMinutes * 60 * 1000);

  try {
    const rateLimitDoc = db.collection('rate_limits').doc(`${userId}_${actionId}`);
    const doc = await rateLimitDoc.get();

    if (!doc.exists()) {
      return {
        limited: false,
        remaining: limit.maxCalls,
        resetsAt: null
      };
    }

    const data = doc.data();
    const calls = (data.calls || []).filter(timestamp => timestamp >= windowStart);
    const remaining = Math.max(0, limit.maxCalls - calls.length);
    const oldestCall = calls.length > 0 ? Math.min(...calls) : null;
    const resetsAt = oldestCall ? new Date(oldestCall + (limit.windowMinutes * 60 * 1000)) : null;

    return {
      limited: remaining === 0,
      remaining,
      total: limit.maxCalls,
      resetsAt,
      windowMinutes: limit.windowMinutes
    };
  } catch (error) {
    logger.error('[RATE_LIMIT] Error getting rate limit status:', error);
    return {
      limited: false,
      error: error.message
    };
  }
}

async function resetRateLimit(userId, actionId) {
  const db = admin.firestore();
  const rateLimitDoc = db.collection('rate_limits').doc(`${userId}_${actionId}`);
  
  try {
    await rateLimitDoc.delete();
    logger.info(`[RATE_LIMIT] Reset rate limit for ${userId}/${actionId}`);
    return true;
  } catch (error) {
    logger.error('[RATE_LIMIT] Error resetting rate limit:', error);
    return false;
  }
}

module.exports = {
  checkRateLimit,
  getRateLimitStatus,
  resetRateLimit,
  RATE_LIMITS
};

