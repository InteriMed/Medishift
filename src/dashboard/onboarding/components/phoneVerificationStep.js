import React, { useState, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import {
    RecaptchaVerifier,
    PhoneAuthProvider,
    linkWithCredential
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../services/services/firebase';
import { useAuth } from '../../../contexts/authContext';
import PersonnalizedInputField from '../../../components/boxedInputFields/personnalizedInputField';
import SimpleDropdown from '../../../components/boxedInputFields/dropdownField';
import { useDropdownOptions } from '../../pages/profile/utils/DropdownListsImports';
import { FiCheck, FiRefreshCw, FiMessageSquare } from 'react-icons/fi';
import { useNotification } from '../../../contexts/notificationContext';
import { formatPhoneNumber } from '../../../services/utils/phone';
import { LOCALSTORAGE_KEYS } from '../../../config/keysDatabase';

const PHONE_VERIFICATION_STORAGE_KEY = LOCALSTORAGE_KEYS.PHONE_VERIFICATION;
const RECAPTCHA_VERIFICATION_STORAGE_KEY = LOCALSTORAGE_KEYS.RECAPTCHA_VERIFICATION;
const RECAPTCHA_RESPONSE_STORAGE_KEY = LOCALSTORAGE_KEYS.RECAPTCHA_RESPONSE;

const PhoneVerificationStep = forwardRef(({
    onComplete,
    onStepChange,
    onValidationChange,
    initialPhoneNumber,
    initialPhonePrefix
}, ref) => {
    const { t } = useTranslation(['auth', 'dashboard', 'dashboardProfile']);
    const { showError, showSuccess } = useNotification();
    const { phonePrefixOptions } = useDropdownOptions();
    const { currentUser } = useAuth();

    useEffect(() => {
        const handleUnhandledRejection = (event) => {
            const reason = event.reason;
            if (reason && (
                reason.message?.includes('Timeout') ||
                reason.message === 'Timeout' ||
                reason.name === 'TimeoutError' ||
                reason.isTimeout === true ||
                (typeof reason === 'string' && reason.includes('Timeout')) ||
                (reason?.stack && (
                    reason.stack.includes('recaptcha') ||
                    reason.stack.includes('grecaptcha') ||
                    reason.stack.includes('Timeout') ||
                    reason.stack.includes('recaptcha__en.js')
                ))
            )) {
                console.debug('[PhoneVerificationStep] Caught reCAPTCHA timeout error (non-critical):', reason.message || reason);
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                return false;
            }
        };

        const handleError = (event) => {
            if (event.error && (
                event.error.message?.includes('Timeout') ||
                event.error.message === 'Timeout' ||
                event.error.name === 'TimeoutError' ||
                event.error.isTimeout === true ||
                (event.error?.stack && (
                    event.error.stack.includes('recaptcha') ||
                    event.error.stack.includes('Timeout') ||
                    event.error.stack.includes('recaptcha__en.js')
                ))
            )) {
                console.debug('[PhoneVerificationStep] Caught reCAPTCHA timeout error in error handler (non-critical):', event.error.message || event.error);
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                return false;
            }
        };

        window.addEventListener('unhandledrejection', handleUnhandledRejection, true);
        window.addEventListener('error', handleError, true);
        return () => {
            window.removeEventListener('unhandledrejection', handleUnhandledRejection, true);
            window.removeEventListener('error', handleError, true);
        };
    }, []);

    const defaultPhonePrefixes = [
        { value: '+41', label: 'Switzerland (+41)' },
        { value: '+49', label: 'Germany (+49)' },
        { value: '+33', label: 'France (+33)' },
        { value: '+39', label: 'Italy (+39)' },
        { value: '+43', label: 'Austria (+43)' },
        { value: '+423', label: 'Liechtenstein (+423)' },
        { value: '+352', label: 'Luxembourg (+352)' },
        { value: '+32', label: 'Belgium (+32)' },
        { value: '+31', label: 'Netherlands (+31)' },
        { value: '+44', label: 'United Kingdom (+44)' },
        { value: '+1', label: 'USA/Canada (+1)' }
    ];

    const effectivePhonePrefixOptions = phonePrefixOptions && phonePrefixOptions.length > 0
        ? phonePrefixOptions
        : defaultPhonePrefixes;

    useEffect(() => {
        if (!phonePrefixOptions || phonePrefixOptions.length === 0) {
            console.warn('⚠️ phonePrefixOptions is empty, using fallback options');
        } else {
            console.debug('✅ phonePrefixOptions loaded:', phonePrefixOptions.length, 'options');
        }
    }, [phonePrefixOptions]);

    const [internalStep, setInternalStep] = useState(1); // 1: Input, 2: OTP, 3: Verified
    const [phonePrefix, setPhonePrefix] = useState(() => {
        if (initialPhonePrefix) return initialPhonePrefix;
        if (initialPhoneNumber?.startsWith('+')) {
            const prefixes = effectivePhonePrefixOptions.map(o => o.value).sort((a, b) => b.length - a.length);
            for (const p of prefixes) {
                if (initialPhoneNumber.startsWith(p)) return p;
            }
        }
        return '+41';
    });

    const [phoneNumber, setPhoneNumber] = useState(() => {
        if (!initialPhoneNumber) return '';
        const detectedPrefix = initialPhonePrefix || (() => {
            if (initialPhoneNumber?.startsWith('+')) {
                const prefixes = effectivePhonePrefixOptions.map(o => o.value).sort((a, b) => b.length - a.length);
                for (const p of prefixes) {
                    if (initialPhoneNumber.startsWith(p)) return p;
                }
            }
            return '+41';
        })();

        if (initialPhoneNumber.startsWith(detectedPrefix)) {
            return initialPhoneNumber.replace(detectedPrefix, '').trim();
        }
        return initialPhoneNumber;
    });
    const [verificationCode, setVerificationCode] = useState('');
    const [verificationId, setPhoneVerificationId] = useState('');
    const [recaptchaVerifier, setRecaptchaVerifier] = useState(null);
    const [recaptchaVerified, setRecaptchaVerified] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const countdownTimerRef = React.useRef(null);
    const pendingPhoneNumberRef = React.useRef(null);
    const verificationCheckDoneRef = React.useRef(false);

    // Phone format check: at least 7 digits, allow leading +, spaces, hyphens, parentheses
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    const isValidPhone = cleanPhone.length >= 7;

    useEffect(() => {
        const isValid = isValidPhone;
        onValidationChange(isValid);
    }, [isValidPhone, onValidationChange, phoneNumber, phonePrefix, cleanPhone]);

    useEffect(() => {
        if (verificationCheckDoneRef.current) return;

        const checkPhoneVerificationStatus = async () => {
            if (verificationCheckDoneRef.current) return;
            verificationCheckDoneRef.current = true;

            try {
                // Check for stored reCAPTCHA verification
                const storedRecaptcha = localStorage.getItem(RECAPTCHA_VERIFICATION_STORAGE_KEY);
                if (storedRecaptcha) {
                    try {
                        const recaptchaData = JSON.parse(storedRecaptcha);
                        const verifiedAt = new Date(recaptchaData.verifiedAt);
                        const hoursSinceVerification = (Date.now() - verifiedAt.getTime()) / (1000 * 60 * 60);

                        // reCAPTCHA verification valid for 24 hours
                        if (hoursSinceVerification < 24) {
                            setRecaptchaVerified(true);
                        } else {
                            localStorage.removeItem(RECAPTCHA_VERIFICATION_STORAGE_KEY);
                        }
                    } catch (e) {
                        localStorage.removeItem(RECAPTCHA_VERIFICATION_STORAGE_KEY);
                    }
                }

                const storedVerification = localStorage.getItem(PHONE_VERIFICATION_STORAGE_KEY);

                if (storedVerification) {
                    try {
                        const verificationData = JSON.parse(storedVerification);
                        if (verificationData.verified && verificationData.phoneNumber) {
                            const phoneParts = verificationData.phoneNumber.split(' ');
                            const storedPrefix = phoneParts[0] || verificationData.phonePrefix || '+41';
                            const storedNumber = phoneParts.slice(1).join(' ') || verificationData.phoneNumber.replace(storedPrefix, '').trim();

                            setPhonePrefix(storedPrefix);
                            setPhoneNumber(storedNumber);
                            setInternalStep(3);
                            onStepChange(3);

                            onComplete({
                                phoneNumber: verificationData.phoneNumber,
                                verified: true
                            });
                            return;
                        }
                    } catch (parseError) {
                        console.warn('Failed to parse stored verification data:', parseError);
                        localStorage.removeItem(PHONE_VERIFICATION_STORAGE_KEY);
                    }
                }

                if (currentUser) {
                    try {
                        const userDocRef = doc(db, 'users', currentUser.uid);
                        const userDoc = await getDoc(userDocRef);

                        if (userDoc.exists()) {
                            const userData = userDoc.data();

                            if (userData.isPhoneVerified && (userData.primaryPhone || userData.contact?.primaryPhone)) {
                                const phonePrefix = userData.primaryPhonePrefix || userData.contact?.primaryPhonePrefix || '+41';
                                const phoneNumber = userData.primaryPhone || userData.contact?.primaryPhone || '';

                                if (phoneNumber) {
                                    const fullPhoneNumber = `${phonePrefix} ${phoneNumber}`;

                                    setPhonePrefix(phonePrefix);
                                    setPhoneNumber(phoneNumber);
                                    setInternalStep(3);
                                    onStepChange(3);

                                    localStorage.setItem(PHONE_VERIFICATION_STORAGE_KEY, JSON.stringify({
                                        verified: true,
                                        phoneNumber: fullPhoneNumber,
                                        phonePrefix: phonePrefix,
                                        verifiedAt: userData.phoneVerifiedAt?.toDate?.()?.toISOString() || new Date().toISOString()
                                    }));

                                    onComplete({
                                        phoneNumber: fullPhoneNumber,
                                        verified: true
                                    });
                                }
                            }
                        }
                    } catch (firebaseError) {
                        console.error('Error checking Firebase for phone verification:', firebaseError);
                        verificationCheckDoneRef.current = false;
                    }
                }
            } catch (error) {
                console.error('Error checking phone verification status:', error);
                verificationCheckDoneRef.current = false;
            }
        };

        checkPhoneVerificationStatus();
    }, [currentUser, onComplete, onStepChange]);

    useEffect(() => {
        if (internalStep === 1 && !captchaSetupDoneRef.current) {
            const initializeRecaptcha = async () => {
                if (captchaSetupDoneRef.current) {
                    console.log('⏭️ reCAPTCHA already initialized, skipping...');
                    return;
                }

                const savedResponse = localStorage.getItem(RECAPTCHA_RESPONSE_STORAGE_KEY);
                if (savedResponse) {
                    try {
                        const responseData = JSON.parse(savedResponse);
                        const savedAt = new Date(responseData.savedAt);
                        const hoursSinceSaved = (Date.now() - savedAt.getTime()) / (1000 * 60 * 60);

                        if (hoursSinceSaved < 2 && responseData.response) {
                            setRecaptchaVerified(true);
                        } else {
                            localStorage.removeItem(RECAPTCHA_RESPONSE_STORAGE_KEY);
                        }
                    } catch (e) {
                        localStorage.removeItem(RECAPTCHA_RESPONSE_STORAGE_KEY);
                    }
                }

                await new Promise(resolve => setTimeout(resolve, 500));
                if (!captchaSetupDoneRef.current) {
                    try {
                        await setupRecaptcha();
                    } catch (error) {
                        if (error?.message?.includes('Timeout') || error?.name === 'TimeoutError' || error?.isTimeout) {
                        } else {
                        }
                    }
                }
            };
            initializeRecaptcha();
        } else if (internalStep !== 1) {
            captchaSetupDoneRef.current = false;
        }
    }, [internalStep]);


    useEffect(() => {
        return () => {
            if (recaptchaVerifier) {
                try {
                    recaptchaVerifier.clear();
                } catch (e) {
                    console.warn('Error clearing reCAPTCHA:', e);
                }
            }
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
            if (window.recaptchaWidgetId !== undefined) {
                try {
                    window.grecaptcha?.reset(window.recaptchaWidgetId);
                } catch (e) { }
                window.recaptchaWidgetId = undefined;
            }
            captchaSetupDoneRef.current = false;

            const container = document.getElementById('recaptcha-container-invisible');
            if (container && container.parentNode) {
                container.parentNode.removeChild(container);
            }
        };
    }, [recaptchaVerifier]);

    const startCountdown = () => {
        setCountdown(60);
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(countdownTimerRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const isInitializingRef = React.useRef(false);
    const captchaSetupDoneRef = React.useRef(false);

    const setupRecaptcha = async () => {
        if (isInitializingRef.current) {
            return recaptchaVerifier;
        }

        if (captchaSetupDoneRef.current && recaptchaVerifier) {
            try {
                const widgetId = recaptchaVerifier._widgetId !== undefined ? recaptchaVerifier._widgetId : window.recaptchaWidgetId;
                if (widgetId !== undefined && widgetId !== null && window.grecaptcha) {
                    return recaptchaVerifier;
                }
            } catch (e) {
                captchaSetupDoneRef.current = false;
            }
        }

        if (recaptchaVerifier) {
            try {
                try {
                    recaptchaVerifier.clear();
                } catch (clearErr) {
                    console.warn('Error clearing verifier:', clearErr);
                }
                setRecaptchaVerifier(null);
            } catch (e) {
                console.warn('⚠️ Existing verifier invalid, clearing...', e);
                try {
                    recaptchaVerifier.clear();
                } catch (clearErr) {
                    console.warn('Error clearing verifier:', clearErr);
                }
                setRecaptchaVerifier(null);
            }
        }

        isInitializingRef.current = true;
        try {
            if (!auth || !auth.config) {
                throw new Error('Firebase Auth is not properly initialized');
            }

            let container = document.getElementById('recaptcha-container-invisible');
            if (!container) {
                container = document.createElement('div');
                container.id = 'recaptcha-container-invisible';
                container.style.display = 'none';
                container.style.visibility = 'hidden';
                container.style.position = 'absolute';
                container.style.left = '-9999px';
                document.body.appendChild(container);
            }

            console.log('🔧 Initializing invisible reCAPTCHA with auth domain:', auth.config.authDomain);

            const verifier = new RecaptchaVerifier(auth, 'recaptcha-container-invisible', {
                'size': 'invisible',
                'callback': (response) => {
                    setRecaptchaVerified(true);

                    // Save reCAPTCHA response to localStorage (valid for 2 hours)
                    localStorage.setItem(RECAPTCHA_RESPONSE_STORAGE_KEY, JSON.stringify({
                        response: response,
                        savedAt: new Date().toISOString()
                    }));

                    // Also save verification status (valid for 24 hours)
                    localStorage.setItem(RECAPTCHA_VERIFICATION_STORAGE_KEY, JSON.stringify({
                        verified: true,
                        verifiedAt: new Date().toISOString()
                    }));
                },
                'expired-callback': () => {
                    if (verifier) {
                        try { verifier.clear(); } catch (e) { }
                    }
                    setRecaptchaVerifier(null);
                    setRecaptchaVerified(false);
                    window.recaptchaWidgetId = undefined;
                    captchaSetupDoneRef.current = false;
                    pendingPhoneNumberRef.current = null;
                    localStorage.removeItem(RECAPTCHA_RESPONSE_STORAGE_KEY);
                },
                'error-callback': (error) => {
                    if (verifier) {
                        try { verifier.clear(); } catch (e) { }
                    }
                    setRecaptchaVerifier(null);
                    setRecaptchaVerified(false);
                    window.recaptchaWidgetId = undefined;
                    captchaSetupDoneRef.current = false;
                    pendingPhoneNumberRef.current = null;
                    localStorage.removeItem(RECAPTCHA_RESPONSE_STORAGE_KEY);
                }
            });

            try {
                let widgetId;
                try {
                    widgetId = await Promise.race([
                        verifier.render().catch((renderError) => {
                            if (renderError?.message?.includes('Timeout') || renderError?.name === 'TimeoutError' || renderError?.message === 'Timeout') {
                                console.warn('⚠️ reCAPTCHA render timeout caught (non-critical)');
                                return null;
                            }
                            throw renderError;
                        }),
                        new Promise((_, reject) => {
                            setTimeout(() => {
                                const timeoutError = new Error('reCAPTCHA render timeout');
                                timeoutError.name = 'TimeoutError';
                                timeoutError.isTimeout = true;
                                reject(timeoutError);
                            }, 10000);
                        })
                    ]).catch(async (error) => {
                        if (error.message === 'reCAPTCHA render timeout' || error.message?.includes('Timeout') || error.name === 'TimeoutError') {
                            console.warn('⚠️ reCAPTCHA render timeout, this is usually non-critical');
                            try {
                                if (verifier) {
                                    verifier.clear();
                                }
                            } catch (clearErr) {
                                console.warn('Error clearing verifier after timeout:', clearErr);
                            }
                            return null;
                        }
                        throw error;
                    });
                } catch (renderErr) {
                    if (renderErr?.message?.includes('Timeout') || renderErr?.name === 'TimeoutError' || renderErr?.message === 'Timeout') {
                        console.warn('⚠️ reCAPTCHA render error (timeout, non-critical):', renderErr.message);
                        widgetId = null;
                    } else {
                        throw renderErr;
                    }
                }

                if (widgetId === null) {
                    console.warn('⚠️ reCAPTCHA widget ID is null after timeout, will return null');
                    isInitializingRef.current = false;
                    captchaSetupDoneRef.current = false;
                    return null;
                }

                window.recaptchaWidgetId = widgetId;
                verifier._widgetId = widgetId;

                if (widgetId === undefined && widgetId !== 0 && widgetId !== null) {
                    throw new Error('reCAPTCHA widget ID is invalid');
                }

                await new Promise(resolve => setTimeout(resolve, 300));

                if (!window.grecaptcha) {
                    throw new Error('reCAPTCHA library not fully loaded');
                }

            } catch (renderError) {
                if (renderError?.message?.includes('Timeout') ||
                    renderError?.name === 'TimeoutError' ||
                    renderError?.message === 'reCAPTCHA initialization timeout' ||
                    renderError?.isTimeout) {
                    console.warn('⚠️ reCAPTCHA render timeout (non-critical, will return null):', renderError.message);
                    isInitializingRef.current = false;
                    captchaSetupDoneRef.current = false;
                    return null;
                }
                console.error('❌ ReCAPTCHA render error:', renderError);
                console.error('Render error details:', {
                    code: renderError.code,
                    message: renderError.message,
                    name: renderError.name
                });
                throw renderError;
            }

            setRecaptchaVerifier(verifier);
            captchaSetupDoneRef.current = true;
            return verifier;
        } catch (error) {
            if (error?.message?.includes('Timeout') ||
                error?.name === 'TimeoutError' ||
                error?.isTimeout ||
                (error?.stack && error?.stack.includes('recaptcha') && error?.stack.includes('timeout'))) {
                console.warn('⚠️ reCAPTCHA setup timeout (non-critical):', error.message);
                isInitializingRef.current = false;
                captchaSetupDoneRef.current = false;
                return null;
            }

            console.error('❌ Error setting up reCAPTCHA:', error);
            console.error('Error details:', {
                code: error.code,
                message: error.message,
                name: error.name,
                stack: error.stack,
                authDomain: auth?.config?.authDomain,
                currentDomain: window.location.hostname
            });

            if (recaptchaVerifier) {
                try { recaptchaVerifier.clear(); } catch (e) { }
                setRecaptchaVerifier(null);
            }
            window.recaptchaWidgetId = undefined;
            captchaSetupDoneRef.current = false;

            const container = document.getElementById('recaptcha-container-invisible');
            if (container && container.parentNode) {
                try {
                    container.parentNode.removeChild(container);
                } catch (e) {
                    console.warn('Error removing invisible container:', e);
                }
            }

            if (error.code === 'auth/internal-error' || error.code === 'auth/internal-error-encountered') {
                const domain = window.location.hostname;
                showError(`Phone verification configuration error. Please ensure: 1) Domain "${domain}" is authorized in Firebase Console, 2) Phone authentication is enabled, 3) reCAPTCHA is properly configured. Check console for details.`);
            } else {
                showError(t('auth.errors.recaptchaFailed', 'Security check initialization failed. Please refresh and try again.'));
            }
            return null;
        } finally {
            isInitializingRef.current = false;
        }
    };


    const handleSendCode = useCallback(async () => {
        if (!isValidPhone) {
            return Promise.resolve();
        }
        setIsLoading(true);

        const { cleanNumber, cleanPrefix, fullNumber } = formatPhoneNumber(phoneNumber, phonePrefix);

        // Update local state with cleaned values for better UI feedback
        setPhoneNumber(cleanNumber);
        setPhonePrefix(cleanPrefix);

        if (!/^\+[1-9]\d{1,14}$/.test(fullNumber)) {
            showError('Invalid phone number format. Please enter a valid international phone number.');
            setIsLoading(false);
            return;
        }

        if (fullNumber.length < 10 || fullNumber.length > 16) {
            showError('Phone number must be between 10 and 16 digits (including country code).');
            setIsLoading(false);
            return;
        }

        console.log('📱 Phone Verification Request:', fullNumber);
        console.log('🔍 Current domain:', window.location.hostname);
        console.log('🔍 Current origin:', window.location.origin);

        try {
            let verifier = recaptchaVerifier;

            if (!verifier || window.recaptchaWidgetId === undefined || !captchaSetupDoneRef.current) {
                verifier = await setupRecaptcha();
                if (!verifier) {
                    throw new Error('reCAPTCHA could not be initialized');
                }
                await new Promise(resolve => setTimeout(resolve, 300));
            } else {
            }


            if (!window.grecaptcha) {
                throw new Error('reCAPTCHA library not loaded');
            }

            const phoneProvider = new PhoneAuthProvider(auth);

            let vid;
            try {
                vid = await Promise.race([
                    phoneProvider.verifyPhoneNumber(fullNumber, verifier).catch((error) => {
                        if (error?.message?.includes('Timeout') || error?.name === 'TimeoutError') {
                            console.warn('⚠️ Phone verification timeout from Firebase (non-critical)');
                            const timeoutError = new Error('Verification request timed out. Please try again.');
                            timeoutError.name = 'TimeoutError';
                            timeoutError.isTimeout = true;
                            throw timeoutError;
                        }
                        throw error;
                    }),
                    new Promise((_, reject) => {
                        setTimeout(() => {
                            const timeoutError = new Error('Phone verification timeout');
                            timeoutError.name = 'TimeoutError';
                            timeoutError.isTimeout = true;
                            reject(timeoutError);
                        }, 30000);
                    })
                ]).catch((error) => {
                    if (error.message?.includes('Timeout') || error.name === 'TimeoutError' || error.message === 'Phone verification timeout') {
                        console.warn('⚠️ Phone verification timeout (non-critical)');
                        const timeoutError = new Error('Verification request timed out. Please try again.');
                        timeoutError.name = 'TimeoutError';
                        timeoutError.isTimeout = true;
                        throw timeoutError;
                    }
                    throw error;
                });
            } catch (timeoutError) {
                if (timeoutError?.message?.includes('timeout') || timeoutError?.message?.includes('Timeout')) {
                    throw new Error('Verification request timed out. Please try again.');
                }
                throw timeoutError;
            }


            setPhoneVerificationId(vid);

            setInternalStep(2);
            onStepChange(2);
            startCountdown();
            showSuccess(t('auth.success.codeSent', 'Verification code sent to your phone.'));
        } catch (error) {

            let errorMessage = t('auth.errors.verificationFailed', 'Could not send verification code.');

            if (error.code === 'auth/internal-error-encountered' || error.code === 'auth/internal-error') {
                const domain = window.location.hostname;
                const isLocalhost = domain === 'localhost' || domain === '127.0.0.1';


                if (window.grecaptcha && window.recaptchaWidgetId !== undefined) {
                    try {
                        window.grecaptcha.getResponse(window.recaptchaWidgetId);
                    } catch (e) {
                    }
                }

                if (isLocalhost) {
                    errorMessage = `Phone verification error. This may be a temporary Firebase service issue.\n\nIf it persists:\n1. Check Firebase Console > Authentication > Settings\n2. Verify Phone authentication is enabled\n3. Check reCAPTCHA configuration\n4. Try again in a few minutes\n\nCurrent: ${domain}:${window.location.port || ''}`;
                } else {
                    errorMessage = `Phone verification failed. This may be a temporary Firebase service issue.\n\nPlease:\n1. Check Firebase Console > Authentication > Settings\n2. Verify Phone authentication is enabled\n3. Check reCAPTCHA configuration\n4. Try again in a few minutes`;
                }

            } else if (error.code === 'auth/invalid-phone-number') {
                errorMessage = 'Invalid phone number format. Please check your entry.';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Too many verification attempts. Please wait a few minutes before requesting a new code. This helps prevent abuse.';
            } else if (error.code === 'auth/quota-exceeded') {
                errorMessage = 'SMS quota exceeded. Please try again later or contact support.';
            } else if (error.message && error.message.includes('reCAPTCHA')) {
                errorMessage = 'Security verification failed. Please refresh the page and try again.';
            }

            showError(errorMessage);

            if (recaptchaVerifier) {
                try {
                    recaptchaVerifier.clear();
                } catch (e) {
                }
                setRecaptchaVerifier(null);
            }
            if (window.recaptchaWidgetId !== undefined && window.recaptchaWidgetId !== null) {
                try {
                    if (window.grecaptcha) {
                        window.grecaptcha.reset(window.recaptchaWidgetId);
                    }
                } catch (e) {
                }
                window.recaptchaWidgetId = undefined;
            }
            captchaSetupDoneRef.current = false;
        } finally {
            setIsLoading(false);
        }
    }, [isValidPhone, phoneNumber, phonePrefix, recaptchaVerifier, captchaSetupDoneRef, onStepChange, showError, showSuccess, t, currentUser, auth]);

    const handleVerifyCode = useCallback(async () => {
        if (!verificationCode || verificationCode.length < 6) {
            showError(t('auth.errors.invalidCode', 'Please enter a valid 6-digit code.'));
            return Promise.resolve();
        }

        if (!verificationId) {
            showError(t('auth.errors.verificationExpired', 'Verification session expired. Please request a new code.'));
            setInternalStep(1);
            onStepChange(1);
            return Promise.resolve();
        }

        setIsLoading(true);
        try {
            const { cleanNumber, cleanPrefix } = formatPhoneNumber(phoneNumber, phonePrefix);
            const fullPhoneNumber = `${cleanPrefix} ${cleanNumber}`;

            const phoneCredential = PhoneAuthProvider.credential(verificationId, verificationCode);

            if (currentUser) {
                try {
                    await linkWithCredential(auth.currentUser, phoneCredential);
                } catch (linkError) {
                    if (linkError.code === 'auth/credential-already-in-use' || 
                        linkError.code === 'auth/provider-already-linked' ||
                        linkError.code === 'auth/account-exists-with-different-credential') {
                        showError(t('auth.errors.phoneAlreadyInUse', 'This phone number is already registered with another account. Please use a different phone number.'));
                        setIsLoading(false);
                        return;
                    }
                    
                    if (linkError.code === 'auth/invalid-verification-code') {
                        showError(t('auth.errors.invalidPhoneCode', 'Invalid verification code. Please check and try again.'));
                        setIsLoading(false);
                        return;
                    }
                    
                    if (linkError.code === 'auth/code-expired') {
                        showError(t('auth.errors.codeExpired', 'Verification code has expired. Please request a new code.'));
                        setInternalStep(1);
                        onStepChange(1);
                        setIsLoading(false);
                        return;
                    }

                    console.error('Phone linking error:', linkError);
                    throw linkError;
                }
            }

            const verificationData = {
                verified: true,
                phoneNumber: fullPhoneNumber,
                phonePrefix: phonePrefix,
                verifiedAt: new Date().toISOString()
            };

            localStorage.setItem(PHONE_VERIFICATION_STORAGE_KEY, JSON.stringify(verificationData));

            setInternalStep(3);
            onStepChange(3);

            onComplete({
                phoneNumber: fullPhoneNumber,
                verified: true
            });

            showSuccess(t('auth.success.phoneVerified', 'Phone number verified successfully!'));
        } catch (error) {
            console.error('Error verifying code:', error);
            
            if (error.code === 'auth/invalid-verification-code') {
                showError(t('auth.errors.invalidPhoneCode', 'Invalid verification code. Please check and try again.'));
            } else if (error.code === 'auth/code-expired') {
                showError(t('auth.errors.codeExpired', 'Verification code has expired. Please request a new code.'));
                setInternalStep(1);
                onStepChange(1);
            } else {
                showError(t('auth.errors.verificationFailed', 'Verification failed. Please try again.'));
            }
        } finally {
            setIsLoading(false);
        }
    }, [verificationCode, verificationId, phoneNumber, phonePrefix, currentUser, onStepChange, showError, showSuccess, t, onComplete]);

    useImperativeHandle(ref, () => ({
        handleSendCode,
        handleVerifyCode,
        isLoading,
        internalStep,
        recaptchaVerified,
        isValidPhone
    }), [handleSendCode, handleVerifyCode, isLoading, internalStep, recaptchaVerified, isValidPhone, onComplete]);

    const iconColor = 'var(--color-logo-1)';
    
    return (
        <div className="space-y-6">
            {internalStep === 1 ? (
                <div className="space-y-6">
                    <div className="text-center space-y-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 text-white shadow-sm onboarding-icon-no-transition" style={{ backgroundColor: iconColor, transition: 'none', WebkitTransition: 'none', MozTransition: 'none', OTransition: 'none', transitionProperty: 'none', transitionDuration: '0s', transitionDelay: '0s' }}>
                            <FiMessageSquare className="w-6 h-6" style={{ transition: 'none' }} />
                        </div>
                        <h2 className="text-2xl font-bold">Mobile Verification</h2>
                        <p className="text-muted-foreground text-sm max-w-md mx-auto">Enter your phone number to receive a secure identity code.</p>
                    </div>

                    <div className="flex gap-4 items-end">
                        <div className="w-1/2 text-left">
                            <SimpleDropdown
                                label={t('dashboardProfile:personalDetails.phonePrefix', 'Prefix')}
                                options={effectivePhonePrefixOptions}
                                value={phonePrefix}
                                onChange={setPhonePrefix}
                                required
                            />
                        </div>
                        <div className="flex-1 text-left">
                            <PersonnalizedInputField
                                label={t('dashboardProfile:personalDetails.phoneNumber', 'Phone Number')}
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="79 123 45 67"
                                type="tel"
                                required
                            />
                        </div>
                    </div>
                </div>
            ) : internalStep === 2 ? (
                <div className="space-y-6">
                    <div className="text-center space-y-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 text-white shadow-sm onboarding-icon-no-transition" style={{ backgroundColor: iconColor, transition: 'none', WebkitTransition: 'none', MozTransition: 'none', OTransition: 'none', transitionProperty: 'none', transitionDuration: '0s', transitionDelay: '0s' }}>
                            <FiCheck className="w-6 h-6" style={{ transition: 'none' }} />
                        </div>
                        <h2 className="text-2xl font-bold">Secured Code</h2>
                        <p className="text-muted-foreground text-sm max-w-md mx-auto">We sent a verification code to {phonePrefix} {phoneNumber}.</p>
                    </div>

                    <div className="space-y-6">
                        <PersonnalizedInputField
                            label={t('auth.verificationCode', 'Verification Code')}
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value)}
                            placeholder="······"
                            maxLength={6}
                            required
                            className="text-center text-4xl tracking-widest font-black"
                        />

                        <div className="flex flex-col items-center gap-4">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={handleSendCode}
                                    disabled={isLoading || countdown > 0}
                                    className={`flex items-center gap-2 text-sm font-bold transition-all ${countdown > 0 ? 'text-muted-foreground cursor-not-allowed' : 'text-primary hover:text-primary/80'}`}
                                >
                                    <FiRefreshCw className={`${isLoading ? 'animate-spin' : ''} ${countdown > 0 ? '' : 'hover:rotate-180 transition-transform duration-500'}`} />
                                    {countdown > 0 ? `Resend in ${countdown}s` : `Send code again`}
                                </button>
                                <span className="text-muted-foreground">|</span>
                                <button
                                    onClick={() => {
                                        setInternalStep(1);
                                        onStepChange(1);
                                    }}
                                    className="text-sm font-bold text-muted-foreground hover:text-foreground"
                                >
                                    Change number
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="text-center space-y-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 text-white shadow-sm onboarding-icon-no-transition" style={{ backgroundColor: iconColor, transition: 'none', WebkitTransition: 'none', MozTransition: 'none', OTransition: 'none', transitionProperty: 'none', transitionDuration: '0s', transitionDelay: '0s' }}>
                            <FiCheck className="w-6 h-6" style={{ transition: 'none' }} />
                        </div>
                        <h2 className="text-2xl font-bold">Phone Verified</h2>
                        <p className="text-muted-foreground text-sm max-w-md mx-auto">Your phone number {phonePrefix} {phoneNumber} has been successfully verified.</p>
                    </div>

                    <div className="bg-muted/50 p-6 rounded-xl border border-border text-center">
                        <div className="flex items-center justify-center gap-3 text-foreground">
                            <FiCheck className="w-6 h-6" />
                            <span className="text-lg font-bold">Verification Complete</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

PhoneVerificationStep.propTypes = {
    onComplete: PropTypes.func.isRequired,
    onStepChange: PropTypes.func.isRequired,
    onValidationChange: PropTypes.func.isRequired,
    initialPhoneNumber: PropTypes.string,
    initialPhonePrefix: PropTypes.string,
};

PhoneVerificationStep.displayName = 'PhoneVerificationStep';

export default PhoneVerificationStep;
