export const DOCUMENT_TYPES = {
  IDENTITY: 'identity',
  WORK_PERMIT: 'work_permit',
  DIPLOMA: 'diploma',
  BILLING: 'billing',
  COMMERCIAL_REGISTRY: 'commercial_registry',
  GLN_CERTIFICATE: 'gln_certificate',
  GENERIC: 'generic'
} as const;

export type DocumentType = typeof DOCUMENT_TYPES[keyof typeof DOCUMENT_TYPES];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  [DOCUMENT_TYPES.IDENTITY]: 'Identity Document',
  [DOCUMENT_TYPES.WORK_PERMIT]: 'Work Permit',
  [DOCUMENT_TYPES.DIPLOMA]: 'Diploma',
  [DOCUMENT_TYPES.BILLING]: 'Billing Document',
  [DOCUMENT_TYPES.COMMERCIAL_REGISTRY]: 'Commercial Registry',
  [DOCUMENT_TYPES.GLN_CERTIFICATE]: 'GLN Certificate',
  [DOCUMENT_TYPES.GENERIC]: 'Generic Document'
};

