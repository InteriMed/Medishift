/**
 * Employee Lifecycle Management
 * 
 * Handles employee termination and account deletion with
 * Swiss Code of Obligations compliance (10-year retention).
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const config = require('../config');

/**
 * Terminate an employee from a facility
 * 
 * This function:
 * 1. Removes user from facility's employee/admin list
 * 2. Updates professional profile
 * 3. Revokes auth tokens (force logout)
 * 4. Cancels/unassigns future shifts
 * 5. Creates audit log
 */
const terminateEmployee = onCall(
    {
        region: config.region,
        enforceAppCheck: false
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'You must be logged in');
        }

        const { userId, facilityId, reason, effectiveDate } = request.data;
        const performedBy = request.auth.uid;
        const db = admin.firestore();

        if (!userId || !facilityId) {
            throw new HttpsError('invalid-argument', 'userId and facilityId are required');
        }

        logger.info(`Termination initiated`, { userId, facilityId, performedBy });

        try {
            // Verify caller is facility admin
            const facilityDoc = await db.collection('facilityProfiles').doc(facilityId).get();

            if (!facilityDoc.exists) {
                throw new HttpsError('not-found', 'Facility not found');
            }

            const facilityData = facilityDoc.data();
            const isAdmin = facilityData.admins?.includes(performedBy) ||
                facilityData.chainAdmins?.includes(performedBy) ||
                performedBy === facilityId;

            if (!isAdmin) {
                throw new HttpsError('permission-denied', 'Only facility admins can terminate employees');
            }

            const batch = db.batch();
            const terminationDate = effectiveDate || new Date().toISOString();

            // 1. Remove from facility employees/admins
            const facilityRef = db.collection('facilityProfiles').doc(facilityId);
            batch.update(facilityRef, {
                employees: admin.firestore.FieldValue.arrayRemove(userId),
                admins: admin.firestore.FieldValue.arrayRemove(userId),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // 2. Update professional profile
            const profileRef = db.collection('professionalProfiles').doc(userId);
            const profileDoc = await profileRef.get();

            if (profileDoc.exists) {
                const profileData = profileDoc.data();

                // Add to employment history
                const historyEntry = {
                    facilityId,
                    facilityName: facilityData.companyName || facilityData.name,
                    startDate: profileData.currentEmployer?.startDate || null,
                    endDate: terminationDate,
                    reason: reason || 'Termination',
                    terminatedBy: performedBy
                };

                batch.update(profileRef, {
                    'currentEmployer': null,
                    'employmentHistory': admin.firestore.FieldValue.arrayUnion(historyEntry),
                    'accountStatus': 'terminated',
                    'terminatedAt': admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }

            // 3. Cancel future shifts
            const futureShiftsQuery = await db.collection('shifts')
                .where('assignedUserId', '==', userId)
                .where('facilityId', '==', facilityId)
                .where('date', '>', new Date(terminationDate))
                .get();

            let cancelledShifts = 0;
            futureShiftsQuery.forEach(doc => {
                batch.update(doc.ref, {
                    status: 'cancelled',
                    assignedUserId: null,
                    userType: null,
                    cancellationReason: `Employee terminated: ${reason || 'No reason provided'}`,
                    cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
                    cancelledBy: performedBy
                });
                cancelledShifts++;
            });

            // 4. Create audit log
            const auditRef = db.collection('audit_logs').doc();
            batch.set(auditRef, {
                type: 'employee_termination',
                userId,
                facilityId,
                performedBy,
                reason: reason || 'No reason provided',
                effectiveDate: terminationDate,
                shiftsUnassigned: cancelledShifts,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                region: config.region
            });

            // Commit batch
            await batch.commit();

            // 5. Revoke auth tokens (force logout) - do this after batch succeeds
            try {
                await admin.auth().revokeRefreshTokens(userId);
                logger.info(`Auth tokens revoked for ${userId}`);
            } catch (authError) {
                logger.warn(`Could not revoke tokens for ${userId}`, { error: authError.message });
                // Don't fail the operation if token revocation fails
            }

            logger.info(`Termination completed`, { userId, facilityId, cancelledShifts });

            return {
                success: true,
                message: 'Employee terminated successfully',
                shiftsUnassigned: cancelledShifts,
                effectiveDate: terminationDate
            };

        } catch (error) {
            logger.error('Termination failed', { error: error.message, userId, facilityId });

            if (error instanceof HttpsError) {
                throw error;
            }

            throw new HttpsError('internal', 'Failed to terminate employee');
        }
    }
);

/**
 * Delete account with Swiss law compliance
 * 
 * Implements "Soft Delete" (Anonymization) to keep legal logs
 * for 10 years as per Swiss Code of Obligations.
 */
const deleteAccount = onCall(
    {
        region: config.region,
        enforceAppCheck: false
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'You must be logged in');
        }

        const userId = request.auth.uid;
        const { reason, confirmDeletion } = request.data || {};
        const db = admin.firestore();

        if (!confirmDeletion) {
            throw new HttpsError(
                'failed-precondition',
                'You must confirm deletion by setting confirmDeletion to true'
            );
        }

        logger.info(`Account deletion initiated`, { userId });

        try {
            // Check for financial records
            const [contracts, payrollRequests] = await Promise.all([
                db.collection('contracts')
                    .where('parties.professional.profileId', '==', userId)
                    .limit(1)
                    .get(),
                db.collection('payroll_requests')
                    .where('workerUid', '==', userId)
                    .limit(1)
                    .get()
            ]);

            const hasFinancialRecords = !contracts.empty || !payrollRequests.empty;

            // Calculate retention date (10 years from now)
            const retentionDate = new Date();
            retentionDate.setFullYear(retentionDate.getFullYear() + config.dataRetention.financialRecordsYears);

            const batch = db.batch();

            if (hasFinancialRecords) {
                // Soft delete - anonymize but retain for legal compliance
                logger.info(`Soft deleting account with financial records`, { userId });

                const anonymizedData = {
                    // Anonymize PII
                    fullName: `DELETED_USER_${userId.substring(0, 8)}`,
                    firstName: 'Deleted',
                    lastName: 'User',
                    email: `deleted_${userId}@anonymized.local`,
                    phone: null,
                    dateOfBirth: null,
                    address: null,

                    // Retain for legal compliance
                    originalUserId: userId,
                    deletedAt: admin.firestore.FieldValue.serverTimestamp(),
                    deletionReason: reason || 'user_request',
                    accountStatus: 'deleted',
                    isAnonymized: true,

                    // Retention tracking
                    hadContracts: !contracts.empty,
                    hadPayments: !payrollRequests.empty,
                    retentionUntil: retentionDate,

                    // Clear sensitive data
                    glnNumber: null,
                    documents: [],
                    workHistory: [],

                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                };

                // Update professional profile
                const profileRef = db.collection('professionalProfiles').doc(userId);
                if ((await profileRef.get()).exists) {
                    batch.update(profileRef, anonymizedData);
                }

                // Update facility profile if exists
                const facilityRef = db.collection('facilityProfiles').doc(userId);
                if ((await facilityRef.get()).exists) {
                    batch.update(facilityRef, {
                        ...anonymizedData,
                        companyName: `DELETED_FACILITY_${userId.substring(0, 8)}`,
                        billing: null
                    });
                }

                // Update base user record
                const userRef = db.collection('users').doc(userId);
                if ((await userRef.get()).exists) {
                    batch.update(userRef, {
                        email: anonymizedData.email,
                        fullName: anonymizedData.fullName,
                        accountStatus: 'deleted',
                        deletedAt: admin.firestore.FieldValue.serverTimestamp(),
                        retentionUntil: retentionDate
                    });
                }

            } else {
                // Full delete - no financial records to retain
                logger.info(`Full deleting account without financial records`, { userId });

                const profileRef = db.collection('professionalProfiles').doc(userId);
                const facilityRef = db.collection('facilityProfiles').doc(userId);
                const userRef = db.collection('users').doc(userId);

                if ((await profileRef.get()).exists) batch.delete(profileRef);
                if ((await facilityRef.get()).exists) batch.delete(facilityRef);
                if ((await userRef.get()).exists) batch.delete(userRef);
            }

            // Create audit log (permanent, never deleted)
            const auditRef = db.collection('audit_logs').doc();
            batch.set(auditRef, {
                type: 'account_deletion',
                userId,
                deletionType: hasFinancialRecords ? 'anonymized' : 'full',
                reason: reason || 'user_request',
                hadFinancialRecords: hasFinancialRecords,
                retentionUntil: hasFinancialRecords ? retentionDate : null,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                region: config.region
            });

            // Commit batch
            await batch.commit();

            // Delete Firebase Auth account
            try {
                await admin.auth().deleteUser(userId);
                logger.info(`Auth account deleted for ${userId}`);
            } catch (authError) {
                logger.warn(`Could not delete auth account for ${userId}`, { error: authError.message });
            }

            logger.info(`Account deletion completed`, {
                userId,
                type: hasFinancialRecords ? 'anonymized' : 'full'
            });

            return {
                success: true,
                deletionType: hasFinancialRecords ? 'anonymized_retained' : 'full_delete',
                retentionUntil: hasFinancialRecords ? retentionDate.toISOString() : null,
                message: hasFinancialRecords
                    ? `Account anonymized. Records retained until ${retentionDate.toLocaleDateString('de-CH')} per Swiss law.`
                    : 'Account fully deleted.'
            };

        } catch (error) {
            logger.error('Account deletion failed', { error: error.message, userId });

            if (error instanceof HttpsError) {
                throw error;
            }

            throw new HttpsError('internal', 'Failed to delete account');
        }
    }
);

/**
 * Scheduled cleanup of expired retention records
 * Runs every Sunday at 2 AM
 */
const cleanupExpiredRecords = onSchedule(
    {
        schedule: '0 2 * * 0', // Every Sunday at 2 AM
        region: config.region,
        timeZone: 'Europe/Zurich'
    },
    async (event) => {
        const db = admin.firestore();
        const now = new Date();

        logger.info('Starting expired records cleanup', { timestamp: now.toISOString() });

        try {
            // Find profiles past retention period
            const expiredProfiles = await db.collection('professionalProfiles')
                .where('accountStatus', '==', 'deleted')
                .where('retentionUntil', '<=', now)
                .limit(500)
                .get();

            const expiredFacilities = await db.collection('facilityProfiles')
                .where('accountStatus', '==', 'deleted')
                .where('retentionUntil', '<=', now)
                .limit(500)
                .get();

            let deletedCount = 0;
            const batch = db.batch();

            expiredProfiles.forEach(doc => {
                batch.delete(doc.ref);
                deletedCount++;
            });

            expiredFacilities.forEach(doc => {
                batch.delete(doc.ref);
                deletedCount++;
            });

            if (deletedCount > 0) {
                await batch.commit();
            }

            // Log cleanup
            await db.collection('audit_logs').add({
                type: 'automated_cleanup',
                recordsDeleted: deletedCount,
                profilesDeleted: expiredProfiles.size,
                facilitiesDeleted: expiredFacilities.size,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                region: config.region
            });

            logger.info('Expired records cleanup completed', { deletedCount });

            return { deletedCount };

        } catch (error) {
            logger.error('Expired records cleanup failed', { error: error.message });
            throw error;
        }
    }
);

/**
 * Restore a soft-deleted account (admin only)
 */
const restoreAccount = onCall(
    {
        region: config.region,
        enforceAppCheck: false
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'You must be logged in');
        }

        const { userId, newEmail } = request.data;
        const performedBy = request.auth.uid;
        const db = admin.firestore();

        // Check if performer is admin (you'd implement your admin check here)
        // For now, we'll just require authentication

        if (!userId || !newEmail) {
            throw new HttpsError('invalid-argument', 'userId and newEmail are required');
        }

        logger.info(`Account restoration initiated`, { userId, performedBy });

        try {
            const profileRef = db.collection('professionalProfiles').doc(userId);
            const profileDoc = await profileRef.get();

            if (!profileDoc.exists) {
                throw new HttpsError('not-found', 'Profile not found');
            }

            const data = profileDoc.data();

            if (data.accountStatus !== 'deleted') {
                throw new HttpsError('failed-precondition', 'Account is not deleted');
            }

            // Restore the account
            await profileRef.update({
                email: newEmail,
                accountStatus: 'restored',
                isAnonymized: false,
                restoredAt: admin.firestore.FieldValue.serverTimestamp(),
                restoredBy: performedBy,
                retentionUntil: null,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Create audit log
            await db.collection('audit_logs').add({
                type: 'account_restoration',
                userId,
                performedBy,
                newEmail,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                region: config.region
            });

            logger.info(`Account restored`, { userId });

            return {
                success: true,
                message: 'Account restored successfully. User must reset password.'
            };

        } catch (error) {
            logger.error('Account restoration failed', { error: error.message, userId });

            if (error instanceof HttpsError) {
                throw error;
            }

            throw new HttpsError('internal', 'Failed to restore account');
        }
    }
);

module.exports = {
    terminateEmployee,
    deleteAccount,
    cleanupExpiredRecords,
    restoreAccount
};
