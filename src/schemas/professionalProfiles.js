const professionalProfilesSchema = {
  collectionName: 'professionalProfiles',
  description: 'Detailed professional profile information',
  documentId: 'userId (matches users/{uid})',
  fields: {
    userId: {
      type: 'string',
      required: true,
      description: 'User UID (matches users/{uid} document ID)'
    },
    email: {
      type: 'string',
      required: false,
      description: 'Professional email address'
    },
    profileType: {
      type: 'string',
      required: false,
      description: 'Professional type (e.g., "doctor", "nurse", "pharmacist")'
    },
    tutorialAccessMode: {
      type: 'string',
      required: false,
      description: 'Tutorial access mode: "enabled" | "disabled"'
    },
    subscriptionTier: {
      type: 'string',
      required: false,
      description: 'Subscription tier: "free" | "premium" | etc.'
    },
    identity: {
      type: 'object',
      required: false,
      description: 'Identity information',
      fields: {
        legalFirstName: 'string',
        legalLastName: 'string',
        firstName: 'string',
        lastName: 'string',
        dateOfBirth: 'string | Timestamp',
        placeOfBirth: 'string',
        gender: 'string',
        nationality: 'string',
        personalIdentificationNumber: 'string'
      }
    },
    contact: {
      type: 'object',
      required: false,
      description: 'Contact information',
      fields: {
        residentialAddress: {
          street: 'string',
          number: 'string',
          postalCode: 'string',
          city: 'string',
          canton: 'string',
          country: 'string'
        },
        contactPhonePrefix: 'string',
        contactPhone: 'string',
        contactEmail: 'string'
      }
    },
    professionalDetails: {
      type: 'object',
      required: false,
      description: 'Professional details',
      fields: {
        profession: 'string',
        specialization: 'string',
        yearsOfExperience: 'number',
        languages: 'string[]',
        glnNumber: 'string'
      }
    },
    education: {
      type: 'array',
      required: false,
      description: 'Education history',
      itemStructure: {
        degree: 'string',
        field: 'string',
        institution: 'string',
        startDate: 'string',
        endDate: 'string',
        currentlyStudying: 'boolean',
        country: 'string',
        gpa: 'string',
        honors: 'string'
      }
    },
    workExperience: {
      type: 'array',
      required: false,
      description: 'Work experience history',
      itemStructure: {
        position: 'string',
        jobTitle: 'string',
        employer: 'string',
        location: 'string',
        startDate: 'string',
        endDate: 'string',
        current: 'boolean',
        description: 'string'
      }
    },
    licensesCertifications: {
      type: 'array',
      required: false,
      description: 'Licenses and certifications'
    },
    professionalMemberships: {
      type: 'array',
      required: false,
      description: 'Professional memberships'
    },
    volunteering: {
      type: 'array',
      required: false,
      description: 'Volunteering experience'
    },
    billingInformation: {
      type: 'object',
      required: false,
      description: 'Billing and banking information',
      fields: {
        bankDetails: {
          accountHolderName: 'string',
          iban: 'string',
          bankName: 'string'
        }
      }
    },
    cvUrl: {
      type: 'string',
      required: false,
      description: 'CV document URL'
    },
    diplomaUrls: {
      type: 'array',
      required: false,
      description: 'Array of diploma document URLs'
    },
    verification: {
      type: 'object',
      required: false,
      description: 'Verification status',
      fields: {
        status: 'string',
        verifiedAt: 'Timestamp',
        verifiedBy: 'string'
      }
    },
    createdAt: {
      type: 'Timestamp',
      required: false,
      description: 'Profile creation timestamp'
    },
    updatedAt: {
      type: 'Timestamp',
      required: false,
      description: 'Last update timestamp'
    }
  },
  indexes: [
    { fields: ['userId'], unique: true },
    { fields: ['profileType'] },
    { fields: ['verification.status'] }
  ]
};

export default professionalProfilesSchema;

