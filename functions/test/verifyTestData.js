#!/usr/bin/env node

const admin = require('firebase-admin');
const db = require('../database/db');

const verifyTestData = async () => {
  console.log('=== VERIFICATION DES DONNEES DE TEST ===\n');

  const testUserId = 'test_user_demo_2026';
  
  try {
    console.log('1. Verification de l\'utilisateur Auth...');
    try {
      const authUser = await admin.auth().getUser(testUserId);
      console.log('✓ Utilisateur Auth trouve:', authUser.email);
    } catch (error) {
      console.log('✗ Utilisateur Auth non trouve');
      return { success: false, error: 'Auth user not found' };
    }

    console.log('\n2. Verification du document users...');
    const userDoc = await db.collection('users').doc(testUserId).get();
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('✓ Document users trouve');
      console.log('  - Email:', userData.email);
      console.log('  - Roles:', JSON.stringify(userData.roles, null, 2));
    } else {
      console.log('✗ Document users non trouve');
      return { success: false, error: 'User document not found' };
    }

    console.log('\n3. Verification du professionalProfile...');
    const profileDoc = await db.collection('professionalProfiles').doc(testUserId).get();
    if (profileDoc.exists()) {
      const profileData = profileDoc.data();
      console.log('✓ Professional profile trouve');
      console.log('  - Profile Type:', profileData.profileType);
      console.log('  - Email:', profileData.email);
      console.log('  - Subscription:', profileData.subscriptionTier);
    } else {
      console.log('✗ Professional profile non trouve');
      return { success: false, error: 'Professional profile not found' };
    }

    console.log('\n4. Verification du compte admin...');
    const adminDoc = await db.collection('admins').doc(testUserId).get();
    if (adminDoc.exists()) {
      const adminData = adminDoc.data();
      console.log('✓ Admin account trouve');
      console.log('  - Roles:', adminData.roles);
      console.log('  - Active:', adminData.isActive);
    } else {
      console.log('✗ Admin account non trouve');
    }

    console.log('\n5. Verification de l\'organisation...');
    const orgDoc = await db.collection('organizations').doc('org_test_pharmacy_group').get();
    if (orgDoc.exists()) {
      console.log('✓ Organisation trouvee');
    } else {
      console.log('✗ Organisation non trouvee');
    }

    console.log('\n6. Comptage des documents...');
    const collections = {
      'users': await db.collection('users').where('uid', '>=', 'employee').where('uid', '<=', 'test_user_demo_2027').get(),
      'professionalProfiles': await db.collection('professionalProfiles').where('userId', '>=', 'employee').where('userId', '<=', 'test_user_demo_2027').get(),
      'events': await db.collection('events').where('userId', '==', testUserId).get(),
      'contracts': await db.collection('contracts').where('organizationId', '==', 'org_test_pharmacy_group').get(),
      'notifications': await db.collection('notifications').where('userId', '==', testUserId).get()
    };

    console.log('  - Users:', collections.users.size);
    console.log('  - Professional Profiles:', collections.professionalProfiles.size);
    console.log('  - Events:', collections.events.size);
    console.log('  - Contracts:', collections.contracts.size);
    console.log('  - Notifications:', collections.notifications.size);

    console.log('\n✓ Verification terminee avec succes!');
    return { success: true };

  } catch (error) {
    console.error('\n✗ Erreur:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { verifyTestData };

if (require.main === module) {
  verifyTestData()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Erreur:', error);
      process.exit(1);
    });
}

