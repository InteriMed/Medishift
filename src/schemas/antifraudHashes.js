const antifraudHashesSchema = {
  collectionName: 'antifraud_hashes',
  description: 'Anti-fraud hash records for document verification',
  documentId: 'auto-generated',
  fields: {
    documentHash: {
      type: 'string',
      required: true,
      description: 'Hash of the document content'
    },
    documentType: {
      type: 'string',
      required: false,
      description: 'Type of document'
    },
    userId: {
      type: 'string',
      required: false,
      description: 'User UID associated with the document'
    },
    facilityId: {
      type: 'string',
      required: false,
      description: 'Facility UID (if applicable)'
    },
    hashAlgorithm: {
      type: 'string',
      required: false,
      description: 'Hash algorithm used (e.g., "sha256")'
    },
    createdAt: {
      type: 'Timestamp',
      required: false,
      description: 'Hash creation timestamp'
    }
  },
  indexes: [
    { fields: ['documentHash'], unique: true },
    { fields: ['userId'] },
    { fields: ['documentType'] }
  ],
  notes: [
    'Used to detect duplicate document uploads and prevent fraud'
  ]
};

export default antifraudHashesSchema;

