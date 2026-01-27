import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { FIRESTORE_COLLECTIONS } from '../../config/keysDatabase';
import { useTutorial } from '../contexts/TutorialContext';
import {
    FiBriefcase, FiCheck, FiArrowRight, FiHome,
    FiLoader, FiArrowLeft, FiShield,
    FiLink, FiHelpCircle
} from 'react-icons/fi';
import ContactFormPopup from '../../components/ContactFormPopup/ContactFormPopup';
import ProfessionalGLNVerification from './components/ProfessionalGLNVerification';
import FacilityGLNVerification from './components/FacilityGLNVerification';
import CommercialRegistryVerification from './components/CommercialRegistryVerification';
import PhoneVerificationStep from './components/PhoneVerificationStep';
import Switch from '../../components/BoxedInputFields/Switch';
import Button from '../../components/BoxedInputFields/Button';
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner';
import BarsLoader from '../../components/LoadingAnimations/BarsLoader';
import Dialog from '../../components/Dialog/Dialog';
import styles from './OnboardingPage.module.css';

const OnboardingPage = () => {
    const navigate = useNavigate();
    const { lang } = useParams();
    const { t } = useTranslation(['dashboard', 'common', 'auth']);
    const { currentUser } = useAuth();
    const { onboardingType: contextOnboardingType } = useTutorial();

    const query = new URLSearchParams(window.location.search);
    const onboardingType = contextOnboardingType || query.get('type') || 'professional';

    const [step, setStep] = useState(1);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [role, setRole] = useState(onboardingType === 'facility' ? 'company' : null);
    const [belongsToFacility, setBelongsToFacility] = useState(false);
    const [phoneVerified, setPhoneVerified] = useState(false);
    const [phoneData, setPhoneData] = useState({ phoneNumber: '', verified: false });
    const [legalConsiderationsConfirmed, setLegalConsiderationsConfirmed] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoadingProgress, setIsLoadingProgress] = useState(true);
    const [chainPhonePrefix, setChainPhonePrefix] = useState('');
    const [chainPhoneNumber, setChainPhoneNumber] = useState('');
    const [showRestrictedServicesModal, setShowRestrictedServicesModal] = useState(false);
    const [isCreatingProfile, setIsCreatingProfile] = useState(false);
    const [showContactForm, setShowContactForm] = useState(false);

    // Internal Phone State
    const [phoneInternalStep, setPhoneInternalStep] = useState(1);
    const [isPhoneValid, setIsPhoneValid] = useState(false);
    const [isPhoneLoading, setIsPhoneLoading] = useState(false);

    const glnVerificationRef = useRef(null);
    const phoneVerificationRef = useRef(null);

    // Handle unhandled promise rejections during onboarding
    useEffect(() => {
        const handleUnhandledRejection = (event) => {
            // Silently handle timeout errors - they're expected during onboarding
            if (event.reason && (
                event.reason.message === 'Request timed out' ||
                event.reason.message === 'Quick read timeout' ||
                event.reason.message === 'Quick retry timed out' ||
                event.reason.message === 'Timeout' ||
                (typeof event.reason === 'string' && event.reason.includes('timeout'))
            )) {
                console.debug('[OnboardingPage] Caught expected timeout error:', event.reason.message);
                event.preventDefault(); // Prevent uncaught error
                return;
            }
            // Log other unhandled rejections for debugging but don't break the flow
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
            if (!currentUser) return;
            try {
                const userDocRef = doc(db, FIRESTORE_COLLECTIONS.USERS, currentUser.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const onboardingProgress = userData.onboardingProgress || {};
                    const typeProgress = onboardingProgress[onboardingType] || {};

                    const forceRestart = query.get('restart') === 'true';
                    if (typeProgress.completed && !forceRestart) {
                        navigate(`/${lang}/dashboard/profile`);
                        return;
                    }

                    const isPhoneVerifiedInUserDoc = userData.isPhoneVerified === true;
                    const userPhonePrefix = userData.contact?.primaryPhonePrefix || userData.primaryPhonePrefix || '';
                    const userPhoneNumber = userData.contact?.primaryPhone || userData.primaryPhone || '';

                    if (Object.keys(typeProgress).length > 0) {
                        if (typeProgress.step) setStep(typeProgress.step);
                        if (typeProgress.role) setRole(typeProgress.role);
                        if (typeProgress.belongsToFacility !== undefined) setBelongsToFacility(typeProgress.belongsToFacility);
                        if (typeProgress.legalConsiderationsConfirmed !== undefined) setLegalConsiderationsConfirmed(typeProgress.legalConsiderationsConfirmed);
                        if (typeProgress.chainPhonePrefix) setChainPhonePrefix(typeProgress.chainPhonePrefix);
                        if (typeProgress.chainPhoneNumber) setChainPhoneNumber(typeProgress.chainPhoneNumber);
                    }

                    if (isPhoneVerifiedInUserDoc) {
                        setPhoneVerified(true);
                        setPhoneInternalStep(3);
                        if (userPhonePrefix && userPhoneNumber) {
                            setPhoneData({
                                phoneNumber: `${userPhonePrefix} ${userPhoneNumber}`,
                                verified: true
                            });
                        }
                    } else if (typeProgress.phoneVerified !== undefined) {
                        setPhoneVerified(typeProgress.phoneVerified);
                        if (typeProgress.phoneVerified) {
                            setPhoneInternalStep(3);
                        }
                        if (typeProgress.phoneData) setPhoneData(typeProgress.phoneData);
                    }
                }
            } catch (err) { console.error(err); }
            setIsLoadingProgress(false);
        };
        loadProgress();
    }, [currentUser, onboardingType, navigate, lang, query]);

    const saveProgress = async (data) => {
        if (!currentUser) return;
        try {
            const userDocRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userDocRef, {
                [`onboardingProgress.${onboardingType}`]: { ...data, updatedAt: new Date() },
                updatedAt: new Date()
            });
        } catch (err) { console.error(err); }
    };

    const handleNext = async () => {
        if (step === 3) {
            if (phoneVerified) {
                const maxStep = (role === 'company' || role === 'chain') ? 5 : 4;
                if (step < maxStep) {
                    transitionToStep(step + 1);
                    await saveProgress({ step: step + 1, role, belongsToFacility, phoneVerified, phoneData, legalConsiderationsConfirmed });
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

        const maxStep = (role === 'company' || role === 'chain') ? 5 : 4;
        if (step < maxStep) {
            transitionToStep(step + 1);
            await saveProgress({ step: step + 1, role, belongsToFacility, phoneVerified, phoneData, legalConsiderationsConfirmed });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            handleComplete();
        }
    };

    const transitionToStep = (newStep) => {
        const isResizing = step === 1 || newStep === 1;

        // Phase 1: Fade Out content
        setIsTransitioning(true);

        // Wait for fade out (300ms)
        setTimeout(() => {
            // Phase 2: Change content & trigger container resize
            setStep(newStep);

            if (isResizing) {
                // Wait for the 300ms container resize animation
                setTimeout(() => {
                    // Phase 3: Fade In new content
                    setIsTransitioning(false);
                }, 300);
            } else {
                // Short jump for non-resizing steps
                setTimeout(() => {
                    setIsTransitioning(false);
                }, 50);
            }
        }, 300);
    };

    const handleBack = async () => {
        if (step > 1) {
            if (step === 4 && phoneVerified) {
                setPhoneInternalStep(3);
                transitionToStep(3);
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
            if (step === 3 && phoneInternalStep === 2) {
                setPhoneInternalStep(1);
                return;
            }
            transitionToStep(step - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleComplete = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            if (currentUser) {
                const userDocRef = doc(db, FIRESTORE_COLLECTIONS.USERS, currentUser.uid);
                const userDoc = await getDoc(userDocRef);
                const userData = userDoc.exists() ? userDoc.data() : {};

                await updateDoc(userDocRef, {
                    [`onboardingProgress.${onboardingType}`]: { completed: true, role, completedAt: new Date() },
                    ...(onboardingType === 'professional' ? { onboardingCompleted: true } : {}),
                    updatedAt: new Date()
                });

                const profileCollection = onboardingType === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
                const profileDocRef = doc(db, profileCollection, currentUser.uid);
                const profileDoc = await getDoc(profileDocRef);
                
                if (!profileDoc.exists() && onboardingType === 'facility' && role === 'company') {
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
                        shouldStartTutorial: true,
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
        if (step === 1) return !!role;
        if (step === 2) return legalConsiderationsConfirmed;
        if (step === 3) {
            if (phoneVerified) return true;
            const isValid = phoneInternalStep === 1 ? isPhoneValid : true;
            return isValid;
        }
        return true;
    };

    return (
        <div className={styles.container}>
            {isCreatingProfile && (
                <div className={styles.loadingOverlay}>
                    <div className={styles.loadingContent}>
                        <BarsLoader size="medium" color="primary" />
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

            <div className={`${styles.content} ${(step === 2 || step === 4) ? styles.contentWide : ''} ${(step === 1 || step === 3) ? styles.contentNarrow : ''}`}>
                <div className={styles.stepIndicator}>
                    {[1, 2, 3, 4, 5].filter(s => {
                        if (role === 'chain') return s <= 3;
                        if (role === 'company') return s <= 5;
                        return s <= 4;
                    }).map(s => (
                        <div key={s} className="flex items-center gap-2">
                            <div
                                className={`${styles.stepCircle} ${step >= s ? styles.stepCircleActive : styles.stepCircleInactive}`}
                            >
                                {step > s ? <FiCheck /> : s}
                            </div>
                            {s < (role === 'chain' ? 3 : role === 'company' ? 5 : 4) && (
                                <div className={`${styles.stepConnector} ${step > s ? styles.stepConnectorActive : styles.stepConnectorInactive}`} />
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
                    {step === 1 && (
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
                                        onClick={() => setRole(r.id)}
                                        className={`${styles.roleCard} ${role === r.id ? styles.roleCardSelected : styles.roleCardUnselected}`}
                                    >
                                        <div className={`${styles.roleIcon} ${role === r.id ? styles.roleIconSelected : styles.roleIconUnselected}`}>
                                            {React.cloneElement(r.icon, { className: "w-8 h-8" })}
                                        </div>
                                        <div className={styles.roleContent}>
                                            <h3 className={styles.roleTitle}>{r.title}</h3>
                                            <p className={styles.roleDescription}>{r.desc}</p>
                                        </div>
                                        <div
                                            className={`${styles.roleCheckbox} ${role === r.id ? styles.roleCheckboxSelected : styles.roleCheckboxUnselected}`}
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
                                            {role === r.id && <FiCheck className="text-primary-foreground w-4 h-4" />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <header className={styles.header}>
                                <h1 className={styles.title}>{t('dashboard.onboarding.step1.title')}</h1>
                            </header>

                            <div className={styles.legalGrid}>
                                <div className={styles.legalInfoCard}>
                                    {belongsToFacility ? (
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
                                    {role === 'worker' && (
                                        <div
                                            className={`${styles.legalOptionCard} ${belongsToFacility ? styles.legalOptionCardSelected : styles.legalOptionCardUnselected}`}
                                            onClick={(e) => {
                                                if (!e.target.closest('.switch-wrapper')) {
                                                    setBelongsToFacility(!belongsToFacility);
                                                }
                                            }}
                                        >
                                            <div className={styles.legalOptionContent}>
                                                <div 
                                                    className={`${styles.legalOptionIcon} ${belongsToFacility ? styles.legalOptionIconSelected : styles.legalOptionIconUnselected}`}
                                                >
                                                    <FiHome className="w-7 h-7" />
                                                </div>
                                                <div>
                                                    <h3 className={styles.legalOptionTitle}>{t('dashboard.onboarding.step1.areYouEmployed')}</h3>
                                                    <p className={styles.legalOptionDescription}>{t('dashboard.onboarding.step1.areYouEmployedDescription')}</p>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={belongsToFacility}
                                                onChange={(val) => setBelongsToFacility(val)}
                                                switchColor="var(--color-logo-1)"
                                                marginBottom="0"
                                            />
                                        </div>
                                    )}

                                    <div
                                        className={`${styles.legalOptionCard} ${legalConsiderationsConfirmed ? styles.legalOptionCardSelected : styles.legalOptionCardUnselected}`}
                                        onClick={(e) => {
                                            if (!e.target.closest('.switch-wrapper') && !e.target.closest('a')) {
                                                setLegalConsiderationsConfirmed(!legalConsiderationsConfirmed);
                                            }
                                        }}
                                    >
                                        <div className={styles.legalOptionContent}>
                                            <div 
                                                className={`${styles.legalOptionIcon} ${legalConsiderationsConfirmed ? styles.legalOptionIconSelected : styles.legalOptionIconUnselected}`}
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
                                            checked={legalConsiderationsConfirmed}
                                            onChange={(val) => setLegalConsiderationsConfirmed(val)}
                                            switchColor="var(--color-logo-1)"
                                            marginBottom="0"
                                        />
                                    </div>

                                    <div className={styles.legalNote}>
                                        {t('dashboard.onboarding.step1.note')}
                                    </div>

                                    {belongsToFacility && role === 'worker' && (
                                        <div 
                                            className={styles.restrictedServicesCard}
                                            onClick={() => setShowRestrictedServicesModal(true)}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="flex-1">
                                                    <h4 className={styles.restrictedServicesTitle}>{t('dashboard.onboarding.step1.restrictedServices.title')}</h4>
                                                    <p className={styles.restrictedServicesDescription}>
                                                        {t('dashboard.onboarding.step1.restrictedServices.description')}
                                                    </p>
                                                </div>
                                                <FiArrowRight className="w-6 h-6 text-destructive flex-shrink-0" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <PhoneVerificationStep
                                ref={phoneVerificationRef}
                                onComplete={async (data) => {
                                    const wasAlreadyVerified = phoneVerified;
                                    setPhoneData(data);
                                    setPhoneVerified(true);

                                    if (currentUser && data.verified) {
                                        try {
                                            const phoneParts = data.phoneNumber.split(' ');
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

                                    await saveProgress({ step: 4, role, belongsToFacility, phoneVerified: true, phoneData: data, legalConsiderationsConfirmed });

                                    if (!wasAlreadyVerified) {
                                        transitionToStep(4);
                                    }
                                }}
                                onStepChange={setPhoneInternalStep}
                                onValidationChange={setIsPhoneValid}
                                initialPhoneNumber={currentUser?.phoneNumber}
                                isVerified={phoneVerified}
                            />
                    )}

                    {step === 4 && role !== 'chain' && (
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
                                        {role === 'company' ? (
                                            <div className={styles.verificationInfoText}>
                                                <p>{t('dashboard.onboarding.step4.company_description')}</p>
                                            </div>
                                        ) : role === 'worker' ? (
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
                                            onComplete={role === 'company' ? async () => {
                                                await saveProgress({ step: 5, role, belongsToFacility, phoneVerified, phoneData, legalConsiderationsConfirmed });
                                                transitionToStep(5);
                                            } : handleComplete}
                                            onReadyChange={(isReady) => { /* Optional */ }}
                                            onProcessingChange={(processing) => setIsVerifying(processing)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 4 && role === 'chain' && (
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
                                        <div className={styles.verificationInfoText}>
                                            <p>{t('dashboard.onboarding.step4.company_description')}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.verificationForm}>
                                    <div className="pt-2">
                                        <ProfessionalGLNVerification
                                            ref={glnVerificationRef}
                                            hideInfo={true}
                                            onComplete={async () => {
                                                await saveProgress({ step: 5, role, belongsToFacility, phoneVerified, phoneData, legalConsiderationsConfirmed });
                                                transitionToStep(5);
                                            }}
                                            onReadyChange={(isReady) => { /* Optional */ }}
                                            onProcessingChange={(processing) => setIsVerifying(processing)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 5 && role === 'company' && (
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
                                            onReadyChange={(isReady) => { /* Optional */ }}
                                            onProcessingChange={(processing) => setIsVerifying(processing)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 5 && role === 'chain' && (
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
                                            onReadyChange={(isReady) => { /* Optional */ }}
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
                        className={`w-full sm:!w-[180px] h-14 rounded-xl font-semibold transition-all ${step === 1 ? 'opacity-0 pointer-events-none' : ''}`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <FiArrowLeft className="w-5 h-5" /> {t('dashboard.onboarding.buttons.back')}
                        </div>
                    </Button>

                    <div className="flex items-center w-full sm:w-auto">
                        {step === 3 ? (
                            <Button
                                id={phoneInternalStep === 1 ? 'send-code-button' : undefined}
                                onClick={handleNext}
                                disabled={!canProceed() || isProcessing || isPhoneLoading}
                                className="w-full sm:!w-[200px] h-14 rounded-xl font-semibold shadow-md flex items-center justify-center gap-2"
                            >
                                {phoneVerified ? (
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
                        ) : (step === 4 || step === 5) ? (
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
                                {isVerifying ? t('dashboard.onboarding.buttons.verifying') : (step === 5 ? t('dashboard.onboarding.buttons.completeAccount') : t('dashboard.onboarding.buttons.nextStep'))}
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

            <Dialog
                isOpen={showRestrictedServicesModal}
                onClose={() => !isCreatingProfile && setShowRestrictedServicesModal(false)}
                title={t('dashboard.onboarding.step1.restrictedServices.modal.title')}
                size="medium"
                messageType="error"
                actions={
                    <>
                        <Button
                            variant="secondary"
                            onClick={() => setShowRestrictedServicesModal(false)}
                            disabled={isCreatingProfile}
                            className="!w-auto rounded-xl font-semibold"
                        >
                            {t('dashboard.onboarding.step1.restrictedServices.modal.cancel')}
                        </Button>
                        <Button
                            onClick={async () => {
                                if (!currentUser || isCreatingProfile) return;
                                setIsCreatingProfile(true);
                                setIsProcessing(true);
                                try {
                                    const { httpsCallable } = await import('firebase/functions');
                                    const { functions } = await import('../../services/firebase');
                                    const updateProfile = httpsCallable(functions, 'updateUserProfile');
                                    await updateProfile({
                                        role: 'professional',
                                        profileType: 'doctor',
                                        tutorialAccessMode: 'team',
                                        profileCompleted: true,
                                        email: currentUser.email,
                                        contact: {
                                            primaryEmail: currentUser.email
                                        },
                                        identity: {
                                            email: currentUser.email
                                        },
                                        verification: {
                                            identityStatus: 'not_verified',
                                            qualificationsStatus: 'not_verified',
                                            workEligibilityStatus: 'not_verified',
                                            overallVerificationStatus: 'not_verified'
                                        }
                                    });
                                    const userDocRef = doc(db, FIRESTORE_COLLECTIONS.USERS, currentUser.uid);
                                    await updateDoc(userDocRef, {
                                        [`onboardingProgress.${onboardingType}`]: {
                                            step: 3,
                                            role: 'worker',
                                            belongsToFacility: true,
                                            legalConsiderationsConfirmed: true,
                                            completed: true,
                                            completedAt: new Date(),
                                            updatedAt: new Date()
                                        },
                                        onboardingCompleted: true,
                                        updatedAt: new Date()
                                    });

                                    const profileCollection = onboardingType === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
                                    const profileDocRef = doc(db, profileCollection, currentUser.uid);
                                    const profileDoc = await getDoc(profileDocRef);
                                    
                                    if (profileDoc.exists()) {
                                        await updateDoc(profileDocRef, {
                                            shouldStartTutorial: true,
                                            updatedAt: new Date()
                                        });
                                    }
                                    navigate(`/${lang}/dashboard/profile`);
                                } catch (err) {
                                    console.error('Error creating profile:', err);
                                    setIsCreatingProfile(false);
                                    setIsProcessing(false);
                                }
                            }}
                            disabled={isProcessing || isCreatingProfile}
                            variant="danger"
                            className="!w-auto rounded-xl font-semibold"
                        >
                            {isProcessing || isCreatingProfile ? <FiLoader className="animate-spin mr-2" /> : null}
                            {t('dashboard.onboarding.step1.restrictedServices.modal.createProfile')}
                        </Button>
                    </>
                }
            >
                <div className={`space-y-6 ${isCreatingProfile ? 'pointer-events-none opacity-50' : ''}`}>
                    <p className="text-foreground leading-relaxed">
                        {(() => {
                            const introText = t('dashboard.onboarding.step1.restrictedServices.modal.intro');
                            const parts = introText.split('__NOT__');
                            const boldWord = lang === 'fr' ? 'PAS' : 'NOT';
                            return parts.map((part, i, arr) => 
                                i === arr.length - 1 ? part : (
                                    <React.Fragment key={i}>
                                        {part}
                                        <strong className="text-red-600">{boldWord}</strong>
                                    </React.Fragment>
                                )
                            );
                        })()}
                    </p>
                    
                    <div className="bg-destructive/10 border-l-4 border-destructive p-4 rounded-r-lg">
                        <ul className="space-y-3 text-foreground">
                            <li className="flex items-start gap-2">
                                <span className="text-destructive font-bold mt-0.5">•</span>
                                <div>
                                    {t('dashboard.onboarding.step1.restrictedServices.modal.interimServices')}
                                </div>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-destructive font-bold mt-0.5">•</span>
                                <div>
                                    {t('dashboard.onboarding.step1.restrictedServices.modal.jobPostulations')}
                                </div>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-destructive font-bold mt-0.5">•</span>
                                <div>
                                    {t('dashboard.onboarding.step1.restrictedServices.modal.marketplaceAccess')}
                                </div>
                            </li>
                        </ul>
                    </div>

                    <div className="border-t border-border pt-4">
                        <p className="text-foreground font-semibold mb-3">
                            {t('dashboard.onboarding.step1.restrictedServices.modal.willHaveAccess')}
                        </p>
                        <ul className="space-y-2 text-muted-foreground ml-4">
                            <li className="flex items-start gap-2">
                                <span className="text-green-600 dark:text-green-500 mt-1.5">•</span>
                                <span>{t('dashboard.onboarding.step1.restrictedServices.modal.facilityInternal')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-600 mt-1.5">•</span>
                                <span>{t('dashboard.onboarding.step1.restrictedServices.modal.teamCollaboration')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-600 mt-1.5">•</span>
                                <span>{t('dashboard.onboarding.step1.restrictedServices.modal.internalScheduling')}</span>
                            </li>
                        </ul>
                    </div>

                    <div className="bg-muted/50 border border-border rounded-lg p-4">
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            {t('dashboard.onboarding.step1.restrictedServices.modal.note')}
                        </p>
                    </div>
                </div>
            </Dialog>
        </div>
    );
};

export default OnboardingPage;
