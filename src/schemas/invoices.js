const invoicesSchema = {
  collectionName: 'invoices',
  description: 'Invoice records',
  documentId: 'auto-generated',
  fields: {
    invoiceNumber: {
      type: 'string',
      required: true,
      description: 'Unique invoice number'
    },
    facilityId: {
      type: 'string',
      required: false,
      description: 'Facility UID (if applicable)'
    },
    organizationId: {
      type: 'string',
      required: false,
      description: 'Organization UID (if applicable)'
    },
    professionalId: {
      type: 'string',
      required: false,
      description: 'Professional user UID (if applicable)'
    },
    invoiceDate: {
      type: 'Timestamp',
      required: false,
      description: 'Invoice date'
    },
    dueDate: {
      type: 'Timestamp',
      required: false,
      description: 'Invoice due date'
    },
    amount: {
      type: 'number',
      required: true,
      description: 'Invoice amount'
    },
    currency: {
      type: 'string',
      required: false,
      description: 'Currency code (default: "CHF")'
    },
    items: {
      type: 'array',
      required: false,
      description: 'Invoice line items',
      itemStructure: {
        description: 'string',
        quantity: 'number',
        unitPrice: 'number',
        total: 'number'
      }
    },
    status: {
      type: 'string',
      required: false,
      description: 'Invoice status: "draft" | "sent" | "paid" | "overdue" | "cancelled"'
    },
    paymentDate: {
      type: 'Timestamp',
      required: false,
      description: 'Payment date'
    },
    billingAddress: {
      type: 'object',
      required: false,
      description: 'Billing address',
      fields: {
        street: 'string',
        number: 'string',
        city: 'string',
        postalCode: 'string',
        canton: 'string',
        country: 'string'
      }
    },
    notes: {
      type: 'string',
      required: false,
      description: 'Additional invoice notes'
    },
    createdAt: {
      type: 'Timestamp',
      required: false,
      description: 'Invoice creation timestamp'
    },
    updatedAt: {
      type: 'Timestamp',
      required: false,
      description: 'Last update timestamp'
    }
  },
  indexes: [
    { fields: ['invoiceNumber'], unique: true },
    { fields: ['facilityId'] },
    { fields: ['professionalId'] },
    { fields: ['status'] },
    { fields: ['invoiceDate'] }
  ]
};

export default invoicesSchema;

