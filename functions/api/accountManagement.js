/**
 * Account Management API
 * 
 * HTTP endpoints for account deletion and related operations
 * 
 * Compliant with:
 * - Swiss nFADP/revDSG (Data Protection)
 * - Swiss Code of Obligations Art. 958f (10-Year Record Retention)
 * - GDPR Article 17 (Right to Erasure)
 */

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const {
    deleteUserAccount,
    getDeletionEligibility,
    checkAntifraudHash
} = require('../services/accountDeletionService');
const { logAuditEvent } = require('../services/auditLog');

// Get Firestore instance
const db = admin.firestore();

// CORS configuration - Manual handling to ensure it works
// Cloud Functions sometimes strips headers if not explicitly set this way
const setCorsHeaders = (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.set('Access-Control-Max-Age', '3600');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return true;
    }
    return false;
};

/**
 * Verify Firebase ID Token
 */
async function verifyAuthToken(req) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Missing or invalid authorization header');
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    return decodedToken;
}

/**
 * GET /account/deletion-preview
 * 
 * Get a preview of what will happen when the account is deleted.
 * Shows what data will be deleted, what will be retained, and why.
 */
const deletionPreview = onRequest({
    region: 'europe-west6',
    cors: true  // Still keep this as a backup
}, async (req, res) => {
    // Manually handle CORS
    if (setCorsHeaders(req, res)) return;

    try {
        // Verify authentication
        const decodedToken = await verifyAuthToken(req);
        const uid = decodedToken.uid;

        // Get deletion eligibility info
        const eligibility = await getDeletionEligibility(uid);

        res.status(200).json({
            success: true,
            data: eligibility
        });

    } catch (error) {
        console.error('[AccountAPI] Error getting deletion preview:', error);

        if (error.message.includes('authorization')) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

/**
 * POST /account/delete
 * 
 * Request account deletion.
 * Implements the "Anonymize & Archive" strategy.
 * 
 * Body:
 * - reason: (optional) Reason for deletion
 * - confirmPhrase: (required) Must be "DELETE MY ACCOUNT" for safety
 */
const deleteAccount = onRequest({
    region: 'europe-west6',
    cors: true,
    timeoutSeconds: 120 // Account deletion may take time
}, async (req, res) => {
    // Manually handle CORS
    if (setCorsHeaders(req, res)) return;

    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed',
            message: 'Use POST to delete account'
        });
    }

    try {
        // Verify authentication
        const decodedToken = await verifyAuthToken(req);
        const uid = decodedToken.uid;

        // Validate confirmation phrase (safety check)
        const { reason, confirmPhrase } = req.body || {};

        if (confirmPhrase !== 'DELETE MY ACCOUNT') {
            return res.status(400).json({
                success: false,
                error: 'Confirmation required',
                message: 'Please confirm by sending confirmPhrase: "DELETE MY ACCOUNT"'
            });
        }

        // Log the deletion request
        await logAuditEvent({
            action: 'ACCOUNT_DELETION_REQUESTED',
            userId: uid,
            performedBy: 'user',
            details: {
                reason: reason || 'User requested account deletion',
                ip: req.ip,
                userAgent: req.headers['user-agent']
            }
        });

        // Process account deletion
        const result = await deleteUserAccount(uid, {
            requestedBy: 'user',
            reason: reason || 'User requested account deletion'
        });

        if (result.success) {
            res.status(200).json({
                success: true,
                message: 'Account deletion processed successfully',
                data: {
                    deletionType: result.deletionType,
                    hasArchivedRecords: result.hasLegalRecords,
                    processingTimeMs: result.processingTimeMs,
                    whatHappened: result.deletionType === 'anonymize_and_archive'
                        ? 'Your personal data has been deleted. Legal records (contracts, shifts, payroll) have been archived for 10 years as required by Swiss law.'
                        : 'Your account has been fully deleted.',
                    retentionInfo: result.hasLegalRecords
                        ? 'Legal records will be automatically purged after 10 years (Art. 958f CO).'
                        : null
                }
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Deletion failed',
                message: 'Account deletion encountered errors',
                errors: result.errors
            });
        }

    } catch (error) {
        console.error('[AccountAPI] Error deleting account:', error);

        if (error.message.includes('authorization')) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

/**
 * POST /account/check-bonus-eligibility
 * 
 * Check if an AVS/GLN number has already claimed bonuses.
 * Used during registration to prevent bonus abuse.
 * 
 * Body:
 * - identifier: AVS or GLN number
 * - type: 'avs' or 'gln'
 */
const checkBonusEligibility = onRequest({
    region: 'europe-west6',
    cors: true
}, async (req, res) => {
    // Manually handle CORS
    if (setCorsHeaders(req, res)) return;

    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });
    }

    try {
        const { identifier, type = 'avs' } = req.body || {};

        if (!identifier) {
            return res.status(400).json({
                success: false,
                error: 'Missing identifier',
                message: 'Please provide an AVS or GLN number'
            });
        }

        // Check if this identifier has been used before
        const hasClaimedBefore = await checkAntifraudHash(identifier, type);

        res.status(200).json({
            success: true,
            data: {
                isEligibleForBonus: !hasClaimedBefore,
                reason: hasClaimedBefore
                    ? 'This identifier has been associated with a previous account.'
                    : null
            }
        });

    } catch (error) {
        console.error('[AccountAPI] Error checking bonus eligibility:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

/**
 * GET /account/data-export
 * 
 * Export all user data (GDPR Right of Access).
 * Returns all data the platform holds about the user.
 */
const dataExport = onRequest({
    region: 'europe-west6',
    cors: true,
    timeoutSeconds: 120
}, async (req, res) => {
    // Manually handle CORS
    if (setCorsHeaders(req, res)) return;

    try {
        // Verify authentication
        const decodedToken = await verifyAuthToken(req);
        const uid = decodedToken.uid;

        // Collect all user data
        const exportData = {
            exportDate: new Date().toISOString(),
            userId: uid,
            data: {}
        };

        // User profile
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
            exportData.data.profile = userDoc.data();
        }

        // Contracts
        const contractsSnap = await db.collection('contracts')
            .where('userId', '==', uid)
            .get();
        exportData.data.contracts = contractsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Shifts
        const shiftsSnap = await db.collection('shifts')
            .where('workerId', '==', uid)
            .get();
        exportData.data.shifts = shiftsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Payroll
        const payrollSnap = await db.collection('payroll')
            .where('userId', '==', uid)
            .get();
        exportData.data.payroll = payrollSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Invoices
        const invoicesSnap = await db.collection('invoices')
            .where('userId', '==', uid)
            .get();
        exportData.data.invoices = invoicesSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Messages
        const messagesSnap = await db.collection('messages')
            .where('senderId', '==', uid)
            .get();
        exportData.data.messages = messagesSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Availability
        const availabilitySnap = await db.collection('availability')
            .where('userId', '==', uid)
            .get();
        exportData.data.availability = availabilitySnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Log the data export
        await logAuditEvent({
            action: 'DATA_EXPORT_REQUESTED',
            userId: uid,
            performedBy: 'user',
            details: {
                ip: req.ip,
                userAgent: req.headers['user-agent']
            }
        });

        res.status(200).json({
            success: true,
            message: 'Data export completed',
            data: exportData
        });

    } catch (error) {
        console.error('[AccountAPI] Error exporting data:', error);

        if (error.message.includes('authorization')) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

module.exports = {
    deletionPreview,
    deleteAccount,
    checkBonusEligibility,
    dataExport
};
