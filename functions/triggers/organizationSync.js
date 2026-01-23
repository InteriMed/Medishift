/**
 * Organization Synchronization Triggers
 * 
 * Handles automatic syncing of chain admins to member facilities
 * when organizations are created or updated.
 */

const { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const config = require('../config');

/**
 * When an organization is created, initialize member facilities
 */
const onOrganizationCreated = onDocumentCreated(
    {
        document: 'organizations/{orgId}',
        region: config.region,
        database: 'medishift'
    },
    async (event) => {
        const orgData = event.data.data();
        const orgId = event.params.orgId;

        logger.info(`Organization created: ${orgId}`, { name: orgData.name });

        // If there are initial member facilities, sync chain admins to them
        if (orgData.memberFacilityIds && orgData.memberFacilityIds.length > 0) {
            await syncChainAdminsToFacilities(orgId, orgData.admins, orgData.memberFacilityIds);
        }

        return null;
    }
);

/**
 * When an organization is updated, sync admin changes to all member facilities
 */
const onOrganizationUpdated = onDocumentUpdated(
    {
        document: 'organizations/{orgId}',
        region: config.region,
        database: 'medishift'
    },
    async (event) => {
        const before = event.data.before.data();
        const after = event.data.after.data();
        const orgId = event.params.orgId;

        // Check if admins changed
        const adminsChanged = JSON.stringify(before.admins?.sort()) !== JSON.stringify(after.admins?.sort());

        // Check if member facilities changed
        const membersChanged = JSON.stringify(before.memberFacilityIds?.sort()) !== JSON.stringify(after.memberFacilityIds?.sort());

        if (!adminsChanged && !membersChanged) {
            logger.info(`No relevant changes to organization ${orgId}`);
            return null;
        }

        logger.info(`Organization ${orgId} updated`, { adminsChanged, membersChanged });

        // If members changed, handle additions and removals
        if (membersChanged) {
            const beforeMembers = new Set(before.memberFacilityIds || []);
            const afterMembers = new Set(after.memberFacilityIds || []);

            // Find added facilities
            const addedFacilities = [...afterMembers].filter(f => !beforeMembers.has(f));

            // Find removed facilities
            const removedFacilities = [...beforeMembers].filter(f => !afterMembers.has(f));

            // Add chain admins to new facilities
            if (addedFacilities.length > 0) {
                await syncChainAdminsToFacilities(orgId, after.admins, addedFacilities);
            }

            // Remove chain admins from removed facilities
            if (removedFacilities.length > 0) {
                await removeChainAdminsFromFacilities(orgId, removedFacilities);
            }
        }

        // If admins changed, sync to all current members
        if (adminsChanged) {
            await syncChainAdminsToFacilities(orgId, after.admins, after.memberFacilityIds || []);
        }

        return null;
    }
);

/**
 * When an organization is deleted (soft delete), clean up references
 */
const onOrganizationDeleted = onDocumentDeleted(
    {
        document: 'organizations/{orgId}',
        region: config.region,
        database: 'medishift'
    },
    async (event) => {
        const orgData = event.data.data();
        const orgId = event.params.orgId;

        logger.info(`Organization deleted: ${orgId}`);

        // Remove organization reference from all member facilities
        if (orgData.memberFacilityIds && orgData.memberFacilityIds.length > 0) {
            await removeChainAdminsFromFacilities(orgId, orgData.memberFacilityIds);
        }

        return null;
    }
);

/**
 * Helper: Sync chain admins to member facilities
 */
async function syncChainAdminsToFacilities(orgId, admins, facilityIds) {
    if (!facilityIds || facilityIds.length === 0) return;

    const db = admin.firestore();
    const batch = db.batch();
    let updateCount = 0;

    for (const facilityId of facilityIds) {
        const facilityRef = db.collection('facilityProfiles').doc(facilityId);

        batch.update(facilityRef, {
            organizationId: orgId,
            chainAdmins: admins || [],
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        updateCount++;

        // Firestore batch limit is 500
        if (updateCount >= 490) {
            await batch.commit();
            logger.info(`Committed batch of ${updateCount} facility updates`);
            updateCount = 0;
        }
    }

    if (updateCount > 0) {
        await batch.commit();
    }

    logger.info(`Synced chain admins to ${facilityIds.length} facilities for org ${orgId}`);
}

/**
 * Helper: Remove chain admins from facilities
 */
async function removeChainAdminsFromFacilities(orgId, facilityIds) {
    if (!facilityIds || facilityIds.length === 0) return;

    const db = admin.firestore();
    const batch = db.batch();

    for (const facilityId of facilityIds) {
        const facilityRef = db.collection('facilityProfiles').doc(facilityId);

        batch.update(facilityRef, {
            organizationId: null,
            chainAdmins: [],
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    await batch.commit();
    logger.info(`Removed chain admins from ${facilityIds.length} facilities`);
}

/**
 * Callable: Create a new organization
 */
const createOrganization = onCall(
    {
        region: config.region,
        enforceAppCheck: false
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'You must be logged in');
        }

        const { name, type, initialFacilityIds, settings, phonePrefix, phoneNumber } = request.data;
        const createdBy = request.auth.uid;
        const db = admin.firestore();

        if (!name) {
            throw new HttpsError('invalid-argument', 'Organization name is required');
        }

        logger.info(`Creating organization: ${name}`, { createdBy });

        try {
            // Verify the creator has admin rights on at least one facility
            if (initialFacilityIds && initialFacilityIds.length > 0) {
                for (const facilityId of initialFacilityIds) {
                    const facilityDoc = await db.collection('facilityProfiles').doc(facilityId).get();

                    if (!facilityDoc.exists) {
                        throw new HttpsError('not-found', `Facility ${facilityId} not found`);
                    }

                    const facilityData = facilityDoc.data();
                    const employeesList = facilityData.employees || [];
                    const isAdmin = employeesList.some(emp => emp.user_uid === createdBy && emp.roles?.includes('admin')) || facilityId === createdBy;

                    if (!isAdmin) {
                        throw new HttpsError('permission-denied', `You are not an admin of facility ${facilityId}`);
                    }
                }
            }

            // Update user document with phone number if provided
            if (phonePrefix && phoneNumber) {
                const userDocRef = db.collection('users').doc(createdBy);
                await userDocRef.update({
                    'contact.primaryPhonePrefix': phonePrefix,
                    'contact.primaryPhone': phoneNumber,
                    'primaryPhonePrefix': phonePrefix,
                    'primaryPhone': phoneNumber,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }

            // Create the organization
            const orgRef = await db.collection('organizations').add({
                name,
                type: type || 'group',
                admins: [createdBy],
                memberFacilityIds: initialFacilityIds || [],
                settings: {
                    consolidatedBilling: settings?.consolidatedBilling || false,
                    sharedStaffPool: settings?.sharedStaffPool || true,
                    crossFacilityScheduling: settings?.crossFacilityScheduling || true,
                    billingEmail: settings?.billingEmail || null,
                    invoiceConsolidation: settings?.invoiceConsolidation || 'per-shift'
                },
                phonePrefix: phonePrefix || null,
                phoneNumber: phoneNumber || null,
                status: 'active',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                createdBy,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            logger.info(`Organization created: ${orgRef.id}`);

            return {
                success: true,
                organizationId: orgRef.id,
                message: 'Organization created successfully'
            };

        } catch (error) {
            logger.error('Failed to create organization', { error: error.message });

            if (error instanceof HttpsError) {
                throw error;
            }

            throw new HttpsError('internal', 'Failed to create organization');
        }
    }
);

/**
 * Callable: Add a facility to an organization
 */
const addFacilityToOrganization = onCall(
    {
        region: config.region,
        enforceAppCheck: false
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'You must be logged in');
        }

        const { organizationId, facilityId } = request.data;
        const userId = request.auth.uid;
        const db = admin.firestore();

        if (!organizationId || !facilityId) {
            throw new HttpsError('invalid-argument', 'organizationId and facilityId are required');
        }

        try {
            // Get organization
            const orgDoc = await db.collection('organizations').doc(organizationId).get();
            if (!orgDoc.exists) {
                throw new HttpsError('not-found', 'Organization not found');
            }

            const orgData = orgDoc.data();

            // Verify user is org admin
            if (!orgData.admins?.includes(userId)) {
                throw new HttpsError('permission-denied', 'Only organization admins can add facilities');
            }

            // Get facility
            const facilityDoc = await db.collection('facilityProfiles').doc(facilityId).get();
            if (!facilityDoc.exists) {
                throw new HttpsError('not-found', 'Facility not found');
            }

            const facilityData = facilityDoc.data();

            // Check if facility is already in an organization
            if (facilityData.organizationId) {
                throw new HttpsError('already-exists', 'Facility is already part of an organization');
            }

            // Add facility to organization
            await db.collection('organizations').doc(organizationId).update({
                memberFacilityIds: admin.firestore.FieldValue.arrayUnion(facilityId),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Note: The onOrganizationUpdated trigger will handle syncing chain admins

            logger.info(`Facility ${facilityId} added to organization ${organizationId}`);

            return {
                success: true,
                message: 'Facility added to organization'
            };

        } catch (error) {
            logger.error('Failed to add facility to organization', { error: error.message });

            if (error instanceof HttpsError) {
                throw error;
            }

            throw new HttpsError('internal', 'Failed to add facility');
        }
    }
);

/**
 * Callable: Remove a facility from an organization
 */
const removeFacilityFromOrganization = onCall(
    {
        region: config.region,
        enforceAppCheck: false
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'You must be logged in');
        }

        const { organizationId, facilityId } = request.data;
        const userId = request.auth.uid;
        const db = admin.firestore();

        if (!organizationId || !facilityId) {
            throw new HttpsError('invalid-argument', 'organizationId and facilityId are required');
        }

        try {
            // Get organization
            const orgDoc = await db.collection('organizations').doc(organizationId).get();
            if (!orgDoc.exists) {
                throw new HttpsError('not-found', 'Organization not found');
            }

            const orgData = orgDoc.data();

            // Verify user is org admin
            if (!orgData.admins?.includes(userId)) {
                throw new HttpsError('permission-denied', 'Only organization admins can remove facilities');
            }

            // Remove facility from organization
            await db.collection('organizations').doc(organizationId).update({
                memberFacilityIds: admin.firestore.FieldValue.arrayRemove(facilityId),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Note: The onOrganizationUpdated trigger will handle removing chain admins

            logger.info(`Facility ${facilityId} removed from organization ${organizationId}`);

            return {
                success: true,
                message: 'Facility removed from organization'
            };

        } catch (error) {
            logger.error('Failed to remove facility from organization', { error: error.message });

            if (error instanceof HttpsError) {
                throw error;
            }

            throw new HttpsError('internal', 'Failed to remove facility');
        }
    }
);

module.exports = {
    onOrganizationCreated,
    onOrganizationUpdated,
    onOrganizationDeleted,
    createOrganization,
    addFacilityToOrganization,
    removeFacilityFromOrganization
};
