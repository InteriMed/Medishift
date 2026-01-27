const availabilitySchema = {
  collectionName: 'availability',
  description: 'Availability records',
  documentId: 'auto-generated',
  fields: {
    userId: {
      type: 'string',
      required: false,
      description: 'User UID'
    },
    professionalId: {
      type: 'string',
      required: false,
      description: 'Professional user UID'
    },
    startTime: {
      type: 'Timestamp',
      required: false,
      description: 'Availability start time'
    },
    endTime: {
      type: 'Timestamp',
      required: false,
      description: 'Availability end time'
    },
    status: {
      type: 'string',
      required: false,
      description: 'Availability status'
    },
    createdAt: {
      type: 'Timestamp',
      required: false,
      description: 'Availability creation timestamp'
    },
    updatedAt: {
      type: 'Timestamp',
      required: false,
      description: 'Last update timestamp'
    }
  },
  indexes: [
    { fields: ['userId'] },
    { fields: ['professionalId'] },
    { fields: ['startTime'] },
    { fields: ['status'] }
  ]
};

export default availabilitySchema;

