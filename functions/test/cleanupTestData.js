const admin = require('firebase-admin');
const db = require('../database/db');

const cleanupTestData = async () => {
  console.log('Starting test data cleanup...\n');

  const testUserId = 'test_user_demo_2026';
  const organizationId = 'org_test_pharmacy_group';
  const facilityIds = [
    'facility_central_pharmacy',
    'facility_north_clinic',
    'facility_south_hospital'
  ];
  const employeeIds = [
    'employee_pharmacist_001',
    'employee_pharmacist_002',
    'employee_nurse_001',
    'employee_nurse_002',
    'employee_doctor_001',
    'employee_doctor_002',
    'employee_receptionist_001',
    'employee_receptionist_002'
  ];

  let deletedCount = 0;
  const allUserIds = [testUserId, ...employeeIds];

  console.log('=== DELETING FIREBASE AUTH USERS ===');
  for (const userId of allUserIds) {
    try {
      await admin.auth().deleteUser(userId);
      console.log(`✓ Deleted auth user: ${userId}`);
      deletedCount++;
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log(`  (Auth user not found: ${userId})`);
      } else {
        console.error(`✗ Error deleting auth user ${userId}:`, error.message);
      }
    }
  }

  console.log('\n=== DELETING USER DOCUMENTS ===');
  for (const userId of allUserIds) {
    try {
      await db.collection('users').doc(userId).delete();
      console.log(`✓ Deleted user doc: ${userId}`);
      deletedCount++;
    } catch (error) {
      console.error(`✗ Error deleting user doc ${userId}:`, error.message);
    }
  }

  console.log('\n=== DELETING PROFESSIONAL PROFILES ===');
  for (const userId of allUserIds) {
    try {
      await db.collection('professionalProfiles').doc(userId).delete();
      console.log(`✓ Deleted professional profile: ${userId}`);
      deletedCount++;
    } catch (error) {
      console.error(`✗ Error deleting profile ${userId}:`, error.message);
    }
  }

  console.log('\n=== DELETING ADMIN ACCOUNT ===');
  try {
    await db.collection('admins').doc(testUserId).delete();
    console.log(`✓ Deleted admin doc: ${testUserId}`);
    deletedCount++;
  } catch (error) {
    console.error(`✗ Error deleting admin doc:`, error.message);
  }

  console.log('\n=== DELETING FACILITIES ===');
  for (const facilityId of facilityIds) {
    try {
      await db.collection('facilityProfiles').doc(facilityId).delete();
      console.log(`✓ Deleted facility: ${facilityId}`);
      deletedCount++;
    } catch (error) {
      console.error(`✗ Error deleting facility ${facilityId}:`, error.message);
    }
  }

  console.log('\n=== DELETING ORGANIZATION ===');
  try {
    await db.collection('organizations').doc(organizationId).delete();
    console.log(`✓ Deleted organization: ${organizationId}`);
    deletedCount++;
  } catch (error) {
    console.error(`✗ Error deleting organization:`, error.message);
  }

  console.log('\n=== DELETING EVENTS ===');
  try {
    const eventsQuery = await db.collection('events')
      .where('userId', '==', testUserId)
      .get();
    
    const batch = db.batch();
    eventsQuery.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    console.log(`✓ Deleted ${eventsQuery.size} events`);
    deletedCount += eventsQuery.size;
  } catch (error) {
    console.error(`✗ Error deleting events:`, error.message);
  }

  console.log('\n=== DELETING JOB POSTINGS ===');
  try {
    const positionsQuery = await db.collection('positions')
      .where('organizationId', '==', organizationId)
      .get();
    
    const batch = db.batch();
    positionsQuery.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    console.log(`✓ Deleted ${positionsQuery.size} job postings`);
    deletedCount += positionsQuery.size;
  } catch (error) {
    console.error(`✗ Error deleting positions:`, error.message);
  }

  console.log('\n=== DELETING CONTRACTS ===');
  try {
    const contractsQuery = await db.collection('contracts')
      .where('organizationId', '==', organizationId)
      .get();
    
    const batch = db.batch();
    contractsQuery.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    console.log(`✓ Deleted ${contractsQuery.size} contracts`);
    deletedCount += contractsQuery.size;
  } catch (error) {
    console.error(`✗ Error deleting contracts:`, error.message);
  }

  console.log('\n=== DELETING NOTIFICATIONS ===');
  try {
    const notificationsQuery = await db.collection('notifications')
      .where('userId', '==', testUserId)
      .get();
    
    const batch = db.batch();
    notificationsQuery.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    console.log(`✓ Deleted ${notificationsQuery.size} notifications`);
    deletedCount += notificationsQuery.size;
  } catch (error) {
    console.error(`✗ Error deleting notifications:`, error.message);
  }

  console.log('\n=== CLEANUP COMPLETE ===');
  console.log(`Total items deleted: ${deletedCount}`);
  console.log('\nTest data has been removed from the database.');

  return {
    success: true,
    deletedCount
  };
};

module.exports = { cleanupTestData };

if (require.main === module) {
  cleanupTestData()
    .then(() => {
      console.log('\n✓ Cleanup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n✗ Error:', error);
      process.exit(1);
    });
}

