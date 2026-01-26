import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { commercialRegistrySearchAPI } from '../../../services/cloudFunctions';
import { FiLoader, FiAlertCircle, FiFileText, FiCheckCircle, FiInfo, FiCheck, FiExternalLink } from 'react-icons/fi';
import { DOCUMENT_TYPES } from '../constants/documentTypes';
import { saveOrganizationProfile } from '../services/profileSavingService';
import { processDocumentWithAI } from '../../../services/documentProcessingService';
import { uploadDocument } from '../services/documentUploadService';
import { getMimeType } from '../utils/glnVerificationUtils';
import PersonnalizedInputField from '../../../components/BoxedInputFields/Personnalized-InputField';
import SimpleDropdown from '../../../components/BoxedInputFields/Dropdown-Field';
import UploadFile from '../../../components/BoxedInputFields/UploadFile';
import Dialog from '../../../components/Dialog/Dialog';
import Button from '../../../components/BoxedInputFields/Button';
import { saveOnboardingData, loadOnboardingData, clearOnboardingData } from '../utils/localStorageUtils';
import { SESSIONSTORAGE_KEYS, FIRESTORE_COLLECTIONS } from '../../../config/keysDatabase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase';

const normalizeCommercialRegistryData = (source) => {
  if (!source) return null;
  
  if (source.results && source.results.length > 0) {
    const result = source.results[0];
    return {
      name: result.name || '',
      uid: result.uid || '',
      seat: result.seat || '',
      legalForm: result.legalForm || '',
      legalFormCode: result.legalFormCode || '',
      chNum: result.chNum || '',
      idCantonal: result.idCantonal || '',
      status: result.status || false,
      registry: 'commercialRegistry'
    };
  }
  
  return null;
};

const CommercialRegistryVerification = React.memo(React.forwardRef(function CommercialRegistryVerification(props, ref) {
    const { onComplete, onReadyChange, onProcessingChange, mode = 'full' } = props;
    const { t } = useTranslation(['dashboard', 'common', 'dashboardProfile']);
    const { currentUser } = useAuth();

    const [commercialNumber, setCommercialNumber] = useState('');
    const [documentType, setDocumentType] = useState('');
    const [documentFile, setDocumentFile] = useState(null);
    const [billingFile, setBillingFile] = useState(null);
    const [internalRef, setInternalRef] = useState('');

    const [isProcessing, setIsProcessing] = useState(false);
    const [verificationStatus, setVerificationStatus] = useState(null);
    const [verificationError, setVerificationError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [identityProgress, setIdentityProgress] = useState(0);
    const [billingProgress, setBillingProgress] = useState(0);
    const [showRegistryInfoDialog, setShowRegistryInfoDialog] = useState(false);
    const [isPreVerified, setIsPreVerified] = useState(false);
    const [preVerifiedData, setPreVerifiedData] = useState(null);

    useEffect(() => {
        const checkVerificationStatus = async () => {
            if (currentUser?.uid) {
                try {
                    const userDocRef = doc(db, FIRESTORE_COLLECTIONS.USERS, currentUser.uid);
                    const userDoc = await getDoc(userDocRef);
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        if (userData.GLN_certified === true || userData.GLN_certified === 'ADMIN_OVERRIDE') {
                            setIsPreVerified(true);
                            setPreVerifiedData(userData);
                        }
                    }
                } catch (error) {
                    if (error.code === 'permission-denied') {
                        console.warn("Insufficient permissions to check verification collections (expected for new users).");
                    } else {
                        console.error("Error checking verification status:", error);
                    }
                }
            }
        };
        checkVerificationStatus();
    }, [currentUser]);

    useEffect(() => {
        const savedData = loadOnboardingData();
        if (savedData?.organization) {
            if (savedData.organization.commercialNumber) setCommercialNumber(savedData.organization.commercialNumber);
            if (savedData.organization.documentType) setDocumentType(savedData.organization.documentType);
            if (savedData.organization.internalRef) setInternalRef(savedData.organization.internalRef);
        }
    }, []);

    useEffect(() => {
        if (commercialNumber || documentType || internalRef) {
            saveOnboardingData({
                organization: { commercialNumber, documentType, internalRef }
            });
        }
    }, [commercialNumber, documentType, internalRef]);

    const isReady = React.useMemo(() => {
        if (isPreVerified) return true;
        const cleanNumber = commercialNumber.replace(/[^A-Z0-9.-]/g, '');
        if (!cleanNumber || (!cleanNumber.startsWith('CHE-') && !/^CHE\d{3}\.\d{3}\.\d{3}$/.test(cleanNumber))) return false;
        return !!(documentFile && documentType && billingFile);
    }, [commercialNumber, documentFile, documentType, billingFile, isPreVerified]);

    React.useImperativeHandle(ref, () => ({
        handleVerify: () => {
            if (isPreVerified) {
                onComplete?.();
                return;
            }
            return handleVerifyAccount();
        },
        isReady
    }), [isReady, commercialNumber, documentFile, documentType, billingFile, isPreVerified]);

    useEffect(() => { onReadyChange?.(isReady); }, [isReady]);
    useEffect(() => { onProcessingChange?.(isProcessing); }, [isProcessing]);

    const handleVerifyAccount = async () => {
        const cleanNumber = commercialNumber.replace(/[^A-Z0-9.-]/g, '');
        const errors = {};

        if (!cleanNumber || (!cleanNumber.startsWith('CHE-') && !/^CHE\d{3}\.\d{3}\.\d{3}$/.test(cleanNumber))) {
            errors.commercialNumber = t('dashboard.onboarding.errors.commercial_number_required', 'Valid commercial registry number (CHE-XXX.XXX.XXX) is required');
        }

        if (!documentType) errors.documentType = t('dashboard.onboarding.errors.missing_document_type');
        if (!documentFile) errors.documentFile = t('dashboard.onboarding.errors.missing_document');
        if (!billingFile) errors.billing = t('dashboard.onboarding.errors.missing_document');

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        setIsProcessing(true);
        setVerificationStatus(null);
        setVerificationError('');
        setFieldErrors({});

        try {
            let registryData = null;
            const normalizedNumber = cleanNumber.startsWith('CHE-') ? cleanNumber : cleanNumber.replace(/^CHE/, 'CHE-');
            const searchResult = await commercialRegistrySearchAPI(normalizedNumber);
            
            if (searchResult.success && searchResult.data?.results?.length > 0) {
                registryData = normalizeCommercialRegistryData(searchResult.data);
            }

            if (!registryData) {
                throw new Error(t('dashboard.onboarding.errors.no_organization_found', 'No organization found in commercial registry'));
            }

            const idUpload = await uploadDocument(documentFile, currentUser.uid, 'responsible_person_id', documentType, setIdentityProgress, true, () => {});
            const idResult = await processDocumentWithAI(idUpload.downloadURL, documentType || 'identity', idUpload.storagePath, getMimeType(documentFile));

            const billUpload = await uploadDocument(billingFile, currentUser.uid, 'billing_document', null, setBillingProgress, true, () => {});
            const billResult = await processDocumentWithAI(billUpload.downloadURL, 'businessDocument', billUpload.storagePath, getMimeType(billingFile));

            if (!idResult.success || !billResult.success) {
                throw new Error(t('dashboard.onboarding.errors.document_processing_failed', 'Failed to process documents'));
            }

            const billingInfo = {
                responsiblePersonAnalysis: idResult.data,
                billingAnalysis: billResult.data,
                billingAddress: billResult.data?.invoiceDetails?.billingAddress || billResult.data?.businessDetails?.address || billResult.data?.facilityDetails?.address || {}
            };

            await saveOrganizationProfile(
                registryData,
                billingInfo,
                { documentType, internalRef },
                normalizedNumber,
                currentUser
            );

            setVerificationStatus('complete');
            clearOnboardingData();
            sessionStorage.setItem(SESSIONSTORAGE_KEYS.ONBOARDING_VALIDATION_SUCCESS, 'organization');
            onComplete?.();
        } catch (error) {
            console.error('Verification error:', error);
            setVerificationError(error.message || t('dashboard.onboarding.errors.generic_error'));
            setVerificationStatus('error');
        } finally {
            setIsProcessing(false);
        }
    };

    if (isPreVerified) {
        return (
            <div className="animate-in fade-in zoom-in-95 duration-500 max-w-md mx-auto">
                <header className="text-center mb-10">
                    <div className="w-16 h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <FiCheck className="w-8 h-8" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t('dashboard.onboarding.commercial_registry_verified.title', 'Commercial Registry Verified')}</h2>
                    <p className="text-slate-500 text-base mt-2">
                        {t('dashboard.onboarding.commercial_registry_verified.desc', 'Your account is already verified. You can proceed with the onboarding.')}
                    </p>
                </header>

                <div className="bg-green-50 p-8 rounded-3xl border border-green-200 shadow-inner text-center">
                    <div className="flex items-center justify-center gap-3 text-green-700">
                        <FiCheck className="w-6 h-6" />
                        <span className="text-lg font-bold">{t('dashboard.onboarding.commercial_registry_verified.status', 'Organization Confirmed')}</span>
                    </div>
                </div>
            </div>
        );
    }

    if (verificationStatus === 'complete') {
        return (
            <div className="flex items-center justify-center py-12">
                <FiLoader className="w-12 h-12 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="space-y-6">
                <h2 className="text-2xl font-black text-slate-900 px-2">{t('dashboard.onboarding.input.commercial_registry_number', 'Commercial Registry Number')}</h2>
                <div className="space-y-2">
                    <PersonnalizedInputField
                        label={t('dashboard.onboarding.input.commercial_registry_number', 'Commercial Registry Number (UID/CHE)')}
                        required
                        value={commercialNumber}
                        onChange={(e) => {
                            setCommercialNumber(e.target.value);
                            setFieldErrors(p => ({ ...p, commercialNumber: '' }));
                            if (verificationError) setVerificationError('');
                        }}
                        placeholder="CHE-106.029.451"
                        error={fieldErrors.commercialNumber}
                    />
                    <button
                        type="button"
                        onClick={() => setShowRegistryInfoDialog(true)}
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                        <FiInfo className="w-4 h-4" />
                        {t('dashboard.onboarding.commercial_registry_info.where_to_find', 'Where to find your commercial registry number?')}
                    </button>
                </div>
                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 shadow-sm text-slate-700 leading-relaxed relative overflow-hidden">
                    <p className="text-xl font-black text-slate-900 border-b border-slate-200 pb-3 mb-4">{t('dashboard.onboarding.commercial_registry.title', 'Commercial Registry Verification')}</p>
                    <p>{t('dashboard.onboarding.commercial_registry.text1', 'Please provide your commercial registry number (UID/CHE) to verify your organization.')}</p>
                    <p className="font-semibold mt-2 text-slate-900 text-lg">{t('dashboard.onboarding.commercial_registry.text2', 'This number can be found in the Geneva commercial registry.')}</p>
                </div>
            </div>

            <div className="space-y-6 pt-12">
                <h2 className="text-2xl font-black text-slate-900 mb-2 px-2 flex items-center gap-2">
                    {t('dashboard.onboarding.docs.title')}
                    {(fieldErrors.documentType || fieldErrors.documentFile || fieldErrors.billing) && <FiAlertCircle className="text-destructive w-5 h-5" />}
                </h2>

                <div className="space-y-6 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
                    <h4 className="text-lg font-bold flex items-center gap-2 text-slate-800"><FiFileText /> {t('dashboard.onboarding.docs.facility_id.title')}</h4>
                    <SimpleDropdown
                        options={DOCUMENT_TYPES}
                        value={documentType}
                        onChange={(v) => {
                            setDocumentType(v);
                            setFieldErrors(p => ({ ...p, documentType: '' }));
                            if (verificationError) setVerificationError('');
                        }}
                        placeholder={t('dashboard.onboarding.docs.select_id_type')}
                        error={fieldErrors.documentType}
                    />
                    <UploadFile
                        onChange={(f) => {
                            setDocumentFile(f[0]);
                            setFieldErrors(p => ({ ...p, documentFile: '' }));
                            if (verificationError) setVerificationError('');
                        }}
                        label={t('dashboard.onboarding.docs.upload_id')}
                        progress={identityProgress}
                        isLoading={isProcessing}
                        error={fieldErrors.documentFile}
                        value={documentFile}
                    />
                </div>

                <div className="space-y-6 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
                    <h4 className="text-lg font-bold flex items-center gap-2 text-slate-800"><FiFileText /> {t('dashboard.onboarding.docs.facility_bill.title')}</h4>
                    <UploadFile
                        onChange={(f) => {
                            setBillingFile(f[0]);
                            setFieldErrors(p => ({ ...p, billing: '' }));
                            if (verificationError) setVerificationError('');
                        }}
                        label={t('dashboard.onboarding.docs.upload_bill')}
                        progress={billingProgress}
                        isLoading={isProcessing}
                        error={fieldErrors.billing}
                        value={billingFile}
                    />
                    <PersonnalizedInputField
                        label={t('dashboard.onboarding.docs.internal_ref')}
                        value={internalRef}
                        onChange={(e) => setInternalRef(e.target.value)}
                        placeholder="e.g. PO-2024-001"
                    />
                </div>
            </div>

            {verificationError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 animate-in fade-in slide-in-from-top-2">
                    <FiAlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">{verificationError}</p>
                </div>
            )}

            <Dialog
                isOpen={showRegistryInfoDialog}
                onClose={() => setShowRegistryInfoDialog(false)}
                title={t('dashboard.onboarding.commercial_registry_info.title', 'Where to find your Commercial Registry Number')}
                messageType="info"
                size="medium"
                className="mt-8"
                actions={
                    <Button variant="primary" onClick={() => setShowRegistryInfoDialog(false)}>
                        {t('common:close', 'Close')}
                    </Button>
                }
            >
                <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-900 mb-2">
                            {t('dashboard.onboarding.commercial_registry_info.registry_info', 'You can find your commercial registry number (UID/CHE) in the Geneva commercial registry:')}
                        </p>
                        <a
                            href="https://app2.ge.ch/ecohrcinternet/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline font-medium flex items-center gap-2"
                        >
                            {t('dashboard.onboarding.commercial_registry_info.registry_link', 'Geneva Commercial Registry')}
                            <FiExternalLink className="w-4 h-4" />
                        </a>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                        <p className="text-sm text-slate-700">
                            {t('dashboard.onboarding.commercial_registry_info.format_info', 'The commercial registry number format is: CHE-XXX.XXX.XXX (e.g., CHE-106.029.451)')}
                        </p>
                    </div>
                </div>
            </Dialog>
        </div>
    );
}));

CommercialRegistryVerification.displayName = 'CommercialRegistryVerification';
export default CommercialRegistryVerification;

