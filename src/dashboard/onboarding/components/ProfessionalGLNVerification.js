import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { healthRegistryAPI, gesRegAPI } from '../../../services/cloudFunctions';
import { FiLoader, FiAlertCircle, FiFileText, FiCheckCircle } from 'react-icons/fi';
import { DOCUMENT_TYPES } from '../constants/documentTypes';
import { processAndSaveProfessional } from '../services/documentProcessingService';
import { normalizeGLNData } from '../utils/glnVerificationUtils';
import PersonnalizedInputField from '../../../components/BoxedInputFields/Personnalized-InputField';
import SimpleDropdown from '../../../components/BoxedInputFields/Dropdown-Field';
import UploadFile from '../../../components/BoxedInputFields/UploadFile';
import { saveOnboardingData, loadOnboardingData, clearOnboardingData } from '../utils/localStorageUtils';


const ProfessionalGLNVerification = React.memo(React.forwardRef(function ProfessionalGLNVerification(props, ref) {
    const { onComplete, onReadyChange, onProcessingChange, t: tProp, allowBypass = false } = props;
    const { t, i18n, ready } = useTranslation(['dashboard', 'common', 'dashboardProfile', 'dropdowns']);
    const { currentUser } = useAuth();

    const MEDICAL_PROFESSION_OPTIONS = React.useMemo(() => {
        if (!ready) return [];
        const dropdownTranslations = i18n.getResourceBundle(i18n.language, 'dropdowns');
        if (!dropdownTranslations || Object.keys(dropdownTranslations).length === 0) {
            const fallbackTranslations = i18n.getResourceBundle(i18n.options.fallbackLng || 'en', 'dropdowns');
            if (!fallbackTranslations || Object.keys(fallbackTranslations).length === 0) return [];
            const professions = fallbackTranslations.medicalProfessions;
            if (!professions || typeof professions !== 'object') return [];
            return Object.entries(professions).map(([key, label]) => ({
                value: label,
                label: label
            })).sort((a, b) => a.label.localeCompare(b.label));
        }
        const professions = dropdownTranslations.medicalProfessions;
        if (!professions || typeof professions !== 'object') return [];
        return Object.entries(professions).map(([key, label]) => ({
            value: label,
            label: label
        })).sort((a, b) => a.label.localeCompare(b.label));
    }, [i18n, ready]);

    const [gln, setGln] = useState('');
    const [profession, setProfession] = useState('');
    const [documentType, setDocumentType] = useState('');
    const [documentFile, setDocumentFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [verificationStatus, setVerificationStatus] = useState(null);
    const [verificationError, setVerificationError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [identityProgress, setIdentityProgress] = useState(0);
    const [bypassMode, setBypassMode] = useState(false);

    // Load saved data from localStorage on mount
    useEffect(() => {
        const savedData = loadOnboardingData();
        if (savedData?.professional) {
            if (savedData.professional.gln) setGln(savedData.professional.gln);
            if (savedData.professional.profession) setProfession(savedData.professional.profession);
            if (savedData.professional.documentType) setDocumentType(savedData.professional.documentType);
        }
    }, []);

    // Save data to localStorage whenever it changes
    useEffect(() => {
        if (gln || profession || documentType) {
            saveOnboardingData({
                professional: { gln, profession, documentType }
            });
        }
    }, [gln, profession, documentType]);

    const isReady = bypassMode ? !!profession : !!(gln.replace(/[^0-9]/g, '').length === 13 && profession && documentType && documentFile);

    React.useImperativeHandle(ref, () => ({
        handleVerify: () => bypassMode ? handleBypassVerification() : handleVerifyAccount(),
        isReady
    }), [isReady, gln, profession, documentType, documentFile, bypassMode]);

    useEffect(() => { onReadyChange?.(isReady); }, [isReady]);
    useEffect(() => { onProcessingChange?.(isProcessing); }, [isProcessing]);

    const handleBypassVerification = async () => {
        const errors = {};
        
        if (!profession) {
            errors.profession = t('dashboard.onboarding.errors.missing_profession');
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
            const { httpsCallable, getFunctions } = await import('firebase/functions');
            const { firebaseApp } = await import('../../../services/firebaseService');
            const functions = getFunctions(firebaseApp, 'europe-west6');
            const updateUserProfile = httpsCallable(functions, 'updateUserProfile');

            const profileData = {
                role: 'professional',
                profileType: 'professional',
                identity: {
                    firstName: currentUser.displayName?.split(' ')[0] || '',
                    lastName: currentUser.displayName?.split(' ').slice(1).join(' ') || '',
                    legalFirstName: currentUser.displayName?.split(' ')[0] || '',
                    legalLastName: currentUser.displayName?.split(' ').slice(1).join(' ') || ''
                },
                contact: {
                    primaryEmail: currentUser.email || '',
                    primaryPhone: '',
                    primaryPhonePrefix: '',
                    residentialAddress: {
                        street: '',
                        number: '',
                        postalCode: '',
                        city: '',
                        canton: '',
                        country: 'CH'
                    }
                },
                professionalDetails: {
                    profession: profession,
                    education: [],
                    workExperience: [],
                    qualifications: [],
                    professionalSummary: ''
                },
                verification: {
                    identityStatus: 'not_verified',
                    overallVerificationStatus: 'not_verified',
                    verificationDocuments: []
                },
                GLN_certified: false,
                verificationStatus: 'not_verified',
                bypassedGLN: true,
                tutorialAccessMode: 'team'
            };

            await updateUserProfile(profileData);

            const { doc, updateDoc } = await import('firebase/firestore');
            const { db } = await import('../../../services/firebase');
            await updateDoc(doc(db, 'users', currentUser.uid), {
                GLN_certified: false,
                bypassedGLN: true,
                roles: ['professional']
            });

            setVerificationStatus('complete');
            clearOnboardingData();
            console.log('[ProfessionalGLNVerification] Bypass completed successfully, triggering onComplete to start tutorial');
            setTimeout(() => {
                console.log('[ProfessionalGLNVerification] Calling onComplete callback');
                onComplete?.();
            }, 1500);
        } catch (error) {
            console.error('Bypass verification error:', error);
            setVerificationError(error.message || t('dashboard.onboarding.errors.generic_error'));
            setVerificationStatus('error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleVerifyAccount = async () => {
        const glnString = gln.replace(/[^0-9]/g, '');
        const errors = {};

        if (!glnString || glnString.length !== 13) {
            errors.gln = t('dashboard.onboarding.errors.gln_required');
        }
        if (!profession) {
            errors.profession = t('dashboard.onboarding.errors.missing_profession');
        }
        if (!documentType) {
            errors.documentType = t('dashboard.onboarding.errors.missing_document_type');
        }
        if (!documentFile) {
            errors.documentFile = t('dashboard.onboarding.errors.missing_document');
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
            let result = await healthRegistryAPI(glnString);

            if (result.success && result.data?.entries?.length > 0) {
                glnData = normalizeGLNData(result.data.entries[0], 'medReg');
            } else {
                result = await gesRegAPI(glnString);
                if (result.success && result.data) {
                    const entries = result.data.Data || result.data.entries || (Array.isArray(result.data) ? result.data : [result.data]);
                    if (entries?.length > 0) {
                        glnData = normalizeGLNData(entries[0], 'gesReg');
                    } else {
                        throw new Error(t('dashboard.onboarding.errors.no_record_found'));
                    }
                } else {
                    throw new Error(result.error || t('dashboard.onboarding.errors.verification_failed'));
                }
            }

            await processAndSaveProfessional(
                documentFile, documentType, currentUser.uid, glnData, true, gln, currentUser,
                setIdentityProgress, () => { }, setVerificationError, () => { },
                (glnData?.primaryProfession) || profession
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
                        <h3 className="text-lg font-semibold">{t('dashboard.onboarding.success.verified_title')}</h3>
                        <p className="text-gray-300 text-sm">{t('dashboard.onboarding.success.professional_redirect')}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {allowBypass && (
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border">
                    <span className="text-sm font-medium">Skip GLN Verification (Team Access)</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={bypassMode}
                            onChange={(e) => {
                                setBypassMode(e.target.checked);
                                if (e.target.checked) {
                                    setGln('');
                                    setDocumentType('');
                                    setDocumentFile(null);
                                    setFieldErrors({});
                                    setVerificationError('');
                                }
                            }}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                </div>
            )}

            {!bypassMode && (
                <PersonnalizedInputField
                    label={t('dashboard.onboarding.input.professional_gln')}
                    required value={gln}
                    onChange={(e) => {
                        setGln(e.target.value);
                        setFieldErrors(p => ({ ...p, gln: '' }));
                        if (verificationError) setVerificationError('');
                    }}
                    error={fieldErrors.gln}
                />
            )}

            <SimpleDropdown
                options={MEDICAL_PROFESSION_OPTIONS}
                value={profession}
                onChange={(v) => {
                    setProfession(v);
                    setFieldErrors(p => ({ ...p, profession: '' }));
                    if (verificationError) setVerificationError('');
                }}
                placeholder={t('dashboard.onboarding.profession.select')}
                required error={fieldErrors.profession}
            />

            {!bypassMode && (
                <div className="space-y-4">
                    <SimpleDropdown
                        options={DOCUMENT_TYPES} value={documentType}
                        onChange={(v) => {
                            setDocumentType(v);
                            setFieldErrors(p => ({ ...p, documentType: '' }));
                            if (verificationError) setVerificationError('');
                        }}
                        placeholder={t('dashboard.onboarding.docs.select_doc_type')}
                        error={fieldErrors.documentType}
                    />

                    <UploadFile
                        onChange={(f) => {
                            setDocumentFile(f[0]);
                            setFieldErrors(p => ({ ...p, documentFile: '' }));
                            if (verificationError) setVerificationError('');
                        }}
                        label={t('dashboard.onboarding.docs.upload_id')}
                        documentName=""
                        progress={identityProgress} isLoading={isProcessing}
                        error={fieldErrors.documentFile}
                        value={documentFile}
                    />
                </div>
            )}

            {verificationError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 animate-in fade-in slide-in-from-top-2">
                    <FiAlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">{verificationError}</p>
                </div>
            )}
        </div>
    );
}));

ProfessionalGLNVerification.displayName = 'ProfessionalGLNVerification';
export default ProfessionalGLNVerification;
