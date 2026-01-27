const payrollSchema = {
  collectionName: 'payroll',
  description: 'Payroll records for employees',
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
      description: 'Facility UID'
    },
    organizationId: {
      type: 'string',
      required: false,
      description: 'Organization UID (if applicable)'
    },
    period: {
      type: 'object',
      required: false,
      description: 'Payroll period',
      fields: {
        startDate: 'Timestamp',
        endDate: 'Timestamp',
        month: 'number',
        year: 'number'
      }
    },
    shifts: {
      type: 'array',
      required: false,
      description: 'Array of shift IDs included in this payroll'
    },
    hoursWorked: {
      type: 'number',
      required: false,
      description: 'Total hours worked in period'
    },
    hourlyRate: {
      type: 'number',
      required: false,
      description: 'Hourly rate'
    },
    grossAmount: {
      type: 'number',
      required: false,
      description: 'Gross payroll amount'
    },
    deductions: {
      type: 'object',
      required: false,
      description: 'Deductions breakdown'
    },
    netAmount: {
      type: 'number',
      required: false,
      description: 'Net payroll amount'
    },
    currency: {
      type: 'string',
      required: false,
      description: 'Currency code (default: "CHF")'
    },
    status: {
      type: 'string',
      required: false,
      description: 'Payroll status: "draft" | "pending" | "processed" | "paid"'
    },
    paymentDate: {
      type: 'Timestamp',
      required: false,
      description: 'Payment date'
    },
    invoiceId: {
      type: 'string',
      required: false,
      description: 'Reference to invoices collection'
    },
    createdAt: {
      type: 'Timestamp',
      required: false,
      description: 'Payroll record creation timestamp'
    },
    updatedAt: {
      type: 'Timestamp',
      required: false,
      description: 'Last update timestamp'
    }
  },
  indexes: [
    { fields: ['employeeId'] },
    { fields: ['facilityId'] },
    { fields: ['status'] },
    { fields: ['period.year', 'period.month'] }
  ]
};

export default payrollSchema;

