const legalArchiveSchema = {
  collectionName: 'legal_archive',
  description: 'Legal archive documents',
  documentId: 'auto-generated',
  fields: {
    documentType: {
      type: 'string',
      required: false,
      description: 'Type of legal document'
    },
    relatedEntityId: {
      type: 'string',
      required: false,
      description: 'Related entity UID (user, facility, organization)'
    },
    relatedEntityType: {
      type: 'string',
      required: false,
      description: 'Entity type: "user" | "facility" | "organization"'
    },
    documentUrl: {
      type: 'string',
      required: false,
      description: 'Document storage URL'
    },
    documentPath: {
      type: 'string',
      required: false,
      description: 'Document storage path'
    },
    fileName: {
      type: 'string',
      required: false,
      description: 'Original file name'
    },
    archivedBy: {
      type: 'string',
      required: false,
      description: 'User UID who archived the document'
    },
    archivedAt: {
      type: 'Timestamp',
      required: false,
      description: 'Archive timestamp'
    },
    retentionUntil: {
      type: 'Timestamp',
      required: false,
      description: 'Document retention expiration date'
    },
    metadata: {
      type: 'object',
      required: false,
      description: 'Additional document metadata'
    },
    createdAt: {
      type: 'Timestamp',
      required: false,
      description: 'Document creation timestamp'
    }
  },
  indexes: [
    { fields: ['relatedEntityId'] },
    { fields: ['relatedEntityType'] },
    { fields: ['documentType'] },
    { fields: ['archivedAt'] }
  ]
};

export default legalArchiveSchema;

