const auditProfessionalCertificationSchema = {
  collectionName: 'auditProfessionalCertification',
  description: 'Audit logs for professional certification verification',
  documentId: 'auto-generated',
  fields: {
    professionalId: {
      type: 'string',
      required: true,
      description: 'Professional user UID'
    },
    certificationId: {
      type: 'string',
      required: false,
      description: 'Certification identifier'
    },
    certificationType: {
      type: 'string',
      required: false,
      description: 'Type of certification'
    },
    action: {
      type: 'string',
      required: false,
      description: 'Action performed: "verified" | "rejected" | "updated" | etc.'
    },
    verifiedBy: {
      type: 'string',
      required: false,
      description: 'User UID who performed the verification'
    },
    verificationStatus: {
      type: 'string',
      required: false,
      description: 'Verification status'
    },
    notes: {
      type: 'string',
      required: false,
      description: 'Audit notes'
    },
    documentUrl: {
      type: 'string',
      required: false,
      description: 'Related document URL'
    },
    createdAt: {
      type: 'Timestamp',
      required: false,
      description: 'Audit record creation timestamp'
    }
  },
  indexes: [
    { fields: ['professionalId'] },
    { fields: ['certificationType'] },
    { fields: ['verificationStatus'] },
    { fields: ['createdAt'] }
  ]
};

export default auditProfessionalCertificationSchema;

