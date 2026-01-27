const organizationsSchema = {
  collectionName: 'organizations',
  description: 'Organization/chain/group profile information',
  documentId: 'organizationProfileId (organization UID)',
  fields: {
    organizationProfileId: {
      type: 'string',
      required: true,
      description: 'Organization UID (matches document ID)'
    },
    role: {
      type: 'string',
      required: false,
      description: 'Role type: "organization"'
    },
    profileType: {
      type: 'string',
      required: false,
      description: 'Profile type: "organization" | "chain" | "group" | etc.'
    },
    organizationName: {
      type: 'string',
      required: false,
      description: 'Primary organization name'
    },
    additionalName: {
      type: 'string | null',
      required: false,
      description: 'Alternative/trade name'
    },
    organizationType: {
      type: 'string | null',
      required: false,
      description: 'Organization type (e.g., "pharmacy_chain", "hospital_group", "clinic_network")'
    },
    organizationDetails: {
      type: 'object',
      required: false,
      description: 'Organization details',
      fields: {
        name: 'string',
        additionalName: 'string | null',
        organizationType: 'string | null',
        registeredSince: 'string | Timestamp | null',
        headquartersAddress: {
          street: 'string',
          number: 'string',
          city: 'string',
          postalCode: 'string',
          canton: 'string',
          country: 'string'
        },
        glnCompany: 'string | null',
        responsiblePersons: 'array'
      }
    },
    identityLegal: {
      type: 'object',
      required: false,
      description: 'Legal identity',
      fields: {
        legalCompanyName: 'string',
        uidNumber: 'string | null',
        commercialRegisterNumber: 'string | null'
      }
    },
    billingInformation: {
      type: 'object',
      required: false,
      description: 'Billing information',
      fields: {
        legalName: 'string',
        uidNumber: 'string | null',
        billingAddress: {
          street: 'string',
          number: 'string',
          city: 'string',
          postalCode: 'string',
          canton: 'string',
          country: 'string'
        },
        invoiceEmail: 'string',
        invoiceNumber: 'string | null',
        invoiceDate: 'string | null',
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
    facilities: {
      type: 'object',
      required: false,
      description: 'Map of facility UIDs to facility metadata',
      structure: {
        '[facilityUid]': {
          facilityUid: 'string',
          facilityName: 'string',
          addedAt: 'Timestamp',
          addedBy: 'string',
          status: 'string',
          roles: 'string[]'
        }
      }
    },
    internalTeam: {
      type: 'object',
      required: false,
      description: 'Organization-level internal team',
      fields: {
        employees: {
          type: 'array',
          itemStructure: {
            user_uid: 'string',
            uid: 'string',
            roles: 'string[]',
            rights: 'string[]',
            addedAt: 'Timestamp',
            addedBy: 'string'
          }
        },
        admins: 'string[]'
      }
    },
    sharedTeam: {
      type: 'object',
      required: false,
      description: 'Shared team across facilities for replacements',
      fields: {
        employees: {
          type: 'array',
          itemStructure: {
            user_uid: 'string',
            uid: 'string',
            roles: 'string[]',
            rights: 'string[]',
            facilities: 'string[]',
            addedAt: 'Timestamp',
            addedBy: 'string'
          }
        },
        admins: 'string[]'
      }
    },
    verification: {
      type: 'object',
      required: false,
      description: 'Verification status',
      fields: {
        identityStatus: 'string',
        billingStatus: 'string',
        overallVerificationStatus: 'string',
        verifiedAt: 'Timestamp | null',
        verificationDocuments: {
          type: 'array',
          itemStructure: {
            documentId: 'string',
            type: 'string',
            fileName: 'string',
            storageUrl: 'string',
            storagePath: 'string',
            uploadedAt: 'Timestamp',
            status: 'string',
            verificationStatus: 'string'
          }
        }
      }
    },
    verificationStatus: {
      type: 'string',
      required: false,
      description: 'Overall verification status'
    },
    GLN_certified: {
      type: 'boolean | null',
      required: false,
      description: 'GLN certification status'
    },
    createdAt: {
      type: 'Timestamp',
      required: false,
      description: 'Organization creation timestamp'
    },
    updatedAt: {
      type: 'Timestamp',
      required: false,
      description: 'Last update timestamp'
    },
    createdBy: {
      type: 'string',
      required: false,
      description: 'User UID who created the organization'
    }
  },
  indexes: [
    { fields: ['organizationProfileId'], unique: true },
    { fields: ['profileType'] },
    { fields: ['verification.overallVerificationStatus'] }
  ],
  notes: [
    'Facilities map uses facility UIDs as keys for direct lookups',
    'Shared team supports cross-facility staffing/replacements',
    'Organization roles in users.roles follow same pattern as facility roles'
  ]
};

export default organizationsSchema;

