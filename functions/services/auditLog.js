const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

/**
 * Audit Logging Service
 * Comprehensive logging of all authorization decisions and sensitive operations
 */

// ============================================
// AUDIT EVENT TYPES
// ============================================

const AUDIT_EVENT_TYPES = {
    // Authentication
    USER_LOGIN: 'user:login',
    USER_LOGOUT: 'user:logout',
    SESSION_CREATED: 'session:created',
    SESSION_EXPIRED: 'session:expired',

    // Authorization
    ACCESS_GRANTED: 'auth:access_granted',
    ACCESS_DENIED: 'auth:access_denied',
    PERMISSION_CHECK: 'auth:permission_check',
    ROLE_ASSIGNED: 'auth:role_assigned',
    ROLE_REMOVED: 'auth:role_removed',

    // Facility Management
    FACILITY_CREATED: 'facility:created',
    FACILITY_UPDATED: 'facility:updated',
    FACILITY_DELETED: 'facility:deleted',

    // Team Management
    MEMBER_ADDED: 'team:member_added',
    MEMBER_REMOVED: 'team:member_removed',
    MEMBER_ROLE_CHANGED: 'team:member_role_changed',
    PERMISSIONS_UPDATED: 'team:permissions_updated',

    // Position Management
    POSITION_CREATED: 'position:created',
    POSITION_UPDATED: 'position:updated',
    POSITION_DELETED: 'position:deleted',

    // Application Management
    APPLICATION_SUBMITTED: 'application:submitted',
    APPLICATION_VIEWED: 'application:viewed',
    APPLICATION_APPROVED: 'application:approved',
    APPLICATION_REJECTED: 'application:rejected',

    // Contract Management
    CONTRACT_CREATED: 'contract:created',
    CONTRACT_UPDATED: 'contract:updated',
    CONTRACT_SIGNED: 'contract:signed',
    CONTRACT_CANCELLED: 'contract:cancelled',

    // Schedule Management
    SCHEDULE_CREATED: 'schedule:created',
    SCHEDULE_UPDATED: 'schedule:updated',
    SCHEDULE_DELETED: 'schedule:deleted',

    // Time-Off Management
    TIMEOFF_REQUESTED: 'timeoff:requested',
    TIMEOFF_APPROVED: 'timeoff:approved',
    TIMEOFF_REJECTED: 'timeoff:rejected',
    TIMEOFF_CANCELLED: 'timeoff:cancelled',

    // Message Management
    MESSAGE_SENT: 'message:sent',
    CONVERSATION_CREATED: 'conversation:created',

    // Calendar Management
    EVENT_CREATED: 'event:created',
    EVENT_UPDATED: 'event:updated',
    EVENT_DELETED: 'event:deleted',

    // Admin Actions
    ADMIN_USER_APPROVED: 'admin:user_approved',
    ADMIN_USER_REJECTED: 'admin:user_rejected',
    ADMIN_SHIFT_FORCE_ASSIGNED: 'admin:shift_force_assigned',
    ADMIN_SHIFT_PAY_EDITED: 'admin:shift_pay_edited',
    ADMIN_SHIFT_STATUS_EDITED: 'admin:shift_status_edited',
    ADMIN_USER_IMPERSONATED: 'admin:user_impersonated',
    ADMIN_EMPLOYEE_INVITED: 'admin:employee_invited',
    ADMIN_EMPLOYEE_ROLE_UPDATED: 'admin:employee_role_updated',
    ADMIN_ACCOUNT_CREATED: 'admin:account_created',
    ADMIN_DATABASE_EDITED: 'admin:database_edited',
};

// ============================================
// AUDIT LOG FUNCTION
// ============================================

/**
 * Log an audit event
 * @param {Object} params - Event parameters
 * @param {string} params.eventType - Type of event (from AUDIT_EVENT_TYPES)
 * @param {string} params.userId - User who performed the action
 * @param {string} params.action - Description of action
 * @param {Object} params.resource - Resource affected
 * @param {Object} params.details - Additional details
 * @param {Object} params.metadata - Request metadata (IP, user agent, etc.)
 * @param {boolean} params.success - Whether action succeeded
 * @param {string} params.errorMessage - Error message if failed
 */
const logAuditEvent = async ({
    eventType,
    userId,
    action,
    resource = {},
    details = {},
    metadata = {},
    success = true,
    errorMessage = null,
}) => {
    try {
        const auditEntry = {
            eventType,
            userId,
            action,
            resource: {
                type: resource.type || null,
                id: resource.id || null,
                name: resource.name || null,
                ...resource,
            },
            details,
            metadata: {
                ip: metadata.ip || null,
                userAgent: metadata.userAgent || null,
                facilityId: metadata.facilityId || null,
                ...metadata,
            },
            success,
            errorMessage,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: new Date().toISOString(), // For immediate access
        };

        await admin.firestore().collection('audit_logs').add(auditEntry);
        console.log(`[AUDIT] ${eventType}: ${action} by user ${userId} - ${success ? 'SUCCESS' : 'FAILED'}`);

        return { success: true };
    } catch (error) {
        console.error('[AUDIT] Error logging audit event:', error);
        // Don't throw - audit logging should not break the main flow
        return { success: false, error: error.message };
    }
};

/**
 * Extract request metadata
 * @param {Object} req - HTTP request object
 * @param {Object} context - Cloud Functions context
 * @returns {Object} Metadata object
 */
const extractMetadata = (req, context = null) => {
    const metadata = {};

    if (req) {
        metadata.ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress;
        metadata.userAgent = req.headers['user-agent'];
        metadata.referer = req.headers['referer'];
    }

    if (context && context.auth) {
        metadata.authProvider = context.auth.token?.firebase?.sign_in_provider;
    }

    return metadata;
};

// ============================================
// CALLABLE CLOUD FUNCTION
// ============================================

/**
 * Callable function to manually log audit events from frontend
 */
const { FUNCTION_CONFIG } = require('../config/keysDatabase');

exports.logAudit = onCall(FUNCTION_CONFIG, async (request) => {
    // Only allow authenticated users
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    const { eventType, action, resource, details } = request.data;

    if (!eventType || !action) {
        throw new HttpsError('invalid-argument', 'eventType and action are required');
    }

    const metadata = {
        authProvider: request.auth.token?.firebase?.sign_in_provider,
    };

    await logAuditEvent({
        eventType,
        userId: request.auth.uid,
        action,
        resource,
        details,
        metadata,
        success: true,
    });

    return { success: true };
});

// ============================================
// QUERY AUDIT LOGS
// ============================================

/**
 * Query audit logs for a facility
 * Requires admin permission
 */
exports.getAuditLogs = onCall(FUNCTION_CONFIG, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    const { facilityId, limit = 100, startAfter = null, filters = {} } = request.data;
    const userId = request.auth.uid;

    try {
        // Verify user is facility admin
        if (facilityId) {
            const facilityDoc = await admin.firestore()
                .collection('facilityProfiles')
                .doc(facilityId)
                .get();

            if (!facilityDoc.exists) {
                throw new HttpsError('not-found', 'Facility not found');
            }

            const facilityData = facilityDoc.data();
            if (!facilityData.admin || !facilityData.admin.includes(userId)) {
                throw new HttpsError('permission-denied', 'Only facility admins can view audit logs');
            }
        }

        // Build query
        let query = admin.firestore()
            .collection('audit_logs')
            .orderBy('timestamp', 'desc')
            .limit(limit);

        // Filter by facility if provided
        if (facilityId) {
            query = query.where('metadata.facilityId', '==', facilityId);
        }

        // Filter by event type
        if (filters.eventType) {
            query = query.where('eventType', '==', filters.eventType);
        }

        // Filter by user
        if (filters.userId) {
            query = query.where('userId', '==', filters.userId);
        }

        // Filter by success/failure
        if (filters.success !== undefined) {
            query = query.where('success', '==', filters.success);
        }

        // Pagination
        if (startAfter) {
            const startDoc = await admin.firestore()
                .collection('audit_logs')
                .doc(startAfter)
                .get();
            query = query.startAfter(startDoc);
        }

        const snapshot = await query.get();
        const logs = [];

        snapshot.forEach(doc => {
            logs.push({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toDate() || null,
            });
        });

        return {
            success: true,
            logs,
            hasMore: logs.length === limit,
        };
    } catch (error) {
        logger.error('Error fetching audit logs:', error);
        throw new HttpsError('internal', error.message);
    }
});

// ============================================
// MIDDLEWARE FOR HTTP FUNCTIONS
// ============================================

/**
 * Middleware to automatically log audit events for HTTP functions
 */
const auditMiddleware = (eventType) => {
    return async (req, res, next) => {
        const startTime = Date.now();
        const originalSend = res.send;

        // Intercept response
        res.send = function (data) {
            const duration = Date.now() - startTime;
            const success = res.statusCode < 400;

            // Log audit event
            logAuditEvent({
                eventType,
                userId: req.user?.uid || 'anonymous',
                action: `${req.method} ${req.path}`,
                resource: {
                    type: 'http_endpoint',
                    path: req.path,
                },
                details: {
                    method: req.method,
                    statusCode: res.statusCode,
                    duration,
                    queryParams: req.query,
                },
                metadata: extractMetadata(req),
                success,
                errorMessage: success ? null : data?.error || 'Request failed',
            });

            return originalSend.call(this, data);
        };

        next();
    };
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
    AUDIT_EVENT_TYPES,
    logAuditEvent,
    extractMetadata,
    auditMiddleware,
    logAudit: exports.logAudit,
    getAuditLogs: exports.getAuditLogs,
};
