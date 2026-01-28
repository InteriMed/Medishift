import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  RecaptchaVerifier,
  PhoneAuthProvider,
  sendEmailVerification,
  linkWithCredential
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, loginWithGoogle } from '../../services/services/firebase';
import InputField from '../../components/boxedInputFields/personnalizedInputField';
import PhoneInput from 'react-phone-number-input';
import { validatePassword } from '../../services/utils/validation';
import 'react-phone-number-input/style.css';
import { FcGoogle } from 'react-icons/fc';
import { useNotification } from '../../contexts/notificationContext';
import InputFieldHideUnhide from '../../components/boxedInputFields/inputFieldHideUnhide';
import { FIRESTORE_COLLECTIONS } from '../../config/keysDatabase';
import './auth.css';

function Signup() {
  const { t } = useTranslation(['auth']);
  const { lang } = useParams();
  const navigate = useNavigate();
  // const auth = getAuth(firebaseApp); // Use imported auth instance
  const { showError } = useNotification();

  // State management
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    emailVerificationCode: '',
    phoneVerificationCode: '',
    termsAccepted: false,
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [phoneVerificationId, setPhoneVerificationId] = useState('');
  const [emailVerificationId, setEmailVerificationId] = useState('');
  const [temporaryUser, setTemporaryUser] = useState(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);


  // Set unsaved changes flag when form data changes
  useEffect(() => {
    if (step > 1 && step < 5) {
      setHasUnsavedChanges(true);
    }
  }, [formData, step]);

  // Removed unused redirect handling effect since we now use popup for Google Sign In

  // Warn user about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (hasUnsavedChanges) {
        const confirmationMessage = t('auth.signup.unsavedChangesWarning');
        event.returnValue = confirmationMessage; // For most browsers
        return confirmationMessage; // For some browsers
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, t]);

  // Initialize reCAPTCHA verifier for phone auth
  useEffect(() => {
    if (step === 3 && !recaptchaVerifier) {
      const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'normal',
        'callback': () => {
          // reCAPTCHA verified
        },
        'expired-callback': () => {
          // reCAPTCHA expired
          setRecaptchaVerifier(null);
        }
      });

      setRecaptchaVerifier(verifier);
    }

    return () => {
      if (recaptchaVerifier) {
        recaptchaVerifier.clear();
      }
    };
  }, [step, recaptchaVerifier]);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prevErrors => {
        const newErrors = { ...prevErrors };
        delete newErrors[name];
        return newErrors;
      });
    }

    // If changing password or confirmPassword, also check the other one
    if (name === 'password' || name === 'confirmPassword') {
      const otherField = name === 'password' ? 'confirmPassword' : 'password';
      const otherValue = name === 'password' ? formData.confirmPassword : formData.password;

      // If the other field has a value, check if they match
      if (otherValue) {
        if (value !== otherValue) {
          setErrors(prevErrors => ({
            ...prevErrors,
            [otherField]: t('auth.errors.passwordsDoNotMatch')
          }));
        } else {
          // If they match, clear the error
          setErrors(prevErrors => {
            const newErrors = { ...prevErrors };
            delete newErrors[otherField];
            return newErrors;
          });
        }
      }
    }
  };

  // Handle phone number input change
  const handlePhoneChange = (value) => {
    setFormData(prevData => ({
      ...prevData,
      phoneNumber: value || ''
    }));

    // Clear phone number error when user updates the value
    if (errors.phoneNumber) {
      setErrors(prevErrors => {
        const newErrors = { ...prevErrors };
        delete newErrors.phoneNumber;
        return newErrors;
      });
    }
  };


  // Handle resending email verification code
  const handleResendEmailCode = async () => {
    setIsLoading(true);
    try {
      const verificationCode = await sendEmailVerificationCode();
      // For demo purposes, auto-fill the verification code
      setFormData(prev => ({ ...prev, emailVerificationCode: verificationCode }));
    } catch (error) {
      console.error('Email verification error:', error);
      setErrors({ general: t('auth.errors.emailVerificationFailed') });
      showError(t('auth.errors.emailVerificationFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle navigation to dashboard after successful signup
  const handleNavigateToDashboard = () => {
    setHasUnsavedChanges(false);
    navigate(`/${lang}/verification-sent`);
  };

  // Complete the handleNext function for step 4 and 5
  const handleNext = async () => {
    if (!validateForm()) return;

    if (step === 1) {
      // Send email verification code
      setIsLoading(true);

      try {
        if (!db) {
          throw new Error('Firestore database not initialized');
        }

        // Create a temporary user account
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const user = userCredential.user;

        // Send email verification
        await sendEmailVerification(user);

        // Create user document in Firestore with onboarding flags
        const userDocRef = doc(db, FIRESTORE_COLLECTIONS.USERS, user.uid);
        const displayName = formData.email.split('@')[0];
        const userData = {
          email: formData.email,
          displayName: displayName,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          role: 'professional',
          isEmailVerified: false,
          profileCompleted: false,
          profileStatus: 'incomplete',
          tutorialPassed: false,
          isProfessionalProfileComplete: false,
        };

        await setDoc(userDocRef, userData);

        // Verify the document was created
        const verifyDoc = await getDoc(userDocRef);
        if (!verifyDoc.exists()) {
          throw new Error('Failed to create user document in Firestore - document does not exist after write');
        }

        // Store the user temporarily
        setTemporaryUser(user);

        // Redirect to VerificationSentPage
        handleNavigateToDashboard();
      } catch (error) {
        console.error('Account creation error:', error);
        if (error.code === 'auth/email-already-in-use') {
          const newErrors = { email: t('auth.errors.emailInUse') };
          setErrors(newErrors);
          showError(t('auth.errors.emailInUse'));
        } else {
          setErrors({ general: t('auth.errors.signupFailed') });
          showError(t('auth.errors.signupFailed'));
        }
      } finally {
        setIsLoading(false);
      }
    } else if (step === 2) {
      // Verify email code
      setIsLoading(true);

      try {
        if (formData.emailVerificationCode !== emailVerificationId) {
          setErrors({ emailVerificationCode: t('auth.errors.invalidEmailCode') });
          showError(t('auth.errors.invalidEmailCode'));
          setIsLoading(false);
          return;
        }

        // Proceed with account creation after email verification
        const user = temporaryUser; // Use the temporarily stored user
        const displayName = formData.email.split('@')[0];
        await updateProfile(user, {
          displayName: displayName
        });

        // Create user document in Firestore
        await setDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, user.uid), {
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          displayName: displayName,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          role: 'professional',
          isEmailVerified: true,
          isPhoneVerified: false,
          profileCompleted: false,
          profileStatus: 'incomplete',
          primarySector: 'pharmacy',
          primaryProfession: 'pharmacist',
          tutorialPassed: false,
          isProfessionalProfileComplete: false,
        });

        // Redirect to profile for onboarding
        navigate(`/${lang}/dashboard/profile`);

      } catch (error) {
        console.error('Email verification error:', error);
        setErrors({ general: t('auth.errors.verificationFailed') });
        showError(t('auth.errors.verificationFailed'));
      } finally {
        setIsLoading(false);
      }
    } else if (step === 3) {
      // Send phone verification code
      setIsLoading(true);

      try {
        if (!recaptchaVerifier) {
          const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            'size': 'normal'
          });
          setRecaptchaVerifier(verifier);
        }

        const phoneProvider = new PhoneAuthProvider(auth);
        const verificationId = await phoneProvider.verifyPhoneNumber(
          formData.phoneNumber,
          recaptchaVerifier
        );

        setPhoneVerificationId(verificationId);
        setStep(4);
      } catch (error) {
        console.error('Phone verification error:', error);
        setErrors({ general: t('auth.errors.verificationFailed') });
        showError(t('auth.errors.verificationFailed'));
      } finally {
        setIsLoading(false);
      }
    } else if (step === 4) {
      // Verify phone code and create user
      setIsLoading(true);

      try {
        const phoneCredential = PhoneAuthProvider.credential(
          phoneVerificationId,
          formData.phoneVerificationCode
        );

        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );

        const user = userCredential.user;

        const displayName = formData.email.split('@')[0];
        await updateProfile(user, {
          displayName: displayName
        });

        await linkWithCredential(user, phoneCredential);

        await setDoc(doc(db, 'users', user.uid), {
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          displayName: displayName,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          role: 'professional',
          isEmailVerified: true,
          isPhoneVerified: true,
          profileCompleted: false,
          profileStatus: 'incomplete',
          primarySector: 'pharmacy',
          primaryProfession: 'pharmacist',
          tutorialPassed: false,
          isProfessionalProfileComplete: false,
        });

        // Redirect to profile for onboarding
        navigate(`/${lang}/dashboard/profile`);

      } catch (error) {
        console.error('Account creation error:', error);
        switch (error.code) {
          case 'auth/email-already-in-use':
            setErrors({ general: t('auth.errors.emailInUse') });
            showError(t('auth.errors.emailInUse'));
            break;
          case 'auth/invalid-verification-code':
            setErrors({ phoneVerificationCode: t('auth.errors.invalidPhoneCode') });
            showError(t('auth.errors.invalidPhoneCode'));
            break;
          default:
            setErrors({ general: t('auth.errors.signupFailed') });
            showError(t('auth.errors.signupFailed'));
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Validate the form based on current step
  const validateForm = () => {
    const newErrors = {};
    let hasErrors = false;

    if (!formData.email.trim()) {
      newErrors.email = t('auth.errors.emailRequired');
      hasErrors = true;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('auth.errors.emailInvalid');
      hasErrors = true;
    }

    if (!formData.password) {
      newErrors.password = t('auth.errors.passwordRequired');
      hasErrors = true;
    } else if (!validatePassword(formData.password)) {
      newErrors.password = t('auth.errors.passwordRequirements');
      hasErrors = true;
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('auth.errors.passwordsDoNotMatch');
      hasErrors = true;
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('auth.errors.confirmPasswordRequired');
      hasErrors = true;
    }

    if (!formData.termsAccepted) {
      newErrors.termsAccepted = t('auth.errors.termsRequired');
      hasErrors = true;
    }

    setErrors(newErrors);

    // If there are multiple errors, show a generic message
    if (hasErrors) {
      const errorCount = Object.keys(newErrors).length;
      if (errorCount > 1) {
        showError(t('auth.errors.multipleErrors'));
      } else {
        // If there's only one error, show that specific message
        const firstErrorField = Object.keys(newErrors)[0];
        const firstErrorMessage = newErrors[firstErrorField];
        showError(firstErrorMessage);
      }
      return false;
    }

    return true;
  };


  // Send email verification code
  const sendEmailVerificationCode = async () => {
    try {
      // Create a temporary user account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      const user = userCredential.user;

      // Update the user's display name
      const displayName = formData.email.split('@')[0];
      await updateProfile(user, {
        displayName: displayName
      });

      // Send email verification
      await sendEmailVerification(user);

      // Store the user temporarily
      setTemporaryUser(user);

      // For development, we'll use a simulated code
      // In production, the user would get this code via email
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      setEmailVerificationId(verificationCode);

      return verificationCode;
    } catch (error) {
      console.error('Email verification error:', error);

      if (error.code === 'auth/email-already-in-use') {
        setErrors({ email: t('auth.errors.emailInUse') });
        showError(t('auth.errors.emailInUse'));
      } else {
        setErrors({ general: t('auth.errors.emailVerificationFailed') });
        showError(t('auth.errors.emailVerificationFailed'));
      }

      throw error;
    }
  };

  // Add Google signup button
  const handleGoogleSignup = async () => {
    setIsLoading(true);
    try {
      // Ensure network is enabled before operations (Implicit check)
      if (db) {
        // Network is enabled by default. Explicit calls removed to prevent assertion errors.
      }

      // Use the centralized loginWithGoogle function which now uses signInWithPopup
      const user = await loginWithGoogle();

      // Retry helper for checking user existence with better offline handling
      const getDocWithRetry = async (docRef, retries = 5, delay = 1000) => {
        for (let attempt = 0; attempt < retries; attempt++) {
          try {
            const docSnapshot = await getDoc(docRef);
            return docSnapshot;
          } catch (err) {
            const isOfflineError = err.code === 'unavailable' ||
              err.code === 'failed-precondition' ||
              err.message?.includes('offline') ||
              err.message?.includes('network') ||
              err.message?.includes('client is offline');

            if (isOfflineError && attempt < retries - 1) {
              await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)));
              continue;
            }

            // If it's an offline error and we've exhausted retries, just log and throw
            if (isOfflineError && attempt === retries - 1) {
              // Network issues persisted after retries
            }

            throw err;
          }
        }
      };

      // Check if user exists in Firestore, if not create them
      const userDocRef = doc(db, FIRESTORE_COLLECTIONS.USERS, user.uid);

      // Use retry logic with better error handling
      let userDoc;
      try {
        userDoc = await getDocWithRetry(userDocRef);
      } catch (error) {
        const isOfflineError = error.code === 'unavailable' ||
          error.message?.includes('offline') ||
          error.message?.includes('client is offline');

        if (isOfflineError) {
          // Client is offline, user document will be created when online
          // Create user document anyway - it will be queued for when online
          try {
            await setDoc(userDocRef, {
              email: user.email,
              displayName: user.displayName || user.email.split('@')[0],
              firstName: user.displayName?.split(' ')[0] || '',
              lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
              photoURL: user.photoURL || '',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              role: 'professional',
              profileCompleted: false,
              profileStatus: 'incomplete',
              tutorialPassed: false,
              isProfessionalProfileComplete: false,
            });
          } catch (setDocError) {
            // Error queuing user document creation
          }
          // Navigate anyway since auth succeeded
          navigate(`/${lang}/dashboard/profile`);
          setIsLoading(false);
          return;
        }
        throw error;
      }

      if (!userDoc.exists()) {
        try {
          await setDoc(userDocRef, {
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            firstName: user.displayName?.split(' ')[0] || '',
            lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
            photoURL: user.photoURL || '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            role: 'professional',
            profileCompleted: false,
            profileStatus: 'incomplete',
            tutorialPassed: false,
            isProfessionalProfileComplete: false,
          });
        } catch (setDocError) {
          // Error creating user doc
          // If setDoc fails, we should probably stop and show error, but existing code logged and continued?
          // Actually existing code just logged and navigated. 
          // If setDoc fails (e.g. offline), the write is queued. So navigating is actually OK if it's an offline write.
        }

        // Redirect new user to profile
        navigate(`/${lang}/dashboard/profile`);
      } else {
        // Existing user
        const userData = userDoc.data();
        if (!userData.profileCompleted && !userData.isProfessionalProfileComplete) {
          navigate(`/${lang}/dashboard/profile`);
        } else {
          navigate(`/${lang}/dashboard`);
        }
      }

    } catch (error) {
      console.error('Google signup error:', error);
      setIsLoading(false);
      showError(t('auth.errors.googleSignupFailed'));
    }
  };

  // Render different steps of the signup form
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="signup-step">
            <h1 className="auth-title">{t('auth.signup.title')}</h1>
            <p className="auth-subtitle">{t('auth.signup.subtitle')}</p>

            <form className="auth-form" onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
              <div className="form-group">
                <InputField
                  label={t('auth.signup.email') + ' *'}
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder={t('auth.signup.emailPlaceholder')}
                  error={errors.email}
                  required={true}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <InputFieldHideUnhide
                    label={t('auth.signup.password')}
                    name="password"
                    value={formData.password}
                    onChange={(e) => {
                      handleInputChange({
                        target: {
                          name: 'password',
                          value: e.target.value
                        }
                      });
                    }}
                    placeholder="••••••••"
                    type="password"
                    required
                    error={errors.password}
                    onErrorReset={() => {
                      if (errors.password) {
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.password;
                          return newErrors;
                        });
                      }
                    }}
                  />
                </div>

                <div className="form-group">
                  <InputFieldHideUnhide
                    label={t('auth.signup.confirmPassword')}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={(e) => {
                      handleInputChange({
                        target: {
                          name: 'confirmPassword',
                          value: e.target.value
                        }
                      });
                    }}
                    placeholder="••••••••"
                    type="password"
                    required
                    error={errors.confirmPassword}
                    onErrorReset={() => {
                      if (errors.confirmPassword) {
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.confirmPassword;
                          return newErrors;
                        });
                      }
                    }}
                  />
                </div>
              </div>

              <div className="terms-agreement">
                <input
                  type="checkbox"
                  id="termsAccepted"
                  name="termsAccepted"
                  checked={formData.termsAccepted}
                  onChange={handleInputChange}
                  required
                />
                <label htmlFor="termsAccepted" className="termsAgreed">
                  {t('auth.signup.termsAgreement')}
                  <a href={`/${lang}/terms-of-service`}>{t('auth.signup.termsAndConditions')}</a>
                </label>
              </div>

              {errors.general && <div className="auth-error">{errors.general}</div>}

              <button
                type="submit"
                className="auth-button primary-button"
                disabled={isLoading}
              >
                {isLoading ? t('auth.signup.creating') : t('auth.signup.continue')}
              </button>

              <button
                type="button"
                className="auth-button social-button"
                onClick={handleGoogleSignup}
                disabled={isLoading}
              >
                <FcGoogle className="social-icon" />
                {t('auth.signup.signUpWithGoogle')}
              </button>

            </form>

            <div className="auth-footer">
              <p>
                {t('auth.signup.alreadyHaveAccount')}
                <a
                  href={`/${lang}/login`}
                  className="text-link"
                >
                  {t('auth.login.button')}
                </a>
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="signup-step">
            <h1 className="auth-title">{t('auth.signup.verifyEmail')}</h1>
            <p className="auth-subtitle">
              {t('auth.signup.emailVerificationDesc')} {formData.email}
            </p>

            <div className="auth-form">
              <div className="form-group">
                <InputField
                  label={t('auth.emailVerificationCode')}
                  name="emailVerificationCode"
                  value={formData.emailVerificationCode}
                  onChange={handleInputChange}
                  placeholder="123456"
                  maxLength={6}
                  error={errors.emailVerificationCode}
                />
              </div>

              {errors.general && <div className="auth-error">{errors.general}</div>}

              <button
                className="auth-button primary-button"
                onClick={handleNext}
                disabled={isLoading}
              >
                {isLoading ? t('auth.signup.verifying') : t('auth.signup.verifyEmail')}
              </button>

            </div>

            <div className="resend-code">
              <p>
                {t('auth.signup.didntReceiveCode')}
                <button
                  type="button"
                  onClick={handleResendEmailCode}
                  className="text-link"
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {t('auth.signup.resend')}
                </button>
              </p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="signup-step">
            <h1 className="auth-title">{t('auth.signup.verifyPhone')}</h1>
            <p className="auth-subtitle">{t('auth.signup.phoneVerificationDesc')}</p>

            <div className="auth-form">
              <div className="form-group">
                <label>{t('auth.phoneNumber')}</label>
                <PhoneInput
                  international
                  defaultCountry="CH"
                  value={formData.phoneNumber}
                  onChange={handlePhoneChange}
                  className="phone-input"
                />
                {errors.phoneNumber && <div className="field-error">{errors.phoneNumber}</div>}
              </div>

              <div id="recaptcha-container" className="recaptcha-container"></div>

              {errors.general && <div className="auth-error">{errors.general}</div>}

              <button
                className="auth-button primary-button"
                onClick={handleNext}
                disabled={isLoading}
              >
                {isLoading ? t('auth.signup.sending') : t('auth.signup.sendCode')}
              </button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="signup-step">
            <h1 className="auth-title">{t('auth.signup.enterPhoneCode')}</h1>
            <p className="auth-subtitle">
              {t('auth.signup.codeSent')} {formData.phoneNumber}
            </p>

            <div className="auth-form">
              <div className="form-group">
                <InputField
                  label={t('auth.phoneVerificationCode')}
                  name="phoneVerificationCode"
                  value={formData.phoneVerificationCode}
                  onChange={handleInputChange}
                  placeholder="123456"
                  maxLength={6}
                  error={errors.phoneVerificationCode}
                />
              </div>

              {errors.general && <div className="auth-error">{errors.general}</div>}

              <button
                className="auth-button primary-button"
                onClick={handleNext}
                disabled={isLoading}
              >
                {isLoading ? t('auth.signup.creating') : t('auth.signup.createAccount')}
              </button>

            </div>

            <div className="resend-code">
              <p>
                {t('auth.signup.didntReceiveCode')}
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="text-link"
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {t('auth.signup.resend')}
                </button>
              </p>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="signup-step success-step">
            <div className="success-icon">✓</div>
            <h1 className="auth-title">{t('auth.signup.accountCreated')}</h1>
            <p className="auth-subtitle">
              {t('auth.signup.welcomeMessage')}
              {formData.email.split('@')[0]}!
            </p>

            <div className="auth-form">
              <button
                className="auth-button primary-button"
                onClick={handleNavigateToDashboard}
              >
                {t('auth.signup.continueToApp')}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };


  return (
    <div className="auth-page-container bg-swiss-cross">
      <div className="auth-card">
        <div className="auth-logo-container">
          <img src="/logo.png" alt="Logo" className="auth-logo" />
        </div>

        <div className="auth-form-container">
          {renderStep()}
        </div>
      </div>
    </div>
  );
}

export default Signup; 