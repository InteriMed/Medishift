const facilityInvitationsSchema = {
  collectionName: 'facilityInvitations',
  description: 'Facility invitation records',
  documentId: 'auto-generated',
  fields: {
    facilityId: {
      type: 'string',
      required: true,
      description: 'Facility UID'
    },
    organizationId: {
      type: 'string',
      required: false,
      description: 'Organization UID (if applicable)'
    },
    invitedEmail: {
      type: 'string',
      required: true,
      description: 'Email address of invited user'
    },
    invitedBy: {
      type: 'string',
      required: false,
      description: 'User UID who sent the invitation'
    },
    roles: {
      type: 'array',
      required: false,
      description: 'Array of roles to assign upon acceptance'
    },
    status: {
      type: 'string',
      required: false,
      description: 'Invitation status: "pending" | "accepted" | "rejected" | "expired"'
    },
    token: {
      type: 'string',
      required: false,
      description: 'Invitation token'
    },
    expiresAt: {
      type: 'Timestamp',
      required: false,
      description: 'Invitation expiration timestamp'
    },
    acceptedAt: {
      type: 'Timestamp',
      required: false,
      description: 'Acceptance timestamp'
    },
    createdAt: {
      type: 'Timestamp',
      required: false,
      description: 'Invitation creation timestamp'
    },
    updatedAt: {
      type: 'Timestamp',
      required: false,
      description: 'Last update timestamp'
    }
  },
  indexes: [
    { fields: ['facilityId'] },
    { fields: ['invitedEmail'] },
    { fields: ['status'] },
    { fields: ['token'], unique: true }
  ]
};

export default facilityInvitationsSchema;

