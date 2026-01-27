const shiftsSchema = {
  collectionName: 'shifts',
  description: 'Work shifts assigned to employees',
  documentId: 'auto-generated',
  fields: {
    employeeId: {
      type: 'string',
      required: true,
      description: 'Employee user UID'
    },
    facilityId: {
      type: 'string',
      required: false,
      description: 'Facility UID where shift takes place'
    },
    organizationId: {
      type: 'string',
      required: false,
      description: 'Organization UID (if applicable)'
    },
    startTime: {
      type: 'Timestamp',
      required: true,
      description: 'Shift start time'
    },
    endTime: {
      type: 'Timestamp',
      required: true,
      description: 'Shift end time'
    },
    date: {
      type: 'Timestamp',
      required: false,
      description: 'Shift date'
    },
    status: {
      type: 'string',
      required: false,
      description: 'Shift status: "scheduled" | "confirmed" | "completed" | "cancelled"'
    },
    shiftType: {
      type: 'string',
      required: false,
      description: 'Shift type: "day" | "evening" | "night" | "weekend"'
    },
    title: {
      type: 'string',
      required: false,
      description: 'Shift title/description'
    },
    location: {
      type: 'string',
      required: false,
      description: 'Shift location'
    },
    notes: {
      type: 'string',
      required: false,
      description: 'Additional shift notes'
    },
    compensation: {
      type: 'object',
      required: false,
      description: 'Shift compensation details',
      fields: {
        type: 'string',
        amount: 'number',
        currency: 'string'
      }
    },
    createdAt: {
      type: 'Timestamp',
      required: false,
      description: 'Shift creation timestamp'
    },
    updatedAt: {
      type: 'Timestamp',
      required: false,
      description: 'Last update timestamp'
    }
  },
  indexes: [
    { fields: ['status', 'endTime', 'startTime'] },
    { fields: ['status', 'startTime'] },
    { fields: ['status', 'date'] },
    { fields: ['employeeId'] },
    { fields: ['facilityId'] }
  ]
};

export default shiftsSchema;

