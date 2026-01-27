const notificationsSchema = {
  collectionName: 'notifications',
  description: 'User notifications',
  documentId: 'auto-generated',
  fields: {
    userId: {
      type: 'string',
      required: true,
      description: 'User UID who receives the notification'
    },
    type: {
      type: 'string',
      required: true,
      description: 'Notification type (e.g., "contract", "message", "shift", "system")'
    },
    title: {
      type: 'string',
      required: true,
      description: 'Notification title'
    },
    message: {
      type: 'string',
      required: true,
      description: 'Notification message content'
    },
    priority: {
      type: 'string',
      required: false,
      description: 'Notification priority: "low" | "normal" | "high" | "urgent"'
    },
    read: {
      type: 'boolean',
      required: false,
      description: 'Read status'
    },
    readAt: {
      type: 'Timestamp',
      required: false,
      description: 'Timestamp when notification was read'
    },
    actionUrl: {
      type: 'string | null',
      required: false,
      description: 'URL to navigate when notification is clicked'
    },
    metadata: {
      type: 'object',
      required: false,
      description: 'Additional metadata',
      fields: {
        source: 'string',
        category: 'string',
        relatedId: 'string'
      }
    },
    expiresAt: {
      type: 'Timestamp | null',
      required: false,
      description: 'Notification expiration timestamp'
    },
    createdAt: {
      type: 'Timestamp',
      required: true,
      description: 'Notification creation timestamp'
    }
  },
  indexes: [
    { fields: ['userId'] },
    { fields: ['read'] },
    { fields: ['type'] },
    { fields: ['createdAt'], order: 'DESCENDING' }
  ]
};

export default notificationsSchema;

