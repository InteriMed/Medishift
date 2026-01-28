import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/authContext';
import { healthRegistryAPI, gesRegAPI, normalizeGLNData, commercialRegistrySearchAPI } from '../../../services/utils/gln';
import { FiLoader, FiAlertCircle, FiCheck, FiFileText, FiInfo, FiExternalLink } from 'react-icons/fi';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../services/services/firebase';
import { processAndSaveProfessional, saveOrganizationProfile } from '../../../services/utils/profile';
import { saveGLNVerificationAudit } from '../../../services/utils/audit';
import { processDocumentWithAI } from '../../../services/utils/document';
import { uploadDocument } from '../../../services/utils/upload';
import { getMimeType } from '../../../services/utils/document';
import PersonnalizedInputField from '../../../components/boxedInputFields/personnalizedInputField';
import SimpleDropdown from '../../../components/boxedInputFields/dropdownField';
import UploadFile from '../../../components/boxedInputFields/uploadFile';
import BoxedSwitchField from '../../../components/boxedInputFields/BoxedSwitchField';
import modal from '../../../components/modals/modals';
import Button from '../../../components/boxedInputFields/button';
import { saveOnboardingData, loadOnboardingData, clearOnboardingData } from '../../../services/utils/storage';
import { FIRESTORE_COLLECTIONS, SESSIONSTORAGE_KEYS } from '../../../config/keysDatabase';
import { useDropdownOptions } from '../../pages/profile/utils/DropdownListsImports';

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

const GLNVerificationStep = React.memo(React.forwardRef(function GLNVerificationStep({ 
    data, 
    saveProgress, 
    next, 
    handleComplete, 
    setIsVerifying 
}, ref) {
    const { t } = useTranslation(['dashboard', 'common', 'dashboardProfile']);
    const { currentUser } = useAuth();
    const { idDocumentTypeOptions, medicalProfessionOptions } = useDropdownOptions();

    const [gln, setGln] = useState('');
    const [profession, setProfession] = useState('');
    const [documentType, setDocumentType] = useState('');
    const [documentFile, setDocumentFile] = useState(null);
    const [commercialNumber, setCommercialNumber] = useState('');
    const [billingFile, setBillingFile] = useState(null);
    const [internalRef, setInternalRef] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [verificationStatus, setVerificationStatus] = useState(null);
    const [verificationError, setVerificationError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [identityProgress, setIdentityProgress] = useState(0);
    const [billingProgress, setBillingProgress] = useState(0);
    const [bypassMode, setBypassMode] = useState(false);
    const [showGLNInfomodal, setShowGLNInfomodal] = useState(false);
    const [showRegistryInfomodal, setShowRegistryInfomodal] = useState(false);
    const [glnInfoProfession, setGlnInfoProfession] = useState('');
    const [isPreVerified, setIsPreVerified] = useState(false);
    const [cannotFindGLN, setCannotFindGLN] = useState(false);

    const isChain = data.role === 'chain';
    const isCompany = data.role === 'company';
    const isWorker = data.role === 'worker';

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
        if (isChain && savedData?.organization) {
            if (savedData.organization.commercialNumber) setCommercialNumber(savedData.organization.commercialNumber);
            if (savedData.organization.documentType) setDocumentType(savedData.organization.documentType);
            if (savedData.organization.internalRef) setInternalRef(savedData.organization.internalRef);
        } else if (savedData?.professional) {
            if (savedData.professional.gln) setGln(savedData.professional.gln);
            if (savedData.professional.profession) setProfession(savedData.professional.profession);
            if (savedData.professional.documentType) setDocumentType(savedData.professional.documentType);
        }
    }, [isChain]);

    useEffect(() => {
        if (isChain) {
            if (commercialNumber || documentType || internalRef) {
                saveOnboardingData({
                    organization: { commercialNumber, documentType, internalRef }
                });
            }
        } else {
            if (gln || profession || documentType) {
                saveOnboardingData({
                    professional: { gln, profession, documentType }
                });
            }
        }
    }, [gln, profession, documentType, commercialNumber, internalRef, isChain]);

    const isReady = React.useMemo(() => {
        if (isPreVerified || (isWorker && bypassMode) || (isWorker && cannotFindGLN)) return true;
        if (isChain) {
            const cleanNumber = commercialNumber.replace(/[^A-Z0-9.-]/g, '');
            if (!cleanNumber || (!cleanNumber.startsWith('CHE-') && !/^CHE\d{3}\.\d{3}\.\d{3}$/.test(cleanNumber))) return false;
            return !!(documentFile && documentType && billingFile);
        }
        if (!profession) return false;
        if (!cannotFindGLN && !gln) return false;
        return !!(documentFile && documentType);
    }, [gln, profession, documentFile, documentType, commercialNumber, billingFile, isPreVerified, bypassMode, cannotFindGLN, isChain, isWorker]);

    const handleVerifyAccount = useCallback(async () => {
        if (isPreVerified) {
            handleComplete?.();
            return;
        }

        if (isChain) {
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
                handleComplete?.();
            } catch (error) {
                console.error('Verification error:', error);
                setVerificationError(error.message || t('dashboard.onboarding.errors.generic_error'));
                setVerificationStatus('error');
            } finally {
                setIsProcessing(false);
            }
        } else {
            if (bypassMode || cannotFindGLN) {
                handleComplete?.();
                return;
            }

            const errors = {};
            if (!profession) errors.profession = t('dashboard.onboarding.errors.profession_required', 'Profession is required');
            if (!cannotFindGLN && !gln) errors.gln = t('dashboard.onboarding.errors.gln_required', 'GLN is required');
            if (!documentType) errors.documentType = t('dashboard.onboarding.errors.missing_document_type');
            if (!documentFile) errors.documentFile = t('dashboard.onboarding.errors.missing_document');

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
                if (gln) {
                    const healthResult = await healthRegistryAPI(gln);
                    if (healthResult.success && healthResult.data?.entries?.length > 0) {
                        glnData = normalizeGLNData(healthResult.data.entries[0], 'healthRegistry');
                    } else {
                        const gesResult = await gesRegAPI(gln);
                        if (gesResult.success && gesResult.data?.entries?.length > 0) {
                            glnData = normalizeGLNData(gesResult.data.entries[0], 'gesReg');
                        }
                    }
                }

                await processAndSaveProfessional(
                    currentUser,
                    profession,
                    glnData,
                    documentFile,
                    documentType,
                    setIdentityProgress,
                    cannotFindGLN
                );

                if (gln) {
                    await saveGLNVerificationAudit(currentUser.uid, gln, glnData, 'professional');
                }

                setVerificationStatus('complete');
                clearOnboardingData();
                sessionStorage.setItem(SESSIONSTORAGE_KEYS.ONBOARDING_VALIDATION_SUCCESS, 'professional');
                
                if (isCompany) {
                    await saveProgress();
                    const result = await next();
                    if (result.complete) {
                        handleComplete();
                    }
                } else {
                    handleComplete?.();
                }
            } catch (error) {
                console.error('Verification error:', error);
                setVerificationError(error.message || t('dashboard.onboarding.errors.generic_error'));
                setVerificationStatus('error');
            } finally {
                setIsProcessing(false);
            }
        }
    }, [gln, profession, documentType, documentFile, commercialNumber, billingFile, currentUser, t, cannotFindGLN, bypassMode, isPreVerified, isChain, isCompany, isWorker, saveProgress, next, handleComplete]);

    React.useImperativeHandle(ref, () => ({
        handleVerify: handleVerifyAccount,
        isReady,
        setShowGLNInfomodal: (show) => {
            setShowGLNInfomodal(show);
            if (show) setGlnInfoProfession(profession);
        }
    }), [isReady, handleVerifyAccount, profession]);

    useEffect(() => { setIsVerifying(isProcessing); }, [isProcessing, setIsVerifying]);

    if (isPreVerified) {
        return (
            <div className="animate-in fade-in zoom-in-95 duration-500 max-w-md mx-auto">
                <header className="text-center mb-10">
                    <div className="w-16 h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <FiCheck className="w-8 h-8" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                        {isChain 
                            ? t('dashboard.onboarding.commercial_registry_verified.title', 'Commercial Registry Verified')
                            : t('dashboard.onboarding.gln_verified.title', 'GLN Verified')
                        }
                    </h2>
                    <p className="text-slate-500 text-base mt-2">
                        {isChain
                            ? t('dashboard.onboarding.commercial_registry_verified.desc', 'Your account is already verified. You can proceed with the onboarding.')
                            : t('dashboard.onboarding.gln_verified.desc', 'Your GLN {{gln}} has been recognized from your professional profile.', { gln: gln })
                        }
                    </p>
                </header>
                <div className="bg-green-50 p-8 rounded-3xl border border-green-200 shadow-inner text-center">
                    <div className="flex items-center justify-center gap-3 text-green-700">
                        <FiCheck className="w-6 h-6" />
                        <span className="text-lg font-bold">
                            {isChain
                                ? t('dashboard.onboarding.commercial_registry_verified.status', 'Organization Confirmed')
                                : t('dashboard.onboarding.gln_verified.status', 'Identity Confirmed')
                            }
                        </span>
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

    if (isChain) {
        return (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
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
                                onClick={() => setShowRegistryInfomodal(true)}
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
                                options={idDocumentTypeOptions}
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

                    <modal
                        isOpen={showRegistryInfomodal}
                        onClose={() => setShowRegistryInfomodal(false)}
                        title={t('dashboard.onboarding.commercial_registry_info.title', 'Where to find your Commercial Registry Number')}
                        messageType="info"
                        size="medium"
                        className="mt-8"
                        actions={
                            <Button variant="primary" onClick={() => setShowRegistryInfomodal(false)}>
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
                    </modal>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <header className="text-center mb-12">
                <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-3 tracking-tight">
                    {t('dashboard.onboarding.step4.title')}
                </h1>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                <div className="bg-gray-50 p-6 md:p-8 rounded-xl border border-gray-200 shadow-sm leading-relaxed flex-grow">
                    <div className="space-y-4 animate-in fade-in duration-300 text-left">
                        <p className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">
                            {isCompany 
                                ? t('dashboard.onboarding.company_gln.title', 'GLN information')
                                : t('dashboard.onboarding.professional_gln.title')
                            }
                        </p>
                        {isWorker && (
                            <div className="text-gray-700 space-y-3 mt-4">
                                <p>{t('dashboard.onboarding.professional_gln.text_new')}</p>
                            </div>
                        )}
                        {isCompany && (
                            <div className="text-gray-700 space-y-3 mt-4">
                                <p>{t('dashboard.onboarding.company_gln.text1', 'The GLN (Global Location Number) is a unique identifier for your facility or company.')}</p>
                                <p>{t('dashboard.onboarding.company_gln.text2', 'Providing your GLN helps us verify your business details automatically and speeds up the verification process.')}</p>
                                <p>{t('dashboard.onboarding.company_gln.text3', 'This field is optional, but recommended for faster account verification.')}</p>
                            </div>
                        )}
                        <div className="mt-4">
                            <a
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setShowGLNInfomodal(true);
                                    setGlnInfoProfession(profession);
                                }}
                                className="text-primary hover:underline font-medium text-sm block"
                            >
                                {isCompany
                                    ? t('dashboard.onboarding.gln_info.where_to_find_facility', 'Where to find your facility GLN?')
                                    : t('dashboard.onboarding.gln_info.where_to_find', 'GLN information')
                                }
                            </a>
                        </div>
                    </div>
                </div>

                <div className="space-y-6 flex flex-col justify-start text-left">
                    <SimpleDropdown
                        label={t('dashboardProfile:profession', 'Profession')}
                        options={medicalProfessionOptions}
                        value={profession}
                        onChange={(v) => {
                            setProfession(v);
                            setFieldErrors(p => ({ ...p, profession: '' }));
                            if (verificationError) setVerificationError('');
                        }}
                        placeholder={t('dashboard.onboarding.profession.select', 'Select your profession')}
                        required
                        error={fieldErrors.profession}
                    />

                    {!bypassMode && !cannotFindGLN && (
                        <PersonnalizedInputField
                            label={t('dashboard.onboarding.input.professional_gln')}
                            required
                            value={gln}
                            onChange={(e) => {
                                setGln(e.target.value);
                                setFieldErrors(p => ({ ...p, gln: '' }));
                                if (verificationError) setVerificationError('');
                            }}
                            error={fieldErrors.gln}
                        />
                    )}

                    {!bypassMode && (
                        <BoxedSwitchField
                            label={t('dashboard.onboarding.gln_info.cannot_find', 'I cannot find my GLN or don\'t have a GLN')}
                            checked={cannotFindGLN}
                            onChange={(checked) => {
                                setCannotFindGLN(checked);
                                if (checked) {
                                    setGln('');
                                    setFieldErrors(p => ({ ...p, gln: '' }));
                                    setVerificationError('');
                                }
                            }}
                        />
                    )}

                    {!bypassMode && (
                        <>
                            <SimpleDropdown
                                label={t('dashboard.onboarding.docs.professional_id', 'Authorization Document')}
                                options={idDocumentTypeOptions}
                                value={documentType}
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
                                progress={identityProgress}
                                isLoading={isProcessing}
                                error={fieldErrors.documentFile}
                                value={documentFile}
                            />
                        </>
                    )}

                    {verificationError && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 animate-in fade-in slide-in-from-top-2">
                            <FiAlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <p className="text-sm font-medium">{verificationError}</p>
                        </div>
                    )}
                </div>
            </div>

            <modal
                isOpen={showGLNInfomodal}
                onClose={() => setShowGLNInfomodal(false)}
                title={t('dashboard.onboarding.gln_info.title', 'Where to find your GLN')}
                messageType="info"
                size="medium"
                style={{ zIndex: 9999 }}
                actions={
                    <Button variant="primary" onClick={() => setShowGLNInfomodal(false)}>
                        {t('common:close', 'Close')}
                    </Button>
                }
            >
                <div className="text-sm text-gray-700">
                    <p className="mb-4">{t('dashboard.onboarding.gln_info.registry_info', 'You can find your GLN number in the official Swiss health registry:')}</p>
                    {glnInfoProfession && (
                        <a
                            href={getGLNWebsiteForProfession(glnInfoProfession)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline font-medium"
                        >
                            {getGLNWebsiteLabelForProfession(glnInfoProfession, t)}
                        </a>
                    )}
                    {!glnInfoProfession && (
                        <a
                            href="https://www.medreg.admin.ch"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline font-medium"
                        >
                            {t('dashboard.onboarding.gln_info.medreg_registry', 'Swiss Medical Registry (MEDREG)')}
                        </a>
                    )}
                </div>
            </modal>
        </div>
    );
}));

GLNVerificationStep.displayName = 'GLNVerificationStep';
export default GLNVerificationStep;
