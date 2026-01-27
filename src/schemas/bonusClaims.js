const bonusClaimsSchema = {
  collectionName: 'bonusClaims',
  description: 'Bonus claims from professionals',
  documentId: 'auto-generated',
  fields: {
    professionalId: {
      type: 'string',
      required: true,
      description: 'Professional user UID making the claim'
    },
    facilityId: {
      type: 'string',
      required: false,
      description: 'Facility UID (if applicable)'
    },
    claimType: {
      type: 'string',
      required: false,
      description: 'Type of bonus claim'
    },
    amount: {
      type: 'number',
      required: false,
      description: 'Claim amount'
    },
    currency: {
      type: 'string',
      required: false,
      description: 'Currency code (default: "CHF")'
    },
    description: {
      type: 'string',
      required: false,
      description: 'Claim description'
    },
    status: {
      type: 'string',
      required: false,
      description: 'Claim status: "pending" | "approved" | "rejected" | "paid"'
    },
    supportingDocuments: {
      type: 'array',
      required: false,
      description: 'Array of document URLs supporting the claim'
    },
    reviewedBy: {
      type: 'string',
      required: false,
      description: 'User UID who reviewed the claim'
    },
    reviewedAt: {
      type: 'Timestamp',
      required: false,
      description: 'Review timestamp'
    },
    createdAt: {
      type: 'Timestamp',
      required: false,
      description: 'Claim creation timestamp'
    },
    updatedAt: {
      type: 'Timestamp',
      required: false,
      description: 'Last update timestamp'
    }
  },
  indexes: [
    { fields: ['professionalId'] },
    { fields: ['facilityId'] },
    { fields: ['status'] },
    { fields: ['createdAt'] }
  ]
};

export default bonusClaimsSchema;

