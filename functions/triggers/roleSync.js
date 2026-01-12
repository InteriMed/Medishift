const { onDocumentUpdated, onDocumentDeleted } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

/**
 * Role Synchronization Trigger
 * Automatically syncs user roles when facility admin/employees arrays change
 */

/**
 * Sync user roles when facility admin array changes
 */
exports.syncAdminRoles = onDocumentUpdated({
    document: 'facilityProfiles/{facilityId}',
    database: 'medishift',
    region: 'europe-west6'
}, async (event) => {
    const facilityId = event.params.facilityId;
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();

    const beforeAdmins = beforeData.admin || [];
    const afterAdmins = afterData.admin || [];
    const beforeEmployees = beforeData.employees || [];
    const afterEmployees = afterData.employees || [];

    const facilityName = afterData.legalInfo?.tradeName || afterData.legalInfo?.legalCompanyName || 'Facility';

    try {
        const batch = admin.firestore().batch();
        let updatesCount = 0;

        // ====================================
        // ADMIN ROLE CHANGES
        // ====================================

        // Find users added to admin
        const addedAdmins = afterAdmins.filter(uid => !beforeAdmins.includes(uid));

        // Find users removed from admin
        const removedAdmins = beforeAdmins.filter(uid => !afterAdmins.includes(uid));

        // Add admin roles
        for (const userId of addedAdmins) {
            const userRef = admin.firestore().collection('users').doc(userId);
            const userDoc = await userRef.get();

            if (userDoc.exists) {
                const userData = userDoc.data();
                const currentRoles = userData.roles || [];
                const adminRole = `facility_admin_${facilityId}`;
                const employeeRole = `facility_employee_${facilityId}`;

                // Remove employee role if exists (upgraded to admin)
                const updatedRoles = currentRoles
                    .filter(role => role !== employeeRole)
                    .concat(currentRoles.includes(adminRole) ? [] : [adminRole]);

                // Update facility memberships
                const currentMemberships = userData.facilityMemberships || [];
                const membershipIndex = currentMemberships.findIndex(m => m.facilityProfileId === facilityId);

                let updatedMemberships;
                if (membershipIndex >= 0) {
                    // Update existing membership
                    updatedMemberships = [...currentMemberships];
                    updatedMemberships[membershipIndex] = {
                        facilityProfileId: facilityId,
                        facilityName: facilityName,
                        role: 'admin'
                    };
                } else {
                    // Add new membership
                    updatedMemberships = [
                        ...currentMemberships,
                        {
                            facilityProfileId: facilityId,
                            facilityName: facilityName,
                            role: 'admin'
                        }
                    ];
                }

                batch.update(userRef, {
                    roles: updatedRoles,
                    facilityMemberships: updatedMemberships,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                updatesCount++;

                console.log(`Added admin role for user ${userId} in facility ${facilityId}`);
            }
        }

        // Remove admin roles
        for (const userId of removedAdmins) {
            const userRef = admin.firestore().collection('users').doc(userId);
            const userDoc = await userRef.get();

            if (userDoc.exists) {
                const userData = userDoc.data();
                const currentRoles = userData.roles || [];
                const adminRole = `facility_admin_${facilityId}`;
                const employeeRole = `facility_employee_${facilityId}`;

                // Remove admin role
                let updatedRoles = currentRoles.filter(role => role !== adminRole);

                // If user is still in employees array, add employee role
                if (afterEmployees.includes(userId)) {
                    if (!updatedRoles.includes(employeeRole)) {
                        updatedRoles.push(employeeRole);
                    }
                }

                // Update facility memberships
                const currentMemberships = userData.facilityMemberships || [];
                let updatedMemberships;

                if (afterEmployees.includes(userId)) {
                    // Downgrade to employee
                    const membershipIndex = currentMemberships.findIndex(m => m.facilityProfileId === facilityId);
                    if (membershipIndex >= 0) {
                        updatedMemberships = [...currentMemberships];
                        updatedMemberships[membershipIndex] = {
                            facilityProfileId: facilityId,
                            facilityName: facilityName,
                            role: 'employee'
                        };
                    }
                } else {
                    // Remove membership entirely
                    updatedMemberships = currentMemberships.filter(m => m.facilityProfileId !== facilityId);
                }

                batch.update(userRef, {
                    roles: updatedRoles,
                    facilityMemberships: updatedMemberships,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                updatesCount++;

                console.log(`Removed admin role for user ${userId} in facility ${facilityId}`);
            }
        }

        // ====================================
        // EMPLOYEE ROLE CHANGES
        // ====================================

        // Find users added to employees (but not admins)
        const addedEmployees = afterEmployees.filter(uid =>
            !beforeEmployees.includes(uid) && !afterAdmins.includes(uid)
        );

        // Find users removed from employees (and not in admins)
        const removedEmployees = beforeEmployees.filter(uid =>
            !afterEmployees.includes(uid) && !afterAdmins.includes(uid)
        );

        // Add employee roles
        for (const userId of addedEmployees) {
            const userRef = admin.firestore().collection('users').doc(userId);
            const userDoc = await userRef.get();

            if (userDoc.exists) {
                const userData = userDoc.data();
                const currentRoles = userData.roles || [];
                const employeeRole = `facility_employee_${facilityId}`;

                if (!currentRoles.includes(employeeRole)) {
                    const updatedRoles = [...currentRoles, employeeRole];

                    // Update facility memberships
                    const currentMemberships = userData.facilityMemberships || [];
                    const updatedMemberships = [
                        ...currentMemberships,
                        {
                            facilityProfileId: facilityId,
                            facilityName: facilityName,
                            role: 'employee'
                        }
                    ];

                    batch.update(userRef, {
                        roles: updatedRoles,
                        facilityMemberships: updatedMemberships,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    updatesCount++;

                    console.log(`Added employee role for user ${userId} in facility ${facilityId}`);
                }
            }
        }

        // Remove employee roles
        for (const userId of removedEmployees) {
            const userRef = admin.firestore().collection('users').doc(userId);
            const userDoc = await userRef.get();

            if (userDoc.exists) {
                const userData = userDoc.data();
                const currentRoles = userData.roles || [];
                const employeeRole = `facility_employee_${facilityId}`;

                const updatedRoles = currentRoles.filter(role => role !== employeeRole);
                const currentMemberships = userData.facilityMemberships || [];
                const updatedMemberships = currentMemberships.filter(m => m.facilityProfileId !== facilityId);

                batch.update(userRef, {
                    roles: updatedRoles,
                    facilityMemberships: updatedMemberships,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                updatesCount++;

                console.log(`Removed employee role for user ${userId} in facility ${facilityId}`);
            }
        }

        // Commit all updates
        if (updatesCount > 0) {
            await batch.commit();
            console.log(`Successfully synced ${updatesCount} user role changes for facility ${facilityId}`);
        }

        return { success: true, updatesCount };
    } catch (error) {
        console.error('Error syncing roles:', error);
        throw error;
    }
});

/**
 * Clean up roles when facility is deleted
 */
exports.cleanupRolesOnFacilityDelete = onDocumentDeleted({
    document: 'facilityProfiles/{facilityId}',
    database: 'medishift',
    region: 'europe-west6'
}, async (event) => {
    const facilityId = event.params.facilityId;
    const facilityData = event.data.data();
    const admins = facilityData.admin || [];
    const employees = facilityData.employees || [];
    const allMembers = [...new Set([...admins, ...employees])];

    try {
        const batch = admin.firestore().batch();

        for (const userId of allMembers) {
            const userRef = admin.firestore().collection('users').doc(userId);
            const userDoc = await userRef.get();

            if (userDoc.exists) {
                const userData = userDoc.data();
                const currentRoles = userData.roles || [];
                const adminRole = `facility_admin_${facilityId}`;
                const employeeRole = `facility_employee_${facilityId}`;

                // Remove all facility-related roles
                const updatedRoles = currentRoles.filter(
                    role => role !== adminRole && role !== employeeRole
                );

                // Remove from facility memberships
                const currentMemberships = userData.facilityMemberships || [];
                const updatedMemberships = currentMemberships.filter(
                    m => m.facilityProfileId !== facilityId
                );

                batch.update(userRef, {
                    roles: updatedRoles,
                    facilityMemberships: updatedMemberships,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }

        await batch.commit();
        console.log(`Cleaned up roles for ${allMembers.length} users after facility ${facilityId} deletion`);

        return { success: true, cleanedUsers: allMembers.length };
    } catch (error) {
        console.error('Error cleaning up roles on facility delete:', error);
        throw error;
    }
});

module.exports = {
    syncAdminRoles: exports.syncAdminRoles,
    cleanupRolesOnFacilityDelete: exports.cleanupRolesOnFacilityDelete
};
