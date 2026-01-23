import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../contexts/AuthContext';
import { useNotification } from '../../../../contexts/NotificationContext';
import { get, set, cloneDeep } from 'lodash';
import { uploadFile } from '../../../../services/storageService';
import { processDocumentWithAI, mergeExtractedData, getCachedExtractedData, saveCachedExtractedData } from '../../../../services/documentProcessingService';
import { useDropdownOptions } from '../utils/DropdownListsImports';

export const useProfileDocumentProcessing = (formData, profileConfig, setFormData, updateProfileData, validateCurrentTabData, getNestedValue) => {
    const { t } = useTranslation(['dashboardProfile', 'common']);
    const { currentUser } = useAuth();
    const { showNotification } = useNotification();
    const dropdownOptions = useDropdownOptions();
    const isProfessional = formData?.role === 'professional';

    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [extractedData, setExtractedData] = useState(null);
    const [showAnalysisConfirmation, setShowAnalysisConfirmation] = useState(false);
    const [cachedData, setCachedData] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedDocumentType, setSelectedDocumentType] = useState(null);
    const [documentTypeError, setDocumentTypeError] = useState(null);
    const [fileUploadError, setFileUploadError] = useState(null);
    const [showAutoFillDialog, setShowAutoFillDialog] = useState(false);
    const [showDocumentsView, setShowDocumentsView] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const uploadInputRef = useRef(null);

    useEffect(() => {
        const loadCachedData = async () => {
            if (currentUser?.uid) {
                const cached = await getCachedExtractedData(currentUser.uid);
                if (cached) {
                    setCachedData(cached);
                }
            }
        };
        loadCachedData();
    }, [currentUser]);

    const processAndFillProfile = useCallback(async (document) => {
        if (!document || !document.storageUrl) return;

        try {
            setIsAnalyzing(true);
            showNotification(t('dashboardProfile:documents.analyzing', 'Analyzing document...'), 'info');

            const docType = document.type || (isProfessional ? 'cv' : 'businessDocument');
            const mimeType = document.mimeType || document.fileType || 'application/pdf';

            const result = await processDocumentWithAI(document.storageUrl, docType, document.storagePath, mimeType, dropdownOptions);

            if (result.success && result.data) {
                setExtractedData(result.data);
                setCachedData(result.data);
                setShowAnalysisConfirmation(true);

                if (currentUser?.uid) {
                    saveCachedExtractedData(currentUser.uid, result.data);
                }
            } else {
                throw new Error('Analysis failed or returned no data');
            }
        } catch (error) {
            // Error analyzing document
            showNotification(t('dashboardProfile:documents.analysisError', 'Failed to analyze document'), 'error');
        } finally {
            setIsAnalyzing(false);
        }
    }, [isProfessional, showNotification, t, currentUser, dropdownOptions]);

    const handleCloseAutoFillDialog = useCallback(() => {
        setShowAutoFillDialog(false);
        setSelectedDocumentType(null);
        setSelectedFile(null);
        setDocumentTypeError(null);
        setFileUploadError(null);
    }, []);

    const handleFileUpload = useCallback(async (files) => {
        if (!files || files.length === 0 || !currentUser) {
            setSelectedFile(null);
            return;
        }

        const file = files[0];
        setSelectedFile(file);
        setFileUploadError(null);
    }, [currentUser]);

    const handleAutoFillProcess = useCallback(async () => {
        let hasError = false;

        if (!selectedFile || !currentUser) {
            setFileUploadError(t('dashboardProfile:documents.selectFileFirst', 'Please select a file to upload'));
            hasError = true;
        } else {
            setFileUploadError(null);
        }

        if (!selectedDocumentType) {
            setDocumentTypeError(t('dashboardProfile:documents.selectDocumentTypeFirst', 'Please select a document type first'));
            hasError = true;
        } else {
            setDocumentTypeError(null);
        }

        if (hasError) {
            return;
        }
        setIsUploading(true);
        setUploadProgress(0);

        try {
            const userId = currentUser.uid;
            const docType = selectedDocumentType;
            const file = selectedFile;
            const timestamp = Date.now();
            const fileExtension = file.name.split('.').pop();
            const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
            const normalizedFileName = `${baseName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${timestamp}.${fileExtension}`;
            const path = isProfessional
                ? `documents/${userId}/${docType}/${normalizedFileName}`
                : `documents/facilities/${userId}/${docType}/${normalizedFileName}`;

            const downloadURL = await uploadFile(file, path, (progress) => {
                setUploadProgress(progress);
            });

            const fileMetadata = {
                documentId: `${docType}_${Date.now()}`,
                userId: userId,
                type: docType,
                category: docType,
                fileName: normalizedFileName,
                originalFileName: file.name,
                storageUrl: downloadURL,
                storagePath: path,
                fileSize: file.size,
                fileType: file.type || 'application/octet-stream',
                mimeType: file.type || 'application/octet-stream',
                uploadedAt: new Date().toISOString(),
                status: 'pending_verification'
            };

            if (!formData) return;

            const updatedFormData = cloneDeep(formData);

            const documentFieldConfig = profileConfig?.fields?.documentUploads?.find(f => f.docType === docType);
            const fieldName = documentFieldConfig?.name || (docType === 'cv' ? 'cvUrl' : 'verificationDocumentsProvided');

            if (docType === 'cv' || fieldName === 'cvUrl') {
                if (!updatedFormData.documents) {
                    updatedFormData.documents = {};
                }
                if (!updatedFormData.documents.cv) {
                    updatedFormData.documents.cv = [];
                }
                updatedFormData.documents.cv.push(fileMetadata);
            } else if (isProfessional) {
                const fieldPath = fieldName.includes('.') ? fieldName : `documents.${fieldName}`;
                const currentList = getNestedValue(updatedFormData, fieldPath) || [];
                set(updatedFormData, fieldPath, [...currentList, fileMetadata]);
            } else {
                if (!updatedFormData.verification) {
                    updatedFormData.verification = {};
                }
                if (!updatedFormData.verification.verificationDocumentsProvided) {
                    updatedFormData.verification.verificationDocumentsProvided = [];
                }
                updatedFormData.verification.verificationDocumentsProvided.push(fileMetadata);
            }

            setFormData(updatedFormData);

            try {
                await updateProfileData(updatedFormData);
                showNotification(t('dashboardProfile:documents.uploadSuccess', 'Document uploaded successfully'), 'success');

                setTimeout(() => {
                    handleCloseAutoFillDialog();
                    processAndFillProfile(fileMetadata);
                }, 500);
            } catch (dbError) {
                // Error saving document metadata to database
                showNotification(t('dashboardProfile:documents.uploadSuccessButSaveError', 'Document uploaded but failed to save metadata. Please try again.'), 'warning');
            }

            setIsUploading(false);
            setUploadProgress(0);
            setSelectedFile(null);
        } catch (error) {
            // Error uploading file
            setIsUploading(false);
            setUploadProgress(0);
            setFileUploadError(t('dashboardProfile:documents.uploadError', 'Error uploading document'));
            showNotification(t('dashboardProfile:documents.uploadError', 'Error uploading document'), 'error');
        }
    }, [currentUser, isProfessional, formData, profileConfig, selectedDocumentType, selectedFile, showNotification, t, updateProfileData, processAndFillProfile, handleCloseAutoFillDialog, getNestedValue, setFormData]);

    const handleUploadButtonClick = useCallback(() => {
        if (uploadInputRef.current) {
            uploadInputRef.current.click();
        }
    }, []);

    const handleAutoFillClick = useCallback(() => {
        setSelectedDocumentType(null);
        setShowAutoFillDialog(true);
    }, []);

    const handleCloseDocumentsView = useCallback(() => {
        setShowDocumentsView(false);
    }, []);

    const handleSelectDocument = useCallback((document) => {
        setShowDocumentsView(false);
        processAndFillProfile(document);
    }, [processAndFillProfile]);

    const applyExtractedData = useCallback(async () => {
        if (!extractedData || !formData) return;

        try {
            setIsSubmitting(true);
            const updatedFormData = mergeExtractedData(formData, extractedData);
            setFormData(updatedFormData);

            validateCurrentTabData(updatedFormData);

            await updateProfileData(updatedFormData);

            showNotification(t('dashboardProfile:documents.autoFillSuccess', 'Profile auto-filled successfully!'), 'success');
            setShowAnalysisConfirmation(false);
            setExtractedData(null);
        } catch (error) {
            // Error applying extracted data
            showNotification(t('dashboardProfile:documents.autoFillError', 'Error updating profile'), 'error');
        } finally {
            setIsSubmitting(false);
        }
    }, [extractedData, formData, updateProfileData, showNotification, t, setFormData, validateCurrentTabData]);

    const handleFillEmptyFields = useCallback(() => {
        applyExtractedData();
    }, [applyExtractedData]);

    const cancelAnalysis = useCallback(() => {
        setShowAnalysisConfirmation(false);
        setExtractedData(null);
    }, []);

    const handleUseCachedData = useCallback(() => {
        if (cachedData) {
            handleCloseAutoFillDialog();
            setExtractedData(cachedData);
            setShowAnalysisConfirmation(true);
        }
    }, [cachedData, handleCloseAutoFillDialog]);

    const availableDocuments = useMemo(() => {
        if (!formData) return [];
        const verificationDocs = getNestedValue(formData, 'verification.verificationDocuments') || [];
        const cvDocs = getNestedValue(formData, 'documents.cv') || [];
        const providedDocs = getNestedValue(formData, 'verification.verificationDocumentsProvided') || [];

        const allDocs = [...verificationDocs, ...cvDocs, ...providedDocs];

        return allDocs.filter(doc => doc && doc.storageUrl);
    }, [formData, getNestedValue]);

    const documentTypeOptions = useMemo(() => {
        if (!profileConfig) return [];

        const allowedTypes = ['cv'];
        const documentFields = profileConfig.fields?.documentUploads || [];
        const filteredFields = documentFields
            .filter(field => allowedTypes.includes(field.docType))
            .map(field => {
                const label = field.labelKey
                    ? t(`dashboardProfile:${field.labelKey}`, field.docType)
                    : t(`dashboardProfile:documents.${field.docType}`, field.docType);
                return {
                    value: field.docType,
                    label: label,
                    accept: field.accept || '.pdf,.doc,.docx,.jpg,.png'
                };
            });

        filteredFields.push({
            value: 'businessDocument',
            label: t('dashboardProfile:documents.billingDocument', 'Billing / Credit Card'),
            accept: '.pdf,.jpg,.png,.jpeg'
        });

        return filteredFields;
    }, [profileConfig, t]);

    const selectedDocumentTypeConfig = useMemo(() => {
        if (!selectedDocumentType || !profileConfig) return null;
        return profileConfig.fields?.documentUploads?.find(f => f.docType === selectedDocumentType);
    }, [selectedDocumentType, profileConfig]);

    return {
        isUploading,
        uploadProgress,
        isAnalyzing,
        isSubmitting,
        extractedData,
        showAnalysisConfirmation,
        cachedData,
        selectedFile,
        selectedDocumentType,
        setSelectedDocumentType,
        documentTypeError,
        fileUploadError,
        showAutoFillDialog,
        showDocumentsView,
        uploadInputRef,
        handleFileUpload,
        handleAutoFillProcess,
        handleUploadButtonClick,
        handleAutoFillClick,
        handleCloseAutoFillDialog,
        handleCloseDocumentsView,
        handleSelectDocument,
        handleFillEmptyFields,
        cancelAnalysis,
        handleUseCachedData,
        availableDocuments,
        documentTypeOptions,
        selectedDocumentTypeConfig
    };
};

