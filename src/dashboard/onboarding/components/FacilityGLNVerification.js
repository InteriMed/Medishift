import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { companySearchAPI, companyDetailsAPI } from '../../../services/cloudFunctions';
import { FiLoader, FiAlertCircle, FiFileText, FiCheckCircle } from 'react-icons/fi';
import { DOCUMENT_TYPES } from '../constants/documentTypes';
import { processAndSaveFacility } from '../services/documentProcessingService';
import { normalizeGLNData } from '../utils/glnVerificationUtils';
import PersonnalizedInputField from '../../../components/BoxedInputFields/Personnalized-InputField';
import SimpleDropdown from '../../../components/BoxedInputFields/Dropdown-Field';
import UploadFile from '../../../components/BoxedInputFields/UploadFile';
import { saveOnboardingData, loadOnboardingData, clearOnboardingData } from '../utils/localStorageUtils';


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
        const glnDigits = gln.replace(/[^0-9]/g, '');
        if (glnDigits.length !== 13) return false;
        if (isResponsiblePersonMode) return !!(documentFile && documentType);
        if (isFacilityInfoMode) return !!billingFile;
        return !!(documentFile && documentType && billingFile);
    }, [gln, documentFile, documentType, billingFile, isResponsiblePersonMode, isFacilityInfoMode]);

    React.useImperativeHandle(ref, () => ({
        handleVerify: () => handleVerifyAccount(),
        isReady
    }), [isReady, gln, documentFile, documentType, billingFile, internalRef]);

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
                () => { }, () => { }
            );

            setVerificationStatus('complete');
            clearOnboardingData();
            setTimeout(() => onComplete?.(), 1500);
        } catch (error) {
            console.error('Verification error:', error);
            setVerificationError(error.message || t('dashboard.onboarding.errors.generic_error'));
            setVerificationStatus('error');
        } finally {
            setIsProcessing(false);
        }
    };

    if (verificationStatus === 'complete') {
        return (
            <div className="space-y-6 animate-in fade-in zoom-in">
                <div className="p-6 bg-black/95 border border-gray-800 rounded-xl flex items-start gap-4 text-white shadow-xl">
                    <FiCheckCircle className="w-12 h-12 text-green-500" />
                    <div>
                        <h3 className="text-lg font-semibold text-white">{t('dashboard.onboarding.success.verified_title')}</h3>
                        <p className="text-gray-300 text-sm">{t('dashboard.onboarding.success.facility_redirect')}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="space-y-6">
                <h2 className="text-2xl font-black text-slate-900 px-2">{t('dashboard.onboarding.input.company_gln')}</h2>
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
                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 shadow-sm text-slate-700 leading-relaxed">
                    <p className="text-xl font-black text-slate-900 border-b border-slate-200 pb-3 mb-4">{t('dashboard.onboarding.company_gln.title')}</p>
                    <p>{t('dashboard.onboarding.company_gln.text1')}</p>
                    <p className="font-semibold mt-2 text-slate-900 text-lg">{t('dashboard.onboarding.company_gln.text3')}</p>
                </div>
            </div>

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
        </div>
    );
}));

FacilityGLNVerification.displayName = 'FacilityGLNVerification';
export default FacilityGLNVerification;
