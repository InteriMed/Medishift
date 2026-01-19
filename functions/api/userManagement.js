const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

/**
 * Disables a user in Firebase Auth and updates their Firestore record with ban info.
 */
exports.disableUser = onCall({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be signed in to disable users');
    }

    // Check for admin role (assuming super_admin or admin role covers this)
    const callerId = request.auth.uid;
    const callerDoc = await admin.firestore().collection('users').doc(callerId).get();
    const callerData = callerDoc.data();
    const isAdmin = (callerData?.roles || []).some(role => ['super_admin', 'ops_manager'].includes(role));

    if (!isAdmin) {
        throw new HttpsError('permission-denied', 'You do not have permission to disable users');
    }

    const { userId, reason, banInfo } = request.data;

    if (!userId) {
        throw new HttpsError('invalid-argument', 'User ID is required');
    }

    try {
        const db = admin.firestore();

        // 1. Disable in Firebase Auth
        await admin.auth().updateUser(userId, {
            disabled: true
        });

        // 2. Revoke refresh tokens
        await admin.auth().revokeRefreshTokens(userId);

        // 3. Update Firestore record
        await db.collection('users').doc(userId).update({
            accountStatus: 'disabled',
            banReason: reason || 'Violation of terms',
            banDetails: banInfo || 'Your account has been disabled. Please contact support.',
            bannedAt: admin.firestore.FieldValue.serverTimestamp(),
            bannedBy: callerId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 4. Create audit log
        await db.collection('audit_logs').add({
            type: 'user_disabled',
            userId,
            performedBy: callerId,
            reason: reason || 'No reason provided',
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        logger.info(`User ${userId} disabled by ${callerId}`);

        return { success: true, message: 'User account has been disabled' };
    } catch (error) {
        logger.error('Error disabling user:', error);
        throw new HttpsError('internal', error.message || 'Failed to disable user');
    }
});
