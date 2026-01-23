const { onDocumentUpdated, onDocumentDeleted } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

exports.syncFacilityRoles = onDocumentUpdated({
    document: 'facilityProfiles/{facilityId}',
    database: 'medishift',
    region: 'europe-west6'
}, async (event) => {
    const facilityId = event.params.facilityId;
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();

    const beforeEmployeesList = beforeData.employees || [];
    const afterEmployeesList = afterData.employees || [];

    const beforeUserIds = beforeEmployeesList.map(emp => emp.user_uid);
    const afterUserIds = afterEmployeesList.map(emp => emp.user_uid);

    const addedUsers = afterUserIds.filter(uid => !beforeUserIds.includes(uid));
    const removedUsers = beforeUserIds.filter(uid => !afterUserIds.includes(uid));
    const modifiedUsers = afterUserIds.filter(uid => beforeUserIds.includes(uid));

    try {
        const batch = admin.firestore().batch();
        let updatesCount = 0;

        for (const userId of addedUsers) {
            const userRef = admin.firestore().collection('users').doc(userId);
            const userDoc = await userRef.get();

            if (userDoc.exists) {
                const userData = userDoc.data();
                const currentRoles = userData.roles || [];
                const employeeEntry = afterEmployeesList.find(emp => emp.user_uid === userId);
                
                const existingIndex = currentRoles.findIndex(r => r.facility_uid === facilityId);
                let updatedRoles;
                
                if (existingIndex >= 0) {
                    updatedRoles = [...currentRoles];
                    updatedRoles[existingIndex] = {
                        facility_uid: facilityId,
                        roles: employeeEntry?.roles || ['employee']
                    };
                } else {
                    updatedRoles = [
                        ...currentRoles,
                        {
                            facility_uid: facilityId,
                            roles: employeeEntry?.roles || ['employee']
                        }
                    ];
                }

                batch.update(userRef, {
                    roles: updatedRoles,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                updatesCount++;
                console.log(`Added facility roles for user ${userId} in facility ${facilityId}`);
            }
        }

        for (const userId of removedUsers) {
            const userRef = admin.firestore().collection('users').doc(userId);
            const userDoc = await userRef.get();

            if (userDoc.exists) {
                const userData = userDoc.data();
                const currentRoles = userData.roles || [];
                const updatedRoles = currentRoles.filter(r => r.facility_uid !== facilityId);

                batch.update(userRef, {
                    roles: updatedRoles,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                updatesCount++;
                console.log(`Removed facility roles for user ${userId} from facility ${facilityId}`);
            }
        }

        for (const userId of modifiedUsers) {
            const beforeEmployee = beforeEmployeesList.find(emp => emp.user_uid === userId);
            const afterEmployee = afterEmployeesList.find(emp => emp.user_uid === userId);
            
            const beforeRolesStr = JSON.stringify(beforeEmployee?.roles || []);
            const afterRolesStr = JSON.stringify(afterEmployee?.roles || []);
            
            if (beforeRolesStr !== afterRolesStr) {
                const userRef = admin.firestore().collection('users').doc(userId);
                const userDoc = await userRef.get();

                if (userDoc.exists) {
                    const userData = userDoc.data();
                    const currentRoles = userData.roles || [];
                    const existingIndex = currentRoles.findIndex(r => r.facility_uid === facilityId);
                    
                    let updatedRoles;
                    if (existingIndex >= 0) {
                        updatedRoles = [...currentRoles];
                        updatedRoles[existingIndex] = {
                            facility_uid: facilityId,
                            roles: afterEmployee?.roles || ['employee']
                        };
                    } else {
                        updatedRoles = [
                            ...currentRoles,
                            {
                                facility_uid: facilityId,
                                roles: afterEmployee?.roles || ['employee']
                            }
                        ];
                    }

                    batch.update(userRef, {
                        roles: updatedRoles,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    updatesCount++;
                    console.log(`Updated facility roles for user ${userId} in facility ${facilityId}`);
                }
            }
        }

        if (updatesCount > 0) {
            await batch.commit();
            console.log(`Successfully synced ${updatesCount} user role(s) for facility ${facilityId}`);
        }

        return { success: true, updatesCount };
    } catch (error) {
        console.error('Error syncing facility roles:', error);
        throw error;
    }
});

exports.cleanupFacilityRoles = onDocumentDeleted({
    document: 'facilityProfiles/{facilityId}',
    database: 'medishift',
    region: 'europe-west6'
}, async (event) => {
    const facilityId = event.params.facilityId;
    const facilityData = event.data.data();
    const employeesList = facilityData?.employees || [];

    try {
        const batch = admin.firestore().batch();
        let updatesCount = 0;

        for (const employee of employeesList) {
            const userId = employee.user_uid;
            if (!userId) continue;

            const userRef = admin.firestore().collection('users').doc(userId);
            const userDoc = await userRef.get();

            if (userDoc.exists) {
                const userData = userDoc.data();
                const currentRoles = userData.roles || [];
                const updatedRoles = currentRoles.filter(r => r.facility_uid !== facilityId);

                batch.update(userRef, {
                    roles: updatedRoles,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                updatesCount++;
            }
        }

        if (updatesCount > 0) {
            await batch.commit();
            console.log(`Cleaned up ${updatesCount} user role(s) after facility ${facilityId} deletion`);
        }

        return { success: true, updatesCount };
    } catch (error) {
        console.error('Error cleaning up facility roles:', error);
        throw error;
    }
});

