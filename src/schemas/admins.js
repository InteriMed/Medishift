const adminsSchema = {
  collectionName: 'admins',
  description: 'Admin user accounts and permissions',
  documentId: 'uid (admin user UID)',
  fields: {
    uid: {
      type: 'string',
      required: true,
      description: 'Admin user UID (matches document ID)'
    },
    email: {
      type: 'string',
      required: true,
      description: 'Admin email address'
    },
    firstName: {
      type: 'string',
      required: false,
      description: 'Admin first name'
    },
    lastName: {
      type: 'string',
      required: false,
      description: 'Admin last name'
    },
    displayName: {
      type: 'string',
      required: false,
      description: 'Admin display name'
    },
    permissions: {
      type: 'array',
      required: false,
      description: 'Array of permission strings'
    },
    roles: {
      type: 'array',
      required: false,
      description: 'Array of admin role strings'
    },
    createdAt: {
      type: 'Timestamp',
      required: false,
      description: 'Admin account creation timestamp'
    },
    updatedAt: {
      type: 'Timestamp',
      required: false,
      description: 'Last update timestamp'
    }
  },
  indexes: [
    { fields: ['uid'], unique: true },
    { fields: ['email'], unique: true }
  ]
};

export default adminsSchema;

