// FILE: /src/pages/dashboard/profile/facilities/components/DocumentUploads.js
// Renders the facility document upload section

import React, { useState, useMemo, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { get } from 'lodash';
import { FiEdit, FiTrash2, FiFileText, FiUploadCloud, FiCheckCircle } from 'react-icons/fi';

// --- Import Base Components ---
import Button from '../../../../../components/BoxedInputFields/Button';
import UploadFile from '../../../../../components/BoxedInputFields/UploadFile';

// --- Import Storage Service ---
import { uploadFile } from '../../../../../services/storageService';
import useAutoSave from '../../../../hooks/useAutoSave';

const styles = {
    sectionContainer: "flex flex-col gap-6 p-1 w-full max-w-[1400px] mx-auto",
    headerCard: "bg-card rounded-2xl border border-border/50 px-6 py-4 shadow-lg backdrop-blur-sm w-full max-w-[1400px] mx-auto flex items-center",
    sectionTitle: "text-2xl font-semibold mb-2",
    sectionTitleStyle: { fontSize: '18px', color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
    sectionSubtitle: "text-sm font-medium",
    sectionSubtitleStyle: { color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
    subtitleRow: "flex items-end justify-between gap-4",
    mandatoryFieldLegend: "text-xs",
    mandatoryFieldLegendStyle: { color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
    mandatoryMark: "text-destructive",
    sectionsWrapper: "facility-uploads-wrapper w-full max-w-[1400px] mx-auto",
    leftColumn: "flex flex-col gap-6 flex-1",
    rightColumn: "flex flex-col gap-6 flex-1",
    sectionCard: "space-y-6 bg-card p-6 rounded-2xl border border-border/50 shadow-lg backdrop-blur-sm w-full",
    cardHeader: "flex items-center gap-4 mb-0",
    cardIconWrapper: "p-2 rounded-lg bg-primary/10",
    cardIconStyle: { color: 'var(--primary-color)' },
    cardTitle: "flex-1",
    cardTitleH3: "text-lg font-bold flex items-center gap-2 m-0",
    cardTitleH3Style: { color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
    formActions: "flex justify-end gap-4 w-full max-w-[1400px] mx-auto",
    sectionContent: "space-y-4",
    errorText: "text-destructive text-sm mt-2",
    errorUpload: "border-destructive"
};

const useFileUpload = () => {
    const [uploadState, setUploadState] = useState({ isLoading: false, progress: 0, error: null, type: null });

    const upload = async (file, path, docType) => {
        setUploadState({ isLoading: true, progress: 0, error: null, type: docType });

        try {
            const downloadURL = await uploadFile(file, path, (progress) => {
                setUploadState(prev => ({
                    ...prev,
                    progress: prev.type === docType ? progress : prev.progress
                }));
            });

            setUploadState({ isLoading: false, progress: 0, error: null, type: null });
            return downloadURL;
        } catch (error) {
            setUploadState({
                isLoading: false,
                progress: 0,
                error: error.message || 'Upload failed',
                type: docType
            });
            throw error;
        }
    };

    return { upload, uploadState };
};

const DocumentUploads = ({
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
    onTabCompleted,
    isTutorialActive
}) => {
    const { t } = useTranslation(['dashboardProfile', 'common', 'validation']);
    const { upload, uploadState } = useFileUpload();

    const documentFieldsConfig = useMemo(() => config?.fields?.documentUploads || [], [config]);

    const extractTabData = useCallback(() => {
        if (!formData) return null;
        const tabData = {};
        documentFieldsConfig.forEach(field => {
            const value = getNestedValue(formData, field.name);
            if (value !== undefined && value !== null) {
                tabData[field.name] = value;
            }
        });
        return tabData;
    }, [formData, documentFieldsConfig, getNestedValue]);

    useAutoSave({
        formData,
        config,
        activeTab: 'facilityDocuments',
        onInputChange,
        onSave,
        getNestedValue,
        extractTabData,
        validateCurrentTabData,
        onTabCompleted,
        isTutorialActive
    });

    const handleCancel = useCallback(() => {
        if (onCancel) onCancel();
    }, [onCancel]);

    const handleFileUpload = useCallback(async (files, fieldConfig) => {
        if (!files || files.length === 0) return;
        const file = files[0];
        const { docType, name: fieldName, isMultiple } = fieldConfig;

        try {
            const userId = getNestedValue(formData, 'userId') || 'unknown_user';
            const facilityId = getNestedValue(formData, 'facilityId') || userId;
            const timestamp = Date.now();
            const fileExtension = file.name.split('.').pop();
            const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
            const normalizedFileName = `${baseName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${timestamp}.${fileExtension}`;
            const path = `documents/facilities/${facilityId}/${docType}/${normalizedFileName}`;
            const downloadURL = await upload(file, path, docType);

            const uploadedAt = new Date().toISOString();
            const fileMetadata = {
                documentId: `facility_doc_${Date.now()}`,
                userId: userId,
                facilityId: facilityId,
                type: docType,
                category: docType,
                fileName: normalizedFileName,
                originalFileName: file.name,
                storageUrl: downloadURL,
                fileSize: file.size,
                fileType: file.type || 'application/octet-stream',
                uploadedAt: uploadedAt,
                status: 'pending_verification'
            };

            // Update verificationDocumentsProvided array
            const currentDocs = getNestedValue(formData, 'verification.verificationDocumentsProvided') || [];

            if (isMultiple) {
                onArrayChange('verification.verificationDocumentsProvided', [...currentDocs, fileMetadata]);
                const currentUrls = getNestedValue(formData, fieldName) || [];
                onArrayChange(fieldName, [...currentUrls, downloadURL]);
            } else {
                const filteredDocs = currentDocs.filter(doc => doc.type !== docType);
                onArrayChange('verification.verificationDocumentsProvided', [...filteredDocs, fileMetadata]);
                onInputChange(fieldName, downloadURL);
            }
        } catch (error) {
            // Error uploading document
        }
    }, [upload, formData, getNestedValue, onInputChange, onArrayChange]);

    const handleRemoveDocument = useCallback((fieldConfig, indexOrUrlToRemove) => {
        const { name: fieldName, isMultiple, docType } = fieldConfig;
        const currentDocs = getNestedValue(formData, 'verification.verificationDocumentsProvided') || [];

        if (isMultiple) {
            const currentUrls = getNestedValue(formData, fieldName) || [];
            let updatedUrls;
            let updatedDocs;

            if (typeof indexOrUrlToRemove === 'number') {
                const docsOfType = currentDocs.filter(doc => doc.type === docType);
                const docToRemove = docsOfType[indexOrUrlToRemove];
                updatedDocs = currentDocs.filter(doc => doc !== docToRemove);
                updatedUrls = currentUrls.filter((_, i) => i !== indexOrUrlToRemove);
            } else {
                updatedDocs = currentDocs.filter(doc => doc.storageUrl !== indexOrUrlToRemove);
                updatedUrls = currentUrls.filter(url => url !== indexOrUrlToRemove);
            }

            onArrayChange('verification.verificationDocumentsProvided', updatedDocs);
            onArrayChange(fieldName, updatedUrls);
        } else {
            const filteredDocs = currentDocs.filter(doc => doc.type !== docType);
            onArrayChange('verification.verificationDocumentsProvided', filteredDocs);
            onInputChange(fieldName, '');
        }
    }, [getNestedValue, formData, onInputChange, onArrayChange]);

    const getCurrentFiles = useCallback((fieldConfig) => {
        const { isMultiple, docType, name } = fieldConfig;
        // For facilities, we use verificationDocumentsProvided or the field itself
        // But the previous implementation used 'verification.verificationDocumentsProvided' as the source for the UI to be safe
        // And also stored just URLs in the specific fieldName for isMultiple.
        // Let's stick to using verificationDocumentsProvided as source of truth for metadata.

        const allDocs = getNestedValue(formData, 'verification.verificationDocumentsProvided') || [];
        const docsOfType = allDocs.filter(doc => doc.type === docType);

        if (isMultiple) {
            return docsOfType.map(doc => ({ url: doc.storageUrl, doc }));
        } else {
            // If manual field check is needed (e.g. single url string in fieldName)
            // But let's trust the array.
            return docsOfType.length > 0 ? [{ url: docsOfType[0].storageUrl, doc: docsOfType[0] }] : [];
        }
    }, [formData, getNestedValue]);

    // Sub-component for rendering
    const RenderDocumentCard = ({ fieldConfig }) => {
        const { docType, name: fieldName, required, isMultiple, labelKey, accept } = fieldConfig;
        const currentFiles = getCurrentFiles(fieldConfig);
        const error = getNestedValue(errors, fieldName);
        const label = t(labelKey, docType);

        const isCurrentlyUploading = uploadState.isLoading && uploadState.type === docType;
        const inputRef = useRef(null);

        const uploadButtonLabel = isMultiple
            ? t(`documents.add${docType.charAt(0).toUpperCase() + docType.slice(1)}Button`, `Add ${docType}`)
            : currentFiles.length > 0
                ? t(`documents.replace${docType.charAt(0).toUpperCase() + docType.slice(1)}Button`, `Replace ${docType}`)
                : t(`documents.upload${docType.charAt(0).toUpperCase() + docType.slice(1)}Button`, `Upload ${docType}`);

        const renderDocumentItem = (fileData, index) => {
            const url = fileData.url || fileData;
            const doc = fileData.doc || null;
            const getFileNameFromUrl = (url) => {
                if (!url) return '';
                try {
                    const path = new URL(url).pathname;
                    const parts = path.split('/');
                    return decodeURIComponent(parts[parts.length - 1]);
                } catch (e) {
                    const parts = url.split('/');
                    return parts[parts.length - 1];
                }
            };
            const fileName = doc?.originalFileName || getFileNameFromUrl(url);

            return (
                <div key={url || index} style={{ display: 'flex', alignItems: 'center', padding: 0, margin: 0 }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        color: 'hsl(var(--foreground))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '0.75rem'
                    }}>
                        <FiFileText />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 500, fontSize: 'var(--font-size-small)', color: 'hsl(var(--foreground))', fontFamily: 'var(--font-family-text, Roboto, sans-serif)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={fileName}>{fileName}</p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <FiCheckCircle size={12} /> {t('common.uploaded')}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            onClick={() => inputRef.current && inputRef.current.click()}
                            style={{ background: 'none', border: 'none', padding: 0, color: '#000000', cursor: 'pointer', transition: 'color 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'hsl(221, 83%, 53%)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#000000'}
                            title={t('documents.replace')}
                            aria-label={t('documents.replace')}
                        >
                            <FiEdit style={{ width: '16px', height: '16px', color: 'inherit' }} />
                        </button>
                        <button
                            onClick={() => {
                                const urlToRemove = url;
                                handleRemoveDocument(fieldConfig, isMultiple ? index : urlToRemove);
                            }}
                            style={{ background: 'none', border: 'none', padding: 0, color: '#000000', cursor: 'pointer', transition: 'color 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'hsl(221, 83%, 53%)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#000000'}
                            title={t('documents.remove')}
                            aria-label={t('documents.remove')}
                        >
                            <FiTrash2 style={{ width: '16px', height: '16px', color: 'inherit' }} />
                        </button>
                    </div>
                </div>
            );
        };

        return (
            <div className={styles.sectionCard}>
                <h4 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>
                    <FiFileText /> {label} {required && <span className={styles.mandatoryMark}>*</span>}
                </h4>
                <div className={styles.sectionContent}>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, paddingBottom: (!isMultiple && currentFiles.length === 1) ? 0 : undefined }}>
                        {isMultiple
                            ? currentFiles.map((fileData, index) => {
                                const url = fileData.url || fileData;
                                return (
                                    <React.Fragment key={url || index}>
                                        {renderDocumentItem(fileData, index)}
                                        {index < currentFiles.length - 1 && (
                                            <div style={{ height: '1px', backgroundColor: 'hsl(var(--border) / 0.3)', margin: '0.5rem 0' }} />
                                        )}
                                    </React.Fragment>
                                );
                            })
                            : currentFiles.length > 0 ? renderDocumentItem(currentFiles[0], 0) : null
                        }
                    </div>

                    <div style={{ marginTop: (currentFiles.length === 0) ? 0 : ((!isMultiple && currentFiles.length === 1) ? 0 : '1.5rem') }}>
                        {/* Always show auto-hidden file input for replace actions */}
                        {/* If single file already uploaded and not multiple, we only show button if we want to expose 'replace' via big button too, but we have icon button.
                              However, Professional component SHOWS the button (UploadFile) as well or logic to handle it.
                              In Professional component:
                              isMultiple || currentFiles.length === 0 ? <UploadFile...> : <><input hidden ... /></>
                              If single file exists, it shows the replace icon button which triggers input.
                           */}

                        {isMultiple || currentFiles.length === 0 ? (
                            <UploadFile
                                ref={inputRef}
                                onChange={(files) => handleFileUpload(files, fieldConfig)}
                                isLoading={isCurrentlyUploading}
                                progress={isCurrentlyUploading ? uploadState.progress : 0}
                                accept={accept || ".pdf,.jpg,.png,.doc,.docx"}
                                label={uploadButtonLabel}
                                documentName={label.toLowerCase()}
                                className={error && currentFiles.length === 0 ? styles.errorUpload : ''}
                            />
                        ) : (
                            <input
                                ref={inputRef}
                                type="file"
                                accept={accept || ".pdf,.jpg,.png,.doc,.docx"}
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        handleFileUpload([e.target.files[0]], fieldConfig);
                                        e.target.value = '';
                                    }
                                }}
                                style={{ display: 'none' }}
                            />
                        )}
                    </div>

                    {error && currentFiles.length === 0 && <p className={styles.errorText} style={{ marginTop: '0.5rem' }}>{error}</p>}
                    {uploadState.type === docType && uploadState.error && <p className={styles.errorText} style={{ marginTop: '0.5rem' }}>{uploadState.error}</p>}
                </div>
            </div>
        );
    };

    return (
        <>
            <style>{`
            .facility-uploads-container {
                container-type: inline-size;
            }

            .facility-uploads-wrapper {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 1.5rem;
            }

            @container (max-width: 700px) {
                .facility-uploads-wrapper {
                    grid-template-columns: 1fr;
                }
            }
        `}</style>
            <div className={styles.sectionContainer}>
                <div className={styles.headerCard}>
                    <div className="flex flex-col gap-1 flex-1">
                        <h2 className={styles.sectionTitle} style={styles.sectionTitleStyle}>{t('documents.title')}</h2>
                        <p className={styles.sectionSubtitle} style={styles.sectionSubtitleStyle}>{t('documents.subtitle')}</p>
                    </div>
                </div>

                <div className="facility-uploads-container w-full max-w-[1400px] mx-auto">
                    <div className={styles.sectionsWrapper}>
                        <div className={styles.leftColumn}>
                            {documentFieldsConfig.filter((_, index) => index % 2 === 0).map(fieldConfig => (
                                <RenderDocumentCard key={fieldConfig.docType} fieldConfig={fieldConfig} />
                            ))}
                        </div>
                        <div className={styles.rightColumn}>
                            {documentFieldsConfig.filter((_, index) => index % 2 === 1).map(fieldConfig => (
                                <RenderDocumentCard key={fieldConfig.docType} fieldConfig={fieldConfig} />
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </>
    );
};

export default DocumentUploads;