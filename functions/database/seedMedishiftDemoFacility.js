/**
 * SEED MEDISHIFT DEMO FACILITY
 * 
 * Creates a demo facility for admin users to access and use for presentations.
 * This facility is automatically available to all active admin users.
 * 
 * Run with: node -e "require('./seedMedishiftDemoFacility').seedMedishiftDemoFacility()"
 * Or from Firebase Functions: exports.seedDemoFacility = seedMedishiftDemoFacility
 */

const admin = require('firebase-admin');
const config = require('../config');

const MEDISHIFT_DEMO_FACILITY_ID = 'medishift-demo-facility';

const seedMedishiftDemoFacility = async () => {
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

  const facilityRef = db.collection('facilityProfiles').doc(MEDISHIFT_DEMO_FACILITY_ID);
  const adminsRef = db.collection('admins');

  console.log('[seedMedishiftDemoFacility] Starting...');

  const adminsSnapshot = await adminsRef.where('isActive', '!=', false).get();
  const adminUserIds = [];
  adminsSnapshot.forEach(doc => {
    if (doc.data().isActive !== false) {
      adminUserIds.push(doc.id);
    }
  });

  console.log(`[seedMedishiftDemoFacility] Found ${adminUserIds.length} active admins`);

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
  console.log(`[seedMedishiftDemoFacility] Created/Updated facility: ${MEDISHIFT_DEMO_FACILITY_ID}`);

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
        
        console.log(`[seedMedishiftDemoFacility] Added demo facility to admin user: ${adminUserId}`);
      } else {
        console.log(`[seedMedishiftDemoFacility] Admin user ${adminUserId} already has demo facility access`);
      }
    }
  }

  await batch.commit();
  console.log('[seedMedishiftDemoFacility] Completed successfully');

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

  console.log('[removeMedishiftDemoFacility] Starting cleanup...');

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
      console.log(`[removeMedishiftDemoFacility] Removed demo facility from user: ${doc.id}`);
    }
  });

  await batch.commit();

  await db.collection('facilityProfiles').doc(MEDISHIFT_DEMO_FACILITY_ID).delete();
  console.log(`[removeMedishiftDemoFacility] Deleted facility: ${MEDISHIFT_DEMO_FACILITY_ID}`);

  return { success: true };
};

module.exports = {
  MEDISHIFT_DEMO_FACILITY_ID,
  seedMedishiftDemoFacility,
  removeMedishiftDemoFacility
};

