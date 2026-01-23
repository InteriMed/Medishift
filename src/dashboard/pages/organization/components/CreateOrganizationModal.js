import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../contexts/AuthContext';
import { useNotification } from '../../../../contexts/NotificationContext';
import { RecaptchaVerifier, PhoneAuthProvider, linkWithCredential } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, auth, functions } from '../../../../services/firebase';
import { FIRESTORE_COLLECTIONS } from '../../../../config/keysDatabase';
import Button from '../../../../components/BoxedInputFields/Button';
import SimpleDropdown from '../../../../components/BoxedInputFields/Dropdown-Field';
import PersonnalizedInputField from '../../../../components/BoxedInputFields/Personnalized-InputField';
import { useDropdownOptions } from '../../../pages/profile/utils/DropdownListsImports';
import { FiX, FiPhone, FiCheck } from 'react-icons/fi';
import { formatPhoneNumber } from '../../../onboarding/utils/glnVerificationUtils';

const CreateOrganizationModal = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation(['organization', 'dashboard', 'common', 'dashboardProfile']);
  const { currentUser } = useAuth();
  const { showNotification } = useNotification();
  const { phonePrefixOptions } = useDropdownOptions();

  const [step, setStep] = useState(1);
  const [phonePrefix, setPhonePrefix] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneVerificationId, setPhoneVerificationId] = useState('');
  const [phoneVerificationCode, setPhoneVerificationCode] = useState('');
  const [recaptchaVerifier, setRecaptchaVerifier] = useState(null);
  const [recaptchaVerified, setRecaptchaVerified] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [orgName, setOrgName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const recaptchaContainerRef = useRef(null);

  useEffect(() => {
    if (isOpen && step === 1 && !recaptchaVerifier && !phoneVerified) {
      const initRecaptcha = async (attempt = 0) => {
        const container = document.getElementById('recaptcha-container-org-create');

        if (container) {
          if (container.children.length > 0) {
            container.innerHTML = '';
          }

          try {
            const verifier = new RecaptchaVerifier(auth, 'recaptcha-container-org-create', {
              'size': 'normal',
              'callback': (response) => {
                setRecaptchaVerified(true);
                setPhoneError('');
              },
              'expired-callback': () => {
                setRecaptchaVerifier(null);
                setRecaptchaVerified(false);
              }
            });

            await verifier.render();
            setRecaptchaVerifier(verifier);
          } catch (error) {
            console.error('[reCAPTCHA] Error initializing:', error);
            if (attempt < 3) {
              setTimeout(() => initRecaptcha(attempt + 1), 500);
            }
          }
        } else if (attempt < 10) {
          setTimeout(() => initRecaptcha(attempt + 1), 200);
        }
      };

      initRecaptcha();
    }

    return () => {
      if (recaptchaVerifier && step !== 1) {
        try {
          recaptchaVerifier.clear();
        } catch (error) {
          console.error('[reCAPTCHA] Error clearing:', error);
        }
        setRecaptchaVerifier(null);
        setRecaptchaVerified(false);
      }
    };
  }, [isOpen, step, phoneVerified]);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setPhonePrefix('');
      setPhoneNumber('');
      setPhoneVerificationId('');
      setPhoneVerificationCode('');
      setPhoneVerified(false);
      setPhoneError('');
      setOrgName('');
      if (recaptchaVerifier) {
        try {
          recaptchaVerifier.clear();
        } catch (error) {
          console.error('[reCAPTCHA] Error clearing:', error);
        }
        setRecaptchaVerifier(null);
      }
    }
  }, [isOpen]);

  const handleSendPhoneVerificationCode = async () => {
    if (!phonePrefix || !phoneNumber.trim()) {
      setPhoneError(t('dashboard.onboarding.phoneVerification.phoneRequired', 'Phone number is required'));
      return;
    }

    if (isSendingCode) return;
    setIsSendingCode(true);
    setPhoneError('');

    const container = document.getElementById('recaptcha-container-org-create');
    if (!container) {
      setPhoneError(t('dashboard.onboarding.phoneVerification.sendFailed', 'reCAPTCHA container not found. Please refresh the page.'));
      setIsSendingCode(false);
      return;
    }

    try {
      let verifierToUse = recaptchaVerifier;

      if (!verifierToUse) {
        try {
          container.innerHTML = '';
          verifierToUse = new RecaptchaVerifier(auth, 'recaptcha-container-org-create', {
            'size': 'normal',
            'callback': () => {
              setRecaptchaVerified(true);
              setPhoneError('');
            },
            'expired-callback': () => {
              setRecaptchaVerifier(null);
              setRecaptchaVerified(false);
            }
          });
          await verifierToUse.render();
          setRecaptchaVerifier(verifierToUse);
        } catch (err) {
          console.error("Failed to recreate verifier:", err);
          setPhoneError(t('dashboard.onboarding.phoneVerification.sendFailed', 'reCAPTCHA initialization failed. Please refresh.'));
          setIsSendingCode(false);
          return;
        }
      }

      const { cleanNumber, cleanPrefix, fullNumber: fullPhoneNumber } = formatPhoneNumber(phoneNumber, phonePrefix);

      // Update local state for consistency
      setPhoneNumber(cleanNumber);
      setPhonePrefix(cleanPrefix);

      const phoneProvider = new PhoneAuthProvider(auth);
      const verificationId = await phoneProvider.verifyPhoneNumber(
        fullPhoneNumber,
        verifierToUse
      );

      setPhoneVerificationId(verificationId);
      setStep(1.5);
    } catch (error) {
      console.error('Phone verification error:', error);
      if (error.code === 'auth/operation-not-allowed') {
        setPhoneError(t('dashboard.onboarding.phoneVerification.operationNotAllowed', 'Phone Authentication is not enabled in Firebase.'));
      } else if (error.code === 'auth/invalid-phone-number') {
        setPhoneError(t('dashboard.onboarding.phoneVerification.invalidPhone', 'Invalid phone number'));
      } else if (error.code === 'auth/too-many-requests') {
        setPhoneError(t('dashboard.onboarding.phoneVerification.tooManyRequests', 'Too many requests. Please try again later'));
      } else {
        setPhoneError(t('dashboard.onboarding.phoneVerification.sendFailed', 'Failed to send verification code. Please try again'));
      }
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyPhoneCode = async () => {
    if (!phoneVerificationCode.trim() || phoneVerificationCode.length !== 6) {
      setPhoneError(t('dashboard.onboarding.phoneVerification.codeRequired', 'Please enter the 6-digit verification code'));
      return;
    }

    setIsSendingCode(true);
    setPhoneError('');

    try {
      const phoneCredential = PhoneAuthProvider.credential(
        phoneVerificationId,
        phoneVerificationCode
      );

      if (currentUser) {
        await linkWithCredential(auth.currentUser, phoneCredential);

        const { cleanNumber, cleanPrefix } = formatPhoneNumber(phoneNumber, phonePrefix);
        const userDocRef = doc(db, FIRESTORE_COLLECTIONS.USERS, currentUser.uid);
        await updateDoc(userDocRef, {
          'contact.primaryPhonePrefix': cleanPrefix,
          'contact.primaryPhone': cleanNumber,
          'primaryPhonePrefix': cleanPrefix,
          'primaryPhone': cleanNumber,
          isPhoneVerified: true,
          phoneVerifiedAt: new Date(),
          updatedAt: new Date()
        });

        setPhoneVerified(true);
        setStep(2);
      }
    } catch (error) {
      console.error('Phone code verification error:', error);
      if (error.code === 'auth/invalid-verification-code') {
        setPhoneError(t('dashboard.onboarding.phoneVerification.invalidCode', 'Invalid verification code'));
      } else if (error.code === 'auth/code-expired') {
        setPhoneError(t('dashboard.onboarding.phoneVerification.codeExpired', 'Verification code expired. Please request a new one'));
      } else {
        setPhoneError(t('dashboard.onboarding.phoneVerification.verifyFailed', 'Failed to verify code. Please try again'));
      }
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleCreateOrganization = async () => {
    if (!orgName.trim()) {
      showNotification(t('organization:errors.nameRequired', 'Organization name is required'), 'error');
      return;
    }

    setIsCreating(true);

    try {
      const createOrganizationFn = httpsCallable(functions, 'createOrganization');
      const result = await createOrganizationFn({
        name: orgName.trim(),
        type: 'group',
        initialFacilityIds: [],
        settings: {
          consolidatedBilling: false,
          sharedStaffPool: true,
          crossFacilityScheduling: true,
          billingEmail: null,
          invoiceConsolidation: 'per-shift'
        },
        phonePrefix,
        phoneNumber
      });

      if (result.data.success) {
        showNotification(t('organization:success.created', 'Organization created successfully!'), 'success');
        if (onSuccess) {
          onSuccess(result.data.organizationId);
        }
        onClose();
      }
    } catch (error) {
      console.error('Error creating organization:', error);
      showNotification(error.message || t('organization:errors.createFailed', 'Failed to create organization'), 'error');
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <div>
            <h3 className="text-xl font-semibold text-foreground">
              {t('organization:create.title', 'Create Organization')}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {step === 1 || step === 1.5
                ? t('organization:create.phoneVerificationRequired', 'Please verify your mobile phone number first')
                : t('organization:create.subtitle', 'Create a new pharmacy chain or group')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4 rounded-full" style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)' }}>
                  <FiPhone className="w-8 h-8" style={{ color: 'var(--color-logo-1)' }} />
                </div>
                <h2 className="text-2xl font-bold">
                  {t('organization:create.phoneVerification.title', 'Verify Your Mobile Phone Number')}
                </h2>
                <p className="text-muted-foreground text-sm mt-2">
                  {t('organization:create.phoneVerification.description', 'A mobile phone number is required to create an organization. We need to verify your phone number to secure your account.')}
                </p>
                <p className="text-sm font-medium text-foreground mt-3" style={{ color: 'var(--color-logo-1)' }}>
                  {t('organization:create.phoneVerification.mobileRequired', '⚠️ A mobile phone number must be used')}
                </p>
              </div>

              <div className="space-y-4 max-w-lg mx-auto">
                <SimpleDropdown
                  label={t('dashboardProfile:personalDetails.phonePrefix', 'Phone Prefix')}
                  options={phonePrefixOptions}
                  value={phonePrefix}
                  onChange={(value) => {
                    setPhonePrefix(value);
                    setPhoneError('');
                  }}
                  placeholder={t('dashboardProfile:personalDetails.selectPhonePrefix', 'Select phone prefix')}
                  required
                />
                <PersonnalizedInputField
                  label={t('dashboardProfile:personalDetails.phoneNumber', 'Phone Number')}
                  name="phoneNumber"
                  type="tel"
                  value={phoneNumber || ''}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    setPhoneError('');
                  }}
                  placeholder={t('dashboardProfile:personalDetails.phonePlaceholder', 'Enter your phone number')}
                  required
                />

                <div id="recaptcha-container-org-create" className="flex justify-center"></div>

                {phoneError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                    {phoneError}
                  </div>
                )}

                <Button
                  variant="primary"
                  onClick={handleSendPhoneVerificationCode}
                  disabled={!phonePrefix || !phoneNumber.trim() || isSendingCode || !recaptchaVerified}
                  className="w-full"
                >
                  {isSendingCode
                    ? t('dashboard.onboarding.phoneVerification.sending', 'Sending...')
                    : t('dashboard.onboarding.phoneVerification.sendCode', 'Send Verification Code')}
                </Button>
              </div>
            </div>
          )}

          {step === 1.5 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4 rounded-full" style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)' }}>
                  <FiPhone className="w-8 h-8" style={{ color: 'var(--color-logo-1)' }} />
                </div>
                <h2 className="text-2xl font-bold">
                  {t('dashboard.onboarding.phoneVerification.enterCode', 'Enter Verification Code')}
                </h2>
                <p className="text-muted-foreground text-sm mt-2">
                  {t('dashboard.onboarding.phoneVerification.codeSent', 'We sent a verification code to')} {phonePrefix} {phoneNumber}
                </p>
              </div>

              <div className="space-y-4 max-w-lg mx-auto">
                <PersonnalizedInputField
                  label={t('dashboard.onboarding.phoneVerification.codeLabel', 'Verification Code')}
                  name="phoneVerificationCode"
                  type="text"
                  value={phoneVerificationCode || ''}
                  onChange={(e) => {
                    setPhoneVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                    setPhoneError('');
                  }}
                  placeholder="000000"
                  required
                />

                {phoneError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                    {phoneError}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setStep(1);
                      setPhoneVerificationCode('');
                      setPhoneError('');
                    }}
                    className="flex-1"
                  >
                    {t('common:back', 'Back')}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleVerifyPhoneCode}
                    disabled={!phoneVerificationCode.trim() || phoneVerificationCode.length !== 6 || isSendingCode}
                    className="flex-1"
                  >
                    {isSendingCode
                      ? t('dashboard.onboarding.phoneVerification.verifying', 'Verifying...')
                      : t('dashboard.onboarding.phoneVerification.verify', 'Verify')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4 rounded-full bg-green-100">
                  <FiCheck className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold">
                  {t('organization:create.phoneVerified', 'Phone Verified!')}
                </h2>
                <p className="text-muted-foreground text-sm mt-2">
                  {t('organization:create.phoneVerifiedDescription', 'Your phone number has been verified. Now let\'s create your organization.')}
                </p>
              </div>

              <div className="space-y-4 max-w-lg mx-auto">
                <PersonnalizedInputField
                  label={t('organization:create.nameLabel', 'Organization Name')}
                  name="orgName"
                  type="text"
                  value={orgName || ''}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder={t('organization:create.namePlaceholder', 'e.g., Amavita Geneva Group')}
                  required
                />

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="secondary"
                    onClick={onClose}
                    className="flex-1"
                  >
                    {t('common:cancel', 'Cancel')}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleCreateOrganization}
                    disabled={!orgName.trim() || isCreating}
                    className="flex-1"
                  >
                    {isCreating
                      ? t('common:creating', 'Creating...')
                      : t('organization:actions.create', 'Create Organization')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateOrganizationModal;










