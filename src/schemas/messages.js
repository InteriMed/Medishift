const messagesSchema = {
  collectionName: 'messages',
  description: 'Individual messages within conversations',
  documentId: 'auto-generated',
  fields: {
    conversationId: {
      type: 'string',
      required: true,
      description: 'Reference to conversations/{conversationId}'
    },
    senderId: {
      type: 'string',
      required: true,
      description: 'User UID of the message sender'
    },
    content: {
      type: 'string',
      required: true,
      description: 'Message content/text'
    },
    messageType: {
      type: 'string',
      required: false,
      description: 'Message type (e.g., "text", "image", "file")'
    },
    read: {
      type: 'boolean',
      required: false,
      description: 'Read status'
    },
    readAt: {
      type: 'Timestamp',
      required: false,
      description: 'Timestamp when message was read'
    },
    attachments: {
      type: 'array',
      required: false,
      description: 'Array of attachment objects'
    },
    createdAt: {
      type: 'Timestamp',
      required: true,
      description: 'Message creation timestamp'
    }
  },
  indexes: [
    { fields: ['conversationId'] },
    { fields: ['senderId'] },
    { fields: ['createdAt'], order: 'ASCENDING' }
  ]
};

export default messagesSchema;

