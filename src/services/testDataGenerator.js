import { 
  doc, 
  setDoc, 
  collection, 
  addDoc, 
  Timestamp,
  writeBatch 
} from 'firebase/firestore';
import { db } from './firebase';

// Test user UID as specified
const TEST_USER_UID = 'yXpsx5kaOhPO8em7o77F7wR9Xen1';

/**
 * Generate contract-linked conversations
 */
const generateContractLinkedConversations = async (contracts, facilityProfileId, professionalProfileId) => {
  console.log('🔗 Generating contract-linked conversations...');
  
  if (!contracts || contracts.length === 0) {
    console.log('No contracts found, skipping contract-linked conversations');
    return [];
  }
  
  const contractConversations = [];
  
  for (const contract of contracts) {
    const conversation = {
      participantIds: [TEST_USER_UID, 'contract_professional_001'],
      participantInfo: [
        {
          userId: TEST_USER_UID,
          displayName: 'Dr. Sarah Mueller',
          photoURL: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400',
          roleInConversation: 'facility_representative'
        },
        {
          userId: 'contract_professional_001',
          displayName: contract.parties?.professional?.legalFirstName + ' ' + contract.parties?.professional?.legalLastName || 'Contract Professional',
          photoURL: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400',
          roleInConversation: 'professional'
        }
      ],
      facilityProfileId: facilityProfileId,
      professionalProfileId: professionalProfileId,
      contractId: contract.id,
      lastMessage: {
        text: 'Welcome to the team! Your contract is now active.',
        senderId: TEST_USER_UID,
        timestamp: Timestamp.now()
      },
      lastMessageTimestamp: Timestamp.now(),
      unreadCounts: {
        [TEST_USER_UID]: 0,
        'contract_professional_001': 0
      },
      isArchivedBy: [],
      typingIndicator: {
        [TEST_USER_UID]: false,
        'contract_professional_001': false
      },
      createdAt: contract.statusLifecycle?.timestamps?.activatedAt || Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    const docRef = await addDoc(collection(db, 'conversations'), conversation);
    
    // Add contract-related messages
    const messages = [
      {
        senderId: TEST_USER_UID,
        text: `Hi! Your contract for the ${contract.terms?.jobTitle} position has been finalized and is now active.`,
        timestamp: contract.statusLifecycle?.timestamps?.activatedAt || Timestamp.fromDate(new Date('2024-01-15T09:00:00')),
        status: 'read',
        imageUrl: null,
        fileUrl: null,
        fileName: null,
        fileType: null,
        reactions: []
      },
      {
        senderId: 'contract_professional_001',
        text: 'Thank you! I\'m excited to start working with the team.',
        timestamp: Timestamp.fromDate(new Date('2024-01-15T09:30:00')),
        status: 'read',
        imageUrl: null,
        fileUrl: null,
        fileName: null,
        fileType: null,
        reactions: [
          {
            userId: TEST_USER_UID,
            emoji: '🎉'
          }
        ]
      },
      {
        senderId: TEST_USER_UID,
        text: 'Perfect! Your first day is scheduled for tomorrow. Please arrive at 8 AM and ask for me at the front desk.',
        timestamp: Timestamp.fromDate(new Date('2024-01-15T10:00:00')),
        status: 'read',
        imageUrl: null,
        fileUrl: null,
        fileName: null,
        fileType: null,
        reactions: []
      },
      {
        senderId: 'contract_professional_001',
        text: 'Will do! Should I bring any specific documents or materials?',
        timestamp: Timestamp.fromDate(new Date('2024-01-15T10:15:00')),
        status: 'read',
        imageUrl: null,
        fileUrl: null,
        fileName: null,
        fileType: null,
        reactions: []
      },
      {
        senderId: TEST_USER_UID,
        text: 'Just bring your ID and pharmacy license. We\'ll provide everything else you need during the orientation.',
        timestamp: Timestamp.fromDate(new Date('2024-01-15T10:30:00')),
        status: 'read',
        imageUrl: null,
        fileUrl: null,
        fileName: null,
        fileType: null,
        reactions: []
      },
      {
        senderId: TEST_USER_UID,
        text: 'Welcome to the team! Your contract is now active.',
        timestamp: Timestamp.now(),
        status: 'sent',
        imageUrl: null,
        fileUrl: null,
        fileName: null,
        fileType: null,
        reactions: []
      }
    ];
    
    // Add messages to subcollection
    for (const message of messages) {
      await addDoc(collection(db, 'conversations', docRef.id, 'messages'), message);
    }
    
    contractConversations.push({ id: docRef.id, ...conversation });
  }
  
  console.log(`✅ ${contractConversations.length} contract-linked conversations created`);
  return contractConversations;
};

/**
 * Comprehensive test data generator for the INTERIMED platform
 * Creates realistic test data across all Firebase collections
 */
export const generateTestData = async () => {
  console.log('🚀 Starting test data generation...');
  
  try {
    // Generate data in order of dependencies
    const userData = await generateUserData();
    const professionalProfile = await generateProfessionalProfile();
    const facilityProfile = await generateFacilityProfile();
    const teamMembers = await generateTeamMembers(facilityProfile.id);
    const contracts = await generateContracts(professionalProfile.id, facilityProfile.id);
    const availabilities = await generateProfessionalAvailabilities(professionalProfile.id);
    const positions = await generatePositions(facilityProfile.id);
    const timeOffRequests = await generateTimeOffRequests(facilityProfile.id);
    const teamSchedules = await generateTeamSchedules(facilityProfile.id, teamMembers);
    
    // Generate conversations (both general and contract-linked)
    const generalConversations = await generateConversations();
    const contractConversations = await generateContractLinkedConversations(
      contracts, 
      facilityProfile.id, 
      professionalProfile.id
    );
    
    const allConversations = [...generalConversations, ...contractConversations];
    
    console.log('✅ Test data generation completed successfully!');
    
    return {
      userData,
      professionalProfile,
      facilityProfile,
      teamMembers,
      contracts,
      availabilities,
      positions,
      timeOffRequests,
      teamSchedules,
      conversations: allConversations,
      conversationStats: {
        general: generalConversations.length,
        contractLinked: contractConversations.length,
        total: allConversations.length
      }
    };
  } catch (error) {
    console.error('❌ Error generating test data:', error);
    throw error;
  }
};

/**
 * Generate test user data
 */
const generateUserData = async () => {
  console.log('📝 Generating user data...');
  
  const userData = {
    uid: TEST_USER_UID,
    email: 'william.abhamon@gmail.com',
    emailVerified: true,
    firstName: 'William',
    lastName: 'Abhamon',
    photoURL: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400',
    roles: ['professional', `facility_admin_${TEST_USER_UID}_facility`],
    professionalProfileId: TEST_USER_UID,
    facilityMemberships: [
      {
        facilityProfileId: `${TEST_USER_UID}_facility`,
        facilityName: 'Stadtapotheke Zürich',
        role: 'admin'
      }
    ],
    onboardingStatus: 'completed',
    notificationPreferences: {
      email: true,
      push: true,
      sms: false,
      marketplaceUpdates: true,
      scheduleChanges: true,
      contractUpdates: true
    },
    consents: {
      tosVersion: '1.2',
      acceptedAt: Timestamp.now(),
      privacyPolicyVersion: '1.1',
      privacyAcceptedAt: Timestamp.now()
    },
    isActive: true,
    fcmTokens: ['test_fcm_token_123'],
    createdAt: Timestamp.fromDate(new Date('2024-01-15')),
    updatedAt: Timestamp.now(),
    lastLoginAt: Timestamp.now()
  };
  
  await setDoc(doc(db, 'users', TEST_USER_UID), userData);
  console.log('✅ User data created');
  return userData;
};

/**
 * Generate professional profile data
 */
const generateProfessionalProfile = async () => {
  console.log('👩‍⚕️ Generating professional profile...');
  
  const profileData = {
    userId: TEST_USER_UID,
    profileType: 'pharmacist',
    
    identity: {
      legalFirstName: 'Sarah',
      legalLastName: 'Mueller',
      dateOfBirth: Timestamp.fromDate(new Date('1985-03-15')),
      nationality: 'Swiss',
      ahvNumber: '756.1234.5678.90'
    },
    
    contact: {
      primaryPhone: '+41 79 123 45 67',
      primaryEmail: 'sarah.mueller@interimed.ch',
      residentialAddress: {
        street: 'Bahnhofstrasse',
        number: '42',
        postalCode: '8001',
        city: 'Zürich',
        canton: 'ZH',
        country: 'CH'
      }
    },
    
    employmentEligibility: {
      workPermit: {
        type: 'Swiss Citizen',
        permitNumber: null,
        expiryDate: null,
        issuingCanton: 'ZH'
      }
    },
    
    profileDisplay: {
      displayName: 'Dr. Sarah Mueller',
      profilePictureUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400',
      languagesSpoken: [
        { language: 'German', level: 'Native' },
        { language: 'English', level: 'Fluent' },
        { language: 'French', level: 'Intermediate' }
      ],
      bioOrSummary: 'Experienced pharmacist with 8+ years in clinical pharmacy and medication management. Specialized in geriatric pharmacy and drug interaction analysis.',
      experienceYears: 8
    },
    
    professionalDetails: {
      mainProfession: 'Clinical Pharmacist',
      specializations: ['Geriatric Pharmacy', 'Clinical Pharmacy', 'Medication Therapy Management'],
      skills: ['Drug Interaction Analysis', 'Patient Counseling', 'Compounding', 'Inventory Management', 'Clinical Research'],
      softwareProficiency: [
        { name: 'Pharmagest', level: 'Expert' },
        { name: 'Documed', level: 'Advanced' },
        { name: 'HIN Mail', level: 'Intermediate' }
      ],
      qualifications: [
        {
          type: 'license',
          title: 'Swiss Pharmacist License',
          institution: 'Swiss Federal Office of Public Health',
          dateObtained: Timestamp.fromDate(new Date('2016-06-15')),
          expiryDate: null,
          licenseNumber: 'PH-ZH-2016-1234',
          isVerified: true
        },
        {
          type: 'certification',
          title: 'Clinical Pharmacy Certification',
          institution: 'Swiss Society of Clinical Pharmacy',
          dateObtained: Timestamp.fromDate(new Date('2018-09-20')),
          expiryDate: Timestamp.fromDate(new Date('2026-09-20')),
          certificateNumber: 'SSCP-2018-567',
          isVerified: true
        }
      ],
      workExperience: [
        {
          jobTitle: 'Senior Clinical Pharmacist',
          employer: 'University Hospital Zürich',
          startDate: Timestamp.fromDate(new Date('2020-01-01')),
          endDate: Timestamp.fromDate(new Date('2024-01-01')),
          description: 'Led medication therapy management for geriatric patients, conducted drug utilization reviews, and supervised pharmacy residents.',
          location: 'Zürich, Switzerland'
        },
        {
          jobTitle: 'Staff Pharmacist',
          employer: 'Apotheke am Paradeplatz',
          startDate: Timestamp.fromDate(new Date('2016-07-01')),
          endDate: Timestamp.fromDate(new Date('2019-12-31')),
          description: 'Provided pharmaceutical care, managed inventory, and conducted patient consultations.',
          location: 'Zürich, Switzerland'
        }
      ],
      education: [
        {
          degree: 'Master of Pharmacy (PharmD)',
          institution: 'ETH Zürich',
          startDate: Timestamp.fromDate(new Date('2011-09-01')),
          endDate: Timestamp.fromDate(new Date('2016-06-30')),
          gpa: '5.8/6.0',
          honors: 'Magna Cum Laude'
        }
      ]
    },
    
    payrollData: {
      civilStatus: 'married',
      numberOfChildren: 1,
      withholdingTaxInfo: {
        isSubject: false,
        taxCanton: 'ZH',
        rateGroup: 'A'
      },
      religion: 'reformed'
    },
    
    banking: {
      iban: 'CH93 0076 2011 6238 5295 7',
      bankName: 'UBS Switzerland AG',
      accountHolderName: 'Sarah Mueller'
    },
    
    platformSettings: {
      detailedAvailability: {
        availabilityType: 'flexible',
        minHoursPerWeek: 20,
        preferredWorkdays: ['monday', 'tuesday', 'wednesday', 'thursday'],
        noticePeriodDays: 14,
        earliestStartDate: Timestamp.fromDate(new Date('2024-02-01')),
        notes: 'Prefer morning shifts, available for emergency coverage'
      }
    },
    
    verification: {
      identityStatus: 'verified',
      qualificationsStatus: 'verified',
      workEligibilityStatus: 'verified',
      overallVerificationStatus: 'verified',
      verificationDocuments: [
        {
          documentId: 'doc_001',
          type: 'passport',
          fileName: 'passport_sarah_mueller.pdf',
          storageUrl: 'gs://interimed-test/documents/passport_sarah_mueller.pdf',
          status: 'verified'
        },
        {
          documentId: 'doc_002',
          type: 'diploma',
          fileName: 'pharmd_diploma.pdf',
          storageUrl: 'gs://interimed-test/documents/pharmd_diploma.pdf',
          status: 'verified'
        }
      ]
    },
    
    isActiveOnMarketplace: true,
    createdAt: Timestamp.fromDate(new Date('2024-01-15')),
    updatedAt: Timestamp.now()
  };
  
  await setDoc(doc(db, 'professionalProfiles', TEST_USER_UID), profileData);
  console.log('✅ Professional profile created');
  return { id: TEST_USER_UID, ...profileData };
};

/**
 * Generate facility profile data
 */
const generateFacilityProfile = async () => {
  console.log('🏥 Generating facility profile...');
  
  const facilityId = `${TEST_USER_UID}_facility`;
  
  const facilityData = {
    facilityName: 'Stadtapotheke Zürich',
    profileType: 'pharmacy',
    
    identityLegal: {
      legalCompanyName: 'Stadtapotheke Zürich AG',
      uidNumber: 'CHE-123.456.789',
      vatNumber: 'CHE-123.456.789 MWST',
      companyType: 'AG',
      cantonOfRegistration: 'ZH',
      commercialRegisterNumber: 'CH-020.3.123.456-7'
    },
    
    contactPoints: {
      registeredAddress: {
        street: 'Bahnhofstrasse',
        number: '100',
        postalCode: '8001',
        city: 'Zürich',
        canton: 'ZH',
        country: 'CH'
      },
      operatingAddress: {
        street: 'Bahnhofstrasse',
        number: '100',
        postalCode: '8001',
        city: 'Zürich',
        canton: 'ZH',
        country: 'CH'
      },
      generalPhone: '+41 44 123 45 67',
      generalEmail: 'info@stadtapotheke-zh.ch',
      websiteUrl: 'https://www.stadtapotheke-zh.ch'
    },
    
    profilePublic: {
      logoUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400',
      industrySector: 'Healthcare - Pharmacy',
      companySizeRange: '10-25 employees',
      descriptionPublic: 'Modern community pharmacy in the heart of Zürich, providing comprehensive pharmaceutical services including medication management, health consultations, and specialized compounding services.'
    },
    
    operationalEnvironment: {
      primarySoftwareUsed: [
        { category: 'Pharmacy Management', name: 'Pharmagest' },
        { category: 'Electronic Health Records', name: 'Documed' },
        { category: 'Communication', name: 'HIN Mail' }
      ],
      collectiveLaborAgreementInfo: {
        applies: true,
        agreementName: 'Swiss Pharmacy Association CLA'
      },
      standardWorkWeekHours: 42,
      workingHoursModel: 'flexible_hours',
      remoteWorkPolicy: 'on_site_only'
    },
    
    recruitmentAndContracts: {
      hiringContactPerson: {
        name: 'Sarah Mueller',
        email: 'hr@stadtapotheke-zh.ch',
        phone: '+41 44 123 45 67'
      },
      typicalOnboardingDocumentsRequired: [
        'Work permit verification',
        'Professional license verification',
        'Criminal background check',
        'Health certificate',
        'Emergency contact information'
      ]
    },
    
    payrollAndComplianceInfo: {
      compensationFundInfo: {
        canton: 'ZH',
        fundName: 'Ausgleichskasse Zürich',
        employerAffiliationNumber: 'ZH-123456'
      },
      accidentInsuranceProvider: {
        providerName: 'Suva',
        policyNumber: 'SUV-789012'
      },
      occupationalPensionProvider: {
        providerName: 'Swiss Life',
        contractNumber: 'SL-345678'
      }
    },
    
    platformAccountAndBilling: {
      platformBillingContact: {
        name: 'Sarah Mueller',
        email: 'billing@stadtapotheke-zh.ch',
        phone: '+41 44 123 45 67'
      },
      platformSubscriptionPlan: 'professional'
    },
    
    verification: {
      overallStatus: 'verified',
      identityCheck: {
        method: 'document_verification',
        status: 'verified',
        documentRefs: ['commercial_register_extract', 'uid_certificate']
      },
      verificationDocumentsProvided: [
        {
          documentId: 'facility_doc_001',
          type: 'commercial_register_extract',
          fileName: 'commercial_register_stadtapotheke.pdf',
          storageUrl: 'gs://interimed-test/facility-documents/commercial_register.pdf',
          status: 'verified'
        }
      ]
    },
    
    // Admin and employee arrays with user UIDs
    admin: [TEST_USER_UID],
    employees: [TEST_USER_UID, 'team_member_001', 'team_member_002', 'team_member_003'],
    
    operationalSettings: {
      standardOpeningHours: {
        monday: '08:00-18:30',
        tuesday: '08:00-18:30',
        wednesday: '08:00-18:30',
        thursday: '08:00-18:30',
        friday: '08:00-18:30',
        saturday: '08:00-16:00',
        sunday: 'closed'
      },
      minStaffPerShiftType: {
        pharmacist_day: 1,
        pharmacist_evening: 1,
        technician_day: 2,
        technician_evening: 1,
        assistant_day: 1
      },
      timeOffApprovalWorkflow: 'manager_approval_required'
    },
    
    createdAt: Timestamp.fromDate(new Date('2024-01-15')),
    updatedAt: Timestamp.now()
  };
  
  await setDoc(doc(db, 'facilityProfiles', facilityId), facilityData);
  console.log('✅ Facility profile created');
  return { id: facilityId, ...facilityData };
};

/**
 * Generate team members for the facility
 */
const generateTeamMembers = async (facilityId) => {
  console.log('👥 Generating team members...');
  
  // Create additional user documents for team members
  const teamMembers = [
    {
      uid: 'team_member_001',
      email: 'anna.schneider@stadtapotheke-zh.ch',
      emailVerified: true,
      firstName: 'Anna',
      lastName: 'Schneider',
      photoURL: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400',
      roles: [`facility_employee_${facilityId}`],
      professionalProfileId: null,
      facilityMemberships: [
        {
          facilityProfileId: facilityId,
          facilityName: 'Stadtapotheke Zürich',
          role: 'employee'
        }
      ],
      onboardingStatus: 'completed',
      isActive: true,
      createdAt: Timestamp.fromDate(new Date('2024-01-20')),
      updatedAt: Timestamp.now(),
      lastLoginAt: Timestamp.now()
    },
    {
      uid: 'team_member_002',
      email: 'marco.weber@stadtapotheke-zh.ch',
      emailVerified: true,
      firstName: 'Marco',
      lastName: 'Weber',
      photoURL: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400',
      roles: [`facility_employee_${facilityId}`],
      professionalProfileId: null,
      facilityMemberships: [
        {
          facilityProfileId: facilityId,
          facilityName: 'Stadtapotheke Zürich',
          role: 'employee'
        }
      ],
      onboardingStatus: 'completed',
      isActive: true,
      createdAt: Timestamp.fromDate(new Date('2024-01-25')),
      updatedAt: Timestamp.now(),
      lastLoginAt: Timestamp.now()
    },
    {
      uid: 'team_member_003',
      email: 'lisa.mueller@stadtapotheke-zh.ch',
      emailVerified: true,
      firstName: 'Lisa',
      lastName: 'Mueller',
      photoURL: 'https://images.unsplash.com/photo-1594824388853-d0c2d4e5b1b5?w=400',
      roles: [`facility_employee_${facilityId}`],
      professionalProfileId: null,
      facilityMemberships: [
        {
          facilityProfileId: facilityId,
          facilityName: 'Stadtapotheke Zürich',
          role: 'employee'
        }
      ],
      onboardingStatus: 'completed',
      isActive: true,
      createdAt: Timestamp.fromDate(new Date('2024-02-01')),
      updatedAt: Timestamp.now(),
      lastLoginAt: Timestamp.now()
    }
  ];
  
  // Create user documents for team members
  for (const member of teamMembers) {
    await setDoc(doc(db, 'users', member.uid), member);
  }
  
  console.log('✅ Team member user documents created');
  return teamMembers;
};

/**
 * Generate contract data
 */
const generateContracts = async (professionalProfileId, facilityProfileId) => {
  console.log('📋 Generating contracts...');
  
  const contracts = [
    {
      parties: {
        employer: {
          profileId: facilityProfileId,
          legalCompanyName: 'Stadtapotheke Zürich AG',
          address: {
            street: 'Bahnhofstrasse',
            number: '100',
            postalCode: '8001',
            city: 'Zürich',
            canton: 'ZH',
            country: 'CH'
          }
        },
        professional: {
          profileId: professionalProfileId,
          legalFirstName: 'Sarah',
          legalLastName: 'Mueller',
          address: {
            street: 'Bahnhofstrasse',
            number: '42',
            postalCode: '8001',
            city: 'Zürich',
            canton: 'ZH',
            country: 'CH'
          },
          ahvNumber: '756.1234.5678.90'
        }
      },
      terms: {
        jobTitle: 'Head Pharmacist',
        startDate: Timestamp.fromDate(new Date('2024-01-15')),
        endDate: null,
        contractType: 'permanent',
        workLocation: 'Stadtapotheke Zürich, Bahnhofstrasse 100, 8001 Zürich',
        workPercentage: 100,
        salary: {
          grossAmount: 95000,
          currency: 'CHF',
          period: 'annual',
          includesThirteenth: true
        },
        annualVacationDays: 25,
        probationPeriod: '3 months',
        noticePeriodAfterProbation: '3 months'
      },
      statusLifecycle: {
        currentStatus: 'active',
        validation: {
          employerApproved: true,
          employerApprovedAt: Timestamp.fromDate(new Date('2024-01-10')),
          professionalApproved: true,
          professionalApprovedAt: Timestamp.fromDate(new Date('2024-01-12'))
        },
        timestamps: {
          createdAt: Timestamp.fromDate(new Date('2024-01-08')),
          activatedAt: Timestamp.fromDate(new Date('2024-01-15')),
          terminatedAt: null
        }
      },
      platformMeta: {
        platformFee: {
          status: 'paid',
          amount: 500
        },
        generatedContractUrl: 'https://storage.interimed.ch/contracts/contract_001.pdf',
        createdByUserId: TEST_USER_UID
      },
      originType: 'direct_hire',
      originPositionId: null,
      originAvailabilityId: null,
      originTeamShiftId: null,
      lendingFacilityProfileId: null,
      associatedProfileType: 'professional',
      associatedProfileId: professionalProfileId
    }
  ];
  
  const contractPromises = contracts.map(async (contract) => {
    const docRef = await addDoc(collection(db, 'contracts'), contract);
    return { id: docRef.id, ...contract };
  });
  
  const createdContracts = await Promise.all(contractPromises);
  console.log('✅ Contracts created');
  return createdContracts;
};

/**
 * Generate professional availabilities
 */
const generateProfessionalAvailabilities = async (professionalProfileId) => {
  console.log('📅 Generating professional availabilities...');
  
  const availabilities = [];
  const startDate = new Date();
  
  // Generate availabilities for the next 30 days
  for (let i = 0; i < 30; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    // Skip weekends for this example
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    // Morning availability
    const morningStart = new Date(date);
    morningStart.setHours(8, 0, 0, 0);
    const morningEnd = new Date(date);
    morningEnd.setHours(12, 0, 0, 0);
    
    availabilities.push({
      professionalProfileId,
      userId: TEST_USER_UID,
      startTime: Timestamp.fromDate(morningStart),
      endTime: Timestamp.fromDate(morningEnd),
      status: 'available',
      jobTypes: ['pharmacist', 'clinical_pharmacist'],
      locationPreference: {
        type: 'specific_area',
        areas: ['Zürich City', 'Zürich District'],
        maxTravelDistance: 20
      },
      hourlyRate: {
        min: 45,
        max: 65,
        currency: 'CHF'
      },
      notes: 'Available for morning shifts, prefer clinical pharmacy roles',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    
    // Afternoon availability (every other day)
    if (i % 2 === 0) {
      const afternoonStart = new Date(date);
      afternoonStart.setHours(13, 0, 0, 0);
      const afternoonEnd = new Date(date);
      afternoonEnd.setHours(17, 0, 0, 0);
      
      availabilities.push({
        professionalProfileId,
        userId: TEST_USER_UID,
        startTime: Timestamp.fromDate(afternoonStart),
        endTime: Timestamp.fromDate(afternoonEnd),
        status: 'available',
        jobTypes: ['pharmacist'],
        locationPreference: {
          type: 'specific_area',
          areas: ['Zürich City'],
          maxTravelDistance: 15
        },
        hourlyRate: {
          min: 50,
          max: 70,
          currency: 'CHF'
        },
        notes: 'Afternoon availability for community pharmacy',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    }
  }
  
  const availabilityPromises = availabilities.map(async (availability) => {
    const docRef = await addDoc(collection(db, 'professionalAvailabilities'), availability);
    return { id: docRef.id, ...availability };
  });
  
  const createdAvailabilities = await Promise.all(availabilityPromises);
  console.log(`✅ ${createdAvailabilities.length} availabilities created`);
  return createdAvailabilities;
};

/**
 * Generate marketplace positions
 */
const generatePositions = async (facilityProfileId) => {
  console.log('💼 Generating marketplace positions...');
  
  const positions = [
    {
      facilityProfileId,
      postedByUserId: TEST_USER_UID,
      status: 'open',
      jobTitle: 'Weekend Pharmacist',
      jobType: 'pharmacist',
      startTime: Timestamp.fromDate(new Date('2024-03-01T08:00:00')),
      endTime: Timestamp.fromDate(new Date('2024-03-01T18:00:00')),
      location: {
        address: 'Bahnhofstrasse 100, 8001 Zürich',
        coordinates: { lat: 47.3769, lng: 8.5417 }
      },
      description: 'Looking for an experienced pharmacist to cover weekend shifts. Must have Swiss pharmacy license and experience with community pharmacy operations.',
      compensation: {
        type: 'hourly',
        amount: 60,
        currency: 'CHF',
        benefits: ['Meal allowance', 'Transportation reimbursement']
      },
      requirements: [
        'Swiss Pharmacist License',
        'Minimum 2 years experience',
        'German language proficiency',
        'Customer service skills'
      ],
      urgency: 'medium',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(new Date('2024-04-01'))
    },
    {
      facilityProfileId,
      postedByUserId: TEST_USER_UID,
      status: 'open',
      jobTitle: 'Pharmacy Technician - Evening Shift',
      jobType: 'pharmacy_technician',
      startTime: Timestamp.fromDate(new Date('2024-03-15T14:00:00')),
      endTime: Timestamp.fromDate(new Date('2024-03-15T22:00:00')),
      location: {
        address: 'Bahnhofstrasse 100, 8001 Zürich',
        coordinates: { lat: 47.3769, lng: 8.5417 }
      },
      description: 'Seeking a qualified pharmacy technician for evening shift coverage. Responsibilities include dispensing, inventory management, and customer service.',
      compensation: {
        type: 'hourly',
        amount: 35,
        currency: 'CHF',
        benefits: ['Evening shift premium']
      },
      requirements: [
        'Pharmacy Technician Certification',
        'Experience with pharmacy software',
        'Attention to detail',
        'Team player'
      ],
      urgency: 'high',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(new Date('2024-03-10'))
    }
  ];
  
  const positionPromises = positions.map(async (position) => {
    const docRef = await addDoc(collection(db, 'positions'), position);
    
    // Add some sample applications
    const applications = [
      {
        professionalProfileId: 'sample_professional_001',
        userId: 'sample_user_001',
        applicationTime: Timestamp.now(),
        status: 'submitted',
        coverLetter: 'I am very interested in this position and believe my experience would be a great fit.',
        proposedRate: position.compensation.amount
      }
    ];
    
    for (const application of applications) {
      await addDoc(collection(db, 'positions', docRef.id, 'applications'), application);
    }
    
    return { id: docRef.id, ...position };
  });
  
  const createdPositions = await Promise.all(positionPromises);
  console.log('✅ Positions created');
  return createdPositions;
};

/**
 * Generate time-off requests
 */
const generateTimeOffRequests = async (facilityProfileId) => {
  console.log('🏖️ Generating time-off requests...');
  
  const timeOffRequests = [
    {
      facilityProfileId,
      userId: 'team_member_001',
      professionalProfileId: null,
      startTime: Timestamp.fromDate(new Date('2024-03-20T00:00:00')),
      endTime: Timestamp.fromDate(new Date('2024-03-22T23:59:59')),
      type: 'vacation',
      reason: 'Family vacation to Italy',
      status: 'approved',
      managerNotes: 'Approved - coverage arranged',
      approvedByUserId: TEST_USER_UID,
      actionTimestamp: Timestamp.fromDate(new Date('2024-02-15')),
      createdAt: Timestamp.fromDate(new Date('2024-02-10')),
      updatedAt: Timestamp.fromDate(new Date('2024-02-15'))
    },
    {
      facilityProfileId,
      userId: 'team_member_002',
      professionalProfileId: null,
      startTime: Timestamp.fromDate(new Date('2024-03-05T08:00:00')),
      endTime: Timestamp.fromDate(new Date('2024-03-05T17:00:00')),
      type: 'personal_appointment',
      reason: 'Medical appointment',
      status: 'pending',
      managerNotes: null,
      approvedByUserId: null,
      actionTimestamp: null,
      createdAt: Timestamp.fromDate(new Date('2024-02-28')),
      updatedAt: Timestamp.fromDate(new Date('2024-02-28'))
    },
    {
      facilityProfileId,
      userId: TEST_USER_UID,
      professionalProfileId: TEST_USER_UID,
      startTime: Timestamp.fromDate(new Date('2024-04-01T00:00:00')),
      endTime: Timestamp.fromDate(new Date('2024-04-05T23:59:59')),
      type: 'vacation',
      reason: 'Spring break with family',
      status: 'pending',
      managerNotes: null,
      approvedByUserId: null,
      actionTimestamp: null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }
  ];
  
  const requestPromises = timeOffRequests.map(async (request) => {
    const docRef = await addDoc(collection(db, 'timeOffRequests'), request);
    return { id: docRef.id, ...request };
  });
  
  const createdRequests = await Promise.all(requestPromises);
  console.log('✅ Time-off requests created');
  return createdRequests;
};

/**
 * Generate team schedules
 */
const generateTeamSchedules = async (facilityProfileId, teamMembers) => {
  console.log('📋 Generating team schedules...');
  
  const scheduleId = `${facilityProfileId}_2024-03`;
  
  const scheduleData = {
    facilityProfileId,
    periodStartDate: Timestamp.fromDate(new Date('2024-03-01')),
    periodEndDate: Timestamp.fromDate(new Date('2024-03-31')),
    status: 'published_to_team',
    version: 1,
    notes: 'March 2024 schedule - please note the extended hours during the first week',
    createdByUserId: TEST_USER_UID,
    publishedAt: Timestamp.fromDate(new Date('2024-02-25')),
    createdAt: Timestamp.fromDate(new Date('2024-02-20')),
    updatedAt: Timestamp.fromDate(new Date('2024-02-25'))
  };
  
  await setDoc(doc(db, 'teamSchedules', scheduleId), scheduleData);
  
  // Generate shifts for the first week of March
  const shifts = [];
  const startDate = new Date('2024-03-01');
  
  for (let day = 0; day < 7; day++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + day);
    
    // Skip Sunday
    if (currentDate.getDay() === 0) continue;
    
    // Morning shift - Head Pharmacist
    const morningStart = new Date(currentDate);
    morningStart.setHours(8, 0, 0, 0);
    const morningEnd = new Date(currentDate);
    morningEnd.setHours(14, 0, 0, 0);
    
    shifts.push({
      userId: TEST_USER_UID,
      startTime: Timestamp.fromDate(morningStart),
      endTime: Timestamp.fromDate(morningEnd),
      roleOrTask: 'Head Pharmacist - Morning',
      notes: 'Responsible for clinical consultations and staff supervision',
      isSublettable: false,
      subletStatus: 'none',
      subletToFacilityId: null,
      subletContractId: null
    });
    
    // Afternoon shift - Technician
    const afternoonStart = new Date(currentDate);
    afternoonStart.setHours(14, 0, 0, 0);
    const afternoonEnd = new Date(currentDate);
    afternoonEnd.setHours(18, 30, 0, 0);
    
    shifts.push({
      userId: 'team_member_001',
      startTime: Timestamp.fromDate(afternoonStart),
      endTime: Timestamp.fromDate(afternoonEnd),
      roleOrTask: 'Pharmacy Technician - Afternoon',
      notes: 'Focus on dispensing and inventory management',
      isSublettable: true,
      subletStatus: 'available_for_sublet',
      subletToFacilityId: null,
      subletContractId: null
    });
    
    // Part-time assistant (3 days a week)
    if (day % 2 === 0) {
      const assistantStart = new Date(currentDate);
      assistantStart.setHours(9, 0, 0, 0);
      const assistantEnd = new Date(currentDate);
      assistantEnd.setHours(13, 0, 0, 0);
      
      shifts.push({
        userId: 'team_member_002',
        startTime: Timestamp.fromDate(assistantStart),
        endTime: Timestamp.fromDate(assistantEnd),
        roleOrTask: 'Pharmacy Assistant - Morning Support',
        notes: 'Customer service and administrative tasks',
        isSublettable: false,
        subletStatus: 'none',
        subletToFacilityId: null,
        subletContractId: null
      });
    }
  }
  
  // Add shifts to the schedule
  const shiftPromises = shifts.map(async (shift, index) => {
    const shiftRef = doc(db, 'teamSchedules', scheduleId, 'shifts', `shift_${index + 1}`);
    await setDoc(shiftRef, shift);
    return { id: `shift_${index + 1}`, ...shift };
  });
  
  const createdShifts = await Promise.all(shiftPromises);
  console.log('✅ Team schedule and shifts created');
  return { schedule: { id: scheduleId, ...scheduleData }, shifts: createdShifts };
};

/**
 * Generate conversation and message data - Updated to match documented structure
 */
const generateConversations = async () => {
  console.log('💬 Generating conversations and messages...');
  
  const conversations = [
    {
      participantIds: [TEST_USER_UID, 'sample_user_001'],
      participantInfo: [
        {
          userId: TEST_USER_UID,
          displayName: 'Dr. Sarah Mueller',
          photoURL: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400',
          roleInConversation: 'facility_representative'
        },
        {
          userId: 'sample_user_001',
          displayName: 'Dr. Michael Weber',
          photoURL: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400',
          roleInConversation: 'professional'
        }
      ],
      facilityProfileId: `${TEST_USER_UID}_facility`,
      professionalProfileId: 'sample_professional_001',
      contractId: null, // Will be updated when contracts are linked
      lastMessage: {
        text: 'Thanks for the information about the weekend position!',
        senderId: 'sample_user_001',
        timestamp: Timestamp.now()
      },
      lastMessageTimestamp: Timestamp.now(),
      unreadCounts: {
        [TEST_USER_UID]: 0,
        'sample_user_001': 1
      },
      isArchivedBy: [],
      typingIndicator: {
        [TEST_USER_UID]: false,
        'sample_user_001': false
      },
      createdAt: Timestamp.fromDate(new Date('2024-02-20')),
      updatedAt: Timestamp.now()
    },
    {
      participantIds: [TEST_USER_UID, 'team_member_001'],
      participantInfo: [
        {
          userId: TEST_USER_UID,
          displayName: 'Dr. Sarah Mueller',
          photoURL: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400',
          roleInConversation: 'facility_representative'
        },
        {
          userId: 'team_member_001',
          displayName: 'Anna Schneider',
          photoURL: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400',
          roleInConversation: 'facility_employee'
        }
      ],
      facilityProfileId: `${TEST_USER_UID}_facility`,
      professionalProfileId: null,
      contractId: null,
      lastMessage: {
        text: 'Could you cover my shift next Tuesday?',
        senderId: 'team_member_001',
        timestamp: Timestamp.fromDate(new Date('2024-03-01T15:30:00'))
      },
      lastMessageTimestamp: Timestamp.fromDate(new Date('2024-03-01T15:30:00')),
      unreadCounts: {
        [TEST_USER_UID]: 1,
        'team_member_001': 0
      },
      isArchivedBy: [],
      typingIndicator: {
        [TEST_USER_UID]: false,
        'team_member_001': false
      },
      createdAt: Timestamp.fromDate(new Date('2024-03-01')),
      updatedAt: Timestamp.fromDate(new Date('2024-03-01T15:30:00'))
    }
  ];
  
  const conversationPromises = conversations.map(async (conversation) => {
    const docRef = await addDoc(collection(db, 'conversations'), conversation);
    
    // Add sample messages as subcollection
    let messages = [];
    
    if (conversation.participantIds.includes('sample_user_001')) {
      // Professional inquiry conversation
      messages = [
        {
          senderId: TEST_USER_UID,
          text: 'Hi Michael! I saw your application for the weekend pharmacist position. Your experience looks great!',
          timestamp: Timestamp.fromDate(new Date('2024-02-20T10:00:00')),
          status: 'read',
          imageUrl: null,
          fileUrl: null,
          fileName: null,
          fileType: null,
          reactions: []
        },
        {
          senderId: 'sample_user_001',
          text: 'Thank you Sarah! I\'m very interested in the position. Could you tell me more about the specific responsibilities?',
          timestamp: Timestamp.fromDate(new Date('2024-02-20T10:30:00')),
          status: 'read',
          imageUrl: null,
          fileUrl: null,
          fileName: null,
          fileType: null,
          reactions: []
        },
        {
          senderId: TEST_USER_UID,
          text: 'Of course! The weekend shifts involve managing the pharmacy independently, handling prescriptions, and providing patient consultations. We also do some compounding work.',
          timestamp: Timestamp.fromDate(new Date('2024-02-20T11:15:00')),
          status: 'read',
          imageUrl: null,
          fileUrl: null,
          fileName: null,
          fileType: null,
          reactions: [
            {
              userId: 'sample_user_001',
              emoji: '👍'
            }
          ]
        },
        {
          senderId: 'sample_user_001',
          text: 'That sounds perfect! I have experience with all of those areas. What are the next steps in the process?',
          timestamp: Timestamp.fromDate(new Date('2024-02-20T12:00:00')),
          status: 'read',
          imageUrl: null,
          fileUrl: null,
          fileName: null,
          fileType: null,
          reactions: []
        },
        {
          senderId: TEST_USER_UID,
          text: 'Great! I\'ll send you the detailed job description and we can schedule a brief interview. Are you available this Friday afternoon?',
          timestamp: Timestamp.fromDate(new Date('2024-02-20T14:30:00')),
          status: 'read',
          imageUrl: null,
          fileUrl: null,
          fileName: null,
          fileType: null,
          reactions: []
        },
        {
          senderId: 'sample_user_001',
          text: 'Thanks for the information about the weekend position!',
          timestamp: Timestamp.now(),
          status: 'sent',
          imageUrl: null,
          fileUrl: null,
          fileName: null,
          fileType: null,
          reactions: []
        }
      ];
    } else if (conversation.participantIds.includes('team_member_001')) {
      // Team member conversation
      messages = [
        {
          senderId: 'team_member_001',
          text: 'Hi Sarah! I hope you\'re doing well.',
          timestamp: Timestamp.fromDate(new Date('2024-03-01T14:00:00')),
          status: 'read',
          imageUrl: null,
          fileUrl: null,
          fileName: null,
          fileType: null,
          reactions: []
        },
        {
          senderId: TEST_USER_UID,
          text: 'Hi Anna! I\'m good, thanks. How can I help you?',
          timestamp: Timestamp.fromDate(new Date('2024-03-01T14:15:00')),
          status: 'read',
          imageUrl: null,
          fileUrl: null,
          fileName: null,
          fileType: null,
          reactions: []
        },
        {
          senderId: 'team_member_001',
          text: 'I have a family emergency next Tuesday and was wondering if someone could cover my afternoon shift. It\'s from 2 PM to 6 PM.',
          timestamp: Timestamp.fromDate(new Date('2024-03-01T14:30:00')),
          status: 'read',
          imageUrl: null,
          fileUrl: null,
          fileName: null,
          fileType: null,
          reactions: []
        },
        {
          senderId: TEST_USER_UID,
          text: 'Of course! Don\'t worry about it. I\'ll check with Marco if he can extend his shift or I can cover it myself.',
          timestamp: Timestamp.fromDate(new Date('2024-03-01T15:00:00')),
          status: 'read',
          imageUrl: null,
          fileUrl: null,
          fileName: null,
          fileType: null,
          reactions: [
            {
              userId: 'team_member_001',
              emoji: '🙏'
            }
          ]
        },
        {
          senderId: 'team_member_001',
          text: 'Could you cover my shift next Tuesday?',
          timestamp: Timestamp.fromDate(new Date('2024-03-01T15:30:00')),
          status: 'sent',
          imageUrl: null,
          fileUrl: null,
          fileName: null,
          fileType: null,
          reactions: []
        }
      ];
    }
    
    // Add messages to subcollection
    for (const message of messages) {
      await addDoc(collection(db, 'conversations', docRef.id, 'messages'), message);
    }
    
    return { id: docRef.id, ...conversation };
  });
  
  const createdConversations = await Promise.all(conversationPromises);
  console.log('✅ Conversations and messages created');
  return createdConversations;
};

/**
 * Clean up test data (utility function)
 */
export const cleanupTestData = async () => {
  console.log('🧹 Cleaning up test data...');
  
  try {
    // Note: This is a simplified cleanup - in production you'd want more sophisticated cleanup
    const collections = [
      'users',
      'professionalProfiles', 
      'facilityProfiles',
      'contracts',
      'professionalAvailabilities',
      'positions',
      'timeOffRequests',
      'teamSchedules',
      'conversations' // This includes messages as subcollections
    ];
    
    console.log('⚠️ Cleanup function created but not implemented to prevent accidental data loss');
    console.log('To clean up test data, manually delete documents with test user UID:', TEST_USER_UID);
    console.log('📝 Note: conversations now include messages as subcollections - these will be automatically deleted when parent conversation is deleted');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
};

export default generateTestData; 