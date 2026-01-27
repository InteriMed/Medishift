const usersSchema = {
  collectionName: 'users',
  description: 'Core user identity and authentication data',
  documentId: 'uid (Firebase Auth UID)',
  fields: {
    uid: {
      type: 'string',
      required: true,
      description: 'Firebase Auth UID (matches document ID)'
    },
    email: {
      type: 'string',
      required: true,
      description: 'User email address'
    },
    firstName: {
      type: 'string',
      required: false,
      description: 'User first name'
    },
    lastName: {
      type: 'string',
      required: false,
      description: 'User last name'
    },
    displayName: {
      type: 'string',
      required: false,
      description: 'Display name for UI'
    },
    photoURL: {
      type: 'string | null',
      required: false,
      description: 'Profile picture URL'
    },
    emailVerified: {
      type: 'boolean',
      required: false,
      description: 'Email verification status'
    },
    roles: {
      type: 'array',
      required: false,
      description: 'Array of role objects for facility/organization access',
      structure: [
        {
          facility_uid: 'string',
          roles: 'string[]'
        },
        {
          organization_uid: 'string',
          roles: 'string[]',
          rights: 'string[]'
        }
      ]
    },
    createdAt: {
      type: 'Timestamp',
      required: false,
      description: 'Account creation timestamp'
    },
    updatedAt: {
      type: 'Timestamp',
      required: false,
      description: 'Last update timestamp'
    },
    adminCreated: {
      type: 'boolean',
      required: false,
      description: 'Flag if account was created by admin'
    },
    adminCreatedAt: {
      type: 'Timestamp',
      required: false,
      description: 'Timestamp when admin created the account'
    }
  },
  indexes: [
    { fields: ['email'], unique: true },
    { fields: ['roles.facility_uid'] },
    { fields: ['roles.organization_uid'] }
  ],
  notes: [
    'DO NOT include: role, profileType, profileCompleted, profileStatus, tutorialPassed, tutorialAccessMode, facilityMemberships, verifiedAt, verifiedBy',
    'These fields belong in profile collections (professionalProfiles, facilityProfiles)',
    'Document ID must match Firebase Auth UID'
  ]
};

export default usersSchema;

