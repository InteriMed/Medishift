import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/authContext';
import { companySearchAPI, companyDetailsAPI } from '../../../services/utils/gln';
import { FiLoader, FiAlertCircle, FiFileText, FiCheckCircle, FiInfo, FiCheck } from 'react-icons/fi';
import { DOCUMENT_TYPES } from '../constants/documentTypes';
import { processAndSaveFacility } from '../../../services/utils/profile';
import { normalizeGLNData } from '../../../services/utils/gln';
import PersonnalizedInputField from '../../../components/boxedInputFields/personnalizedInputField';
import SimpleDropdown from '../../../components/boxedInputFields/dropdownField';
import UploadFile from '../../../components/boxedInputFields/uploadFile';
import modal from '../../../components/modals/modals';
import Button from '../../../components/boxedInputFields/button';
import { saveToStorage as saveOnboardingData, loadFromStorage as loadOnboardingData, removeFromStorage as clearOnboardingData } from '../../../services/utils/storage';
import { SESSIONSTORAGE_KEYS, FIRESTORE_COLLECTIONS } from '../../../config/keysDatabase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../services/services/firebase';


const FacilityGLNVerification = React.memo(React.forwardRef(function FacilityGLNVerification(props, ref) {
    const { onComplete, onReadyChange, onProcessingChange, mode = 'full' } = props;
    const { t } = useTranslation(['dashboard', 'common', 'dashboardProfile']);
    const { currentUser } = useAuth();

    const [gln, setGln] = useState('');
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
    const [showGLNInfomodal, setShowGLNInfomodal] = useState(false);
    const [isProfVerified, setIsProfVerified] = useState(false);
    const [profProfileData, setProfProfileData] = useState(null);
    const [isPreVerified, setIsPreVerified] = useState(false);
    const [preVerifiedData, setPreVerifiedData] = useState(null);

    // Check if user is already a verified professional or has GLN_certified in users collection
    useEffect(() => {
        const checkVerificationStatus = async () => {
            if (currentUser?.uid) {
                try {
                    // Check user document for GLN_certified status
                    const userDocRef = doc(db, FIRESTORE_COLLECTIONS.USERS, currentUser.uid);
                    const userDoc = await getDoc(userDocRef);
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        if (userData.GLN_certified === true || userData.GLN_certified === 'ADMIN_OVERRIDE') {
                            setIsPreVerified(true);
                            setPreVerifiedData(userData);
                        }
                    }

                    // Also check professional profile (existing logic)
                    const profDocRef = doc(db, FIRESTORE_COLLECTIONS.PROFESSIONAL_PROFILES, currentUser.uid);
                    const profDoc = await getDoc(profDocRef);
                    if (profDoc.exists()) {
                        const data = profDoc.data();
                        if (data.verificationStatus === 'verified' || data.GLN_certified === true) {
                            setIsProfVerified(true);
                            setProfProfileData(data);

                            if (data.GLN_certified === true) {
                                setIsPreVerified(true);
                                setPreVerifiedData(data);
                            }
                        }
                    }
                } catch (error) {
                    if (error.code === 'permission-denied') {
                        console.warn("Insufficient permissions to check some verification collections (expected for new users).");
                    } else {
                        console.error("Error checking verification status:", error);
                    }
                }
            }
        };
        checkVerificationStatus();
    }, [currentUser]);

    // Load saved data from localStorage on mount
    useEffect(() => {
        const savedData = loadOnboardingData();
        if (savedData?.facility) {
            if (savedData.facility.gln) setGln(savedData.facility.gln);
            if (savedData.facility.documentType) setDocumentType(savedData.facility.documentType);
            if (savedData.facility.internalRef) setInternalRef(savedData.facility.internalRef);
        }
    }, []);

    // Save data to localStorage whenever it changes
    useEffect(() => {
        if (gln || documentType || internalRef) {
            saveOnboardingData({
                facility: { gln, documentType, internalRef }
            });
        }
    }, [gln, documentType, internalRef]);

    const isResponsiblePersonMode = mode === 'responsiblePerson';
    const isFacilityInfoMode = mode === 'facilityInfo';

    const isReady = React.useMemo(() => {
        if (isPreVerified) return true;
        const glnDigits = gln.replace(/[^0-9]/g, '');
        if (glnDigits.length !== 13) return false;
        if (isResponsiblePersonMode) return !!(documentFile && documentType);
        if (isFacilityInfoMode) return !!billingFile;
        return !!(documentFile && documentType && billingFile);
    }, [gln, documentFile, documentType, billingFile, isResponsiblePersonMode, isFacilityInfoMode, isPreVerified]);

    React.useImperativeHandle(ref, () => ({
        handleVerify: () => {
            if (isPreVerified) {
                onComplete?.();
                return;
            }
            return handleVerifyAccount();
        },
        isReady
    }), [isReady, gln, documentFile, documentType, billingFile, internalRef, isPreVerified]);

    useEffect(() => { onReadyChange?.(isReady); }, [isReady]);
    useEffect(() => { onProcessingChange?.(isProcessing); }, [isProcessing]);

    const handleVerifyAccount = async () => {
        const glnString = gln.replace(/[^0-9]/g, '');
        const errors = {};

        if (!glnString || glnString.length !== 13) {
            errors.gln = t('dashboard.onboarding.errors.gln_required');
        }

        if (!isFacilityInfoMode) {
            if (!documentType) errors.documentType = t('dashboard.onboarding.errors.missing_document_type');
            if (!documentFile) errors.documentFile = t('dashboard.onboarding.errors.missing_document');
        }

        if (!isResponsiblePersonMode && !billingFile) {
            errors.billing = t('dashboard.onboarding.errors.missing_document');
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        setIsProcessing(true);
        setVerificationStatus(null);
        setVerificationError('');
        setFieldErrors({});

        try {
            let glnData = null;
            const searchResult = await companySearchAPI(glnString);
            if (searchResult.success && searchResult.data?.entries?.length > 0) {
                const detailsResult = await companyDetailsAPI(searchResult.data.entries[0].id);
                if (detailsResult.success) glnData = normalizeGLNData(detailsResult.data, 'betReg');
            }

            if (!glnData) throw new Error(t('dashboard.onboarding.errors.no_facility_found'));

            await processAndSaveFacility(
                documentFile, billingFile, documentType, currentUser.uid, glnData, true, gln, internalRef, currentUser,
                setIdentityProgress, setBillingProgress,
                () => { }, () => { },
                null,
                isProfVerified ? profProfileData : null
            );

            setVerificationStatus('complete');
            clearOnboardingData();
            sessionStorage.setItem(SESSIONSTORAGE_KEYS.ONBOARDING_VALIDATION_SUCCESS, 'facility');
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
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t('dashboard.onboarding.gln_verified.title', 'GLN Verified')}</h2>
                    <p className="text-slate-500 text-base mt-2">
                        {t('dashboard.onboarding.gln_verified.facility_desc', 'Your account is already GLN certified. You can proceed with the onboarding.', { gln: preVerifiedData?.gln || '' })}
                    </p>
                </header>

                <div className="bg-green-50 p-8 rounded-3xl border border-green-200 shadow-inner text-center">
                    <div className="flex items-center justify-center gap-3 text-green-700">
                        <FiCheck className="w-6 h-6" />
                        <span className="text-lg font-bold">{t('dashboard.onboarding.gln_verified.status', 'Identity Confirmed')}</span>
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
                <h2 className="text-2xl font-black text-slate-900 px-2">{t('dashboard.onboarding.input.company_gln')}</h2>
                <div className="space-y-2">
                    <PersonnalizedInputField
                        label={t('dashboard.onboarding.input.company_gln')}
                        required value={gln}
                        onChange={(e) => {
                            setGln(e.target.value);
                            setFieldErrors(p => ({ ...p, gln: '' }));
                            if (verificationError) setVerificationError('');
                        }}
                        placeholder="760100..."
                        error={fieldErrors.gln}
                    />
                    <button
                        type="button"
                        onClick={() => setShowGLNInfomodal(true)}
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                        <FiInfo className="w-4 h-4" />
                        {t('dashboard.onboarding.gln_info.where_to_find_facility', 'Where to find your facility GLN?')}
                    </button>
                </div>
                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 shadow-sm text-slate-700 leading-relaxed relative overflow-hidden">
                    {isProfVerified && (
                        <div className="absolute top-4 right-4 flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold animate-in fade-in slide-in-from-right-4 duration-500">
                            <FiCheckCircle className="w-3 h-3" />
                            {t('dashboard.onboarding.identity_verified', 'Identity Verified')}
                        </div>
                    )}
                    <p className="text-xl font-black text-slate-900 border-b border-slate-200 pb-3 mb-4">{t('dashboard.onboarding.company_gln.title')}</p>
                    <p>{t('dashboard.onboarding.company_gln.text1')}</p>
                    <p className="font-semibold mt-2 text-slate-900 text-lg">{t('dashboard.onboarding.company_gln.text3')}</p>
                </div>
            </div>

            {isProfVerified && (
                <div className="bg-green-50/50 p-6 rounded-[2rem] border border-green-200 shadow-sm flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <FiCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900">{t('dashboard.onboarding.identity_verified_title', 'Identity Verified')}</h4>
                        <p className="text-sm text-slate-600">
                            {t('dashboard.onboarding.identity_verified_desc', 'Using your verified identity document from your professional profile ({{name}}).', { name: `${profProfileData?.identity?.firstName} ${profProfileData?.identity?.lastName}` })}
                        </p>
                    </div>
                </div>
            )}

            <div className="space-y-6 pt-12">
                <h2 className="text-2xl font-black text-slate-900 mb-2 px-2 flex items-center gap-2">
                    {t('dashboard.onboarding.docs.title')}
                    {(fieldErrors.documentType || fieldErrors.documentFile || fieldErrors.billing) && <FiAlertCircle className="text-destructive w-5 h-5" />}
                </h2>

                {!isFacilityInfoMode && (
                    <div className="space-y-6 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
                        <h4 className="text-lg font-bold flex items-center gap-2 text-slate-800"><FiFileText /> {t('dashboard.onboarding.docs.facility_id.title')}</h4>
                        <SimpleDropdown
                            options={DOCUMENT_TYPES} value={documentType}
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
                            progress={identityProgress} isLoading={isProcessing}
                            error={fieldErrors.documentFile}
                            value={documentFile}
                        />
                    </div>
                )}

                {!isResponsiblePersonMode && (
                    <div className="space-y-6 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
                        <h4 className="text-lg font-bold flex items-center gap-2 text-slate-800"><FiFileText /> {t('dashboard.onboarding.docs.facility_bill.title')}</h4>
                        <UploadFile
                            onChange={(f) => {
                                setBillingFile(f[0]);
                                setFieldErrors(p => ({ ...p, billing: '' }));
                                if (verificationError) setVerificationError('');
                            }}
                            label={t('dashboard.onboarding.docs.upload_bill')}
                            progress={billingProgress} isLoading={isProcessing}
                            error={fieldErrors.billing}
                            value={billingFile}
                        />
                        <PersonnalizedInputField
                            label={t('dashboard.onboarding.docs.internal_ref')}
                            value={internalRef} onChange={(e) => setInternalRef(e.target.value)}
                            placeholder="e.g. PO-2024-001"
                        />
                    </div>
                )}
            </div>

            {verificationError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 animate-in fade-in slide-in-from-top-2">
                    <FiAlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">{verificationError}</p>
                </div>
            )}

            <modal
                isOpen={showGLNInfomodal}
                onClose={() => setShowGLNInfomodal(false)}
                title={t('dashboard.onboarding.gln_info.facility_title', 'Where to find your Facility GLN')}
                messageType="info"
                size="medium"
                className="mt-8"
                actions={
                    <Button variant="primary" onClick={() => setShowGLNInfomodal(false)}>
                        {t('common:close', 'Close')}
                    </Button>
                }
            >
                <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-900 mb-2">
                            {t('dashboard.onboarding.gln_info.facility_registry_info', 'You can find your facility GLN number in the official Swiss business registry:')}
                        </p>
                        <a
                            href="https://www.uid.admin.ch"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline font-medium"
                        >
                            {t('dashboard.onboarding.gln_info.uid_registry', 'Swiss Business Registry (UID/CHE)')}
                        </a>
                    </div>
                </div>
            </modal>
        </div>
    );
}));

FacilityGLNVerification.displayName = 'FacilityGLNVerification';
export default FacilityGLNVerification;
