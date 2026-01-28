const admin = require('firebase-admin');
const db = require('../../../Medishift/functions/database/db');

const generateTestData = async () => {
  console.log('Starting test data generation...');
  
  const testUserId = 'test_user_demo_2026';
  const testEmail = 'demo@medishift.ch';
  const timestamp = admin.firestore.Timestamp.now();
  const dateNow = new Date();

  try {
    const userRecord = await admin.auth().createUser({
      uid: testUserId,
      email: testEmail,
      password: 'DemoPass123!',
      emailVerified: true,
      displayName: 'Demo User'
    });
    console.log('✓ Created Firebase Auth user:', userRecord.uid);
  } catch (error) {
    if (error.code === 'auth/uid-already-exists') {
      console.log('✓ Firebase Auth user already exists');
    } else {
      throw error;
    }
  }

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

  console.log('\n=== CREATING USER DOCUMENT ===');
  await db.collection('users').doc(testUserId).set({
    uid: testUserId,
    email: testEmail,
    firstName: 'Demo',
    lastName: 'User',
    displayName: 'Demo User',
    photoURL: null,
    emailVerified: true,
    roles: [
      { facility_uid: facilityIds[0], roles: ['admin', 'scheduler'] },
      { organization_uid: organizationId, roles: ['org_admin', 'org_manager'], rights: ['manage_facilities', 'manage_shared_team'] }
    ],
    createdAt: timestamp,
    updatedAt: timestamp
  }, { merge: true });
  console.log('✓ User document created');

  console.log('\n=== CREATING PROFESSIONAL PROFILE ===');
  await db.collection('professionalProfiles').doc(testUserId).set({
    userId: testUserId,
    email: testEmail,
    profileType: 'doctor',
    tutorialAccessMode: 'disabled',
    currentStepIndex: 0,
    subscriptionTier: 'premium',
    identity: {
      legalFirstName: 'Demo',
      legalLastName: 'User',
      firstName: 'Demo',
      lastName: 'User',
      dateOfBirth: '1985-03-15',
      placeOfBirth: 'Zurich',
      gender: 'other',
      nationality: 'Swiss',
      personalIdentificationNumber: 'CH-DEMO-12345'
    },
    contact: {
      residentialAddress: {
        street: 'Bahnhofstrasse',
        number: '100',
        postalCode: '8001',
        city: 'Zurich',
        canton: 'ZH',
        country: 'CH'
      },
      contactPhonePrefix: '+41',
      contactPhone: '791234567',
      contactEmail: testEmail
    },
    professionalDetails: {
      profession: 'doctor',
      specialization: 'General Practice',
      yearsOfExperience: 10,
      languages: ['German', 'English', 'French'],
      glnNumber: 'GLN7601001234567'
    },
    education: [
      {
        degree: 'Doctor of Medicine (MD)',
        institution: 'University of Zurich',
        startYear: '2003',
        endYear: '2009',
        country: 'Switzerland'
      },
      {
        degree: 'Master of Public Health',
        institution: 'ETH Zurich',
        startYear: '2010',
        endYear: '2012',
        country: 'Switzerland'
      }
    ],
    workExperience: [
      {
        position: 'General Practitioner',
        employer: 'University Hospital Zurich',
        startDate: '2012-09-01',
        endDate: '2020-12-31',
        description: 'Primary care physician'
      },
      {
        position: 'Senior Physician',
        employer: 'Central Pharmacy & Clinic',
        startDate: '2021-01-01',
        endDate: null,
        description: 'Lead physician and healthcare coordinator'
      }
    ],
    licensesCertifications: [
      { name: 'Swiss Medical License', issuer: 'FMH', issueDate: '2009-07-15', expiryDate: null },
      { name: 'Advanced Cardiac Life Support', issuer: 'Swiss Heart Foundation', issueDate: '2022-03-10', expiryDate: '2025-03-10' }
    ],
    billingInformation: {
      iban: 'CH93 0076 2011 6238 5295 7',
      bankName: 'UBS Switzerland AG',
      accountHolderName: 'Demo User'
    },
    verification: {
      status: 'approved',
      verifiedAt: timestamp,
      verifiedBy: 'system',
      bypassed: true
    },
    profileVisibility: 'public',
    createdAt: timestamp,
    updatedAt: timestamp
  }, { merge: true });
  console.log('✓ Professional profile created');

  console.log('\n=== CREATING ADMIN ACCOUNT ===');
  await db.collection('admins').doc(testUserId).set({
    userId: testUserId,
    email: testEmail,
    displayName: 'Demo User',
    roles: ['admin'],
    permissions: ['manage_users', 'manage_facilities', 'view_analytics', 'support_tools'],
    isActive: true,
    isSuperAdmin: false,
    createdAt: timestamp,
    createdBy: 'system',
    lastLoginAt: timestamp
  }, { merge: true });
  console.log('✓ Admin account created');

  console.log('\n=== CREATING ORGANIZATION ===');
  await db.collection('organizations').doc(organizationId).set({
    organizationProfileId: organizationId,
    role: 'organization',
    profileType: 'pharmacy_chain',
    organizationName: 'MediCare Pharmacy Group',
    additionalName: 'MCG Switzerland',
    organizationType: 'pharmacy_chain',
    organizationDetails: {
      name: 'MediCare Pharmacy Group',
      additionalName: 'MCG Switzerland',
      organizationType: 'chain',
      registeredSince: '2015-01-15',
      headquartersAddress: {
        street: 'Hauptstrasse',
        number: '50',
        city: 'Zurich',
        postalCode: '8001',
        canton: 'ZH',
        country: 'CH'
      },
      glnCompany: 'GLN7601000000001',
      responsiblePersons: [
        { firstName: 'Demo', lastName: 'User', role: 'CEO', email: testEmail, phone: '+41791234567' }
      ]
    },
    identityLegal: {
      legalCompanyName: 'MediCare Pharmacy Group AG',
      uidNumber: 'CHE-123.456.789',
      commercialRegisterNumber: 'CH-020.3.123.456-7'
    },
    billingInformation: {
      legalName: 'MediCare Pharmacy Group AG',
      uidNumber: 'CHE-123.456.789',
      billingAddress: {
        street: 'Hauptstrasse',
        number: '50',
        city: 'Zurich',
        postalCode: '8001',
        canton: 'ZH',
        country: 'CH'
      },
      invoiceEmail: 'billing@medicare-group.ch',
      invoiceNumber: 'INV-2026-001',
      invoiceDate: dateNow.toISOString(),
      internalRef: 'ORG-2026-001',
      verificationStatus: 'verified'
    },
    contact: {
      primaryEmail: 'contact@medicare-group.ch',
      primaryPhone: '+41443334455',
      primaryPhonePrefix: '+41'
    },
    facilities: {
      [facilityIds[0]]: {
        facilityUid: facilityIds[0],
        facilityName: 'Central Pharmacy',
        addedAt: timestamp,
        addedBy: testUserId,
        status: 'active',
        roles: []
      },
      [facilityIds[1]]: {
        facilityUid: facilityIds[1],
        facilityName: 'North District Clinic',
        addedAt: timestamp,
        addedBy: testUserId,
        status: 'active',
        roles: []
      },
      [facilityIds[2]]: {
        facilityUid: facilityIds[2],
        facilityName: 'South General Hospital',
        addedAt: timestamp,
        addedBy: testUserId,
        status: 'active',
        roles: []
      }
    },
    internalTeam: {
      employees: [
        {
          user_uid: testUserId,
          uid: testUserId,
          roles: ['org_admin', 'org_manager'],
          rights: ['manage_facilities', 'manage_shared_team', 'view_cross_facility_reports'],
          addedAt: timestamp,
          addedBy: 'system'
        }
      ],
      admins: [testUserId]
    },
    sharedTeam: {
      employees: [],
      admins: [testUserId]
    },
    verification: {
      identityStatus: 'verified',
      billingStatus: 'verified',
      overallVerificationStatus: 'verified',
      verifiedAt: timestamp,
      verificationDocuments: []
    },
    GLN_certified: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: testUserId,
    verificationStatus: 'verified'
  }, { merge: true });
  console.log('✓ Organization created');

  console.log('\n=== CREATING EMPLOYEE AUTH ACCOUNTS ===');
  for (let i = 0; i < employeeIds.length; i++) {
    const empId = employeeIds[i];
    const empEmail = `${empId}@medicare-demo.ch`;
    try {
      await admin.auth().createUser({
        uid: empId,
        email: empEmail,
        password: 'Employee123!',
        emailVerified: true,
        displayName: `Employee ${i + 1}`
      });
      console.log(`✓ Created auth for ${empId}`);
    } catch (error) {
      if (error.code === 'auth/uid-already-exists') {
        console.log(`✓ Auth already exists for ${empId}`);
      } else {
        console.error(`✗ Error creating auth for ${empId}:`, error.message);
      }
    }
  }

  console.log('\n=== CREATING FACILITIES WITH EMPLOYEES ===');
  const facilityData = [
    {
      id: facilityIds[0],
      name: 'Central Pharmacy',
      type: 'pharmacy',
      address: { street: 'Bahnhofstrasse', number: '85', city: 'Zurich', postalCode: '8001', canton: 'ZH' },
      employeeIndices: [0, 1, 6]
    },
    {
      id: facilityIds[1],
      name: 'North District Clinic',
      type: 'clinic',
      address: { street: 'Nordstrasse', number: '12', city: 'Basel', postalCode: '4001', canton: 'BS' },
      employeeIndices: [2, 3, 7]
    },
    {
      id: facilityIds[2],
      name: 'South General Hospital',
      type: 'hospital',
      address: { street: 'Südweg', number: '45', city: 'Geneva', postalCode: '1201', canton: 'GE' },
      employeeIndices: [4, 5]
    }
  ];

  for (const facility of facilityData) {
    const employees = facility.employeeIndices.map(idx => {
      const empId = employeeIds[idx];
      const empEmail = `${empId}@medicare-demo.ch`;
      const roleMap = {
        0: ['scheduler'], 1: ['employee'], 2: ['admin'], 3: ['employee'],
        4: ['admin', 'scheduler'], 5: ['recruiter'], 6: ['employee'], 7: ['employee']
      };
      
      return {
        user_uid: empId,
        uid: empId,
        roles: roleMap[idx] || ['employee'],
        addedAt: timestamp,
        addedBy: testUserId
      };
    });

    await db.collection('facilityProfiles').doc(facility.id).set({
      facilityProfileId: facility.id,
      userId: testUserId,
      facilityName: facility.name,
      facilityType: facility.type,
      tutorialAccessMode: 'disabled',
      currentStepIndex: 0,
      subscriptionTier: 'premium',
      facilityDetails: {
        name: facility.name,
        facilityType: facility.type,
        additionalName: null,
        address: {
          ...facility.address,
          country: 'CH'
        },
        mainPhoneNumber: `+41${44 + facilityData.indexOf(facility)}1234567`,
        mainPhonePrefix: '+41',
        mainEmail: `contact@${facility.id}.ch`,
        openingHours: {
          monday: '08:00-18:00',
          tuesday: '08:00-18:00',
          wednesday: '08:00-18:00',
          thursday: '08:00-18:00',
          friday: '08:00-18:00',
          saturday: '09:00-13:00',
          sunday: 'Closed'
        }
      },
      identityLegal: {
        legalEntityName: `${facility.name} AG`,
        uidNumber: `CHE-${100 + facilityData.indexOf(facility)}.456.789`,
        commercialRegisterNumber: `CH-020.3.${100 + facilityData.indexOf(facility)}.456-7`
      },
      billingInformation: {
        legalName: `${facility.name} AG`,
        uidNumber: `CHE-${100 + facilityData.indexOf(facility)}.456.789`,
        billingAddress: {
          ...facility.address,
          country: 'CH'
        },
        invoiceEmail: `billing@${facility.id}.ch`,
        facilityIBAN: `CH93 0076 2011 6238 ${5295 + facilityData.indexOf(facility)} 7`,
        facilityBankName: 'UBS Switzerland AG'
      },
      employees: employees,
      verification: {
        identityStatus: 'verified',
        billingStatus: 'verified',
        overallVerificationStatus: 'verified',
        verifiedAt: timestamp,
        verificationDocuments: []
      },
      organizationId: organizationId,
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: testUserId
    }, { merge: true });
    console.log(`✓ Created facility: ${facility.name} with ${employees.length} employees`);

    for (const emp of employees) {
      const empId = emp.user_uid;
      const empEmail = `${empId}@medicare-demo.ch`;
      const names = empId.split('_');
      const role = names[1] || 'employee';
      const num = names[2] || '001';

      await db.collection('users').doc(empId).set({
        uid: empId,
        email: empEmail,
        firstName: `${role.charAt(0).toUpperCase()}${role.slice(1)}`,
        lastName: `Demo${num}`,
        displayName: `${role.charAt(0).toUpperCase()}${role.slice(1)} Demo${num}`,
        emailVerified: true,
        roles: [
          { facility_uid: facility.id, roles: emp.roles }
        ],
        createdAt: timestamp,
        updatedAt: timestamp
      }, { merge: true });

      await db.collection('professionalProfiles').doc(empId).set({
        userId: empId,
        email: empEmail,
        profileType: role,
        identity: {
          legalFirstName: `${role.charAt(0).toUpperCase()}${role.slice(1)}`,
          legalLastName: `Demo${num}`,
          firstName: `${role.charAt(0).toUpperCase()}${role.slice(1)}`,
          lastName: `Demo${num}`
        },
        contact: {
          contactEmail: empEmail,
          contactPhone: `79${1000000 + parseInt(num)}`,
          contactPhonePrefix: '+41'
        },
        professionalDetails: {
          profession: role
        },
        verification: {
          status: 'approved',
          verifiedAt: timestamp,
          verifiedBy: 'system'
        },
        createdAt: timestamp,
        updatedAt: timestamp
      }, { merge: true });
      console.log(`  ✓ Created employee profile: ${empId}`);
    }
  }

  console.log('\n=== CREATING EVENTS ===');
  const eventTypes = [
    { title: 'Morning Shift', offset: -7, duration: 8, color: '#4CAF50', type: 'past' },
    { title: 'Afternoon Coverage', offset: -5, duration: 6, color: '#2196F3', type: 'past' },
    { title: 'Emergency Shift', offset: -2, duration: 12, color: '#FF5722', type: 'past' },
    { title: 'Current Shift', offset: 0, duration: 8, color: '#FFC107', type: 'current' },
    { title: 'Evening Shift', offset: 1, duration: 6, color: '#9C27B0', type: 'future' },
    { title: 'Weekend Coverage', offset: 3, duration: 10, color: '#00BCD4', type: 'future' },
    { title: 'Holiday Shift', offset: 7, duration: 8, color: '#FF9800', type: 'future' },
    { title: 'Night Shift', offset: 10, duration: 12, color: '#607D8B', type: 'future' }
  ];

  for (const eventDef of eventTypes) {
    const startDate = new Date(dateNow);
    startDate.setDate(startDate.getDate() + eventDef.offset);
    startDate.setHours(8, 0, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + eventDef.duration);

    const eventId = `event_${testUserId}_${eventDef.offset}`;
    
    await db.collection('events').doc(eventId).set({
      userId: testUserId,
      professionalProfileId: testUserId,
      title: eventDef.title,
      from: admin.firestore.Timestamp.fromDate(startDate),
      to: admin.firestore.Timestamp.fromDate(endDate),
      color: eventDef.color,
      color1: `${eventDef.color}20`,
      color2: `${eventDef.color}60`,
      notes: `${eventDef.type.charAt(0).toUpperCase()}${eventDef.type.slice(1)} shift - Demo data`,
      location: facilityData[Math.floor(Math.random() * facilityData.length)].name,
      isAvailability: true,
      isValidated: true,
      recurring: false,
      recurrenceId: null,
      locationCountry: ['CH'],
      LocationArea: ['ZH', 'BS', 'GE'],
      languages: ['German', 'English'],
      experience: '10+ years',
      software: ['MediSoft', 'HealthTrack'],
      certifications: ['Swiss Medical License'],
      workAmount: 'full-time',
      created: timestamp,
      updated: timestamp
    });
    console.log(`✓ Created event: ${eventDef.title} (${eventDef.type})`);
  }

  for (let i = 0; i < 3; i++) {
    const facilityId = facilityIds[i];
    const empId = employeeIds[i * 2];
    
    const startDate = new Date(dateNow);
    startDate.setDate(startDate.getDate() + (i + 1) * 2);
    startDate.setHours(9, 0, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setHours(17, 0, 0, 0);

    const jobId = `job_${facilityId}_${i}`;
    
    await db.collection('positions').doc(jobId).set({
      facilityId: facilityId,
      organizationId: organizationId,
      createdBy: testUserId,
      title: `${['Pharmacist', 'Nurse', 'Doctor'][i]} Position`,
      description: `Seeking qualified ${['pharmacist', 'nurse', 'doctor'][i]} for ${facilityData[i].name}`,
      jobType: 'temporary',
      status: 'open',
      vacancyType: 'urgent',
      urgency: 'high',
      visibility: 'public',
      startTime: admin.firestore.Timestamp.fromDate(startDate),
      endTime: admin.firestore.Timestamp.fromDate(endDate),
      employeeUserId: empId,
      employeeRole: ['pharmacist', 'nurse', 'doctor'][i],
      shiftType: 'day',
      compensation: {
        type: 'hourly',
        amount: 45 + (i * 10),
        currency: 'CHF'
      },
      requiredSkills: [
        'Swiss Medical License',
        `${['Pharmacy', 'Nursing', 'Medical'][i]} Experience`,
        'German Language'
      ],
      location: facilityData[i].address.city,
      canton: facilityData[i].address.canton,
      isSublettable: true,
      created: timestamp,
      updated: timestamp
    });
    console.log(`✓ Created job posting: ${jobId}`);
  }

  console.log('\n=== CREATING CONTRACTS ===');
  const contractStatuses = ['awaiting_dual_approval', 'approved', 'active', 'completed'];
  
  for (let i = 0; i < 4; i++) {
    const facilityId = facilityIds[i % 3];
    const empId = employeeIds[i * 2];
    const status = contractStatuses[i];
    
    const startDate = new Date(dateNow);
    startDate.setDate(startDate.getDate() - 30 + (i * 20));
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 90);

    const contractId = `contract_${facilityId}_${empId}`;
    
    await db.collection('contracts').doc(contractId).set({
      parties: {
        professional: {
          profileId: empId,
          name: `Employee Demo${String(i * 2 + 1).padStart(3, '0')}`,
          email: `${empId}@medicare-demo.ch`
        },
        employer: {
          profileId: facilityId,
          name: facilityData[i % 3].name,
          email: `contact@${facilityId}.ch`
        }
      },
      terms: {
        jobTitle: ['Pharmacist', 'Nurse', 'Doctor', 'Receptionist'][i % 4],
        contractType: ['full-time', 'part-time', 'temporary', 'on-call'][i % 4],
        startDate: admin.firestore.Timestamp.fromDate(startDate),
        endDate: admin.firestore.Timestamp.fromDate(endDate),
        workSchedule: {
          hoursPerWeek: [40, 30, 20, 25][i % 4],
          daysPerWeek: [5, 4, 3, 3][i % 4]
        },
        compensation: {
          baseSalary: [7000, 5500, 6000, 4500][i % 4],
          currency: 'CHF',
          paymentFrequency: 'monthly',
          bonusEligible: true
        },
        benefits: ['Health Insurance', 'Pension Plan', 'Public Transport'],
        trialPeriod: {
          duration: 3,
          unit: 'months'
        },
        noticePeriod: {
          duration: 1,
          unit: 'months'
        }
      },
      statusLifecycle: {
        currentStatus: status,
        previousStatus: i > 0 ? contractStatuses[i - 1] : null,
        timestamps: {
          createdAt: timestamp,
          updatedAt: timestamp,
          submittedAt: timestamp,
          approvedAt: i >= 1 ? timestamp : null,
          activeAt: i >= 2 ? timestamp : null,
          completedAt: i >= 3 ? timestamp : null
        },
        validation: {
          professionalApproved: i >= 1,
          facilityApproved: i >= 1,
          professionalApprovedAt: i >= 1 ? timestamp : null,
          facilityApprovedAt: i >= 1 ? timestamp : null
        }
      },
      metadata: {
        source: 'platform',
        createdBy: testUserId,
        createdByType: 'facility',
        version: 1,
        documentUrl: null,
        signatureStatus: {
          professional: i >= 1 ? 'signed' : 'pending',
          facility: i >= 1 ? 'signed' : 'pending'
        }
      },
      organizationId: organizationId,
      facilityId: facilityId,
      created: timestamp,
      updated: timestamp
    });
    console.log(`✓ Created contract: ${contractId} (${status})`);
  }

  console.log('\n=== CREATING NOTIFICATIONS ===');
  const notificationTypes = [
    { type: 'contract_approval', title: 'New Contract Awaiting Approval', priority: 'high' },
    { type: 'shift_reminder', title: 'Upcoming Shift Tomorrow', priority: 'normal' },
    { type: 'application_received', title: 'New Application for Position', priority: 'normal' },
    { type: 'payment_processed', title: 'Payment Successfully Processed', priority: 'low' },
    { type: 'schedule_update', title: 'Your Schedule Has Been Updated', priority: 'normal' }
  ];

  for (let i = 0; i < notificationTypes.length; i++) {
    const notif = notificationTypes[i];
    const notifDate = new Date(dateNow);
    notifDate.setHours(notifDate.getHours() - (i * 6));

    await db.collection('notifications').add({
      userId: testUserId,
      type: notif.type,
      title: notif.title,
      message: `Demo notification for ${notif.type} - This is a test message`,
      priority: notif.priority,
      read: i >= 3,
      readAt: i >= 3 ? timestamp : null,
      actionUrl: null,
      metadata: {
        source: 'system',
        category: 'general'
      },
      createdAt: admin.firestore.Timestamp.fromDate(notifDate),
      expiresAt: null
    });
    console.log(`✓ Created notification: ${notif.title}`);
  }

  console.log('\n=== TEST DATA GENERATION COMPLETE ===');
  console.log('\nTest User Credentials:');
  console.log('Email:', testEmail);
  console.log('Password: DemoPass123!');
  console.log('User ID:', testUserId);
  console.log('\nOrganization ID:', organizationId);
  console.log('Facility IDs:', facilityIds.join(', '));
  console.log('\nThe test user has:');
  console.log('- Professional account (Doctor profile)');
  console.log('- Admin rights in organization');
  console.log('- Admin rights in first facility');
  console.log('- 1 organization with 3 facilities');
  console.log('- 8 employees across facilities');
  console.log('- 8 events (past, current, and future)');
  console.log('- 3 job postings');
  console.log('- 4 contracts in various states');
  console.log('- 5 notifications');

  return {
    success: true,
    testUserId,
    testEmail,
    organizationId,
    facilityIds,
    employeeIds
  };
};

module.exports = { generateTestData };

if (require.main === module) {
  generateTestData()
    .then(() => {
      console.log('\n✓ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n✗ Error:', error);
      process.exit(1);
    });
}

