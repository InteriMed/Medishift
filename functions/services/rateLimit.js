const functions = require('firebase-functions');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall } = require('firebase-functions/v2/https');
const { HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

/**
 * Rate Limiting Service
 * Prevents abuse and spam by limiting request rates per user/IP
 */

// ============================================
// RATE LIMIT CONFIGURATIONS
// ============================================

const RATE_LIMITS = {
    // Position Management
    CREATE_POSITION: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 10,
        message: 'Too many positions created. Please try again in 15 minutes.',
    },

    // Application Management
    APPLY_TO_POSITION: {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 20,
        message: 'Too many applications submitted. Please try again in 1 hour.',
    },

    // Availability Management
    CREATE_AVAILABILITY: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 15,
        message: 'Too many availabilities created. Please try again in 15 minutes.',
    },

    // Message Management
    SEND_MESSAGE: {
        windowMs: 1 * 60 * 1000, // 1 minute
        maxRequests: 30,
        message: 'Too many messages sent. Please slow down.',
    },

    // Contract Management
    CREATE_CONTRACT: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 5,
        message: 'Too many contracts created. Please try again in 15 minutes.',
    },

    // Team Management
    INVITE_MEMBER: {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 20,
        message: 'Too many invitations sent. Please try again in 1 hour.',
    },

    // Schedule Management
    CREATE_SCHEDULE: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 10,
        message: 'Too many schedules created. Please try again in 15 minutes.',
    },

    // Time-Off Requests
    REQUEST_TIMEOFF: {
        windowMs: 24 * 60 * 60 * 1000, // 24 hours
        maxRequests: 10,
        message: 'Too many time-off requests. Please try again tomorrow.',
    },

    // Authentication
    LOGIN_ATTEMPT: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 5,
        message: 'Too many login attempts. Please try again in 15 minutes.',
    },

    // General API
    API_GENERAL: {
        windowMs: 1 * 60 * 1000, // 1 minute
        maxRequests: 60,
        message: 'Too many requests. Please slow down.',
    },
};

// ============================================
// RATE LIMITER CLASS
// ============================================

class RateLimiter {
    constructor() {
        this.db = admin.firestore();
        this.collection = this.db.collection('rate_limits');
    }

    /**
     * Generate rate limit key
     * @param {string} userId - User ID
     * @param {string} action - Action type
     * @param {string} ip - Optional IP address
     * @returns {string}
     */
    generateKey(userId, action, ip = null) {
        // Use userId as primary identifier, fall back to IP
        const identifier = userId || ip || 'anonymous';
        return `${identifier}:${action}`;
    }

    /**
     * Check if request should be rate limited
     * @param {string} userId - User ID
     * @param {string} action - Action type (from RATE_LIMITS keys)
     * @param {string} ip - Optional IP address
     * @returns {Promise<{allowed: boolean, retryAfter?: number, message?: string}>}
     */
    async checkLimit(userId, action, ip = null) {
        const config = RATE_LIMITS[action];

        if (!config) {
            // No rate limit configured for this action
            return { allowed: true };
        }

        const key = this.generateKey(userId, action, ip);
        const now = Date.now();
        const windowStart = now - config.windowMs;

        try {
            const docRef = this.collection.doc(key);
            const doc = await docRef.get();

            if (!doc.exists) {
                //  First request - create record
                await docRef.set({
                    userId: userId || null,
                    ip: ip || null,
                    action,
                    requests: [now],
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    expiresAt: new Date(now + config.windowMs),
                });

                return { allowed: true };
            }

            const data = doc.data();
            const requests = data.requests || [];

            // Filter requests within the current window
            const recentRequests = requests.filter(timestamp => timestamp > windowStart);

            if (recentRequests.length >= config.maxRequests) {
                // Rate limit exceeded
                const oldestRequest = Math.min(...recentRequests);
                const retryAfter = Math.ceil((oldestRequest + config.windowMs - now) / 1000);

                return {
                    allowed: false,
                    retryAfter,
                    message: config.message,
                };
            }

            // Add current request
            recentRequests.push(now);

            // Update document
            await docRef.update({
                requests: recentRequests,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                expiresAt: new Date(now + config.windowMs),
            });

            return { allowed: true };
        } catch (error) {
            console.error('Rate limiter error:', error);
            // Fail open - allow request if rate limiter fails
            return { allowed: true };
        }
    }

    /**
     * Reset rate limit for a user/action
     * @param {string} userId - User ID
     * @param {string} action - Action type
     */
    async resetLimit(userId, action) {
        try {
            const key = this.generateKey(userId, action);
            await this.collection.doc(key).delete();
            return { success: true };
        } catch (error) {
            console.error('Error resetting rate limit:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get current rate limit status
     * @param {string} userId - User ID
     * @param {string} action - Action type
     * @returns {Promise<{requests: number, maxRequests: number, windowMs: number, resetAt: Date}>}
     */
    async getStatus(userId, action) {
        try {
            const config = RATE_LIMITS[action];
            if (!config) {
                return { requests: 0, maxRequests: 0, windowMs: 0 };
            }

            const key = this.generateKey(userId, action);
            const doc = await this.collection.doc(key).get();

            if (!doc.exists) {
                return {
                    requests: 0,
                    maxRequests: config.maxRequests,
                    windowMs: config.windowMs,
                    resetAt: null,
                };
            }

            const data = doc.data();
            const now = Date.now();
            const windowStart = now - config.windowMs;
            const recentRequests = (data.requests || []).filter(t => t > windowStart);

            return {
                requests: recentRequests.length,
                maxRequests: config.maxRequests,
                windowMs: config.windowMs,
                resetAt: data.expiresAt?.toDate() || null,
            };
        } catch (error) {
            console.error('Error getting rate limit status:', error);
            return { requests: 0, maxRequests: 0, windowMs: 0 };
        }
    }
}

// Create singleton instance
const rateLimiter = new RateLimiter();

// ============================================
// MIDDLEWARE FUNCTION
// ============================================

/**
 * Rate limiting middleware for Cloud Functions
 * @param {string} action - Action type from RATE_LIMITS
 */
const rateLimitMiddleware = (action) => {
    return async (data, context) => {
        const userId = context.auth?.uid;
        const ip = context.rawRequest?.ip;

        const result = await rateLimiter.checkLimit(userId, action, ip);

        if (!result.allowed) {
            throw new HttpsError(
                'resource-exhausted',
                result.message || 'Rate limit exceeded',
                { retryAfter: result.retryAfter }
            );
        }

        return result;
    };
};

// ============================================
// CLOUD FUNCTIONS
// ============================================

/**
 * Clean up expired rate limit records
 * Runs daily
 */
exports.cleanupRateLimits = onSchedule({
    schedule: 'every 24 hours'
}, async (event) => {
        try {
            const now = new Date();
            const snapshot = await admin.firestore()
                .collection('rate_limits')
                .where('expiresAt', '<', now)
                .limit(500)
                .get();

            const batch = admin.firestore().batch();
            let deletedCount = 0;

            snapshot.forEach(doc => {
                batch.delete(doc.ref);
                deletedCount++;
            });

            if (deletedCount > 0) {
                await batch.commit();
                console.log(`Cleaned up ${deletedCount} expired rate limit records`);
            }

            return { success: true, deletedCount };
        } catch (error) {
            console.error('Error cleaning up rate limits:', error);
            throw error;
        }
    });

/**
 * Get rate limit status for current user
 */
exports.getRateLimitStatus = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    const { action } = request.data;

    if (!action || !RATE_LIMITS[action]) {
        throw new HttpsError('invalid-argument', 'Invalid action');
    }

    const status = await rateLimiter.getStatus(request.auth.uid, action);

    return {
        success: true,
        ...status,
    };
});

// ============================================
// EXPORTS
// ============================================

module.exports = {
    RATE_LIMITS,
    RateLimiter,
    rateLimiter,
    rateLimitMiddleware,
    cleanupRateLimits: exports.cleanupRateLimits,
    getRateLimitStatus: exports.getRateLimitStatus,
};
