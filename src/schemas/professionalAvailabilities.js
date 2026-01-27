const professionalAvailabilitiesSchema = {
  collectionName: 'professionalAvailabilities',
  description: 'Availability listings from professionals',
  documentId: 'auto-generated',
  fields: {
    professionalId: {
      type: 'string',
      required: true,
      description: 'Professional user UID'
    },
    title: {
      type: 'string',
      required: false,
      description: 'Availability title'
    },
    description: {
      type: 'string',
      required: false,
      description: 'Availability description'
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
    location: {
      type: 'string',
      required: false,
      description: 'Preferred location'
    },
    locationCountry: {
      type: 'array',
      required: false,
      description: 'Array of country codes'
    },
    LocationArea: {
      type: 'array',
      required: false,
      description: 'Array of area/canton codes'
    },
    languages: {
      type: 'array',
      required: false,
      description: 'Required languages'
    },
    experience: {
      type: 'string',
      required: false,
      description: 'Required experience level'
    },
    software: {
      type: 'array',
      required: false,
      description: 'Required software knowledge'
    },
    certifications: {
      type: 'array',
      required: false,
      description: 'Required certifications'
    },
    workAmount: {
      type: 'string',
      required: false,
      description: 'Work amount: "full-time" | "part-time" | etc.'
    },
    status: {
      type: 'string',
      required: false,
      description: 'Availability status'
    },
    isAvailability: {
      type: 'boolean',
      required: false,
      description: 'Whether this is an availability record'
    },
    isValidated: {
      type: 'boolean',
      required: false,
      description: 'Validation status'
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
    { fields: ['professionalId'] },
    { fields: ['startTime'] },
    { fields: ['status'] },
    { fields: ['isAvailability'] }
  ]
};

export default professionalAvailabilitiesSchema;

