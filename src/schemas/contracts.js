const contractsSchema = {
  collectionName: 'contracts',
  description: 'Signed contracts between professionals and facilities',
  documentId: 'auto-generated',
  fields: {
    parties: {
      type: 'object',
      required: true,
      description: 'Contract parties',
      fields: {
        professional: {
          type: 'object',
          fields: {
            profileId: 'string',
            legalFirstName: 'string',
            legalLastName: 'string',
            email: 'string'
          }
        },
        employer: {
          type: 'object',
          fields: {
            profileId: 'string',
            legalCompanyName: 'string',
            email: 'string'
          }
        }
      }
    },
    participants: {
      type: 'array',
      required: true,
      description: 'Array of user UIDs who are participants in the contract'
    },
    terms: {
      type: 'object',
      required: false,
      description: 'Contract terms and conditions',
      fields: {
        jobTitle: 'string',
        startDate: 'Timestamp',
        endDate: 'Timestamp | null',
        hourlyRate: 'number',
        hoursPerWeek: 'number',
        role: 'string',
        description: 'string'
      }
    },
    statusLifecycle: {
      type: 'object',
      required: false,
      description: 'Contract status lifecycle',
      fields: {
        currentStatus: 'string',
        timestamps: {
          createdAt: 'Timestamp',
          updatedAt: 'Timestamp'
        }
      }
    },
    startDate: {
      type: 'Timestamp',
      required: false,
      description: 'Contract start date (legacy field)'
    },
    endDate: {
      type: 'Timestamp | null',
      required: false,
      description: 'Contract end date (legacy field)'
    },
    createdBy: {
      type: 'string',
      required: false,
      description: 'User UID who created the contract'
    },
    createdAt: {
      type: 'Timestamp',
      required: false,
      description: 'Contract creation timestamp'
    },
    updatedAt: {
      type: 'Timestamp',
      required: false,
      description: 'Last update timestamp'
    }
  },
  indexes: [
    { fields: ['participants'], arrayConfig: 'CONTAINS' },
    { fields: ['parties.professional.profileId'] },
    { fields: ['parties.employer.profileId'] },
    { fields: ['statusLifecycle.currentStatus'] }
  ],
  notes: [
    'Status values: "draft", "awaiting_dual_approval", "approved", "active", "completed", "cancelled"'
  ]
};

export default contractsSchema;

