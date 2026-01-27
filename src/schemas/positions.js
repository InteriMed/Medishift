const positionsSchema = {
  collectionName: 'positions',
  description: 'Job positions posted by facilities',
  documentId: 'auto-generated',
  fields: {
    facilityId: {
      type: 'string',
      required: false,
      description: 'Facility UID posting the position'
    },
    facilityProfileId: {
      type: 'string',
      required: false,
      description: 'Facility profile ID'
    },
    organizationId: {
      type: 'string',
      required: false,
      description: 'Organization UID (if applicable)'
    },
    createdBy: {
      type: 'string',
      required: false,
      description: 'User UID who created the position'
    },
    postedByUserId: {
      type: 'string',
      required: false,
      description: 'User UID who posted the position'
    },
    title: {
      type: 'string',
      required: false,
      description: 'Job title'
    },
    jobTitle: {
      type: 'string',
      required: false,
      description: 'Job title (alternative field)'
    },
    description: {
      type: 'string',
      required: false,
      description: 'Job description'
    },
    jobType: {
      type: 'string',
      required: false,
      description: 'Job type: "temporary" | "permanent" | "general"'
    },
    status: {
      type: 'string',
      required: false,
      description: 'Position status: "open" | "filled" | "closed" | "cancelled"'
    },
    vacancyType: {
      type: 'string',
      required: false,
      description: 'Vacancy type: "urgent" | "regular"'
    },
    urgency: {
      type: 'string',
      required: false,
      description: 'Urgency level: "low" | "medium" | "high"'
    },
    visibility: {
      type: 'string',
      required: false,
      description: 'Visibility: "public" | "private"'
    },
    startTime: {
      type: 'Timestamp',
      required: false,
      description: 'Position start time'
    },
    endTime: {
      type: 'Timestamp',
      required: false,
      description: 'Position end time'
    },
    employeeUserId: {
      type: 'string',
      required: false,
      description: 'Assigned employee user UID (if filled)'
    },
    employeeRole: {
      type: 'string',
      required: false,
      description: 'Required employee role'
    },
    shiftType: {
      type: 'string',
      required: false,
      description: 'Shift type: "day" | "evening" | "night" | "weekend"'
    },
    compensation: {
      type: 'object',
      required: false,
      description: 'Compensation details',
      fields: {
        type: 'string',
        amount: 'number',
        currency: 'string'
      }
    },
    requiredSkills: {
      type: 'array',
      required: false,
      description: 'Array of required skills'
    },
    location: {
      type: 'string',
      required: false,
      description: 'Job location'
    },
    canton: {
      type: 'string',
      required: false,
      description: 'Swiss canton'
    },
    isSublettable: {
      type: 'boolean',
      required: false,
      description: 'Whether position can be sublet'
    },
    created: {
      type: 'Timestamp',
      required: false,
      description: 'Position creation timestamp'
    },
    updated: {
      type: 'Timestamp',
      required: false,
      description: 'Last update timestamp'
    }
  },
  indexes: [
    { fields: ['facilityId'] },
    { fields: ['organizationId'] },
    { fields: ['status'] },
    { fields: ['startTime'] },
    { fields: ['employeeUserId'] }
  ]
};

export default positionsSchema;

