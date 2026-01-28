/**
 * Account Deletion Service
 * 
 * Compliant with:
 * - Swiss nFADP/revDSG (Right to be Forgotten)
 * - Swiss Code of Obligations Art. 958f (10-Year Record Retention)
 * - GDPR Article 17 (Right to Erasure)
 * 
 * Strategy: "Anonymize & Archive" - not "Delete Everything"
 * 
 * Data Classification:
 * - Bucket A: DELETE IMMEDIATELY (Profile photo, bio, chat messages, phone link)
 * - Bucket B: KEEP FOR 10 YEARS (Contracts, shift logs, payroll, invoices, AVS)
 * - Bucket C: ANTI-FRAUD HASH (Permanent SHA256 hash of AVS/GLN)
 */

const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const crypto = require('crypto');
const config = require('../config');
const { logAuditEvent } = require('./auditLog');
const { FIRESTORE_COLLECTIONS, FIRESTORE_DATABASE_NAME } = require('../../../Medishift/functions/config/keysDatabasections/config/keysDatabase');

const db = getFirestore(admin.app(), FIRESTORE_DATABASE_NAME);
const FieldValue = admin.firestore.FieldValue;

// Salt for hashing - should be stored in environment variables in production
const HASH_SALT = config.security?.accountDeletionSalt || process.env.ACCOUNT_DELETION_SALT || 'MediShift-gdpr-compliant-2024';

/**
 * Determine if user has any legal records that require 10-year retention
 * @param {string} uid - User ID
 * @returns {Promise<{hasRecords: boolean, records: Object}>}
 */
async function checkLegalRecordRequirements(uid) {
    const records = {
        contracts: [],
        shifts: [],
        payroll: [],
        invoices: [],
        hasAnyRecords: false
    };

    try {
        // Check for employment contracts
        const contractsSnap = await db.collection(FIRESTORE_COLLECTIONS.CONTRACTS)
            .where('userId', '==', uid)
            .get();
        records.contracts = contractsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Check for completed shifts (proof of work)
        const shiftsSnap = await db.collection('shifts')
            .where('workerId', '==', uid)
            .where('status', '==', 'completed')
            .get();
        records.shifts = shiftsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Check for payroll records
        const payrollSnap = await db.collection('payroll')
            .where('userId', '==', uid)
            .get();
        records.payroll = payrollSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Check for invoices
        const invoicesSnap = await db.collection('invoices')
            .where('userId', '==', uid)
            .get();
        records.invoices = invoicesSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        records.hasAnyRecords =
            records.contracts.length > 0 ||
            records.shifts.length > 0 ||
            records.payroll.length > 0 ||
            records.invoices.length > 0;

    } catch (error) {
        console.error('[AccountDeletion] Error checking legal records:', error);
        throw error;
    }

    return records;
}

/**
 * Check if user has claimed any bonuses
 * @param {string} uid - User ID
 * @returns {Promise<{hasBonuses: boolean, bonuses: Array}>}
 */
async function checkBonusClaims(uid) {
    try {
        const bonusSnap = await db.collection('bonusClaims')
            .where('userId', '==', uid)
            .get();

        return {
            hasBonuses: !bonusSnap.empty,
            bonuses: bonusSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
        };
    } catch (error) {
        console.error('[AccountDeletion] Error checking bonuses:', error);
        return { hasBonuses: false, bonuses: [] };
    }
}

/**
 * Create SHA256 hash of AVS/GLN number for anti-fraud protection
 * @param {string} identifier - AVS or GLN number
 * @param {string} type - 'avs' or 'gln'
 * @returns {string} - SHA256 hash
 */
function createAntifraudHash(identifier, type = 'avs') {
    if (!identifier) return null;

    const combined = `${type}:${identifier}:${HASH_SALT}`;
    return crypto.createHash('sha256').update(combined).digest('hex');
}

/**
 * Archive legal records to cold storage (10-year retention)
 * @param {string} uid - User ID
 * @param {Object} userData - User document data
 * @param {Object} legalRecords - Legal records to archive
 */
async function archiveLegalRecords(uid, userData, legalRecords) {
    const archiveData = {
        // Identification
        original_uid: uid,

        // Required personal data for legal records (Art. 958f CO)
        full_name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Unknown',
        avs_number: userData.avsNumber || userData.avs_number || null,
        gln_number: userData.glnNumber || userData.gln_number || null,

        // Archive metadata
        archive_date: FieldValue.serverTimestamp(),
        archive_reason: 'User requested deletion - Statutory Retention (Art. 958f CO)',
        retention_until: new Date(Date.now() + (10 * 365 * 24 * 60 * 60 * 1000)), // 10 years from now

        // Legal records summary
        contracts_count: legalRecords.contracts.length,
        shifts_count: legalRecords.shifts.length,
        payroll_count: legalRecords.payroll.length,
        invoices_count: legalRecords.invoices.length,

        // Detailed records (stored as subcollections or embedded)
        contracts: legalRecords.contracts.map(c => ({
            id: c.id,
            facilityId: c.facilityId,
            startDate: c.startDate,
            endDate: c.endDate,
            contractType: c.contractType,
            status: c.status
        })),
        shifts: legalRecords.shifts.map(s => ({
            id: s.id,
            facilityId: s.facilityId,
            date: s.date,
            hoursWorked: s.hoursWorked,
            status: s.status
        })),
        payroll: legalRecords.payroll.map(p => ({
            id: p.id,
            period: p.period,
            amount: p.amount,
            status: p.status
        })),
        invoices: legalRecords.invoices.map(i => ({
            id: i.id,
            invoiceNumber: i.invoiceNumber,
            amount: i.amount,
            date: i.date,
            status: i.status
        }))
    };

    await db.collection('legal_archive').doc(uid).set(archiveData);

    return archiveData;
}

/**
 * Create anti-fraud hashes for bonus protection
 * @param {string} uid - User ID
 * @param {Object} userData - User document data
 * @param {Object} bonusInfo - Bonus claims info
 */
async function createAntiFraudHashes(uid, userData, bonusInfo) {
    const hashes = [];

    // Hash AVS number if exists
    if (userData.avsNumber || userData.avs_number) {
        const avsHash = createAntifraudHash(userData.avsNumber || userData.avs_number, 'avs');
        if (avsHash) {
            await db.collection('antifraud_hashes').doc(avsHash).set({
                hash_type: 'avs',
                original_uid: uid,
                created_at: FieldValue.serverTimestamp(),
                reason: 'account_deletion',
                claimed_bonuses: bonusInfo.hasBonuses,
                bonus_count: bonusInfo.bonuses.length
            });
            hashes.push({ type: 'avs', hash: avsHash });
        }
    }

    // Hash GLN number if exists
    if (userData.glnNumber || userData.gln_number) {
        const glnHash = createAntifraudHash(userData.glnNumber || userData.gln_number, 'gln');
        if (glnHash) {
            await db.collection('antifraud_hashes').doc(glnHash).set({
                hash_type: 'gln',
                original_uid: uid,
                created_at: FieldValue.serverTimestamp(),
                reason: 'account_deletion'
            });
            hashes.push({ type: 'gln', hash: glnHash });
        }
    }

    return hashes;
}

/**
 * Delete data that should be immediately removed (Bucket A)
 * @param {string} uid - User ID
 */
async function deleteImmediateData(uid) {
    const deletedItems = [];

    try {
        // Delete profile photos from Storage
        const bucket = admin.storage().bucket();
        const [files] = await bucket.getFiles({
            prefix: `users/${uid}/`
        });

        for (const file of files) {
            await file.delete();
            deletedItems.push(`storage:${file.name}`);
        }

        // Delete chat messages (unless they constitute legal order modifications)
        const chatMessagesSnap = await db.collection(FIRESTORE_COLLECTIONS.MESSAGES)
            .where('senderId', '==', uid)
            .get();

        const batch = db.batch();
        let batchCount = 0;

        for (const doc of chatMessagesSnap.docs) {
            const message = doc.data();
            // Only delete non-legal messages (not contract modifications)
            if (!message.isLegalRecord && !message.isContractModification) {
                batch.delete(doc.ref);
                deletedItems.push(`message:${doc.id}`);
                batchCount++;

                // Firestore batch limit is 500
                if (batchCount >= 450) {
                    await batch.commit();
                    batchCount = 0;
                }
            }
        }

        if (batchCount > 0) {
            await batch.commit();
        }

        // Delete availability preferences
        const availabilitySnap = await db.collection('availability')
            .where('userId', '==', uid)
            .get();

        const availBatch = db.batch();
        availabilitySnap.docs.forEach(doc => {
            availBatch.delete(doc.ref);
            deletedItems.push(`availability:${doc.id}`);
        });
        await availBatch.commit();

        // Delete notifications
        const notificationsSnap = await db.collection(FIRESTORE_COLLECTIONS.NOTIFICATIONS)
            .where('userId', '==', uid)
            .get();

        const notifBatch = db.batch();
        notificationsSnap.docs.forEach(doc => {
            notifBatch.delete(doc.ref);
            deletedItems.push(`notification:${doc.id}`);
        });
        await notifBatch.commit();

    } catch (error) {
        console.error('[AccountDeletion] Error deleting immediate data:', error);
        throw error;
    }

    return deletedItems;
}

/**
 * Anonymize the user document (soft delete)
 * @param {string} uid - User ID
 */
async function anonymizeUserDocument(uid) {
    const anonymizedData = {
        // Anonymize personal data
        firstName: 'Deleted',
        lastName: 'User',
        email: `deleted_${uid}@interimed.archive`,
        phone: null,
        phonePrefix: null,
        photoURL: null,
        bio: null,
        aboutMe: null,

        // Remove sensitive identifiers from live DB
        avsNumber: null,
        avs_number: null,
        glnNumber: null,
        gln_number: null,

        // Clear profile data
        address: null,
        city: null,
        postalCode: null,
        country: null,
        dateOfBirth: null,
        nationality: null,

        // Clear professional data
        qualifications: [],
        skills: [],
        workExperience: [],
        education: [],
        languages: [],

        // Clear documents
        documents: [],

        // Mark as deleted
        isDeleted: true,
        deletedAt: FieldValue.serverTimestamp(),

        // Clear onboarding (but keep record of completion status)
        onboardingProgress: {
            professional: { deleted: true },
            facility: { deleted: true }
        },

        // Update timestamp
        updatedAt: FieldValue.serverTimestamp()
    };

    await db.collection(FIRESTORE_COLLECTIONS.USERS).doc(uid).update(anonymizedData);

    return anonymizedData;
}

/**
 * Revoke access and delete Firebase Auth user
 * @param {string} uid - User ID
 */
async function revokeUserAccess(uid) {
    try {
        // Revoke all refresh tokens
        await admin.auth().revokeRefreshTokens(uid);

        // Delete the Firebase Auth user
        await admin.auth().deleteUser(uid);

        return true;
    } catch (error) {
        console.error('[AccountDeletion] Error revoking user access:', error);
        throw error;
    }
}

/**
 * Main account deletion function
 * 
 * @param {string} uid - User ID to delete
 * @param {Object} options - Options
 * @param {string} options.requestedBy - Who requested the deletion (user/admin)
 * @param {string} options.reason - Reason for deletion
 * @returns {Promise<Object>} - Deletion summary
 */
async function deleteUserAccount(uid, options = {}) {
    const startTime = Date.now();
    const summary = {
        uid,
        success: false,
        timestamp: new Date(),
        requestedBy: options.requestedBy || 'user',
        reason: options.reason || 'User requested account deletion',
        actions: [],
        errors: []
    };


    try {
        // 1. Get user data
        const userDoc = await db.collection('users').doc(uid).get();

        if (!userDoc.exists) {
            throw new Error('User not found');
        }

        const userData = userDoc.data();
        summary.actions.push('Retrieved user data');

        // 2. Check for legal record requirements
        const legalRecords = await checkLegalRecordRequirements(uid);
        summary.hasLegalRecords = legalRecords.hasAnyRecords;
        summary.legalRecordsCounts = {
            contracts: legalRecords.contracts.length,
            shifts: legalRecords.shifts.length,
            payroll: legalRecords.payroll.length,
            invoices: legalRecords.invoices.length
        };
        summary.actions.push('Checked legal record requirements');

        // 3. Check for bonus claims
        const bonusInfo = await checkBonusClaims(uid);
        summary.hasBonusClaims = bonusInfo.hasBonuses;
        summary.actions.push('Checked bonus claims');

        // 4. If user has legal records, archive them (Bucket B)
        if (legalRecords.hasAnyRecords) {
            await archiveLegalRecords(uid, userData, legalRecords);
            summary.actions.push('Archived legal records for 10-year retention');
        }

        // 5. Create anti-fraud hashes (Bucket C) if user has AVS/GLN or bonuses
        if ((userData.avsNumber || userData.avs_number || userData.glnNumber || userData.gln_number) || bonusInfo.hasBonuses) {
            const hashes = await createAntiFraudHashes(uid, userData, bonusInfo);
            summary.antifraudHashes = hashes.length;
            summary.actions.push('Created anti-fraud hashes');
        }

        // 6. Delete immediate data (Bucket A)
        const deletedItems = await deleteImmediateData(uid);
        summary.deletedItems = deletedItems.length;
        summary.actions.push('Deleted immediate personal data');

        // 7. Anonymize user document (not delete - would break linked data)
        await anonymizeUserDocument(uid);
        summary.actions.push('Anonymized user document');

        // 8. Revoke access and delete Auth user
        await revokeUserAccess(uid);
        summary.actions.push('Revoked access and deleted authentication');

        // 9. Log audit event
        await logAuditEvent({
            action: 'ACCOUNT_DELETION',
            userId: uid,
            performedBy: options.requestedBy || 'user',
            details: {
                hasLegalRecords: legalRecords.hasAnyRecords,
                recordsArchived: legalRecords.hasAnyRecords,
                hasBonusClaims: bonusInfo.hasBonuses,
                deletionType: legalRecords.hasAnyRecords ? 'anonymize_and_archive' : 'full_deletion'
            },
            timestamp: FieldValue.serverTimestamp()
        });
        summary.actions.push('Logged audit event');

        summary.success = true;
        summary.deletionType = legalRecords.hasAnyRecords ? 'anonymize_and_archive' : 'full_deletion';
        summary.processingTimeMs = Date.now() - startTime;


    } catch (error) {
        console.error(`[AccountDeletion] Error deleting account for user ${uid}:`, error);
        summary.errors.push(error.message);
        summary.success = false;
    }

    return summary;
}

/**
 * Check if an AVS/GLN hash exists in the anti-fraud system
 * Used to prevent bonus abuse
 * @param {string} identifier - AVS or GLN number
 * @param {string} type - 'avs' or 'gln'
 * @returns {Promise<boolean>}
 */
async function checkAntifraudHash(identifier, type = 'avs') {
    const hash = createAntifraudHash(identifier, type);
    if (!hash) return false;

    const doc = await db.collection('antifraud_hashes').doc(hash).get();
    return doc.exists;
}

/**
 * Get deletion eligibility info for a user (for frontend preview)
 * @param {string} uid - User ID
 * @returns {Promise<Object>}
 */
async function getDeletionEligibility(uid) {
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
        throw new Error('User not found');
    }

    const legalRecords = await checkLegalRecordRequirements(uid);
    const bonusInfo = await checkBonusClaims(uid);

    return {
        uid,
        canBeFullyDeleted: !legalRecords.hasAnyRecords,
        hasLegalRecords: legalRecords.hasAnyRecords,
        recordsSummary: {
            contracts: legalRecords.contracts.length,
            completedShifts: legalRecords.shifts.length,
            payrollRecords: legalRecords.payroll.length,
            invoices: legalRecords.invoices.length
        },
        hasBonusClaims: bonusInfo.hasBonuses,
        deletionType: legalRecords.hasAnyRecords ? 'anonymize_and_archive' : 'full_deletion',
        retentionReason: legalRecords.hasAnyRecords
            ? 'Swiss Code of Obligations Art. 958f requires 10-year retention of business records.'
            : null,
        whatWillBeDeleted: [
            'Profile photo',
            'Biography and personal description',
            'Phone number link',
            'Chat messages (non-legal)',
            'Schedule preferences',
            'Notifications',
            'Login credentials'
        ],
        whatWillBeRetained: legalRecords.hasAnyRecords ? [
            'Name (for legal identification)',
            'AVS/AHV number (in secure archive)',
            'Employment contracts',
            'Shift/work records',
            'Payroll data',
            'Invoices'
        ] : [],
        retentionPeriod: legalRecords.hasAnyRecords ? '10 years from deletion date' : null
    };
}

module.exports = {
    deleteUserAccount,
    getDeletionEligibility,
    checkAntifraudHash,
    checkLegalRecordRequirements,
    checkBonusClaims,
    createAntifraudHash
};
