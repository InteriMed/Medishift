const admin = require('firebase-admin');
const db = require('../database/db');

const cleanupObsoleteUserFields = async () => {
  console.log('=== NETTOYAGE DES CHAMPS OBSOLETES DANS LA COLLECTION USERS ===\n');

  const OBSOLETE_FIELDS = [
    'role',
    'profileType',
    'profileCompleted',
    'profileStatus',
    'tutorialPassed',
    'tutorialAccessMode',
    'facilityMemberships',
    'verifiedAt',
    'verifiedBy'
  ];

  console.log('Champs à supprimer:', OBSOLETE_FIELDS.join(', '));
  console.log('');

  try {
    const usersSnapshot = await db.collection('users').get();
    console.log(`Trouvé ${usersSnapshot.size} documents utilisateurs`);

    let updatedCount = 0;
    const batch = db.batch();
    let batchCount = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      let hasObsoleteFields = false;

      const updateData = {};
      OBSOLETE_FIELDS.forEach(field => {
        if (userData.hasOwnProperty(field)) {
          updateData[field] = admin.firestore.FieldValue.delete();
          hasObsoleteFields = true;
        }
      });

      if (hasObsoleteFields) {
        batch.update(userDoc.ref, updateData);
        batchCount++;
        updatedCount++;

        console.log(`✓ Mise à jour: ${userDoc.id} (${userData.email || 'no email'})`);

        if (batchCount >= 500) {
          await batch.commit();
          console.log(`  Batch de ${batchCount} mises à jour committé`);
          batchCount = 0;
        }
      }
    }

    if (batchCount > 0) {
      await batch.commit();
      console.log(`  Dernier batch de ${batchCount} mises à jour committé`);
    }

    console.log(`\n✓ Nettoyage terminé: ${updatedCount} documents mis à jour`);

    console.log('\n=== VERIFICATION ===');
    console.log('Les champs suivants doivent maintenant être uniquement dans:');
    console.log('- professionalProfiles: profileType, tutorialAccessMode');
    console.log('- facilityProfiles: profileType, tutorialAccessMode');
    console.log('- users: uid, email, firstName, lastName, displayName, emailVerified, roles, createdAt, updatedAt');

    return { success: true, updatedCount };

  } catch (error) {
    console.error('\n✗ Erreur:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { cleanupObsoleteUserFields };

if (require.main === module) {
  cleanupObsoleteUserFields()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Erreur:', error);
      process.exit(1);
    });
}

