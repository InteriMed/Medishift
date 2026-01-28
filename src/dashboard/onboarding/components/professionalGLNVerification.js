import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/authContext';
import { healthRegistryAPI, gesRegAPI, normalizeGLNData } from '../../../services/utils/gln';
import { FiLoader, FiAlertCircle, FiInfo, FiCheck } from 'react-icons/fi';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../services/services/firebase';
import { DOCUMENT_TYPES } from '../constants/documentTypes';
import { processAndSaveProfessional } from '../../../services/utils/profile';
import { saveGLNVerificationAudit } from '../../../services/utils/audit';
import PersonnalizedInputField from '../../../components/boxedInputFields/personnalizedInputField';
import SimpleDropdown from '../../../components/boxedInputFields/dropdownField';
import UploadFile from '../../../components/boxedInputFields/uploadFile';
import modal from '../../../components/modals/modals';
import Button from '../../../components/boxedInputFields/button';
import { saveOnboardingData, loadOnboardingData, clearOnboardingData } from '../../../services/utils/storage';
import { FIRESTORE_COLLECTIONS, SESSIONSTORAGE_KEYS } from '../../../config/keysDatabase';


const ProfessionalGLNVerification = React.memo(React.forwardRef(function ProfessionalGLNVerification(props, ref) {
    const { onComplete, onReadyChange, onProcessingChange, allowBypass = false } = props;
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
    const [showGLNInfomodal, setShowGLNInfomodal] = useState(false);
    const [glnInfoProfession, setGlnInfoProfession] = useState('');
    const [isPreVerified, setIsPreVerified] = useState(false);

    const hasCompanyUIDInProfessionalProfile = useCallback((data) => {
        if (!data || typeof data !== 'object') return false;
        const candidates = [
            data.uid,
            data.uidNumber,
            data.identityLegal?.uid,
            data.identityLegal?.uidNumber,
            data.billingInformation?.uid,
            data.billingInformation?.uidNumber
        ].filter(Boolean);
        return candidates.some((v) => typeof v === 'string' && v.trim().length > 0);
    }, []);

    // Check for pre-verified status or GLN certification in various collections
    useEffect(() => {
        const checkPreVerification = async () => {
            if (!currentUser?.uid) return;
            try {
                // 1. Check user document for GLN_certified status
                const userDocRef = doc(db, FIRESTORE_COLLECTIONS.USERS, currentUser.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    if (userData.GLN_certified === true || userData.GLN_certified === 'ADMIN_OVERRIDE') {
                        setIsPreVerified(true);
                        setGln(userData.gln || '');
                        setProfession(userData.profession || '');
                        setVerificationStatus('complete');
                        return; // Found verification, stop checking
                    }
                }

                // 2. Check professional profile for verification or GLN certification
                const profileDocRef = doc(db, FIRESTORE_COLLECTIONS.PROFESSIONAL_PROFILES, currentUser.uid);
                const profileDoc = await getDoc(profileDocRef);
                if (profileDoc.exists()) {
                    const profileData = profileDoc.data();
                    if (profileData.verificationStatus === 'verified' || profileData.GLN_certified === true) {
                        setIsPreVerified(true);
                        setGln(profileData.gln || '');
                        setProfession(profileData.professionalDetails?.profession || profileData.profession || '');
                        setVerificationStatus('complete');
                        return; // Found verification, stop checking
                    }

                    // Specific check for UID based verification in professional profile
                    if (hasCompanyUIDInProfessionalProfile(profileData)) {
                        setIsPreVerified(true);
                        setVerificationStatus('complete');
                        return;
                    }
                }

                // 3. Fallback for legacy 'professionals' collection (only if specifically needed and permitted)
                // We use a separate try-catch to not block the whole flow if one specific collection is restricted
                try {
                    const legacyProfDocRef = doc(db, 'professionals', currentUser.uid);
                    const legacyProfDoc = await getDoc(legacyProfDocRef);
                    if (legacyProfDoc.exists()) {
                        const legacyData = legacyProfDoc.data();
                        if (legacyData.gln_verified || legacyData.verificationStatus === 'verified') {
                            setIsPreVerified(true);
                            setGln(legacyData.gln || '');
                            setProfession(legacyData.profession || '');
                            setVerificationStatus('complete');
                        }
                    }
                } catch (legacyErr) {
                    // Silently ignore legacy collection errors (perms, etc) 
                    // as it's a fallback and might reside in a restricted namespace for non-migrated users
                    console.debug('Skip legacy professionals check:', legacyErr.message);
                }

            } catch (err) {
                // For general verification check, log error but don't break the component
                if (err.code === 'permission-denied') {
                    console.warn('Insufficient permissions to check some verification collections. This is expected for new users.');
                } else {
                    console.error('Error during pre-verification check:', err);
                }
            }
        };

        checkPreVerification();
    }, [currentUser, hasCompanyUIDInProfessionalProfile]);
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
    const isReadyForStep = isPreVerified || isReady;

    React.useImperativeHandle(ref, () => ({
        handleVerify: () => {
            if (isPreVerified) {
                onComplete?.();
                return;
            }
            return bypassMode ? handleBypassVerification() : handleVerifyAccount();
        },
        isReady: isReadyForStep
    }), [isReadyForStep, gln, profession, documentType, documentFile, bypassMode, isPreVerified, handleBypassVerification, handleVerifyAccount, onComplete]);

    useEffect(() => { onReadyChange?.(isReadyForStep); }, [isReadyForStep, onReadyChange]);
    useEffect(() => { onProcessingChange?.(isProcessing); }, [isProcessing, onProcessingChange]);

    const handleBypassVerification = useCallback(async () => {
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
            await updateDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, currentUser.uid), {
                GLN_certified: false,
                bypassedGLN: true,
                roles: ['professional']
            });

            setVerificationStatus('complete');
            clearOnboardingData();
            sessionStorage.setItem(SESSIONSTORAGE_KEYS.ONBOARDING_VALIDATION_SUCCESS, 'professional');
            onComplete?.();
        } catch (error) {
            console.error('Bypass verification error:', error);
            setVerificationError(error.message || t('dashboard.onboarding.errors.generic_error'));
            setVerificationStatus('error');
        } finally {
            setIsProcessing(false);
        }
    }, [profession, currentUser, t, onComplete]);

    const handleVerifyAccount = useCallback(async () => {
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
            let source = '';

            if (result.success && result.data?.entries?.length > 0) {
                glnData = normalizeGLNData(result.data.entries[0], 'medReg');
                source = 'GLN MedReg';
            } else {
                result = await gesRegAPI(glnString);
                if (result.success && result.data) {
                    const entries = result.data.Data || result.data.entries || (Array.isArray(result.data) ? result.data : [result.data]);
                    if (entries?.length > 0) {
                        glnData = normalizeGLNData(entries[0], 'gesReg');
                        source = 'GLN NarReg';
                    } else {
                        throw new Error(t('dashboard.onboarding.errors.no_record_found'));
                    }
                } else {
                    throw new Error(result.error || t('dashboard.onboarding.errors.verification_failed'));
                }
            }

            await saveGLNVerificationAudit(
                currentUser.uid,
                glnData?.legalName || `${currentUser.displayName || 'Unknown'}`,
                gln,
                'Self-Onboarding',
                glnData?.primaryProfession || profession || '',
                source,
                glnData
            );

            await processAndSaveProfessional(
                documentFile, documentType, currentUser.uid, glnData, true, gln, currentUser,
                setIdentityProgress, () => { }, setVerificationError, () => { },
                (glnData?.primaryProfession) || profession
            );

            setVerificationStatus('complete');
            clearOnboardingData();
            sessionStorage.setItem(SESSIONSTORAGE_KEYS.ONBOARDING_VALIDATION_SUCCESS, 'professional');
            onComplete?.();
        } catch (error) {
            console.error('Verification error:', error);
            setVerificationError(error.message || t('dashboard.onboarding.errors.generic_error'));
            setVerificationStatus('error');
        } finally {
            setIsProcessing(false);
        }
    }, [gln, profession, documentType, documentFile, currentUser, t, onComplete]);

    if (isPreVerified) {
        return (
            <div className="animate-in fade-in zoom-in-95 duration-500 max-w-md mx-auto">
                <header className="text-center mb-10">
                    <div className="w-16 h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <FiCheck className="w-8 h-8" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t('dashboard.onboarding.gln_verified.title', 'GLN Verified')}</h2>
                    <p className="text-slate-500 text-base mt-2">
                        {t('dashboard.onboarding.gln_verified.desc', 'Your GLN {{gln}} has been recognized from your professional profile.', { gln: gln })}
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
        <div className="space-y-6">
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
                <div className="space-y-2">
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
                    <button
                        type="button"
                        onClick={() => {
                            setGlnInfoProfession(profession);
                            setShowGLNInfomodal(true);
                        }}
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                        <FiInfo className="w-4 h-4" />
                        {t('dashboard.onboarding.gln_info.where_to_find', 'Where to find your GLN?')}
                    </button>
                </div>
            )}

            <SimpleDropdown
                label={t('dashboardProfile:profession', 'Profession')}
                options={MEDICAL_PROFESSION_OPTIONS}
                value={profession}
                onChange={(v) => {
                    setProfession(v);
                    setFieldErrors(p => ({ ...p, profession: '' }));
                    if (verificationError) setVerificationError('');
                }}
                placeholder={t('dashboard.onboarding.profession.select', 'Select your profession')}
                required error={fieldErrors.profession}
            />

            {!bypassMode && (
                <div className="space-y-6">
                    <SimpleDropdown
                        label={t('dashboard.onboarding.docs.professional_id', 'Authorization Document')}
                        options={DOCUMENT_TYPES} value={documentType}
                        onChange={(v) => {
                            setDocumentType(v);
                            setFieldErrors(p => ({ ...p, documentType: '' }));
                            if (verificationError) setVerificationError('');
                        }}
                        placeholder={t('dashboard.onboarding.docs.select_doc_type', 'Select document type')}
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

            <modal
                isOpen={showGLNInfomodal}
                onClose={() => setShowGLNInfomodal(false)}
                title={t('dashboard.onboarding.gln_info.title', 'Where to find your GLN')}
                messageType="info"
                size="medium"
                actions={
                    <Button variant="primary" onClick={() => setShowGLNInfomodal(false)}>
                        {t('common:close', 'Close')}
                    </Button>
                }
            >
                <div className="space-y-4">
                    <SimpleDropdown
                        label={t('dashboardProfile:profession', 'Profession')}
                        options={MEDICAL_PROFESSION_OPTIONS}
                        value={glnInfoProfession}
                        onChange={(v) => setGlnInfoProfession(v)}
                        placeholder={t('dashboard.onboarding.profession.select', 'Select your profession')}
                    />
                    {glnInfoProfession && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-900 mb-2">
                                {t('dashboard.onboarding.gln_info.registry_info', 'You can find your GLN number in the official Swiss health registry:')}
                            </p>
                            <a
                                href={getGLNWebsiteForProfession(glnInfoProfession)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline font-medium"
                            >
                                {getGLNWebsiteLabelForProfession(glnInfoProfession, t)}
                            </a>
                        </div>
                    )}
                </div>
            </modal>
        </div>
    );
}));

const getGLNWebsiteForProfession = (profession) => {
    const professionLower = profession?.toLowerCase() || '';

    if (professionLower.includes('pharmac') || professionLower.includes('apothek')) {
        return 'https://www.nareg.ch';
    } else if (professionLower.includes('medic') || professionLower.includes('doctor') || professionLower.includes('arzt') || professionLower.includes('médecin')) {
        return 'https://www.medreg.admin.ch';
    } else if (professionLower.includes('dentist') || professionLower.includes('zahnarzt') || professionLower.includes('dentiste')) {
        return 'https://www.medreg.admin.ch';
    }

    return 'https://www.medreg.admin.ch';
};

const getGLNWebsiteLabelForProfession = (profession, t) => {
    const professionLower = profession?.toLowerCase() || '';

    if (professionLower.includes('pharmac') || professionLower.includes('apothek')) {
        return t('dashboard.onboarding.gln_info.nareg_registry', 'Swiss Pharmacist Registry (NAREG)');
    } else {
        return t('dashboard.onboarding.gln_info.medreg_registry', 'Swiss Medical Registry (MEDREG)');
    }
};

ProfessionalGLNVerification.displayName = 'ProfessionalGLNVerification';
export default ProfessionalGLNVerification;
