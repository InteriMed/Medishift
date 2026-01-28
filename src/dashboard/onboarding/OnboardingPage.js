import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/authContext';
import { useResponsive } from '../../dashboard/contexts/responsiveContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/services/firebase';
import { FIRESTORE_COLLECTIONS } from '../../config/keysDatabase';
import { useTutorial } from '../../TutorialContext';
import { useFlow } from '../../services/flows/engine';
import { OnboardingFlow } from '../../services/flows/catalog/onboarding';
import { completeOnboarding } from '../../services/flows/catalog/onboarding/completion';
import {
    FiCheck, FiArrowRight,
    FiLoader, FiArrowLeft,
    FiHelpCircle
} from 'react-icons/fi';
import ContactFormPopup from '../../components/modals/contactFormPopup';
import PhoneVerificationStep from './components/phoneVerificationStep';
import RoleSelectionStep from './components/RoleSelectionStep';
import LegalConsiderationsStep from './components/LegalConsiderationsStep';
import GLNVerificationStep from './components/GLNVerificationStep';
import Button from '../../components/boxedInputFields/button';
import LoadingSpinner from '../../components/loadingSpinner/loadingSpinner';

const OnboardingPage = () => {
    const navigate = useNavigate();
    const { lang } = useParams();
    const { t } = useTranslation(['dashboard', 'common', 'auth']);
    const { currentUser } = useAuth();
    const { isMobile, isTablet } = useResponsive();
    const urlQuery = new URLSearchParams(window.location.search);
    const onboardingType = urlQuery.get('type') || 'professional';
    const urlStep = urlQuery.get('step');

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
        jumpToStep,
        progress
    } = useFlow(OnboardingFlow);

    useEffect(() => {
        if (!hasInitializedRef.current) {
            hasInitializedRef.current = true;
            if (urlStep) {
                const stepToJump = OnboardingFlow.steps.find(s => s.path === urlStep);
                if (stepToJump && stepToJump.id !== step.id) {
                    isNavigatingRef.current = true;
                    jumpToStep(stepToJump.id);
                    setTimeout(() => {
                        isNavigatingRef.current = false;
                    }, 500);
                }
            }
            return;
        }
        if (urlSyncRef.current) {
            urlSyncRef.current = false;
            return;
        }
        if (urlStep && step.path !== urlStep && !isNavigatingRef.current) {
            const stepToJump = OnboardingFlow.steps.find(s => s.path === urlStep);
            if (stepToJump && stepToJump.id !== step.id) {
                isNavigatingRef.current = true;
                jumpToStep(stepToJump.id);
                setTimeout(() => {
                    isNavigatingRef.current = false;
                }, 500);
            }
        }
    }, [urlStep, step.path, step.id, jumpToStep]);

    useEffect(() => {
        if (!hasInitializedRef.current) return;
        if (isNavigatingRef.current) return;
        const newUrl = `/${lang}/onboarding?type=${onboardingType}&step=${step.path}`;
        const currentUrl = window.location.pathname + window.location.search;
        if (currentUrl !== newUrl) {
            urlSyncRef.current = true;
            window.history.replaceState({}, '', newUrl);
            setTimeout(() => {
                urlSyncRef.current = false;
            }, 100);
        }
    }, [step.path, lang, onboardingType]);

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
    const isNavigatingRef = useRef(false);
    const urlSyncRef = useRef(false);
    const hasInitializedRef = useRef(false);

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
        if (isNavigatingRef.current || isProcessing || isTransitioning) return;
        
        if (step.id === 'phone') {
            if (data.phoneVerified) {
                isNavigatingRef.current = true;
                const result = await next();
                isNavigatingRef.current = false;
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

        isNavigatingRef.current = true;
        const result = await next();
        isNavigatingRef.current = false;
        if (!result.complete) {
            await saveProgress();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            handleComplete();
        }
    };

    const handleBack = async () => {
        if (isNavigatingRef.current || isProcessing || isTransitioning) return;
        
        if (step.id === 'gln_professional' && data.phoneVerified) {
            setPhoneInternalStep(3);
        }
        if (step.id === 'phone' && phoneInternalStep === 2) {
            setPhoneInternalStep(1);
            return;
        }
        
        isNavigatingRef.current = true;
        back();
        setTimeout(() => {
            isNavigatingRef.current = false;
        }, 100);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleComplete = useCallback(async () => {
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
    }, [isProcessing, currentUser, data, onboardingType, navigate, lang]);

    const handlePhoneComplete = useCallback(async (phoneData) => {
        if (isNavigatingRef.current) return;
        
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

        if (!wasAlreadyVerified && !isNavigatingRef.current) {
            isNavigatingRef.current = true;
            const result = await next();
            isNavigatingRef.current = false;
            if (result.complete) {
                handleComplete();
            }
        }
    }, [data.phoneVerified, currentUser?.uid, updateField, saveProgress, next, handleComplete]);

    const handlePhoneStepChange = useCallback((step) => {
        setPhoneInternalStep(step);
    }, []);

    const handlePhoneValidationChange = useCallback((isValid) => {
        setIsPhoneValid(isValid);
    }, []);

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

    const isTwoColumnLayout = step.id === 'gln_professional' || step.id === 'gln_facility' || step.id === 'commercial_registry';
    const isOneColumnLayout = step.id === 'role' || step.id === 'phone';
    const isRowLayout = step.id === 'legal';
    const isFullScreen = isMobile || isTablet;

    return (
        <div className={`${isFullScreen ? 'h-screen bg-white' : 'min-h-screen bg-onboarding-healthcare'} ${isFullScreen ? 'p-0' : 'p-4 md:p-6 lg:p-8'}`}>
            {isCreatingProfile && (
                <div className="fixed inset-0 bg-white/95 backdrop-blur-md z-[100000] flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <LoadingSpinner size="medium" color="primary" />
                        <p className="text-base font-medium text-foreground animate-pulse">
                            Creating your profile...
                        </p>
                    </div>
                </div>
            )}
            
            <button
                onClick={() => setShowContactForm(true)}
                className={`fixed z-50 p-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-110 flex items-center justify-center ${isFullScreen ? 'top-2 right-2 p-2' : 'top-4 right-4'}`}
                aria-label={t('common:header.help', 'Help')}
                title={t('common:header.help', 'Help')}
            >
                <FiHelpCircle className="w-5 h-5" />
            </button>

            <ContactFormPopup
                isOpen={showContactForm}
                onClose={() => setShowContactForm(false)}
            />

            <div className={`w-full flex flex-col relative z-10 ${isFullScreen ? 'h-screen max-h-screen rounded-none border-0 p-4 bg-white' : 'max-h-[90vh] min-h-[90vh] rounded-3xl shadow-2xl hover:shadow-2xl transition-shadow p-6 md:p-8 lg:p-10'} ${isTwoColumnLayout ? 'max-w-6xl' : isOneColumnLayout ? 'max-w-2xl' : isRowLayout ? 'max-w-4xl' : 'max-w-4xl'} mx-auto overflow-hidden`}
                 style={isFullScreen ? {} : {
                     background: 'rgba(255, 255, 255, 0.85)',
                     backdropFilter: 'blur(12px)',
                     WebkitBackdropFilter: 'blur(12px)',
                     border: '1px solid rgba(255, 255, 255, 0.9)',
                     boxShadow: '0 20px 40px -10px rgba(30, 58, 138, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.5)'
                 }}>
                <div className={`flex justify-center items-center gap-2 ${isFullScreen ? 'mb-4' : 'mb-8'} flex-shrink-0`}>
                    {Array.from({ length: totalSteps }, (_, i) => i + 1).map(s => (
                        <div key={s} className="flex items-center gap-1.5">
                            <div
                                className={`${isFullScreen ? 'w-6 h-6 text-xs' : 'w-8 h-8 md:w-10 md:h-10 text-sm'} rounded-full flex items-center justify-center font-semibold transition-all duration-500 ${
                                    getStepNumber() >= s 
                                        ? 'bg-primary text-primary-foreground shadow-md' 
                                        : 'bg-gray-100 text-gray-400'
                                }`}
                            >
                                {getStepNumber() > s ? <FiCheck className={isFullScreen ? "w-3 h-3" : "w-5 h-5"} /> : s}
                            </div>
                            {s < totalSteps && (
                                <div className={`${isFullScreen ? 'w-8' : 'w-12'} h-1.5 rounded-full transition-all ${
                                    getStepNumber() > s ? 'bg-primary' : 'bg-gray-200'
                                }`} />
                            )}
                        </div>
                    ))}
                </div>

                <div className={`flex-grow transition-opacity duration-500 relative flex flex-col min-h-0 overflow-y-auto ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
                    {isVerifying && (
                        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded-xl gap-6">
                            <div className="w-15 h-15 border-4 border-gray-200 border-t-primary rounded-full animate-spin" />
                            <p className="text-base font-semibold text-primary">
                                Verifying...
                            </p>
                        </div>
                    )}
                    
                    {isOneColumnLayout ? (
                        <div className="flex items-center justify-center min-h-[400px] w-full py-8">
                            <div className="w-full max-w-md">
                                {step.id === 'role' && (
                                    <RoleSelectionStep
                                        data={data}
                                        updateField={updateField}
                                        saveProgress={saveProgress}
                                        onboardingType={onboardingType}
                                        errors={errors}
                                    />
                                )}
                                {step.id === 'phone' && (
                                    <PhoneVerificationStep
                                        ref={phoneVerificationRef}
                                        onComplete={handlePhoneComplete}
                                        onStepChange={handlePhoneStepChange}
                                        onValidationChange={handlePhoneValidationChange}
                                        initialPhoneNumber={currentUser?.phoneNumber}
                                        isVerified={data.phoneVerified || false}
                                    />
                                )}
                            </div>
                        </div>
                    ) : isRowLayout ? (
                        <div className="w-full py-8">
                            <LegalConsiderationsStep
                                data={data}
                                updateField={updateField}
                            />
                        </div>
                    ) : (
                        <>
                            {(step.id === 'gln_professional' || step.id === 'gln_facility' || step.id === 'commercial_registry') && (
                                <GLNVerificationStep
                                    ref={glnVerificationRef}
                                    data={data}
                                    saveProgress={saveProgress}
                                    next={next}
                                    handleComplete={handleComplete}
                                    setIsVerifying={setIsVerifying}
                                />
                            )}
                        </>
                    )}
                </div>

                <footer className={`mt-auto pt-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-4 sm:gap-0 transition-opacity duration-300 flex-shrink-0 ${isTransitioning ? 'opacity-0 pointer-events-none' : ''}`}>
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

