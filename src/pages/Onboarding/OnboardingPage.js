import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useTutorial } from '../../dashboard/contexts/TutorialContext';
import {
    FiBriefcase, FiCheck, FiArrowRight, FiHome,
    FiLoader, FiArrowLeft, FiShield, FiUser,
    FiLink, FiHelpCircle, FiPhone
} from 'react-icons/fi';
import GLNVerificationStep from '../../dashboard/onboarding/components/GLNVerificationStep';
import PhoneVerificationStep from '../../dashboard/onboarding/components/PhoneVerificationStep';
import SimpleDropdown from '../../components/BoxedInputFields/Dropdown-Field';
import PersonnalizedInputField from '../../components/BoxedInputFields/Personnalized-InputField';
import Switch from '../../components/BoxedInputFields/Switch';
import Checkbox from '../../components/BoxedInputFields/CheckboxField';
import Button from '../../components/BoxedInputFields/Button';
import { useDropdownOptions } from '../../dashboard/pages/profile/utils/DropdownListsImports';
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner';

import '../../styles/auth.css';

const OnboardingPage = () => {
    const navigate = useNavigate();
    const { lang } = useParams();
    const { t } = useTranslation(['dashboard', 'common', 'auth']);
    const { currentUser } = useAuth();
    const { onboardingType: contextOnboardingType } = useTutorial();
    const { phonePrefixOptions } = useDropdownOptions();

    const query = new URLSearchParams(window.location.search);
    const onboardingType = contextOnboardingType || query.get('type') || 'professional';

    const [step, setStep] = useState(1);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [role, setRole] = useState(onboardingType === 'facility' ? 'company' : null);
    const [belongsToFacility, setBelongsToFacility] = useState(false);
    const [phoneVerified, setPhoneVerified] = useState(false);
    const [phoneData, setPhoneData] = useState({ phoneNumber: '', verified: false });
    const [legalConsiderationsConfirmed, setLegalConsiderationsConfirmed] = useState(false);
    const [hasGLN, setHasGLN] = useState(true);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoadingProgress, setIsLoadingProgress] = useState(true);
    const [chainMessage, setChainMessage] = useState('');
    const [chainPhonePrefix, setChainPhonePrefix] = useState('');
    const [chainPhoneNumber, setChainPhoneNumber] = useState('');

    // Internal Phone State
    const [phoneInternalStep, setPhoneInternalStep] = useState(1);
    const [isPhoneValid, setIsPhoneValid] = useState(false);

    const glnVerificationRef = useRef(null);
    const phoneVerificationRef = useRef(null);
    const verifyHandlerRef = useRef(null);

    useEffect(() => {
        const loadProgress = async () => {
            if (!currentUser) return;
            try {
                const userDocRef = doc(db, 'users', currentUser.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const onboardingProgress = userData.onboardingProgress || {};
                    const typeProgress = onboardingProgress[onboardingType] || {};

                    if (typeProgress.completed) {
                        navigate(`/${lang}/dashboard`);
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
                        if (typeProgress.hasGLN !== undefined) setHasGLN(typeProgress.hasGLN);
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
    }, [currentUser, onboardingType, navigate, lang]);

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
        if (step === 3 && role !== 'chain') {
            if (phoneVerified) {
                const maxStep = role === 'chain' ? 3 : (role === 'company' ? 5 : 4);
                if (step < maxStep) {
                    transitionToStep(step + 1);
                    await saveProgress({ step: step + 1, role, hasGLN, belongsToFacility, phoneVerified, phoneData, legalConsiderationsConfirmed });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    handleComplete();
                }
                return;
            }

            if (phoneInternalStep === 1) {
                if (phoneVerificationRef.current) phoneVerificationRef.current.handleSendCode();
                return;
            } else if (phoneInternalStep === 2) {
                if (phoneVerificationRef.current) phoneVerificationRef.current.handleVerifyCode();
                return;
            }
        }

        const maxStep = role === 'chain' ? 3 : (role === 'company' ? 5 : 4);
        if (step < maxStep) {
            transitionToStep(step + 1);
            await saveProgress({ step: step + 1, role, hasGLN, belongsToFacility, phoneVerified, phoneData, legalConsiderationsConfirmed });
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
            if (step === 4 && role !== 'chain' && phoneVerified) {
                setPhoneInternalStep(3);
                transitionToStep(3);
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
            if (step === 3 && role !== 'chain' && phoneInternalStep === 2) {
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
                const userDocRef = doc(db, 'users', currentUser.uid);
                await updateDoc(userDocRef, {
                    [`onboardingProgress.${onboardingType}`]: { completed: true, role, completedAt: new Date() },
                    ...(onboardingType === 'professional' ? { onboardingCompleted: true } : {}),
                    updatedAt: new Date()
                });
            }
            navigate(`/${lang}/dashboard`);
        } catch (err) {
            console.error(err);
            setIsProcessing(false);
        }
    };

    if (isLoadingProgress) return <LoadingSpinner />;

    const canProceed = () => {
        if (step === 1) return legalConsiderationsConfirmed;
        if (step === 2) return !!role;
        if (step === 3) {
            if (role === 'chain') return chainMessage.trim() && chainPhoneNumber && chainPhonePrefix;
            if (phoneVerified) return true;

            const isValid = phoneInternalStep === 1 ? isPhoneValid : true;
            console.log('🛡️ Step 3 canProceed check:', { isPhoneValid, phoneInternalStep, isValid, phoneVerified });
            return isValid;
        }
        return true;
    };

    return (
        <div className="auth-container py-12 px-4 text-center">
            <div className={`auth-content mx-auto bg-white rounded-[3.5rem] shadow-2xl p-6 md:p-14 relative overflow-hidden ${(step === 1 || step === 4) ? 'wide' : ''}`}>
                {/* Step Indicator Header */}
                <div className="flex justify-center items-center gap-4 mb-10">
                    {[1, 2, 3, 4, 5].filter(s => {
                        if (role === 'chain') return s <= 3;
                        if (role === 'company') return s <= 5;
                        return s <= 4;
                    }).map(s => (
                        <div key={s} className="flex items-center gap-2">
                            <div
                                className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 
                                    ${step >= s ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'} 
                                `}
                            >
                                {step > s ? <FiCheck /> : s}
                            </div>
                            {s < (role === 'chain' ? 3 : role === 'company' ? 5 : 4) && <div className={`w-12 h-1.5 rounded-full ${step > s ? 'bg-indigo-600' : 'bg-slate-100'}`} />}
                        </div>
                    ))}
                </div>

                <div className={`flex-grow transition-opacity duration-500 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
                    {step === 1 && (
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <header className="text-center mb-8">
                                <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">{t('dashboard.onboarding.step1.title')}</h1>
                            </header>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch">
                                {/* Legal Block - Left Column */}
                                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 shadow-sm leading-relaxed h-full">
                                    {belongsToFacility ? (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <p className="text-xl font-black text-slate-900 border-b border-slate-200 pb-3">{t('dashboard.onboarding.step1.facilityLegalNotice')}</p>
                                            <p className="text-slate-700">{t('dashboard.onboarding.step1.facilityLegalText1')}</p>
                                            <p className="text-slate-700">{t('dashboard.onboarding.step1.facilityLegalText2')}</p>
                                            <p className="text-slate-700">{t('dashboard.onboarding.step1.facilityLegalText3')}</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <p className="text-xl font-black text-slate-900 border-b border-slate-200 pb-3">{t('dashboard.onboarding.step1.professionalLegalNotice')}</p>
                                            <p className="text-slate-700">{t('dashboard.onboarding.step1.professionalLegalText1')}</p>
                                            <p className="text-slate-700">{t('dashboard.onboarding.step1.professionalLegalText2')}</p>
                                            <p className="text-slate-700">{t('dashboard.onboarding.step1.professionalLegalText3')}</p>
                                            <p className="text-slate-700">{t('dashboard.onboarding.step1.professionalLegalText4')}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Control Section - Right Column */}
                                <div className="space-y-6 flex flex-col justify-center text-left">

                                    <div
                                        className={`p-6 px-8 rounded-2xl border transition-all flex items-center justify-between cursor-pointer group ${belongsToFacility ? 'border-indigo-600 bg-indigo-50/50 shadow-md' : 'border-slate-100 bg-white hover:border-indigo-200 shadow-sm'}`}
                                        onClick={() => setBelongsToFacility(!belongsToFacility)}
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${belongsToFacility ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                                                <FiHome className="w-7 h-7" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900 text-lg">{t('dashboard.onboarding.step1.areYouEmployed')}</h3>
                                                <p className="text-slate-500 text-sm">{t('dashboard.onboarding.step1.areYouEmployedDescription')}</p>
                                            </div>
                                        </div>
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <Switch
                                                checked={belongsToFacility}
                                                onChange={(val) => setBelongsToFacility(val)}
                                                switchColor="var(--color-logo-1)"
                                                marginBottom="0"
                                            />
                                        </div>
                                    </div>

                                    <div
                                        className={`p-6 px-8 rounded-2xl border transition-all flex items-center justify-between cursor-pointer group ${legalConsiderationsConfirmed ? 'border-indigo-600 bg-indigo-50/50 shadow-md' : 'border-slate-100 bg-white hover:border-indigo-200 shadow-sm'}`}
                                        onClick={() => setLegalConsiderationsConfirmed(!legalConsiderationsConfirmed)}
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${legalConsiderationsConfirmed ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                                                <FiShield className="w-7 h-7" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900 text-lg">{t('dashboard.onboarding.step1.termsAcceptance')}</h3>
                                                <p className="text-slate-500 text-sm text-left">{t('dashboard.onboarding.step1.termsAcceptanceDescription')}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                                checked={legalConsiderationsConfirmed}
                                                onChange={() => setLegalConsiderationsConfirmed(!legalConsiderationsConfirmed)}
                                                color="var(--color-logo-1)"
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-500 text-xs leading-relaxed italic">
                                        {t('dashboard.onboarding.step1.note')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <header className="text-center mb-10">
                                <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">{t('dashboard.onboarding.step2.title')}</h1>
                                <p className="text-slate-500 text-lg">{t('dashboard.onboarding.step2.description')}</p>
                            </header>

                            <div className="max-w-3xl mx-auto space-y-6">
                                {[
                                    { id: 'worker', title: t('dashboard.onboarding.step2.professional'), desc: t('dashboard.onboarding.step2.professionalDescription'), icon: <FiBriefcase /> },
                                    { id: 'company', title: t('dashboard.onboarding.step2.facility'), desc: t('dashboard.onboarding.step2.facilityDescription'), icon: <FiHome /> },
                                    { id: 'chain', title: t('dashboard.onboarding.step2.organization'), desc: t('dashboard.onboarding.step2.organizationDescription'), icon: <FiLink /> }
                                ].filter(r => onboardingType === 'facility' ? r.id !== 'worker' : true).map(r => (
                                    <div
                                        key={r.id}
                                        onClick={() => setRole(r.id)}
                                        className={`group p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer flex items-center gap-8 ${role === r.id ? 'border-indigo-600 bg-indigo-50/50 shadow-xl' : 'border-slate-100 hover:border-indigo-300 bg-white shadow-sm'}`}
                                    >
                                        <div className={`w-16 h-16 rounded-2xl flex-shrink-0 flex items-center justify-center transition-all duration-500 shadow-sm ${role === r.id ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'}`}>
                                            {React.cloneElement(r.icon, { className: "w-8 h-8" })}
                                        </div>
                                        <div className="flex-grow">
                                            <h3 className="text-xl font-black text-slate-900">{r.title}</h3>
                                            <p className="text-slate-500 font-medium text-sm leading-relaxed">{r.desc}</p>
                                        </div>
                                        <div
                                            className={`flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${role === r.id ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200'}`}
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
                                            {role === r.id && <FiCheck className="text-white w-4 h-4" />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 3 && role !== 'chain' && (
                        <div className="max-w-2xl mx-auto">
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

                                            const userDocRef = doc(db, 'users', currentUser.uid);
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

                                    await saveProgress({ step: 4, role, hasGLN, belongsToFacility, phoneVerified: true, phoneData: data, legalConsiderationsConfirmed });

                                    if (!wasAlreadyVerified) {
                                        transitionToStep(4);
                                    }
                                }}
                                onStepChange={setPhoneInternalStep}
                                onValidationChange={setIsPhoneValid}
                                initialPhoneNumber={currentUser?.phoneNumber}
                                isVerified={phoneVerified}
                            />
                        </div>
                    )}

                    {step === 3 && role === 'chain' && (
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-3xl mx-auto">
                            <header className="text-center mb-8">
                                <h2 className="text-4xl font-black text-slate-900 tracking-tight">{t('dashboard.onboarding.step3.chain.title')}</h2>
                                <p className="text-slate-500 text-lg">{t('dashboard.onboarding.step3.chain.description')}</p>
                            </header>

                            <div className="space-y-6 bg-slate-50 p-10 rounded-[3rem] border border-slate-100 shadow-sm text-left">
                                <div className="flex gap-4 items-end">
                                    <div className="w-1/2">
                                        <SimpleDropdown label={t('dashboard.onboarding.step3.chain.phonePrefix')} options={phonePrefixOptions} value={chainPhonePrefix} onChange={setChainPhonePrefix} required />
                                    </div>
                                    <div className="flex-1">
                                        <PersonnalizedInputField label={t('dashboard.onboarding.step3.chain.phoneNumber')} type="tel" value={chainPhoneNumber} onChange={(e) => setChainPhoneNumber(e.target.value)} placeholder={t('dashboard.onboarding.step3.chain.phoneNumberPlaceholder')} required />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-sm font-black text-slate-700 uppercase tracking-widest ml-1">{t('dashboard.onboarding.step3.chain.messageToSupport')}</label>
                                    <textarea
                                        value={chainMessage}
                                        onChange={(e) => setChainMessage(e.target.value)}
                                        placeholder={t('dashboard.onboarding.step3.chain.messagePlaceholder')}
                                        className="w-full h-40 p-6 rounded-[2rem] border-2 border-slate-100 focus:border-indigo-600 focus:bg-white transition-all outline-none text-slate-700 shadow-inner"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <header className="text-center mb-8">
                                <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">{t('dashboard.onboarding.step4.title')}</h1>
                            </header>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch">
                                {/* Left Column - Info and Switch */}
                                <div className="space-y-6 h-full flex flex-col">
                                    {/* Info Panel - First */}
                                    {hasGLN && (
                                        <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 shadow-sm leading-relaxed flex-grow">
                                            <div className="space-y-4 animate-in fade-in duration-300">
                                                <p className="text-xl font-black text-slate-900 border-b border-slate-200 pb-3">
                                                    {role === 'worker' ? t('dashboard.onboarding.professional_gln.title', 'GLN information') : t('dashboard.onboarding.company_gln.title', 'GLN information')}
                                                </p>
                                                {role === 'company' ? (
                                                    <div className="space-y-3 mt-4">
                                                        <p className="text-slate-700">{t('dashboard.onboarding.company_gln.text1')}</p>
                                                        <p className="text-slate-700">{t('dashboard.onboarding.company_gln.text2')}</p>
                                                    </div>
                                                ) : role === 'worker' ? (
                                                    <div className="space-y-3 mt-4">
                                                        <p className="text-slate-700">{t('dashboard.onboarding.professional_gln.text1')}</p>
                                                        <p className="text-slate-700">{t('dashboard.onboarding.professional_gln.text2')}</p>
                                                        <p className="text-slate-700 font-semibold">{t('dashboard.onboarding.professional_gln.text3')}</p>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    )}

                                    {/* GLN Toggle - Below Info */}
                                    <div
                                        className={`p-6 px-8 rounded-[2rem] border transition-all flex items-center justify-between cursor-pointer group ${hasGLN ? 'border-indigo-600 bg-indigo-50/50 shadow-md' : 'border-slate-100 bg-white hover:border-indigo-200 shadow-sm'}`}
                                        onClick={() => setHasGLN(!hasGLN)}
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${hasGLN ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                                                <FiShield className="w-7 h-7" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900 text-lg">{t('dashboard.onboarding.step4.hasGLN')}</h3>
                                            </div>
                                        </div>
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <Switch
                                                checked={hasGLN}
                                                onChange={setHasGLN}
                                                switchColor="var(--color-logo-1)"
                                                marginBottom="0"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column - GLN Input */}
                                <div className="space-y-6 flex flex-col justify-start text-left pb-2">
                                    <div className="pt-2">
                                        <GLNVerificationStep
                                            ref={glnVerificationRef}
                                            role={role}
                                            hasGLN={hasGLN}
                                            onComplete={role === 'company' ? async () => {
                                                await saveProgress({ step: 5, role, hasGLN, belongsToFacility, phoneVerified, phoneData, legalConsiderationsConfirmed });
                                                transitionToStep(5);
                                            } : handleComplete}
                                            onBack={handleBack}
                                            showHeader={false}
                                            hideMainButton={true}
                                            hideGLNInfo={true}
                                            mode={role === 'company' ? 'responsiblePerson' : 'full'}
                                            onVerifyClick={(handler) => { verifyHandlerRef.current = handler; }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 5 && role === 'company' && (
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <header className="text-center mb-8">
                                <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">{t('dashboard.onboarding.step5.title', 'Facility Information')}</h1>
                            </header>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch">
                                {/* Left Column - Info and Switch */}
                                <div className="space-y-6 h-full flex flex-col">
                                    {/* Info Panel - First */}
                                    {hasGLN && (
                                        <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 shadow-sm leading-relaxed flex-grow">
                                            <div className="space-y-4 animate-in fade-in duration-300">
                                                <p className="text-xl font-black text-slate-900 border-b border-slate-200 pb-3">
                                                    {t('dashboard.onboarding.company_gln.title', 'GLN information')}
                                                </p>
                                                <p className="text-slate-700 font-medium">{t('dashboard.onboarding.step5.description', 'Please provide your facility information including billing documents and facility GLN if available.')}</p>
                                                <div className="space-y-3 mt-4">
                                                    <p className="text-slate-700">{t('dashboard.onboarding.company_gln.text1')}</p>
                                                    <p className="text-slate-700">{t('dashboard.onboarding.company_gln.text2')}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* GLN Toggle - Below Info */}
                                    <div
                                        className={`p-6 px-8 rounded-[2rem] border transition-all flex items-center justify-between cursor-pointer group ${hasGLN ? 'border-indigo-600 bg-indigo-50/50 shadow-md' : 'border-slate-100 bg-white hover:border-indigo-200 shadow-sm'}`}
                                        onClick={() => setHasGLN(!hasGLN)}
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${hasGLN ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                                                <FiShield className="w-7 h-7" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900 text-lg">{t('dashboard.onboarding.step4.hasGLN', 'I have a GLN')}</h3>
                                            </div>
                                        </div>
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <Switch
                                                checked={hasGLN}
                                                onChange={setHasGLN}
                                                switchColor="var(--color-logo-1)"
                                                marginBottom="0"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column - GLN Input */}
                                <div className="space-y-6 flex flex-col justify-start text-left pb-2">
                                    <div className="pt-2">
                                        <GLNVerificationStep
                                            ref={glnVerificationRef}
                                            role={role}
                                            hasGLN={hasGLN}
                                            onComplete={handleComplete}
                                            onBack={handleBack}
                                            showHeader={false}
                                            hideMainButton={true}
                                            hideGLNInfo={true}
                                            mode="facilityInfo"
                                            onVerifyClick={(handler) => { verifyHandlerRef.current = handler; }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Footer */}
                <footer className="mt-8 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-4 sm:gap-0 pt-8 border-t border-slate-100 transition-opacity duration-300" style={{ opacity: isTransitioning ? 0 : 1 }}>
                    <Button
                        onClick={handleBack}
                        variant="secondary"
                        className={`w-full sm:!w-[180px] h-14 rounded-2xl font-black transition-all ${step === 1 ? 'opacity-0 pointer-events-none' : ''}`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <FiArrowLeft className="w-5 h-5" /> {t('dashboard.onboarding.buttons.back')}
                        </div>
                    </Button>

                    <div className="flex items-center w-full sm:w-auto">
                        {step === 3 && role !== 'chain' ? (
                            <Button
                                id={phoneInternalStep === 1 ? 'send-code-button' : undefined}
                                onClick={handleNext}
                                disabled={!canProceed() || isProcessing}
                                className="w-full sm:!w-[200px] h-14 rounded-2xl font-black shadow-lg flex items-center justify-center gap-2"
                            >
                                {phoneVerified ? (
                                    <>
                                        <span>{t('dashboard.onboarding.buttons.nextStep')}</span>
                                        <FiArrowRight className="w-5 h-5" />
                                    </>
                                ) : phoneInternalStep === 1 ? (
                                    <>
                                        <span>{t('dashboard.onboarding.buttons.sendCode')}</span>
                                        <FiArrowRight className="w-5 h-5" />
                                    </>
                                ) : (
                                    <>
                                        <span>{t('dashboard.onboarding.buttons.validate')}</span>
                                        <FiCheck className="w-5 h-5" />
                                    </>
                                )}
                            </Button>
                        ) : step === 3 && role === 'chain' ? (
                            <Button
                                onClick={() => {
                                    const mailto = `mailto:support@medishift.ch?subject=Organization Request: ${currentUser?.email}&body=${encodeURIComponent(chainMessage + '\n\nPhone: ' + chainPhonePrefix + ' ' + chainPhoneNumber)}`;
                                    window.location.href = mailto;
                                    handleComplete();
                                }}
                                disabled={!canProceed()}
                                className="w-full sm:!w-[200px] h-14 rounded-2xl font-black shadow-lg"
                            >
                                {t('dashboard.onboarding.buttons.contactAndFinish')}
                            </Button>
                        ) : (step === 4 || step === 5) ? (
                            <Button
                                onClick={() => {
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                    verifyHandlerRef.current && verifyHandlerRef.current();
                                }}
                                disabled={isProcessing}
                                className="w-full sm:!w-[240px] h-14 rounded-2xl font-black shadow-lg flex items-center justify-center gap-3"
                            >
                                {isVerifying ? <FiLoader className="animate-spin" /> : <FiCheck />}
                                {isVerifying ? t('dashboard.onboarding.buttons.verifying') : (step === 5 ? t('dashboard.onboarding.buttons.completeAccount') : t('dashboard.onboarding.buttons.nextStep'))}
                            </Button>
                        ) : (
                            <Button
                                onClick={handleNext}
                                disabled={!canProceed() || isProcessing}
                                className="w-full sm:!w-[180px] h-14 rounded-2xl font-black shadow-lg flex items-center justify-center gap-2"
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
