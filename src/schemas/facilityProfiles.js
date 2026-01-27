const facilityProfilesSchema = {
  collectionName: 'facilityProfiles',
  description: 'Facility/employer profile information',
  documentId: 'facilityProfileId (unique facility identifier)',
  fields: {
    userId: {
      type: 'string',
      required: false,
      description: 'User UID of facility manager/representative'
    },
    facilityProfileId: {
      type: 'string',
      required: true,
      description: 'Unique facility identifier (matches document ID)'
    },
    email: {
      type: 'string',
      required: false,
      description: 'Facility email address'
    },
    profileType: {
      type: 'string',
      required: false,
      description: 'Facility type (e.g., "pharmacy", "clinic", "hospital")'
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
    facilityName: {
      type: 'string',
      required: false,
      description: 'Facility name (legacy/flat field)'
    },
    facilityDetails: {
      type: 'object',
      required: false,
      description: 'Facility details',
      fields: {
        name: 'string',
        additionalName: 'string',
        facilityType: 'string',
        address: {
          street: 'string',
          number: 'string',
          city: 'string',
          postalCode: 'string',
          canton: 'string',
          country: 'string'
        },
        mainPhoneNumber: 'string',
        mainEmail: 'string',
        website: 'string',
        glnNumber: 'string',
        GLN_certified: 'boolean | string'
      }
    },
    identityLegal: {
      type: 'object',
      required: false,
      description: 'Legal identity information',
      fields: {
        legalCompanyName: 'string',
        uidNumber: 'string',
        commercialRegisterNumber: 'string'
      }
    },
    billingInformation: {
      type: 'object',
      required: false,
      description: 'Billing information',
      fields: {
        legalName: 'string',
        uidNumber: 'string',
        billingAddress: {
          street: 'string',
          number: 'string',
          city: 'string',
          postalCode: 'string',
          canton: 'string',
          country: 'string'
        },
        invoiceEmail: 'string',
        invoiceNumber: 'string',
        invoiceDate: 'string',
        internalRef: 'string',
        verificationStatus: 'string'
      }
    },
    contact: {
      type: 'object',
      required: false,
      description: 'Contact information',
      fields: {
        primaryEmail: 'string',
        primaryPhone: 'string',
        primaryPhonePrefix: 'string'
      }
    },
    legalRepresentative: {
      type: 'object',
      required: false,
      description: 'Legal representative information',
      fields: {
        firstName: 'string',
        lastName: 'string',
        email: 'string',
        phone: 'string'
      }
    },
    billingContact: {
      type: 'object',
      required: false,
      description: 'Billing contact information',
      fields: {
        name: 'string',
        email: 'string',
        phone: 'string'
      }
    },
    facilityIBAN: {
      type: 'string',
      required: false,
      description: 'Facility bank IBAN'
    },
    facilityBankName: {
      type: 'string',
      required: false,
      description: 'Facility bank name'
    },
    employees: {
      type: 'array',
      required: false,
      description: 'Facility employees',
      itemStructure: {
        user_uid: 'string',
        uid: 'string',
        roles: 'string[]',
        rights: 'string[]',
        addedAt: 'Timestamp',
        addedBy: 'string'
      }
    },
    admins: {
      type: 'array',
      required: false,
      description: 'Array of admin user UIDs'
    },
    verification: {
      type: 'object',
      required: false,
      description: 'Verification status',
      fields: {
        identityStatus: 'string',
        billingStatus: 'string',
        overallVerificationStatus: 'string',
        overallStatus: 'string',
        verifiedAt: 'Timestamp',
        verifiedBy: 'string',
        verificationDocumentsProvided: 'array'
      }
    },
    commercialRegisterExtractUrl: {
      type: 'string',
      required: false,
      description: 'Commercial register extract document URL'
    },
    proofOfAddressUrl: {
      type: 'string',
      required: false,
      description: 'Proof of address document URL'
    },
    pharmacyLicenseUrl: {
      type: 'string',
      required: false,
      description: 'Pharmacy license document URL (if applicable)'
    },
    verificationStatus: {
      type: 'string',
      required: false,
      description: 'Overall verification status (legacy field)'
    },
    glnNumber: {
      type: 'string',
      required: false,
      description: 'GLN number (legacy field)'
    },
    GLN_certified: {
      type: 'boolean | string',
      required: false,
      description: 'GLN certification status'
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
    { fields: ['facilityProfileId'], unique: true },
    { fields: ['userId'] },
    { fields: ['profileType'] },
    { fields: ['verification.overallVerificationStatus'] }
  ]
};

export default facilityProfilesSchema;

