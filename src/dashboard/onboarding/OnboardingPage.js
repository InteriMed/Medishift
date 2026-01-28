import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/authContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/services/firebase';
import { FIRESTORE_COLLECTIONS } from '../../config/keysDatabase';
import { useTutorial } from '../../TutorialContext';
import { useFlow } from '../../services/flows/engine';
import { OnboardingFlow } from '../../services/flows/catalog/onboarding';
import { completeOnboarding } from '../../services/flows/catalog/onboarding/completion';
import {
    FiBriefcase, FiCheck, FiArrowRight, FiHome,
    FiLoader, FiArrowLeft, FiShield,
    FiLink, FiHelpCircle
} from 'react-icons/fi';
import ContactFormPopup from '../../components/modals/contactFormPopup';
import ProfessionalGLNVerification from './components/professionalGLNVerification';
import FacilityGLNVerification from './components/facilityGLNVerification';
import CommercialRegistryVerification from './components/commercialRegistryVerification';
import PhoneVerificationStep from './components/phoneVerificationStep';
import Switch from '../../components/boxedInputFields/switch';
import Button from '../../components/boxedInputFields/button';
import LoadingSpinner from '../../components/loadingSpinner/loadingSpinner';
import Modal from '../../components/modals/modals';
import styles from './onboardingPage.module.css';

const OnboardingPage = () => {
    const navigate = useNavigate();
    const { lang } = useParams();
    const { t } = useTranslation(['dashboard', 'common', 'auth']);
    const { currentUser } = useAuth();
    const urlQuery = new URLSearchParams(window.location.search);
    const onboardingType = urlQuery.get('type') || 'professional';

    const {
        step,
        index: currentStepIndex,
        totalSteps,
        isFirst,
        isLast,
        data,
        errors,
        isTransitioning,
        next,
        back,
        updateField,
        setFormState,
        progress
    } = useFlow(OnboardingFlow);

    const [isVerifying, setIsVerifying] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoadingProgress, setIsLoadingProgress] = useState(true);
    const [isCreatingProfile, setIsCreatingProfile] = useState(false);
    const [showContactForm, setShowContactForm] = useState(false);
    const [phoneInternalStep, setPhoneInternalStep] = useState(1);
    const [isPhoneValid, setIsPhoneValid] = useState(false);
    const [isPhoneLoading, setIsPhoneLoading] = useState(false);
    const [hasLoadedProgress, setHasLoadedProgress] = useState(false);

    const glnVerificationRef = useRef(null);
    const phoneVerificationRef = useRef(null);

    useEffect(() => {
        const handleUnhandledRejection = (event) => {
            if (event.reason && (
                event.reason.message === 'Request timed out' ||
                event.reason.message === 'Quick read timeout' ||
                event.reason.message === 'Quick retry timed out' ||
                event.reason.message === 'Timeout' ||
                (typeof event.reason === 'string' && event.reason.includes('timeout'))
            )) {
                console.debug('[OnboardingPage] Caught expected timeout error:', event.reason.message);
                event.preventDefault();
                return;
            }
            if (event.reason) {
                console.debug('[OnboardingPage] Unhandled promise rejection (non-critical):', event.reason);
            }
        };

        window.addEventListener('unhandledrejection', handleUnhandledRejection);
        return () => {
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
    }, []);

    useEffect(() => {
        const loadProgress = async () => {
            if (!currentUser || hasLoadedProgress) return;
            try {
                const userDocRef = doc(db, FIRESTORE_COLLECTIONS.USERS, currentUser.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const onboardingProgress = userData.onboardingProgress || {};
                    const typeProgress = onboardingProgress[onboardingType] || {};

                    const forceRestart = urlQuery.get('restart') === 'true';
                    if (typeProgress.completed && !forceRestart) {
                        navigate(`/${lang}/dashboard/profile`);
                        return;
                    }

                    const isPhoneVerifiedInUserDoc = userData.isPhoneVerified === true;
                    const userPhonePrefix = userData.contact?.primaryPhonePrefix || userData.primaryPhonePrefix || '';
                    const userPhoneNumber = userData.contact?.primaryPhone || userData.primaryPhone || '';

                    const savedData = {};
                    if (typeProgress.role) savedData.role = typeProgress.role;
                    if (typeProgress.belongsToFacility !== undefined) savedData.belongsToFacility = typeProgress.belongsToFacility;
                    if (typeProgress.legalConsiderationsConfirmed !== undefined) savedData.legalConsiderationsConfirmed = typeProgress.legalConsiderationsConfirmed;

                    if (isPhoneVerifiedInUserDoc) {
                        savedData.phoneVerified = true;
                        setPhoneInternalStep(3);
                        if (userPhonePrefix && userPhoneNumber) {
                            savedData.phoneData = {
                                phoneNumber: `${userPhonePrefix} ${userPhoneNumber}`,
                                verified: true
                            };
                        }
                    } else if (typeProgress.phoneVerified !== undefined) {
                        savedData.phoneVerified = typeProgress.phoneVerified;
                        if (typeProgress.phoneVerified) {
                            setPhoneInternalStep(3);
                        }
                        if (typeProgress.phoneData) savedData.phoneData = typeProgress.phoneData;
                    }

                    if (Object.keys(savedData).length > 0) {
                        setFormState(savedData);
                    }
                }
                setHasLoadedProgress(true);
            } catch (err) { 
                console.error(err); 
            }
            setIsLoadingProgress(false);
        };
        loadProgress();
    }, [currentUser, onboardingType, navigate, lang]);

    const saveProgress = async (additionalData = {}) => {
        if (!currentUser) return;
        try {
            const userDocRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userDocRef, {
                [`onboardingProgress.${onboardingType}`]: { 
                    ...data, 
                    ...additionalData,
                    step: step.id,
                    updatedAt: new Date() 
                },
                updatedAt: new Date()
            });
        } catch (err) { 
            console.error(err); 
        }
    };

    const handleNext = async () => {
        if (step.id === 'phone') {
            if (data.phoneVerified) {
                const result = await next();
                if (!result.complete) {
                    await saveProgress();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    handleComplete();
                }
                return;
            }

            if (phoneInternalStep === 1) {
                setIsPhoneLoading(true);
                if (phoneVerificationRef.current) {
                    phoneVerificationRef.current.handleSendCode().finally(() => {
                        setIsPhoneLoading(false);
                    });
                } else {
                    setIsPhoneLoading(false);
                }
                return;
            } else if (phoneInternalStep === 2) {
                setIsPhoneLoading(true);
                if (phoneVerificationRef.current) {
                    phoneVerificationRef.current.handleVerifyCode().finally(() => {
                        setIsPhoneLoading(false);
                    });
                } else {
                    setIsPhoneLoading(false);
                }
                return;
            }
        }

        const result = await next();
        if (!result.complete) {
            await saveProgress();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            handleComplete();
        }
    };

    const handleBack = async () => {
        if (step.id === 'gln_professional' && data.phoneVerified) {
            setPhoneInternalStep(3);
        }
        if (step.id === 'phone' && phoneInternalStep === 2) {
            setPhoneInternalStep(1);
            return;
        }
        back();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleComplete = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            if (currentUser) {
                const result = await completeOnboarding(
                    currentUser.uid,
                    data,
                    onboardingType
                );

                if (result.workspaceCreated && result.workspaceId) {
                    if (result.workspaceId === 'personal') {
                        navigate(`/${lang}/dashboard/personal/overview`);
                    } else {
                        navigate(`/${lang}/dashboard/${result.workspaceId}/overview`);
                    }
                } else {
                    navigate(`/${lang}/dashboard/profile`);
                }

                return;
                
                const userDocRef = doc(db, FIRESTORE_COLLECTIONS.USERS, currentUser.uid);
                const userDoc = await getDoc(userDocRef);
                const userData = userDoc.exists() ? userDoc.data() : {};

                await updateDoc(userDocRef, {
                    [`onboardingProgress.${onboardingType}`]: { 
                        completed: true, 
                        role: data.role, 
                        completedAt: new Date() 
                    },
                    ...(onboardingType === 'professional' ? { onboardingCompleted: true } : {}),
                    updatedAt: new Date()
                });

                const profileCollection = onboardingType === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
                const profileDocRef = doc(db, profileCollection, currentUser.uid);
                const profileDoc = await getDoc(profileDocRef);
                
                if (!profileDoc.exists() && onboardingType === 'facility' && data.role === 'company') {
                    const { httpsCallable } = await import('firebase/functions');
                    const { functions } = await import('../../services/firebase');
                    const updateProfile = httpsCallable(functions, 'updateUserProfile');
                    
                    const facilityData = {
                        role: 'facility',
                        profileType: 'pharmacy',
                        userId: currentUser.uid,
                        email: currentUser.email,
                        facilityDetails: {
                            name: userData.firstName || userData.displayName || 'New Facility',
                            additionalName: null,
                            operatingAddress: {
                                street: '',
                                city: '',
                                postalCode: '',
                                canton: '',
                                country: 'CH'
                            },
                            glnCompany: null,
                            responsiblePersons: []
                        },
                        responsiblePersonIdentity: {
                            firstName: userData.firstName || '',
                            lastName: userData.lastName || '',
                            dateOfBirth: null,
                            nationality: null,
                            gender: null,
                            documentType: null,
                            documentNumber: null,
                            documentExpiry: null,
                            residentialAddress: null
                        },
                        identityLegal: {
                            legalCompanyName: userData.firstName || userData.displayName || 'New Facility',
                            uidNumber: null
                        },
                        billingInformation: {
                            legalName: userData.firstName || userData.displayName || 'New Facility',
                            uidNumber: null,
                            billingAddress: {
                                street: '',
                                city: '',
                                postalCode: '',
                                canton: '',
                                country: 'CH'
                            },
                            invoiceEmail: currentUser.email || '',
                            internalRef: '',
                            verificationStatus: 'pending'
                        },
                        contact: {
                            primaryEmail: currentUser.email || '',
                            primaryPhone: userData.primaryPhone || '',
                            primaryPhonePrefix: userData.primaryPhonePrefix || ''
                        },
                        verification: {
                            identityStatus: 'not_verified',
                            billingStatus: 'not_verified',
                            overallVerificationStatus: 'not_verified',
                            verificationDocuments: []
                        },
                        employees: [{
                            user_uid: currentUser.uid,
                            roles: ['admin']
                        }],
                        facilityProfileId: currentUser.uid,
                        facilityName: userData.firstName || userData.displayName || 'New Facility',
                        subscriptionTier: 'free'
                    };

                    await updateProfile(facilityData);

                    const existingRoles = userData.roles || [];
                    const updatedRoles = existingRoles.filter(r => r.facility_uid !== currentUser.uid);
                    updatedRoles.push({
                        facility_uid: currentUser.uid,
                        roles: ['admin']
                    });

                    await updateDoc(userDocRef, {
                        roles: updatedRoles,
                        updatedAt: new Date()
                    });
                }

                const finalProfileDoc = await getDoc(profileDocRef);
                if (finalProfileDoc.exists()) {
                    await updateDoc(profileDocRef, {
                        updatedAt: new Date()
                    });
                }
            }
            navigate(`/${lang}/dashboard/profile`);
        } catch (err) {
            console.error('Error completing onboarding:', err);
            setIsProcessing(false);
        }
    };

    if (isLoadingProgress) return <LoadingSpinner />;

    const canProceed = () => {
        if (step.id === 'role') return !!data.role;
        if (step.id === 'legal') return data.legalConsiderationsConfirmed === true;
        if (step.id === 'phone') {
            if (data.phoneVerified) return true;
            const isValid = phoneInternalStep === 1 ? isPhoneValid : true;
            return isValid;
        }
        return true;
    };

    const getStepNumber = () => {
        return currentStepIndex + 1;
    };

    return (
        <div className={styles.container}>
            {isCreatingProfile && (
                <div className={styles.loadingOverlay}>
                    <div className={styles.loadingContent}>
                        <LoadingSpinner size="medium" color="primary" />
                        <p className={styles.loadingText}>
                            Creating your profile...
                        </p>
                    </div>
                </div>
            )}
            
            <button
                onClick={() => setShowContactForm(true)}
                className={styles.helpButton}
                aria-label={t('common:header.help', 'Help')}
                title={t('common:header.help', 'Help')}
            >
                <FiHelpCircle className="w-5 h-5" />
            </button>

            <ContactFormPopup
                isOpen={showContactForm}
                onClose={() => setShowContactForm(false)}
            />

            <div className={`${styles.content} ${(step.id === 'legal' || step.id === 'gln_professional' || step.id === 'gln_facility' || step.id === 'commercial_registry') ? styles.contentWide : ''} ${(step.id === 'role' || step.id === 'phone') ? styles.contentNarrow : ''}`}>
                <div className={styles.stepIndicator}>
                    {Array.from({ length: totalSteps }, (_, i) => i + 1).map(s => (
                        <div key={s} className="flex items-center gap-2">
                            <div
                                className={`${styles.stepCircle} ${getStepNumber() >= s ? styles.stepCircleActive : styles.stepCircleInactive}`}
                            >
                                {getStepNumber() > s ? <FiCheck /> : s}
                            </div>
                            {s < totalSteps && (
                                <div className={`${styles.stepConnector} ${getStepNumber() > s ? styles.stepConnectorActive : styles.stepConnectorInactive}`} />
                            )}
                        </div>
                    ))}
                </div>

                <div className={`${styles.stepContent} ${isTransitioning ? styles.stepContentTransitioning : styles.stepContentVisible}`}>
                    {isVerifying && (
                        <div className={styles.verifyingOverlay}>
                            <div className={styles.verifyingSpinner} />
                            <p className={styles.verifyingText}>
                                Verifying...
                            </p>
                        </div>
                    )}
                    
                    {step.id === 'role' && (
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <header className={styles.header}>
                                <h1 className={styles.title}>{t('dashboard.onboarding.step2.title')}</h1>
                                <p className={styles.description}>{t('dashboard.onboarding.step2.description')}</p>
                            </header>

                            <div className={styles.roleGrid}>
                                {[
                                    { id: 'worker', title: t('dashboard.onboarding.step2.professional'), desc: t('dashboard.onboarding.step2.professionalDescription'), icon: <FiBriefcase /> },
                                    { id: 'company', title: t('dashboard.onboarding.step2.facility'), desc: t('dashboard.onboarding.step2.facilityDescription'), icon: <FiHome /> },
                                    { id: 'chain', title: t('dashboard.onboarding.step2.organization'), desc: t('dashboard.onboarding.step2.organizationDescription'), icon: <FiLink /> }
                                ].filter(r => onboardingType === 'facility' ? r.id !== 'worker' : true).map(r => (
                                    <div
                                        key={r.id}
                                        onClick={async () => {
                                            updateField('role', r.id);
                                            await saveProgress({ role: r.id });
                                        }}
                                        className={`${styles.roleCard} ${data.role === r.id ? styles.roleCardSelected : styles.roleCardUnselected}`}
                                    >
                                        <div className={`${styles.roleIcon} ${data.role === r.id ? styles.roleIconSelected : styles.roleIconUnselected}`}>
                                            {React.cloneElement(r.icon, { className: "w-8 h-8" })}
                                        </div>
                                        <div className={styles.roleContent}>
                                            <h3 className={styles.roleTitle}>{r.title}</h3>
                                            <p className={styles.roleDescription}>{r.desc}</p>
                                        </div>
                                        <div
                                            className={`${styles.roleCheckbox} ${data.role === r.id ? styles.roleCheckboxSelected : styles.roleCheckboxUnselected}`}
                                            style={{
                                                width: '24px',
                                                height: '24px',
                                                minWidth: '24px',
                                                minHeight: '24px',
                                                maxWidth: '24px',
                                                maxHeight: '24px',
                                                aspectRatio: '1',
                                                boxSizing: 'border-box'
                                            }}
                                        >
                                            {data.role === r.id && <FiCheck className="text-primary-foreground w-4 h-4" />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {errors.role && <p className="text-red-500 mt-2">{errors.role}</p>}
                        </div>
                    )}

                    {step.id === 'legal' && (
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <header className={styles.header}>
                                <h1 className={styles.title}>{t('dashboard.onboarding.step1.title')}</h1>
                            </header>

                            <div className={styles.legalGrid}>
                                <div className={styles.legalInfoCard}>
                                    {data.belongsToFacility ? (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <p className={styles.legalInfoTitle}>{t('dashboard.onboarding.step1.facilityLegalNotice')}</p>
                                            <div className={styles.legalInfoText}>
                                                <p>{t('dashboard.onboarding.step1.facilityLegalText1')}</p>
                                                <p>{t('dashboard.onboarding.step1.facilityLegalText2')}</p>
                                                <p>{t('dashboard.onboarding.step1.facilityLegalText3')}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <p className={styles.legalInfoTitle}>{t('dashboard.onboarding.step1.professionalLegalNotice')}</p>
                                            <div className={styles.legalInfoText}>
                                                <p>{t('dashboard.onboarding.step1.professionalLegalText1')}</p>
                                                <p>{t('dashboard.onboarding.step1.professionalLegalText2')}</p>
                                                <p>{t('dashboard.onboarding.step1.professionalLegalText3')}</p>
                                                <p>{t('dashboard.onboarding.step1.professionalLegalText4')}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className={styles.legalOptions}>
                                    {data.role === 'worker' && (
                                        <div
                                            className={`${styles.legalOptionCard} ${data.belongsToFacility ? styles.legalOptionCardSelected : styles.legalOptionCardUnselected}`}
                                            onClick={(e) => {
                                                if (!e.target.closest('.switch-wrapper')) {
                                                    updateField('belongsToFacility', !data.belongsToFacility);
                                                }
                                            }}
                                        >
                                            <div className={styles.legalOptionContent}>
                                                <div 
                                                    className={`${styles.legalOptionIcon} ${data.belongsToFacility ? styles.legalOptionIconSelected : styles.legalOptionIconUnselected}`}
                                                >
                                                    <FiHome className="w-7 h-7" />
                                                </div>
                                                <div>
                                                    <h3 className={styles.legalOptionTitle}>{t('dashboard.onboarding.step1.areYouEmployed')}</h3>
                                                    <p className={styles.legalOptionDescription}>{t('dashboard.onboarding.step1.areYouEmployedDescription')}</p>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={data.belongsToFacility || false}
                                                onChange={(val) => updateField('belongsToFacility', val)}
                                                switchColor="var(--color-logo-1)"
                                                marginBottom="0"
                                            />
                                        </div>
                                    )}

                                    <div
                                        className={`${styles.legalOptionCard} ${data.legalConsiderationsConfirmed ? styles.legalOptionCardSelected : styles.legalOptionCardUnselected}`}
                                        onClick={(e) => {
                                            if (!e.target.closest('.switch-wrapper') && !e.target.closest('a')) {
                                                updateField('legalConsiderationsConfirmed', !data.legalConsiderationsConfirmed);
                                            }
                                        }}
                                    >
                                        <div className={styles.legalOptionContent}>
                                            <div 
                                                className={`${styles.legalOptionIcon} ${data.legalConsiderationsConfirmed ? styles.legalOptionIconSelected : styles.legalOptionIconUnselected}`}
                                            >
                                                <FiShield className="w-7 h-7" />
                                            </div>
                                            <div>
                                                <h3 className={styles.legalOptionTitle}>{t('dashboard.onboarding.step1.termsAcceptance')}</h3>
                                                <p className={styles.legalOptionDescription}>
                                                    {t('dashboard.onboarding.step1.termsAcceptanceText')}{' '}
                                                    <a 
                                                        href={`/${lang}/terms-of-service`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="text-primary hover:text-primary/80 underline font-medium"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {t('dashboard.onboarding.step1.termsOfService')}
                                                    </a>
                                                </p>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={data.legalConsiderationsConfirmed || false}
                                            onChange={(val) => updateField('legalConsiderationsConfirmed', val)}
                                            switchColor="var(--color-logo-1)"
                                            marginBottom="0"
                                        />
                                    </div>

                                    <div className={styles.legalNote}>
                                        {t('dashboard.onboarding.step1.note')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step.id === 'phone' && (
                        <PhoneVerificationStep
                            ref={phoneVerificationRef}
                            onComplete={async (phoneData) => {
                                const wasAlreadyVerified = data.phoneVerified;
                                updateField('phoneData', phoneData);
                                updateField('phoneVerified', true);

                                if (currentUser && phoneData.verified) {
                                    try {
                                        const phoneParts = phoneData.phoneNumber.split(' ');
                                        const phonePrefix = phoneParts[0] || '';
                                        const phoneNumber = phoneParts.slice(1).join(' ') || '';

                                        const userDocRef = doc(db, FIRESTORE_COLLECTIONS.USERS, currentUser.uid);
                                        await updateDoc(userDocRef, {
                                            'contact.primaryPhonePrefix': phonePrefix,
                                            'contact.primaryPhone': phoneNumber,
                                            'primaryPhonePrefix': phonePrefix,
                                            'primaryPhone': phoneNumber,
                                            isPhoneVerified: true,
                                            phoneVerifiedAt: new Date(),
                                            updatedAt: new Date()
                                        });
                                    } catch (err) {
                                        console.error('Error saving phone verification:', err);
                                    }
                                }

                                await saveProgress({ phoneVerified: true, phoneData });

                                if (!wasAlreadyVerified) {
                                    const result = await next();
                                    if (result.complete) {
                                        handleComplete();
                                    }
                                }
                            }}
                            onStepChange={setPhoneInternalStep}
                            onValidationChange={setIsPhoneValid}
                            initialPhoneNumber={currentUser?.phoneNumber}
                            isVerified={data.phoneVerified || false}
                        />
                    )}

                    {step.id === 'gln_professional' && (
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <header className={styles.header}>
                                <h1 className={styles.title}>{t('dashboard.onboarding.step4.title')}</h1>
                            </header>

                            <div className={styles.verificationGrid}>
                                <div className={styles.verificationInfoCard}>
                                    <div className="space-y-4 animate-in fade-in duration-300 text-left">
                                        <p className={styles.verificationInfoTitle}>
                                            {t('dashboard.onboarding.professional_gln.title')}
                                        </p>
                                        {data.role === 'company' || data.role === 'chain' ? (
                                            <div className={styles.verificationInfoText}>
                                                <p>{t('dashboard.onboarding.step4.company_description')}</p>
                                            </div>
                                        ) : data.role === 'worker' ? (
                                            <div className={styles.verificationInfoText}>
                                                <p>{t('dashboard.onboarding.professional_gln.text_new')}</p>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>

                                <div className={styles.verificationForm}>
                                    <div className="pt-2">
                                        <ProfessionalGLNVerification
                                            ref={glnVerificationRef}
                                            hideInfo={true}
                                            onComplete={async () => {
                                                if (data.role === 'company' || data.role === 'chain') {
                                                    await saveProgress();
                                                    const result = await next();
                                                    if (result.complete) {
                                                        handleComplete();
                                                    }
                                                } else {
                                                    handleComplete();
                                                }
                                            }}
                                            onReadyChange={(isReady) => {}}
                                            onProcessingChange={(processing) => setIsVerifying(processing)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step.id === 'gln_facility' && (
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <header className={styles.header}>
                                <h1 className={styles.title}>{t('dashboard.onboarding.step5.title')}</h1>
                            </header>

                            <div className={styles.verificationGrid}>
                                <div className={styles.verificationInfoCard}>
                                    <div className="space-y-4 animate-in fade-in duration-300 text-left">
                                        <p className={styles.verificationInfoTitle}>
                                            {t('dashboard.onboarding.company_gln.title')}
                                        </p>
                                        <p className="text-foreground font-medium">{t('dashboard.onboarding.step5.description')}</p>
                                        <div className={styles.verificationInfoText}>
                                            <p>{t('dashboard.onboarding.company_gln.text1')}</p>
                                            <p>{t('dashboard.onboarding.company_gln.text2')}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.verificationForm}>
                                    <div className="pt-2">
                                        <FacilityGLNVerification
                                            ref={glnVerificationRef}
                                            mode="facilityInfo"
                                            hideInfo={true}
                                            onComplete={handleComplete}
                                            onReadyChange={(isReady) => {}}
                                            onProcessingChange={(processing) => setIsVerifying(processing)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step.id === 'commercial_registry' && (
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <header className={styles.header}>
                                <h1 className={styles.title}>{t('dashboard.onboarding.step5.title')}</h1>
                            </header>

                            <div className={styles.verificationGrid}>
                                <div className={styles.verificationInfoCard}>
                                    <div className="space-y-4 animate-in fade-in duration-300 text-left">
                                        <p className={styles.verificationInfoTitle}>
                                            {t('dashboard.onboarding.commercial_registry.title', 'Commercial Registry Verification')}
                                        </p>
                                        <p className="text-foreground font-medium">{t('dashboard.onboarding.commercial_registry.description', 'Please provide your commercial registry number to verify your organization.')}</p>
                                        <div className={styles.verificationInfoText}>
                                            <p>{t('dashboard.onboarding.commercial_registry.text1', 'Please provide your commercial registry number (UID/CHE) to verify your organization.')}</p>
                                            <p>{t('dashboard.onboarding.commercial_registry.text2', 'This number can be found in the Geneva commercial registry.')}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.verificationForm}>
                                    <div className="pt-2">
                                        <CommercialRegistryVerification
                                            ref={glnVerificationRef}
                                            mode="organizationInfo"
                                            hideInfo={true}
                                            onComplete={handleComplete}
                                            onReadyChange={(isReady) => {}}
                                            onProcessingChange={(processing) => setIsVerifying(processing)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <footer className={`${styles.footer} ${isTransitioning ? styles.footerHidden : ''}`}>
                    <Button
                        onClick={handleBack}
                        variant="secondary"
                        className={`w-full sm:!w-[180px] h-14 rounded-xl font-semibold transition-all ${isFirst ? 'opacity-0 pointer-events-none' : ''}`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <FiArrowLeft className="w-5 h-5" /> {t('dashboard.onboarding.buttons.back')}
                        </div>
                    </Button>

                    <div className="flex items-center w-full sm:w-auto">
                        {step.id === 'phone' ? (
                            <Button
                                id={phoneInternalStep === 1 ? 'send-code-button' : undefined}
                                onClick={handleNext}
                                disabled={!canProceed() || isProcessing || isPhoneLoading}
                                className="w-full sm:!w-[200px] h-14 rounded-xl font-semibold shadow-md flex items-center justify-center gap-2"
                            >
                                {data.phoneVerified ? (
                                    <>
                                        <span>{t('dashboard.onboarding.buttons.nextStep')}</span>
                                        <FiArrowRight className="w-5 h-5" />
                                    </>
                                ) : phoneInternalStep === 1 ? (
                                    <>
                                        {isPhoneLoading ? (
                                            <>
                                                <FiLoader className="w-5 h-5 animate-spin" />
                                                <span>{t('dashboard.onboarding.buttons.sending', 'Sending...')}</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>{t('dashboard.onboarding.buttons.sendCode')}</span>
                                                <FiArrowRight className="w-5 h-5" />
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {isPhoneLoading ? (
                                            <>
                                                <FiLoader className="w-5 h-5 animate-spin" />
                                                <span>{t('dashboard.onboarding.buttons.verifying', 'Verifying...')}</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>{t('dashboard.onboarding.buttons.validate')}</span>
                                                <FiCheck className="w-5 h-5" />
                                            </>
                                        )}
                                    </>
                                )}
                            </Button>
                        ) : (step.id === 'gln_professional' || step.id === 'gln_facility' || step.id === 'commercial_registry') ? (
                            <Button
                                onClick={() => {
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                    if (glnVerificationRef.current?.handleVerify) {
                                        glnVerificationRef.current.handleVerify();
                                    }
                                }}
                                disabled={isProcessing}
                                className="w-full sm:!w-[240px] h-14 rounded-xl font-semibold shadow-md flex items-center justify-center gap-3"
                            >
                                {isVerifying ? <FiLoader className="animate-spin" /> : <FiCheck />}
                                {isVerifying ? t('dashboard.onboarding.buttons.verifying') : (isLast ? t('dashboard.onboarding.buttons.completeAccount') : t('dashboard.onboarding.buttons.nextStep'))}
                            </Button>
                        ) : (
                            <Button
                                onClick={handleNext}
                                disabled={!canProceed() || isProcessing}
                                className="w-full sm:!w-[180px] h-14 rounded-xl font-semibold shadow-md flex items-center justify-center gap-2"
                            >
                                <span>{t('dashboard.onboarding.buttons.nextStep')}</span>
                                <FiArrowRight className="w-5 h-5" />
                            </Button>
                        )}
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default OnboardingPage;

