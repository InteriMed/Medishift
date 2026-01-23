import React, { useState, useMemo, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';

import Button from '../../../../../components/BoxedInputFields/Button';
import UploadFile from '../../../../../components/BoxedInputFields/UploadFile';
import SimpleDropdown from '../../../../../components/BoxedInputFields/Dropdown-Field';
import LoadingSpinner from '../../../../../components/LoadingSpinner/LoadingSpinner';
import { FiEdit, FiTrash2, FiFileText, FiUploadCloud, FiCheckCircle, FiEye, FiDownload, FiZap } from 'react-icons/fi';
import { cn } from '../../../../../utils/cn';

// --- Import Storage Service ---
import { uploadFile } from '../../../../../services/storageService';
import useAutoSave from '../../../../hooks/useAutoSave';

const styles = {
    sectionContainer: "flex flex-col gap-6 p-1 w-full max-w-[1400px] mx-auto",
    headerCard: "bg-card rounded-2xl border border-border/50 px-6 py-4 shadow-lg backdrop-blur-sm w-full max-w-[1400px] mx-auto flex items-center",
    sectionTitle: "text-2xl font-semibold mb-0",
    sectionTitleStyle: { fontSize: '18px', color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
    sectionSubtitle: "text-sm font-medium",
    sectionSubtitleStyle: { color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
    subtitleRow: "flex items-end justify-between gap-4",
    mandatoryFieldLegend: "text-xs",
    mandatoryFieldLegendStyle: { color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
    mandatoryMark: "text-destructive",
    sectionsWrapper: "flex flex-col lg:flex-row gap-6 w-full max-w-[1400px] mx-auto",
    leftColumn: "flex flex-col gap-6 flex-1",
    rightColumn: "flex flex-col gap-6 flex-1",
    sectionCard: "bg-card rounded-2xl border border-border/50 p-6 shadow-lg backdrop-blur-sm w-full",
    cardHeader: "flex items-center gap-3 mb-4 pb-3 border-b border-border/40",
    cardIconWrapper: "p-2.5 rounded-xl bg-primary/10 flex-shrink-0",
    cardIconStyle: { color: 'var(--primary-color)' },
    cardTitle: "flex-1 min-w-0",
    cardTitleH3: "m-0 text-sm font-semibold truncate",
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
    isTutorialActive,
    completionPercentage,
    handleAutoFillClick,
    isUploading,
    isAnalyzing,
    autoFillButtonRef,
    uploadInputRef,
    handleFileUpload: handleFileUploadProp,
    uploadProgress,
    t: tProp,
    stepData
}) => {
    const { t } = useTranslation(['dashboardProfile', 'common', 'validation']);
    const { upload, uploadState } = useFileUpload();

    const extractTabData = useCallback(() => {
        if (!formData) return null;
        const tabData = {};
        const documentFields = config?.fields?.documentUploads || [];
        documentFields.forEach(field => {
            const value = getNestedValue(formData, field.name);
            if (value !== undefined && value !== null) {
                tabData[field.name] = value;
            }
        });
        return tabData;
    }, [formData, config, getNestedValue]);

    useAutoSave({
        formData,
        config,
        activeTab: 'documentUploads',
        onInputChange,
        onSave,
        getNestedValue,
        extractTabData,
        validateCurrentTabData,
        onTabCompleted,
        isTutorialActive
    });

    const nationality = getNestedValue(formData, 'identity.nationality');
    const isSwiss = nationality === 'switzerland';

    const documentFieldsConfig = useMemo(() => {
        const baseConfig = config?.fields?.documentUploads || [];
        return baseConfig.map(field => {
            if (field.docType === 'workPermit') {
                if (isSwiss) {
                    return {
                        ...field,
                        docType: 'idCard',
                        name: 'workPermitUrl',
                        labelKey: 'documents.idCard',
                        descriptionKey: 'documents.idCardDescription',
                        required: true
                    };
                } else {
                    return {
                        ...field,
                        labelKey: 'documents.workPermit',
                        descriptionKey: 'documents.workPermitDescription'
                    };
                }
            }
            return field;
        });
    }, [config, isSwiss]);

    const handleCancel = useCallback(() => {
        if (onCancel) {
            onCancel();
        }
        window.location.reload();
    }, [onCancel]);

    const educationList = useMemo(() => {
        return getNestedValue(formData, 'professionalDetails.education') || [];
    }, [formData, getNestedValue]);

    const workExperienceList = useMemo(() => {
        return getNestedValue(formData, 'professionalDetails.workExperience') || [];
    }, [formData, getNestedValue]);

    const normalizeDocumentName = useCallback((fileName, docType, educationIndex = null, qualificationIndex = null, workExperienceIndex = null, referenceType = null) => {
        const extension = fileName.split('.').pop();
        const baseName = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
        const normalizedBase = baseName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const timestamp = Date.now();

        if (docType === 'diploma' && educationIndex !== null && educationList[educationIndex]) {
            const edu = educationList[educationIndex];
            const degree = (edu.degree || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
            const institution = (edu.institution || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
            return `${docType}_${degree}_${institution}_${timestamp}.${extension}`;
        }

        if (docType === 'qualification' && qualificationIndex !== null) {
            const qualifications = getNestedValue(formData, 'professionalDetails.qualifications') || [];
            if (qualifications[qualificationIndex]) {
                const qual = qualifications[qualificationIndex];
                const title = (qual.title || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
                const institution = (qual.institution || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
                return `${docType}_${title}_${institution}_${timestamp}.${extension}`;
            }
        }

        if (docType === 'referenceLetter' && referenceType === 'workExperience' && workExperienceIndex !== null && workExperienceList[workExperienceIndex]) {
            const workExp = workExperienceList[workExperienceIndex];
            const jobTitle = (workExp.jobTitle || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
            const employer = (workExp.employer || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
            return `${docType}_work_${jobTitle}_${employer}_${timestamp}.${extension}`;
        }

        if (docType === 'referenceLetter' && referenceType === 'education' && educationIndex !== null && educationList[educationIndex]) {
            const edu = educationList[educationIndex];
            const degree = (edu.degree || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
            const institution = (edu.institution || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
            return `${docType}_edu_${degree}_${institution}_${timestamp}.${extension}`;
        }

        return `${docType}_${normalizedBase}_${timestamp}.${extension}`;
    }, [educationList, formData, getNestedValue, workExperienceList]);

    const handleFileUpload = useCallback(async (files, fieldConfig, educationIndex = null, qualificationIndex = null, referenceValue = null) => {
        if (!files || files.length === 0) return;
        const file = files[0];
        const { docType, name: fieldName, isMultiple } = fieldConfig;

        let workExperienceIndex = null;
        let referenceType = null;
        let refEducationIndex = null;

        if (docType === 'referenceLetter' && referenceValue) {
            if (referenceValue.startsWith('work_')) {
                referenceType = 'workExperience';
                workExperienceIndex = parseInt(referenceValue.split('_')[1]);
            } else if (referenceValue.startsWith('edu_')) {
                referenceType = 'education';
                refEducationIndex = parseInt(referenceValue.split('_')[1]);
            }
        }

        try {
            const userId = getNestedValue(formData, 'userId') || 'unknown_user';
            const normalizedFileName = normalizeDocumentName(file.name, docType, educationIndex || refEducationIndex, qualificationIndex, workExperienceIndex, referenceType);
            const path = `documents/${userId}/${docType}/${normalizedFileName}`;
            const downloadURL = await upload(file, path, docType);

            const uploadedAt = new Date().toISOString();
            const fileMetadata = {
                documentId: `doc_${Date.now()}`,
                userId: userId,
                type: docType,
                category: docType,
                fileName: normalizedFileName,
                originalFileName: file.name,
                storageUrl: downloadURL,
                fileSize: file.size,
                fileType: file.type || 'application/octet-stream',
                uploadedAt: uploadedAt,
                status: 'pending_verification',
                educationIndex: docType === 'diploma' ? (educationIndex !== null ? parseInt(educationIndex) : null) : (docType === 'referenceLetter' && referenceType === 'education' ? refEducationIndex : null),
                qualificationIndex: docType === 'qualification' ? (qualificationIndex !== null ? parseInt(qualificationIndex) : null) : null,
                workExperienceIndex: docType === 'referenceLetter' && referenceType === 'workExperience' ? workExperienceIndex : null,
                referenceType: docType === 'referenceLetter' ? referenceType : null
            };

            if (isMultiple) {
                const currentDocs = getNestedValue(formData, 'verification.verificationDocuments') || [];
                onArrayChange('verification.verificationDocuments', [...currentDocs, fileMetadata]);
            } else {
                const currentDocs = getNestedValue(formData, 'verification.verificationDocuments') || [];
                const filteredDocs = currentDocs.filter(doc => doc.type !== docType);
                onArrayChange('verification.verificationDocuments', [...filteredDocs, fileMetadata]);
                onInputChange(fieldName, downloadURL);
            }
        } catch (error) {
            // Error uploading document
        }
    }, [upload, formData, getNestedValue, onInputChange, onArrayChange, normalizeDocumentName]);

    const handleRemoveDocument = useCallback((fieldConfig, indexOrUrlToRemove) => {
        const { name: fieldName, isMultiple, docType } = fieldConfig;

        if (isMultiple) {
            const currentDocs = getNestedValue(formData, 'verification.verificationDocuments') || [];
            let updatedDocs;

            if (typeof indexOrUrlToRemove === 'number') {
                const docsOfType = currentDocs.filter(doc => doc.type === docType);
                const docToRemove = docsOfType[indexOrUrlToRemove];
                updatedDocs = currentDocs.filter(doc => doc !== docToRemove);
            } else {
                updatedDocs = currentDocs.filter(doc => doc.storageUrl !== indexOrUrlToRemove);
            }

            onArrayChange('verification.verificationDocuments', updatedDocs);
        } else {
            const currentDocs = getNestedValue(formData, 'verification.verificationDocuments') || [];
            const updatedDocs = currentDocs.filter(doc => doc.type !== docType);
            onArrayChange('verification.verificationDocuments', updatedDocs);

            onInputChange(fieldName, '');
        }
    }, [getNestedValue, formData, onInputChange, onArrayChange]);

    const getCurrentFiles = useCallback((fieldConfig) => {
        const { isMultiple, docType } = fieldConfig;
        const allDocs = getNestedValue(formData, 'verification.verificationDocuments') || [];
        const docsOfType = allDocs.filter(doc => doc.type === docType);

        if (isMultiple) {
            return docsOfType.map(doc => ({ url: doc.storageUrl, doc }));
        } else {
            return docsOfType.length > 0 ? [{ url: docsOfType[0].storageUrl, doc: docsOfType[0] }] : [];
        }
    }, [formData, getNestedValue]);

    const qualificationsList = useMemo(() => {
        return getNestedValue(formData, 'professionalDetails.qualifications') || [];
    }, [formData, getNestedValue]);

    const getEducationOptions = useMemo(() => {
        const options = educationList.map((edu, index) => {
            const degree = edu.degree ? t(`dropdowns:educationLevels.${edu.degree}`, edu.degree) : '';
            const institution = edu.institution || '';
            const field = edu.field || '';
            const label = `${degree}${institution ? `, ${institution}` : ''}${field ? `, ${field}` : ''}`;
            return {
                value: index.toString(),
                label: label || `Education ${index + 1}`
            };
        });
        options.push({ value: 'other', label: t('common.other', 'Other') });
        return options;
    }, [educationList, t]);

    const getQualificationOptions = useMemo(() => {
        const options = qualificationsList.map((qual, index) => {
            const title = qual.title || '';
            const institution = qual.institution || '';
            const type = qual.type ? t(`dropdowns:qualificationTypes.${qual.type}`, qual.type) : '';
            const label = `${title}${institution ? `, ${institution}` : ''}${type ? ` (${type})` : ''}`;
            return {
                value: index.toString(),
                label: label || `Qualification ${index + 1}`
            };
        });
        options.push({ value: 'other', label: t('common.other', 'Other') });
        return options;
    }, [qualificationsList, t]);

    const getReferenceLetterOptions = useMemo(() => {
        const options = [];

        if (workExperienceList.length > 0) {
            workExperienceList.forEach((workExp, index) => {
                const jobTitle = workExp.jobTitle || '';
                const employer = workExp.employer || '';
                const location = workExp.location || '';
                const label = `${jobTitle}${employer ? `, ${employer}` : ''}${location ? `, ${location}` : ''}`;
                options.push({
                    value: `work_${index}`,
                    label: `[${t('documents.workExperience', 'Work Experience')}] ${label || `Work ${index + 1}`}`
                });
            });
        }

        if (educationList.length > 0) {
            educationList.forEach((edu, index) => {
                const degree = edu.degree ? t(`dropdowns:educationLevels.${edu.degree}`, edu.degree) : '';
                const institution = edu.institution || '';
                const field = edu.field || '';
                const label = `${degree}${institution ? `, ${institution}` : ''}${field ? `, ${field}` : ''}`;
                options.push({
                    value: `edu_${index}`,
                    label: `[${t('documents.education', 'Education')}] ${label || `Education ${index + 1}`}`
                });
            });
        }

        options.push({ value: 'other', label: t('common.other', 'Other') });
        return options;
    }, [workExperienceList, educationList, t]);

    // --- Sub-component to render inside the loop ---
    const RenderDocumentCard = ({ fieldConfig }) => {
        const { docType, name: fieldName, required, isMultiple, labelKey, accept } = fieldConfig;
        const currentFiles = getCurrentFiles(fieldConfig);
        const error = getNestedValue(errors, fieldName);
        const label = t(labelKey, docType);

        const isCurrentlyUploading = uploadState.isLoading && uploadState.type === docType;
        const inputRef = useRef(null);

        const getInitialEducationIndex = useMemo(() => {
            if (docType === 'diploma' && currentFiles.length > 0 && !isMultiple) {
                const doc = currentFiles[0]?.doc;
                if (doc?.educationIndex !== null && doc?.educationIndex !== undefined) {
                    return doc.educationIndex.toString();
                }
            }
            return null;
        }, [currentFiles, docType, isMultiple]);

        const getInitialQualificationIndex = useMemo(() => {
            if (docType === 'qualification' && currentFiles.length > 0 && !isMultiple) {
                const doc = currentFiles[0]?.doc;
                if (doc?.qualificationIndex !== null && doc?.qualificationIndex !== undefined) {
                    return doc.qualificationIndex.toString();
                }
            }
            return null;
        }, [currentFiles, docType, isMultiple]);

        const getInitialReferenceValue = useMemo(() => {
            if (docType === 'referenceLetter' && currentFiles.length > 0 && !isMultiple) {
                const doc = currentFiles[0]?.doc;
                if (doc?.referenceType === 'workExperience' && doc?.workExperienceIndex !== null && doc?.workExperienceIndex !== undefined) {
                    return `work_${doc.workExperienceIndex}`;
                } else if (doc?.referenceType === 'education' && doc?.educationIndex !== null && doc?.educationIndex !== undefined) {
                    return `edu_${doc.educationIndex}`;
                }
            }
            return null;
        }, [currentFiles, docType, isMultiple]);

        const [selectedEducationIndex, setSelectedEducationIndex] = useState(getInitialEducationIndex);
        const [selectedQualificationIndex, setSelectedQualificationIndex] = useState(getInitialQualificationIndex);
        const [selectedReferenceValue, setSelectedReferenceValue] = useState(getInitialReferenceValue);
        const showEducationDropdown = docType === 'diploma' && educationList.length > 0;
        const showQualificationDropdown = docType === 'qualification' && qualificationsList.length > 0;
        const showReferenceDropdown = docType === 'referenceLetter' && getReferenceLetterOptions.length > 0;

        const uploadButtonLabel = isMultiple
            ? t(`documents.add${docType.charAt(0).toUpperCase() + docType.slice(1)}Button`, `Add ${docType}`)
            : currentFiles.length > 0
                ? t(`documents.replace${docType.charAt(0).toUpperCase() + docType.slice(1)}Button`, `Replace ${docType}`)
                : t(`documents.upload${docType.charAt(0).toUpperCase() + docType.slice(1)}Button`, `Upload ${docType}`);

        const renderDocumentItem = (fileData, index, totalItems) => {
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
            let displayName = fileName;

            if (doc?.educationIndex !== null && doc?.educationIndex !== undefined && educationList[doc.educationIndex]) {
                const edu = educationList[doc.educationIndex];
                const degree = edu.degree ? t(`dropdowns:educationLevels.${edu.degree}`, edu.degree) : '';
                const institution = edu.institution || '';
                const field = edu.field || '';
                displayName = `${degree}${institution ? `, ${institution}` : ''}${field ? `, ${field}` : ''}`;
            } else if (doc?.qualificationIndex !== null && doc?.qualificationIndex !== undefined && qualificationsList[doc.qualificationIndex]) {
                const qual = qualificationsList[doc.qualificationIndex];
                const title = qual.title || '';
                const institution = qual.institution || '';
                const type = qual.type ? t(`dropdowns:qualificationTypes.${qual.type}`, qual.type) : '';
                displayName = `${title}${institution ? `, ${institution}` : ''}${type ? ` (${type})` : ''}`;
            } else if (doc?.referenceType === 'workExperience' && doc?.workExperienceIndex !== null && doc?.workExperienceIndex !== undefined && workExperienceList[doc.workExperienceIndex]) {
                const workExp = workExperienceList[doc.workExperienceIndex];
                const jobTitle = workExp.jobTitle || '';
                const employer = workExp.employer || '';
                const location = workExp.location || '';
                displayName = `${jobTitle}${employer ? `, ${employer}` : ''}${location ? `, ${location}` : ''}`;
            } else if (doc?.referenceType === 'education' && doc?.educationIndex !== null && doc?.educationIndex !== undefined && educationList[doc.educationIndex]) {
                const edu = educationList[doc.educationIndex];
                const degree = edu.degree ? t(`dropdowns:educationLevels.${edu.degree}`, edu.degree) : '';
                const institution = edu.institution || '';
                const field = edu.field || '';
                displayName = `${degree}${institution ? `, ${institution}` : ''}${field ? `, ${field}` : ''}`;
            }

            const itemUrl = typeof url === 'string' ? url : (url?.url || url);
            const itemHasError = false;
            return (
                <div key={itemUrl || index} style={{
                    padding: '0.5rem',
                    margin: '2px 0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderRadius: '8px',
                    border: itemHasError ? '1px dotted hsl(var(--destructive))' : '1px dotted hsl(var(--border) / 0.6)',
                    backgroundColor: itemHasError ? 'hsl(var(--destructive) / 0.03)' : 'transparent'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0, gap: '0.75rem' }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            color: 'hsl(var(--foreground))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <FiFileText />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="text-sm font-medium" style={{
                                color: itemHasError ? 'hsl(var(--destructive))' : 'hsl(var(--foreground))',
                                fontFamily: 'var(--font-family-text, Roboto, sans-serif)'
                            }}>
                                <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }} title={fileName}>{displayName}</strong>
                            </div>
                            <div className="text-xs" style={{
                                color: itemHasError ? 'hsl(var(--destructive) / 0.7)' : 'hsl(var(--muted-foreground))',
                                fontFamily: 'var(--font-family-text, Roboto, sans-serif)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                marginTop: '0.25rem'
                            }}>
                                <FiCheckCircle size={12} /> {t('common.uploaded')}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        {itemUrl && (
                            <button
                                onClick={() => window.open(itemUrl, '_blank')}
                                style={{ background: 'none', border: 'none', padding: 0, color: '#000000', cursor: 'pointer', transition: 'color 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = 'hsl(221, 83%, 53%)'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#000000'}
                                title={t('common.view', 'View')}
                                aria-label={t('common.view', 'View')}
                            >
                                <FiEye style={{ width: '16px', height: '16px', color: 'inherit' }} />
                            </button>
                        )}
                        <button
                            onClick={() => {
                                if (docType === 'diploma') {
                                    setSelectedEducationIndex(doc?.educationIndex?.toString() || null);
                                } else if (docType === 'qualification') {
                                    setSelectedQualificationIndex(doc?.qualificationIndex?.toString() || null);
                                } else if (docType === 'referenceLetter') {
                                    if (doc?.referenceType === 'workExperience' && doc?.workExperienceIndex !== null && doc?.workExperienceIndex !== undefined) {
                                        setSelectedReferenceValue(`work_${doc.workExperienceIndex}`);
                                    } else if (doc?.referenceType === 'education' && doc?.educationIndex !== null && doc?.educationIndex !== undefined) {
                                        setSelectedReferenceValue(`edu_${doc.educationIndex}`);
                                    }
                                }
                                inputRef.current && inputRef.current.click();
                            }}
                            style={{ background: 'none', border: 'none', padding: 0, color: '#000000', cursor: 'pointer', transition: 'color 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'hsl(221, 83%, 53%)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#000000'}
                            title={t('common.edit')}
                            aria-label={t('common.edit')}
                        >
                            <FiEdit style={{ width: '16px', height: '16px', color: 'inherit' }} />
                        </button>
                        <button
                            onClick={() => {
                                const urlToRemove = itemUrl;
                                handleRemoveDocument(fieldConfig, isMultiple ? index : urlToRemove);
                            }}
                            style={{ background: 'none', border: 'none', padding: 0, color: '#000000', cursor: 'pointer', transition: 'color 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'hsl(221, 83%, 53%)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#000000'}
                            title={t('common.delete')}
                            aria-label={t('common.delete')}
                        >
                            <FiTrash2 style={{ width: '16px', height: '16px', color: 'inherit' }} />
                        </button>
                    </div>
                </div>
            );
        };

        return (
            <div className={styles.sectionCard}>
                <div className={styles.cardHeader}>
                    <div className={styles.cardIconWrapper}>
                        <FiFileText className="w-4 h-4" style={styles.cardIconStyle} />
                    </div>
                    <div className={styles.cardTitle}>
                        <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>
                            {label} {required && <span className={styles.mandatoryMark}>*</span>}
                        </h3>
                    </div>
                </div>
                <div className={styles.sectionContent}>
                    {currentFiles.length > 0 && (
                        <div className="document-entries-wrapper" style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 0,
                            padding: '0.75rem',
                            backgroundColor: 'hsl(var(--muted) / 0.3)',
                            borderRadius: '0.5rem',
                            marginBottom: '1rem'
                        }}>
                            {isMultiple
                                ? currentFiles.map((fileData, index) => {
                                    const url = fileData.url || fileData;
                                    const itemHasError = false;
                                    return (
                                        <React.Fragment key={url || index}>
                                            {renderDocumentItem(fileData, index, currentFiles.length)}
                                            {index < currentFiles.length - 1 && !itemHasError && (
                                                <div style={{ height: '1px', backgroundColor: 'hsl(var(--border) / 0.3)', margin: '0.25rem 0' }} />
                                            )}
                                        </React.Fragment>
                                    );
                                })
                                : renderDocumentItem(currentFiles[0], 0, 1)
                            }
                        </div>
                    )}

                    <div className="document-upload-controls-wrapper">
                        {showEducationDropdown && (isMultiple || currentFiles.length === 0) && (
                            <div style={{ marginBottom: '1rem' }}>
                                <SimpleDropdown
                                    label=""
                                    options={getEducationOptions}
                                    value={selectedEducationIndex}
                                    onChange={(value) => setSelectedEducationIndex(value)}
                                    placeholder={t('documents.selectEducationPlaceholder', 'Select education entry...')}
                                    required={true}
                                />
                            </div>
                        )}
                        {showQualificationDropdown && (isMultiple || currentFiles.length === 0) && (
                            <div style={{ marginBottom: '1rem' }}>
                                <SimpleDropdown
                                    label=""
                                    options={getQualificationOptions}
                                    value={selectedQualificationIndex}
                                    onChange={(value) => setSelectedQualificationIndex(value)}
                                    placeholder={t('documents.selectQualificationPlaceholder', 'Select qualification...')}
                                    required={true}
                                />
                            </div>
                        )}
                        {showReferenceDropdown && (isMultiple || currentFiles.length === 0) && (
                            <div style={{ marginBottom: '1rem' }}>
                                <SimpleDropdown
                                    label=""
                                    options={getReferenceLetterOptions}
                                    value={selectedReferenceValue}
                                    onChange={(value) => setSelectedReferenceValue(value)}
                                    placeholder={t('documents.selectReferencePlaceholder', 'Select work experience or education...')}
                                    required={true}
                                />
                            </div>
                        )}
                        {isMultiple || currentFiles.length === 0 ? (
                            <UploadFile
                                ref={inputRef}
                                onChange={(files) => {
                                    if (showEducationDropdown && (selectedEducationIndex === null || selectedEducationIndex === '')) {
                                        return;
                                    }
                                    if (showQualificationDropdown && (selectedQualificationIndex === null || selectedQualificationIndex === '')) {
                                        return;
                                    }
                                    if (showReferenceDropdown && (selectedReferenceValue === null || selectedReferenceValue === '')) {
                                        return;
                                    }
                                    const eduIndex = showEducationDropdown && selectedEducationIndex !== null && selectedEducationIndex !== 'other'
                                        ? selectedEducationIndex
                                        : null;
                                    const qualIndex = showQualificationDropdown && selectedQualificationIndex !== null && selectedQualificationIndex !== 'other'
                                        ? selectedQualificationIndex
                                        : null;
                                    const refValue = showReferenceDropdown && selectedReferenceValue !== null && selectedReferenceValue !== 'other'
                                        ? selectedReferenceValue
                                        : null;
                                    handleFileUpload(files, fieldConfig, eduIndex, qualIndex, refValue);
                                    if (showEducationDropdown) {
                                        setSelectedEducationIndex(null);
                                    }
                                    if (showQualificationDropdown) {
                                        setSelectedQualificationIndex(null);
                                    }
                                    if (showReferenceDropdown) {
                                        setSelectedReferenceValue(null);
                                    }
                                }}
                                isLoading={isCurrentlyUploading}
                                progress={isCurrentlyUploading ? uploadState.progress : 0}
                                accept={accept || ".pdf,.jpg,.png,.doc,.docx"}
                                label={uploadButtonLabel}
                                documentName={label.toLowerCase()}
                                className={error && currentFiles.length === 0 ? styles.errorUpload : ''}
                                disabled={(showEducationDropdown && (selectedEducationIndex === null || selectedEducationIndex === '')) ||
                                    (showQualificationDropdown && (selectedQualificationIndex === null || selectedQualificationIndex === '')) ||
                                    (showReferenceDropdown && (selectedReferenceValue === null || selectedReferenceValue === ''))}
                            />
                        ) : (
                            <>
                                {showEducationDropdown && (
                                    <div style={{ marginBottom: '1rem' }}>
                                        <SimpleDropdown
                                            label=""
                                            options={getEducationOptions}
                                            value={selectedEducationIndex}
                                            onChange={(value) => setSelectedEducationIndex(value)}
                                            placeholder={t('documents.selectEducationPlaceholder', 'Select education entry...')}
                                            required={true}
                                        />
                                    </div>
                                )}
                                {showQualificationDropdown && (
                                    <div style={{ marginBottom: '1rem' }}>
                                        <SimpleDropdown
                                            label=""
                                            options={getQualificationOptions}
                                            value={selectedQualificationIndex}
                                            onChange={(value) => setSelectedQualificationIndex(value)}
                                            placeholder={t('documents.selectQualificationPlaceholder', 'Select qualification...')}
                                            required={true}
                                        />
                                    </div>
                                )}
                                {showReferenceDropdown && (
                                    <div style={{ marginBottom: '1rem' }}>
                                        <SimpleDropdown
                                            label=""
                                            options={getReferenceLetterOptions}
                                            value={selectedReferenceValue}
                                            onChange={(value) => setSelectedReferenceValue(value)}
                                            placeholder={t('documents.selectReferencePlaceholder', 'Select work experience or education...')}
                                            required={true}
                                        />
                                    </div>
                                )}
                                <input
                                    ref={inputRef}
                                    type="file"
                                    accept={accept || ".pdf,.jpg,.png,.doc,.docx"}
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            if (showEducationDropdown && (selectedEducationIndex === null || selectedEducationIndex === '')) {
                                                e.target.value = '';
                                                return;
                                            }
                                            if (showQualificationDropdown && (selectedQualificationIndex === null || selectedQualificationIndex === '')) {
                                                e.target.value = '';
                                                return;
                                            }
                                            if (showReferenceDropdown && (selectedReferenceValue === null || selectedReferenceValue === '')) {
                                                e.target.value = '';
                                                return;
                                            }
                                            const eduIndex = showEducationDropdown && selectedEducationIndex !== null && selectedEducationIndex !== 'other'
                                                ? selectedEducationIndex
                                                : null;
                                            const qualIndex = showQualificationDropdown && selectedQualificationIndex !== null && selectedQualificationIndex !== 'other'
                                                ? selectedQualificationIndex
                                                : null;
                                            const refValue = showReferenceDropdown && selectedReferenceValue !== null && selectedReferenceValue !== 'other'
                                                ? selectedReferenceValue
                                                : null;
                                            handleFileUpload([e.target.files[0]], fieldConfig, eduIndex, qualIndex, refValue);
                                            if (showEducationDropdown) {
                                                setSelectedEducationIndex(null);
                                            }
                                            if (showQualificationDropdown) {
                                                setSelectedQualificationIndex(null);
                                            }
                                            if (showReferenceDropdown) {
                                                setSelectedReferenceValue(null);
                                            }
                                            e.target.value = '';
                                        }
                                    }}
                                    style={{ display: 'none' }}
                                />
                            </>
                        )}
                    </div>

                    {/* Error message text suppressed as per user request */}
                    {/* {error && currentFiles.length === 0 && <p className={styles.errorText} style={{ marginTop: '0.5rem' }}>{error}</p>} */}
                    {uploadState.type === docType && uploadState.error && <p className={styles.errorText} style={{ marginTop: '0.5rem' }}>{uploadState.error}</p>}
                </div>
            </div>
        );
    };

    RenderDocumentCard.propTypes = {
        fieldConfig: PropTypes.shape({
            docType: PropTypes.string.isRequired,
            name: PropTypes.string.isRequired,
            required: PropTypes.bool,
            isMultiple: PropTypes.bool,
            labelKey: PropTypes.string.isRequired,
            accept: PropTypes.string
        }).isRequired
    };

    return (
        <div className={styles.sectionContainer}>
            <div className={styles.headerCard}>
                <div className="flex flex-col gap-1 flex-1">
                    <h2 className={styles.sectionTitle} style={styles.sectionTitleStyle}>{t('documents.title')}</h2>
                    <p className={styles.sectionSubtitle} style={styles.sectionSubtitleStyle}>{t('documents.subtitle')}</p>
                </div>

                {formData && completionPercentage !== undefined && (
                    <div className="flex items-center gap-3 px-4 bg-muted/30 rounded-xl border-2 border-input" style={{ height: 'var(--boxed-inputfield-height)' }}>
                        <span className="text-sm font-medium text-muted-foreground">{t('dashboardProfile:profile.profileCompletion')}</span>
                        <div className="w-32 h-2.5 bg-muted rounded-full overflow-hidden shadow-inner">
                            <div
                                className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 rounded-full"
                                style={{ width: `${completionPercentage}%` }}
                            ></div>
                        </div>
                        <span className="text-sm font-semibold text-foreground">{completionPercentage}%</span>
                    </div>
                )}
            </div>

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
    );
};

DocumentUploads.propTypes = {
    formData: PropTypes.object.isRequired,
    config: PropTypes.shape({
        fields: PropTypes.shape({
            documentUploads: PropTypes.arrayOf(
                PropTypes.shape({
                    docType: PropTypes.string.isRequired,
                    name: PropTypes.string,
                    required: PropTypes.bool,
                    isMultiple: PropTypes.bool,
                    labelKey: PropTypes.string,
                    accept: PropTypes.string
                })
            )
        })
    }).isRequired,
    errors: PropTypes.object.isRequired,
    isSubmitting: PropTypes.bool.isRequired,
    onInputChange: PropTypes.func.isRequired,
    onArrayChange: PropTypes.func.isRequired,
    onSaveAndContinue: PropTypes.func.isRequired,
    onSave: PropTypes.func,
    onCancel: PropTypes.func.isRequired,
    getNestedValue: PropTypes.func.isRequired
};

export default DocumentUploads;