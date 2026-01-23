/**
 * SEED MEDISHIFT DEMO FACILITY
 * 
 * Creates a demo facility for admin users to access and use for presentations.
 * This facility is automatically available to all active admin users.
 * 
 * RECOMMENDED: Use the Cloud Function instead:
 *   - From frontend: httpsCallable(functions, 'seedDemoFacility')
 *   - From Firebase CLI: firebase functions:call seedDemoFacility
 * 
 * To run directly (requires service account credentials):
 *   - Set GOOGLE_APPLICATION_CREDENTIALS env var to service account JSON path
 *   - Or use: firebase use <project> && node -e "require('./seedMedishiftDemoFacility').seedMedishiftDemoFacility()"
 */

const admin = require('firebase-admin');
const config = require('../config');

const MEDISHIFT_DEMO_FACILITY_ID = 'medishift-demo-facility';

const seedMedishiftDemoFacility = async () => {
  try {
    if (!admin.apps.length) {
      try {
        admin.initializeApp({
          projectId: config.projectId || 'interimed-620fd',
          databaseURL: config.databaseURL || `https://interimed-620fd-default-rtdb.europe-west1.firebasedatabase.app`,
          databaseId: config.databaseId || 'medishift'
        });
      } catch (initError) {
        if (initError.code === 'app/duplicate-app') {
          // App already initialized, continue
        } else {
          throw new Error(`Failed to initialize Firebase Admin: ${initError.message}\n\n` +
            `To run this script directly, you need:\n` +
            `1. Set GOOGLE_APPLICATION_CREDENTIALS environment variable to your service account JSON file\n` +
            `2. Or use the Cloud Function: httpsCallable(functions, 'seedDemoFacility')\n` +
            `3. Or deploy and call: firebase functions:call seedDemoFacility`);
        }
      }
    }

    const db = admin.firestore();
    if (config.databaseId) {
      db.settings({ databaseId: config.databaseId });
    }
  } catch (error) {
    if (error.message.includes('Could not load the default credentials')) {
      throw new Error(`Authentication Error: ${error.message}\n\n` +
        `RECOMMENDED: Use the Cloud Function instead:\n` +
        `  From frontend: const seed = httpsCallable(functions, 'seedDemoFacility'); await seed();\n\n` +
        `To run directly, set credentials:\n` +
        `  export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json\n` +
        `  node -e "require('./seedMedishiftDemoFacility').seedMedishiftDemoFacility()"`);
    }
    throw error;
  }

  const facilityRef = db.collection('facilityProfiles').doc(MEDISHIFT_DEMO_FACILITY_ID);
  const adminsRef = db.collection('admins');


  const adminsSnapshot = await adminsRef.where('isActive', '!=', false).get();
  const adminUserIds = [];
  adminsSnapshot.forEach(doc => {
    if (doc.data().isActive !== false) {
      adminUserIds.push(doc.id);
    }
  });


  const facilityData = {
    role: 'facility',
    profileType: 'pharmacy',
    
    facilityDetails: {
      name: 'Medishift Demo Facility',
      additionalName: 'Presentation & Testing Environment',
      operatingAddress: {
        street: 'Rue du Rhône 42',
        city: 'Genève',
        postalCode: '1204',
        canton: 'GE',
        country: 'CH'
      },
      glnCompany: 'DEMO_FACILITY_GLN',
      responsiblePersons: adminUserIds.map(uid => ({
        userId: uid,
        role: 'Administrator'
      }))
    },

    responsiblePersonIdentity: {
      firstName: 'Medishift',
      lastName: 'Admin',
      dateOfBirth: null,
      nationality: 'CH',
      gender: null,
      documentType: 'demo',
      documentNumber: 'DEMO-001',
      documentExpiry: null,
      residentialAddress: {
        street: 'Rue du Rhône 42',
        city: 'Genève',
        postalCode: '1204',
        canton: 'GE',
        country: 'CH'
      }
    },

    identityLegal: {
      legalCompanyName: 'Medishift SA - Demo Environment',
      uidNumber: 'CHE-000.000.000'
    },

    billingInformation: {
      legalName: 'Medishift SA',
      uidNumber: 'CHE-000.000.000',
      billingAddress: {
        street: 'Rue du Rhône 42',
        city: 'Genève',
        postalCode: '1204',
        canton: 'GE',
        country: 'CH'
      },
      invoiceEmail: 'demo@medishift.ch',
      internalRef: 'DEMO-INTERNAL',
      verificationStatus: 'verified'
    },

    contact: {
      primaryEmail: 'demo@medishift.ch',
      primaryPhone: '+41 22 000 00 00',
      primaryPhonePrefix: '+41'
    },

    verification: {
      identityStatus: 'verified',
      billingStatus: 'verified',
      overallVerificationStatus: 'verified',
      overallStatus: 'verified',
      verificationDocumentsProvided: [{
        documentId: 'demo_facility_verification',
        type: 'admin_override',
        fileName: 'Medishift Demo Facility - Auto-verified',
        uploadedAt: new Date().toISOString(),
        status: 'verified',
        verificationStatus: 'verified'
      }]
    },

    admins: adminUserIds,
    
    employees: adminUserIds.map(uid => ({
      user_uid: uid,
      roles: ['admin', 'scheduler', 'hr_manager', 'employee']
    })),

    chainAdmins: adminUserIds,

    tutorialAccessMode: 'disabled',
    currentStepIndex: 0,
    subscriptionTier: 'enterprise',

    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),

    facilityName: 'Medishift Demo Facility',
    facilityProfileId: MEDISHIFT_DEMO_FACILITY_ID,
    glnNumber: 'DEMO_FACILITY_GLN',
    GLN_certified: 'DEMO_FACILITY_GLN',
    verificationStatus: 'verified',

    isDemo: true,
    demoDescription: 'This facility is for admin presentation and testing purposes. All data here is fictional.'
  };

  await facilityRef.set(facilityData, { merge: true });

  const batch = db.batch();
  for (const adminUserId of adminUserIds) {
    const userRef = db.collection('users').doc(adminUserId);
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      const existingRoles = userData.roles || [];
      
      const hasDemoFacility = existingRoles.some(r => r.facility_uid === MEDISHIFT_DEMO_FACILITY_ID);
      
      if (!hasDemoFacility) {
        const newRoleEntry = {
          facility_uid: MEDISHIFT_DEMO_FACILITY_ID,
          roles: ['admin', 'scheduler', 'hr_manager', 'employee']
        };
        
        batch.update(userRef, {
          roles: admin.firestore.FieldValue.arrayUnion(newRoleEntry),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
      } else {
      }
    }
  }

  await batch.commit();

  return {
    success: true,
    facilityId: MEDISHIFT_DEMO_FACILITY_ID,
    adminCount: adminUserIds.length
  };
};

const removeMedishiftDemoFacility = async () => {
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: config.projectId,
      databaseURL: config.databaseURL
    });
  }

  const db = admin.firestore();
  if (config.databaseId) {
    db.settings({ databaseId: config.databaseId });
  }


  const usersSnapshot = await db.collection('users').get();
  const batch = db.batch();
  
  usersSnapshot.forEach(doc => {
    const userData = doc.data();
    const roles = userData.roles || [];
    const filteredRoles = roles.filter(r => r.facility_uid !== MEDISHIFT_DEMO_FACILITY_ID);
    
    if (filteredRoles.length !== roles.length) {
      batch.update(doc.ref, {
        roles: filteredRoles,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  });

  await batch.commit();

  await db.collection('facilityProfiles').doc(MEDISHIFT_DEMO_FACILITY_ID).delete();

  return { success: true };
};

module.exports = {
  MEDISHIFT_DEMO_FACILITY_ID,
  seedMedishiftDemoFacility,
  removeMedishiftDemoFacility
};

