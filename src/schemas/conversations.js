const conversationsSchema = {
  collectionName: 'conversations',
  description: 'Chat conversations between users',
  documentId: 'auto-generated',
  fields: {
    participantIds: {
      type: 'array',
      required: true,
      description: 'Array of user UIDs participating in the conversation'
    },
    lastMessageTimestamp: {
      type: 'Timestamp',
      required: false,
      description: 'Timestamp of the last message in the conversation'
    },
    lastMessage: {
      type: 'string',
      required: false,
      description: 'Preview of the last message'
    },
    unreadCount: {
      type: 'object',
      required: false,
      description: 'Unread message counts per participant',
      structure: {
        '[userId]': 'number'
      }
    },
    createdAt: {
      type: 'Timestamp',
      required: false,
      description: 'Conversation creation timestamp'
    },
    updatedAt: {
      type: 'Timestamp',
      required: false,
      description: 'Last update timestamp'
    }
  },
  indexes: [
    { fields: ['participantIds'], arrayConfig: 'CONTAINS' },
    { fields: ['lastMessageTimestamp'], order: 'DESCENDING' }
  ]
};

export default conversationsSchema;

