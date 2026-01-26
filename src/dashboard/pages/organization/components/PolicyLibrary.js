import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FiFileText, FiUploadCloud, FiClock, FiX, FiDownload, FiTrash2, FiInfo } from 'react-icons/fi';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { uploadFile } from '../../../../services/storageService';
import { useDashboard } from '../../../contexts/DashboardContext';
import { useNotification } from '../../../../contexts/NotificationContext';
import { useAuth } from '../../../../contexts/AuthContext';
import Dialog from '../../../../components/Dialog/Dialog';
import BoxedSwitchField from '../../../../components/BoxedInputFields/BoxedSwitchField';
import InputField from '../../../../components/BoxedInputFields/Personnalized-InputField';
import InputFieldParagraph from '../../../../components/BoxedInputFields/TextareaField';
import { cn } from '../../../../utils/cn';

const PolicyLibrary = () => {
    const { t } = useTranslation(['organization', 'common']);
    const { selectedWorkspace } = useDashboard();
    const { showNotification } = useNotification();
    const { currentUser } = useAuth();

    const [policies, setPolicies] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [policyName, setPolicyName] = useState('');
    const [policyDescription, setPolicyDescription] = useState('');
    const [isInternalPolicy, setIsInternalPolicy] = useState(false);
    const [isInterim, setIsInterim] = useState(false);
    const [createCommunication, setCreateCommunication] = useState(false);

    const organizationId = selectedWorkspace?.facilityId;

    const fetchPolicies = useCallback(async () => {
        if (!organizationId) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const policiesRef = collection(db, 'organizationPolicies');
            const q = query(
                policiesRef,
                where('organizationId', '==', organizationId),
                orderBy('uploadedAt', 'desc')
            );
            const querySnapshot = await getDocs(q);
            const policiesData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPolicies(policiesData);
        } catch (error) {
            console.error('Error fetching policies:', error);
            showNotification(t('organization:errors.fetchPoliciesFailed', 'Failed to load policies'), 'error');
        } finally {
            setIsLoading(false);
        }
    }, [organizationId, showNotification, t]);

    useEffect(() => {
        fetchPolicies();
    }, [fetchPolicies]);

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                showNotification(t('organization:errors.fileTooLarge', 'File size must be less than 10MB'), 'error');
                return;
            }
            const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!allowedTypes.includes(file.type)) {
                showNotification(t('organization:errors.invalidFileType', 'Only PDF and Word documents are allowed'), 'error');
                return;
            }
            setSelectedFile(file);
            if (!policyName) {
                setPolicyName(file.name.replace(/\.[^/.]+$/, ''));
            }
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !policyName.trim() || !organizationId || !currentUser) {
            showNotification(t('organization:errors.missingFields', 'Please fill in all required fields'), 'error');
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const timestamp = Date.now();
            const fileExtension = selectedFile.name.split('.').pop();
            const baseName = selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.')) || selectedFile.name;
            const normalizedFileName = `${baseName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${timestamp}.${fileExtension}`;
            const storagePath = `organizationPolicies/${organizationId}/${normalizedFileName}`;

            const downloadURL = await uploadFile(selectedFile, storagePath, (progress) => {
                setUploadProgress(progress);
            });

            const policyData = {
                organizationId,
                name: policyName.trim(),
                description: policyDescription.trim() || '',
                fileName: selectedFile.name,
                fileSize: selectedFile.size,
                fileType: selectedFile.type,
                storagePath,
                downloadURL,
                status: 'active',
                isInternalPolicy,
                isInterim,
                createCommunication,
                uploadedBy: currentUser.uid,
                uploadedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            await addDoc(collection(db, 'organizationPolicies'), policyData);

            showNotification(t('organization:success.policyUploaded', 'Policy uploaded successfully'), 'success');
            setIsUploadModalOpen(false);
            setSelectedFile(null);
            setPolicyName('');
            setPolicyDescription('');
            setIsInternalPolicy(false);
            setIsInterim(false);
            setCreateCommunication(false);
            setUploadProgress(0);
            fetchPolicies();
        } catch (error) {
            console.error('Error uploading policy:', error);
            showNotification(error.message || t('organization:errors.uploadFailed', 'Failed to upload policy'), 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeletePolicy = async (policyId, storagePath) => {
        if (!window.confirm(t('organization:confirm.deletePolicy', 'Are you sure you want to delete this policy?'))) {
            return;
        }

        try {
            await deleteDoc(doc(db, 'organizationPolicies', policyId));
            showNotification(t('organization:success.policyDeleted', 'Policy deleted successfully'), 'success');
            fetchPolicies();
        } catch (error) {
            console.error('Error deleting policy:', error);
            showNotification(t('organization:errors.deleteFailed', 'Failed to delete policy'), 'error');
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return t('common:today', 'Today');
        if (diffDays === 1) return t('common:yesterday', 'Yesterday');
        if (diffDays < 7) return t('organization:daysAgo', { count: diffDays }, `${diffDays} days ago`);
        if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return t('organization:weeksAgo', { count: weeks }, `${weeks} week${weeks > 1 ? 's' : ''} ago`);
        }
        if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            return t('organization:monthsAgo', { count: months }, `${months} month${months > 1 ? 's' : ''} ago`);
        }
        return date.toLocaleDateString();
    };

    return (
        <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-semibold">{t('organization:policy.title', 'Standardized Policy Library')}</h2>
                        <p className="text-sm text-muted-foreground">
                            {t('organization:policy.subtitle', 'Manage and distribute policies to all facilities instantly.')}
                        </p>
                    </div>
                    <button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        <FiUploadCloud />
                        <span>{t('organization:policy.uploadNew', 'Upload New Policy')}</span>
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : policies.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                            <FiFileText className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground">{t('organization:policy.empty', 'No policies uploaded yet')}</p>
                        <button
                            onClick={() => setIsUploadModalOpen(true)}
                            className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors mx-auto"
                        >
                            <FiUploadCloud />
                            <span>{t('organization:policy.uploadFirst', 'Upload Your First Policy')}</span>
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {policies.map((policy) => (
                            <div
                                key={policy.id}
                                className="flex items-center p-4 bg-background border border-border rounded-lg hover:border-primary/50 transition-colors group"
                            >
                                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center mr-4">
                                    <FiFileText className="text-red-500 w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                                        {policy.name}
                                    </h4>
                                    {policy.description && (
                                        <p className="text-xs text-muted-foreground mt-1 truncate">{policy.description}</p>
                                    )}
                                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                                        <FiClock className="mr-1" />
                                        {formatDate(policy.uploadedAt)}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span
                                        className={cn(
                                            'px-2 py-1 rounded text-xs',
                                            policy.status === 'active'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-yellow-100 text-yellow-700'
                                        )}
                                    >
                                        {policy.status === 'active' ? t('organization:policy.active', 'Active') : t('organization:policy.review', 'Review')}
                                    </span>
                                    {policy.downloadURL && (
                                        <a
                                            href={policy.downloadURL}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                            title={t('common:download', 'Download')}
                                        >
                                            <FiDownload className="w-4 h-4" />
                                        </a>
                                    )}
                                    {currentUser?.uid === policy.uploadedBy && (
                                        <button
                                            onClick={() => handleDeletePolicy(policy.id, policy.storagePath)}
                                            className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title={t('common:delete', 'Delete')}
                                        >
                                            <FiTrash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Dialog
                isOpen={isUploadModalOpen}
                onClose={() => {
                    if (!isUploading) {
                        setIsUploadModalOpen(false);
                        setSelectedFile(null);
                        setPolicyName('');
                        setPolicyDescription('');
                        setIsInternalPolicy(false);
                        setIsInterim(false);
                        setCreateCommunication(false);
                        setUploadProgress(0);
                    }
                }}
                title={t('organization:policy.uploadTitle', 'Upload New Policy')}
                size="medium"
                closeOnBackdropClick={!isUploading}
                actions={
                    <>
                        <button
                            onClick={() => {
                                if (!isUploading) {
                                    setIsUploadModalOpen(false);
                                    setSelectedFile(null);
                                    setPolicyName('');
                                    setPolicyDescription('');
                                    setIsInternalPolicy(false);
                                    setIsInterim(false);
                                    setCreateCommunication(false);
                                    setUploadProgress(0);
                                }
                            }}
                            disabled={isUploading}
                            className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {t('common:cancel', 'Cancel')}
                        </button>
                        <button
                            onClick={handleUpload}
                            disabled={!selectedFile || !policyName.trim() || isUploading}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isUploading
                                ? t('common:uploading', 'Uploading...')
                                : t('organization:policy.upload', 'Upload Policy')}
                        </button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="mt-4">
                        <InputField
                            label={t('organization:policy.policyName', 'Policy Name')}
                            value={policyName}
                            onChange={(e) => setPolicyName(e.target.value)}
                            placeholder={t('organization:policy.policyNamePlaceholder', 'Enter policy name')}
                            required
                            disabled={isUploading}
                            name="policyName"
                        />
                    </div>

                    <InputFieldParagraph
                        label={t('organization:policy.description', 'Description')}
                        value={policyDescription}
                        onChange={(e) => setPolicyDescription(e.target.value)}
                        placeholder={t('organization:policy.descriptionPlaceholder', 'Enter policy description (optional)')}
                        rows={3}
                        disabled={isUploading}
                        name="policyDescription"
                    />

                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            {t('organization:policy.file', 'Policy File')} *
                        </label>
                        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                            <input
                                type="file"
                                onChange={handleFileSelect}
                                accept=".pdf,.doc,.docx"
                                className="hidden"
                                id="policy-file-input"
                                disabled={isUploading}
                            />
                            <label
                                htmlFor="policy-file-input"
                                className={cn(
                                    'cursor-pointer flex flex-col items-center gap-2',
                                    isUploading && 'cursor-not-allowed opacity-50'
                                )}
                            >
                                <FiUploadCloud className="w-8 h-8 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                    {selectedFile
                                        ? selectedFile.name
                                        : t('organization:policy.selectFile', 'Click to select a file or drag and drop')}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {t('organization:policy.fileTypes', 'PDF or Word documents only, max 10MB')}
                                </span>
                            </label>
                        </div>
                    </div>

                    <div className="pt-2">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-sm font-medium text-foreground">
                                {t('organization:policy.options', 'Policy Options')}
                            </span>
                            <div className="relative group">
                                <FiInfo className="w-4 h-4 text-muted-foreground cursor-help" />
                                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-64 max-w-[256px] p-3 bg-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none border border-border overflow-hidden box-border" style={{ color: 'var(--color-logo-1)' }}>
                                    <div className="space-y-1 break-words box-border" style={{ overflowWrap: 'break-word', wordBreak: 'break-word', maxWidth: '100%' }}>
                                        <div className="font-semibold mb-2 break-words">{t('organization:policy.switchesInfoTitle', 'Policy Options')}</div>
                                        <ul className="space-y-1 list-disc pl-5 break-words" style={{ listStylePosition: 'outside' }}>
                                            <li className="break-words">{t('organization:policy.infoInternal', 'Internal Policy: Only visible to organization members')}</li>
                                            <li className="break-words">{t('organization:policy.infoInterim', 'Interim: Temporary policies')}</li>
                                            <li className="break-words">{t('organization:policy.infoCommunication', 'Create Communication: Notify relevant parties when uploaded')}</li>
                                        </ul>
                                    </div>
                                    <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent" style={{ borderRightColor: 'white' }}></div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <BoxedSwitchField
                                label={t('organization:policy.internalPolicy', 'Internal Policy')}
                                checked={isInternalPolicy}
                                onChange={setIsInternalPolicy}
                                disabled={isUploading}
                            />
                            <BoxedSwitchField
                                label={t('organization:policy.interim', 'Interim')}
                                checked={isInterim}
                                onChange={setIsInterim}
                                disabled={isUploading}
                            />
                            <BoxedSwitchField
                                label={t('organization:policy.createCommunication', 'Create Communication')}
                                checked={createCommunication}
                                onChange={setCreateCommunication}
                                disabled={isUploading}
                            />
                        </div>
                    </div>

                    {isUploading && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">{t('common:uploading', 'Uploading')}...</span>
                                <span className="text-muted-foreground">{Math.round(uploadProgress)}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                                <div
                                    className="bg-primary h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </Dialog>
        </div>
    );
};

export default PolicyLibrary;
