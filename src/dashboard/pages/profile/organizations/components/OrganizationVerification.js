import React, { useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiTrash2, FiFileText, FiCheckCircle, FiXCircle, FiClock } from 'react-icons/fi';

import Button from '../../../../../components/BoxedInputFields/Button';
import UploadFile from '../../../../../components/BoxedInputFields/UploadFile';
import { uploadFile } from '../../../../../services/storageService';
import useAutoSave from '../../../../hooks/useAutoSave';

const styles = {
  sectionContainer: "flex flex-col gap-6 p-0 w-full max-w-[1400px] mx-auto",
  sectionsWrapper: "organization-verification-sections-wrapper w-full max-w-[1400px] mx-auto",
  leftColumn: "flex flex-col gap-6 flex-1",
  rightColumn: "flex flex-col gap-6 flex-1",
  sectionCard: "bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow w-full relative overflow-visible",
  cardHeader: "flex items-center gap-3 mb-4 pb-3 border-b border-border/40",
  cardIconWrapper: "p-2.5 rounded-xl bg-primary/10 flex-shrink-0",
  cardIconStyle: { color: 'var(--primary-color)' },
  cardTitle: "flex-1 min-w-0",
  cardTitleH3: "m-0 text-sm font-semibold truncate",
  cardTitleH3Style: { color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  grid: "grid grid-cols-1 gap-6 overflow-visible",
  documentList: "space-y-4",
  documentItem: "flex items-center justify-between p-4 border border-border rounded-lg",
  documentInfo: "flex items-center gap-3 flex-1",
  documentStatus: "flex items-center gap-2",
  uploadSection: "space-y-4"
};

const OrganizationVerification = ({
  formData,
  config,
  errors,
  isSubmitting,
  onInputChange,
  onArrayChange,
  onSaveAndContinue,
  onSave,
  onCancel,
  getNestedValue,
  validateCurrentTabData,
}) => {
  const { t } = useTranslation(['dashboardProfile', 'common', 'validation']);
  const [uploadingDocType, setUploadingDocType] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const verificationDocuments = useMemo(() => {
    return getNestedValue(formData, 'verification.verificationDocuments') || [];
  }, [formData, getNestedValue]);

  const extractTabData = useCallback(() => {
    if (!formData) return null;
    return {
      verification: formData.verification || {}
    };
  }, [formData]);

  useAutoSave({
    formData,
    config,
    activeTab: 'organizationVerification',
    onInputChange,
    onSave,
    getNestedValue,
    extractTabData,
    validateCurrentTabData,
  });

  const handleFileUpload = useCallback(async (files, docType) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    try {
      setUploadingDocType(docType);
      setUploadProgress(0);

      const organizationId = getNestedValue(formData, 'organizationProfileId') || 'unknown_org';
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      const normalizedFileName = `${baseName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${timestamp}.${fileExtension}`;
      const path = `documents/organizations/${organizationId}/${docType}/${normalizedFileName}`;
      
      const downloadURL = await uploadFile(file, path, (progress) => {
        setUploadProgress(progress);
      });

      const uploadedAt = new Date().toISOString();
      const fileMetadata = {
        documentId: `org_doc_${Date.now()}`,
        type: docType,
        fileName: normalizedFileName,
        originalFileName: file.name,
        storageUrl: downloadURL,
        storagePath: path,
        fileSize: file.size,
        fileType: file.type || 'application/octet-stream',
        uploadedAt: uploadedAt,
        status: 'pending',
        verificationStatus: 'pending'
      };

      const currentDocs = verificationDocuments.filter(doc => doc.type !== docType);
      onArrayChange('verification.verificationDocuments', [...currentDocs, fileMetadata]);
      
      if (onSave) {
        await onSave();
      }
    } catch (error) {
      console.error('Error uploading document:', error);
    } finally {
      setUploadingDocType(null);
      setUploadProgress(0);
    }
  }, [formData, getNestedValue, verificationDocuments, onArrayChange, onSave]);

  const handleRemoveDocument = useCallback((documentId) => {
    const updatedDocs = verificationDocuments.filter(doc => doc.documentId !== documentId);
    onArrayChange('verification.verificationDocuments', updatedDocs);
  }, [verificationDocuments, onArrayChange]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'verified':
        return <FiCheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <FiXCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
      default:
        return <FiClock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'verified':
        return t('verification.verified', 'Verified');
      case 'rejected':
        return t('verification.rejected', 'Rejected');
      case 'pending':
      default:
        return t('verification.pending', 'Pending');
    }
  };

  const documentTypes = [
    { type: 'commercial_register', label: t('verification.commercialRegister', 'Commercial Register Extract') },
    { type: 'proof_of_address', label: t('verification.proofOfAddress', 'Proof of Address') },
    { type: 'legal_representative_id', label: t('verification.legalRepresentativeId', 'Legal Representative ID') },
    { type: 'billing_document', label: t('verification.billingDocument', 'Billing Document') }
  ];

  return (
    <div className={styles.sectionContainer} style={{ position: 'relative' }}>
      <style>{`
        .organization-verification-sections-wrapper {
          container-type: inline-size;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        @container (max-width: 700px) {
          .organization-verification-sections-wrapper {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <div className={styles.sectionsWrapper}>
          <div className={styles.leftColumn}>
            <div className={styles.sectionCard} style={{ position: 'relative', zIndex: 10 }}>
              <div className={styles.grid}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardIconWrapper}>
                    <FiFileText className="w-4 h-4" style={styles.cardIconStyle} />
                  </div>
                  <div className={styles.cardTitle}>
                    <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>
                      {t('verification.verificationDocuments', 'Verification Documents')}
                    </h3>
                  </div>
                </div>

                <div className={styles.uploadSection}>
                  {documentTypes.map((docType) => {
                    const existingDoc = verificationDocuments.find(doc => doc.type === docType.type);
                    const isUploading = uploadingDocType === docType.type;

                    return (
                      <div key={docType.type} className="space-y-2">
                        <label className="text-sm font-medium">
                          {docType.label}
                        </label>
                        {existingDoc ? (
                          <div className={styles.documentItem}>
                            <div className={styles.documentInfo}>
                              <FiFileText className="w-5 h-5 text-muted-foreground" />
                              <div className="flex-1">
                                <p className="text-sm font-medium">{existingDoc.originalFileName || existingDoc.fileName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {t('common.uploadedAt', 'Uploaded')}: {new Date(existingDoc.uploadedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className={styles.documentStatus}>
                              {getStatusIcon(existingDoc.verificationStatus || existingDoc.status)}
                              <span className="text-sm">{getStatusLabel(existingDoc.verificationStatus || existingDoc.status)}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveDocument(existingDoc.documentId)}
                                className="ml-2"
                              >
                                <FiTrash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <UploadFile
                            onFileSelect={(files) => handleFileUpload(files, docType.type)}
                            accept=".pdf,.jpg,.jpeg,.png"
                            disabled={isUploading}
                            multiple={false}
                          />
                        )}
                        {isUploading && (
                          <div className="text-xs text-muted-foreground">
                            {t('common.uploading', 'Uploading')}... {uploadProgress}%
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {verificationDocuments.length > 0 && (
                  <div className={styles.documentList}>
                    <h4 className="text-sm font-semibold mb-2">
                      {t('verification.uploadedDocuments', 'Uploaded Documents')}
                    </h4>
                    {verificationDocuments.map((doc) => (
                      <div key={doc.documentId} className={styles.documentItem}>
                        <div className={styles.documentInfo}>
                          <FiFileText className="w-5 h-5 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{doc.originalFileName || doc.fileName}</p>
                            <p className="text-xs text-muted-foreground">
                              {t('common.uploadedAt', 'Uploaded')}: {new Date(doc.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className={styles.documentStatus}>
                          {getStatusIcon(doc.verificationStatus || doc.status)}
                          <span className="text-sm">{getStatusLabel(doc.verificationStatus || doc.status)}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveDocument(doc.documentId)}
                            className="ml-2"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={styles.rightColumn}>
            <div className={styles.sectionCard}>
              <div className={styles.grid}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardIconWrapper}>
                    <FiCheckCircle className="w-4 h-4" style={styles.cardIconStyle} />
                  </div>
                  <div className={styles.cardTitle}>
                    <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>
                      {t('verification.verificationStatus', 'Verification Status')}
                    </h3>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <span className="text-sm font-medium">
                      {t('verification.identityStatus', 'Identity Status')}
                    </span>
                    <span className="text-sm">
                      {getNestedValue(formData, 'verification.identityStatus') || 'pending'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <span className="text-sm font-medium">
                      {t('verification.billingStatus', 'Billing Status')}
                    </span>
                    <span className="text-sm">
                      {getNestedValue(formData, 'verification.billingStatus') || 'pending'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 border-2 border-primary rounded-lg">
                    <span className="text-sm font-semibold">
                      {t('verification.overallStatus', 'Overall Verification Status')}
                    </span>
                    <span className="text-sm font-semibold">
                      {getNestedValue(formData, 'verification.overallVerificationStatus') || 'pending'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};

OrganizationVerification.propTypes = {
  formData: PropTypes.object.isRequired,
  config: PropTypes.object,
  errors: PropTypes.object.isRequired,
  isSubmitting: PropTypes.bool.isRequired,
  onInputChange: PropTypes.func.isRequired,
  onArrayChange: PropTypes.func.isRequired,
  onSaveAndContinue: PropTypes.func,
  onSave: PropTypes.func,
  onCancel: PropTypes.func,
  getNestedValue: PropTypes.func.isRequired,
  validateCurrentTabData: PropTypes.func
};

export default OrganizationVerification;

