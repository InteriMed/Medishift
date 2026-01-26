import React, { useState, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import Dialog from '../Dialog/Dialog';
import InputField from '../BoxedInputFields/Personnalized-InputField';
import Button from '../BoxedInputFields/Button';
import { FiLock, FiMail, FiPhone, FiShield, FiArrowLeft } from 'react-icons/fi';
import SpinnerLoader from '../LoadingAnimations/SpinnerLoader';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { FIRESTORE_COLLECTIONS } from '../../config/keysDatabase';
import { LOCALSTORAGE_KEYS } from '../../config/keysDatabase';

const PasswordResetModal = ({ isOpen, onClose, userEmail, userPhone, userPhonePrefix }) => {
  const { t } = useTranslation(['auth', 'common', 'dashboardProfile']);
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState('email');
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [resetEmail, setResetEmail] = useState(userEmail || '');
  const [foundPhone, setFoundPhone] = useState(userPhone || '');
  const [foundPhonePrefix, setFoundPhonePrefix] = useState(userPhonePrefix || '');
  const [isLookingUpPhone, setIsLookingUpPhone] = useState(false);

  const formattedPhone = useMemo(() => {
    if (!foundPhone) return null;
    const prefix = foundPhonePrefix || '';
    return `${prefix} ${foundPhone}`.trim();
  }, [foundPhone, foundPhonePrefix]);

  const lookupUserPhone = async (email) => {
    if (!email || !db) return;
    
    setIsLookingUpPhone(true);
    try {
      const usersQuery = query(
        collection(db, FIRESTORE_COLLECTIONS.USERS),
        where('email', '==', email)
      );
      const usersSnapshot = await getDocs(usersQuery);
      
      if (!usersSnapshot.empty) {
        const userData = usersSnapshot.docs[0].data();
        const phone = userData.contactPhone || userData.phoneNumber || userData.primaryPhone || '';
        const phonePrefix = userData.contactPhonePrefix || userData.phonePrefix || userData.primaryPhonePrefix || '+41';
        
        if (phone) {
          setFoundPhone(phone);
          setFoundPhonePrefix(phonePrefix);
        }
      }
    } catch (err) {
      console.error('Error looking up user phone:', err);
    } finally {
      setIsLookingUpPhone(false);
    }
  };

  useEffect(() => {
    if (isOpen && resetEmail && !foundPhone && !isLookingUpPhone) {
      lookupUserPhone(resetEmail);
    }
  }, [isOpen, resetEmail, foundPhone, isLookingUpPhone]);

  const handleSendCode = async (method) => {
    const selectedMethod = method || verificationMethod;
    setError('');
    setSendingCode(true);

    try {
      const { httpsCallable } = await import('firebase/functions');
      const { functions, auth: firebaseAuth } = await import('../../services/firebase');
      
      const currentUser = firebaseAuth.currentUser;
      const emailToUse = resetEmail || userEmail;
      
      if (selectedMethod === 'email') {
        if (!emailToUse) {
          throw new Error(t('auth.errors.emailRequired'));
        }
        
        if (currentUser) {
          await currentUser.getIdToken(true);
          const requestBankingAccessCode = httpsCallable(functions, 'requestBankingAccessCode');
          await requestBankingAccessCode({ method: 'email' });
        } else {
          const requestPasswordResetWithBankingAccess = httpsCallable(functions, 'requestPasswordResetWithBankingAccess');
          await requestPasswordResetWithBankingAccess({ method: 'email', email: emailToUse });
        }
        setCodeSent(true);
      } else if (selectedMethod === 'phone') {
        if (!foundPhone) {
          throw new Error(t('auth.errors.phoneNotAvailable', 'Phone number not available for this account'));
        }
        
        if (currentUser) {
          await currentUser.getIdToken(true);
          const requestBankingAccessCode = httpsCallable(functions, 'requestBankingAccessCode');
          await requestBankingAccessCode({ method: 'phone' });
        } else {
          const requestPasswordResetWithBankingAccess = httpsCallable(functions, 'requestPasswordResetWithBankingAccess');
          await requestPasswordResetWithBankingAccess({ 
            method: 'phone', 
            phone: foundPhone,
            phonePrefix: foundPhonePrefix,
            email: emailToUse
          });
        }
        setCodeSent(true);
      }
    } catch (err) {
      const errorMessage = err.message || t('auth.errors.resetFailed');
      setError(errorMessage);
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerify = async () => {
    setError('');
    setIsVerifying(true);

    try {
      const { httpsCallable } = await import('firebase/functions');
      const { functions, auth: firebaseAuth } = await import('../../services/firebase');
      
      const currentUser = firebaseAuth.currentUser;
      const emailToUse = resetEmail || userEmail;
      
      let result;
      
      if (currentUser) {
        await currentUser.getIdToken(true);
        const verifyBankingAccess = httpsCallable(functions, 'verifyBankingAccessCode');
        result = await verifyBankingAccess({ code: accessCode });
        
        if (result.data.success) {
          const editDurationMs = result.data.editDuration || (60 * 60 * 1000);
          const expiresAt = Date.now() + editDurationMs;
          localStorage.setItem(LOCALSTORAGE_KEYS.BANKING_ACCESS_GRANTED, expiresAt.toString());
        }
      } else {
        const verifyPasswordResetWithBankingAccess = httpsCallable(functions, 'verifyPasswordResetWithBankingAccess');
        result = await verifyPasswordResetWithBankingAccess({ 
          code: accessCode,
          method: verificationMethod,
          email: emailToUse
        });
      }

      if (result.data.success) {
        if (!currentUser && emailToUse) {
          await sendPasswordResetEmail(auth, emailToUse);
        }
        
        setAccessCode('');
        setCodeSent(false);
        onClose?.();
      } else {
        setError(t('dashboardProfile:billingInformation.invalidAccessCode', 'Invalid access code'));
      }
    } catch (err) {
      setError(t('dashboardProfile:billingInformation.accessCodeError', 'Failed to verify access code'));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleBackToMethodSelection = () => {
    setAccessCode('');
    setError('');
    setCodeSent(false);
  };

  const handleCancel = () => {
    setAccessCode('');
    setError('');
    setCodeSent(false);
    if (!userEmail) {
      setResetEmail('');
    }
    onClose?.();
  };

  useEffect(() => {
    if (isOpen) {
      setResetEmail(userEmail || '');
      setFoundPhone(userPhone || '');
      setFoundPhonePrefix(userPhonePrefix || '');
      setCodeSent(false);
      setAccessCode('');
      setError('');
      setVerificationMethod('email');
    }
  }, [isOpen, userEmail, userPhone, userPhonePrefix]);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleCancel}
      title={t('dashboardProfile:billingInformation.bankingAccessTitle', 'Secure Banking Access')}
      blurred_background={true}
      size="large"
      centerTitle={true}
    >
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
            <FiShield className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-muted-foreground text-sm">
            {t('dashboardProfile:billingInformation.bankingAccessMessage', 'For your security, please verify your identity to access banking information and reset your password.')}
          </p>
        </div>

        {!codeSent ? (
          <div className="relative">
            {sendingCode && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
                <SpinnerLoader size="small" />
              </div>
            )}
            <div className="space-y-4">
              <p className="text-sm font-medium text-center text-foreground">
                {t('dashboardProfile:billingInformation.verificationMethod', 'Choose verification method')}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <button
                    onClick={() => {
                      setVerificationMethod('email');
                    }}
                    className={`border-2 rounded-xl p-6 hover:border-blue-600 transition-colors flex flex-col items-center text-center w-full ${
                      verificationMethod === 'email'
                        ? 'border-blue-600 bg-blue-500/5'
                        : 'border-border'
                    }`}
                  >
                    <div className={`p-3 rounded-lg mb-3 ${
                      verificationMethod === 'email' 
                        ? 'bg-blue-500/10 text-blue-600' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      <FiMail size={24} />
                    </div>
                    <div className={`font-semibold mb-1 ${verificationMethod === 'email' ? 'text-blue-600' : 'text-foreground'}`}>
                      {t('common:email', 'Email')}
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">
                      {t('dashboardProfile:billingInformation.sendToEmail', 'Send code to your email')}
                    </div>
                    {!userEmail && (
                      <div className="w-full mt-2">
                        <InputField
                          label=""
                          type="email"
                          value={resetEmail}
                          onChange={(e) => {
                            setResetEmail(e.target.value);
                            if (e.target.value && !foundPhone) {
                              lookupUserPhone(e.target.value);
                            }
                          }}
                          placeholder={t('auth.login.email', 'Email address')}
                          marginBottom="0"
                        />
                      </div>
                    )}
                    {(userEmail || resetEmail) && (
                      <div className={`text-xs font-mono px-2 py-1 rounded ${
                        verificationMethod === 'email' 
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-foreground' 
                          : 'bg-muted/50 text-foreground'
                      }`}>
                        {resetEmail || userEmail}
                      </div>
                    )}
                  </button>
                  {error && verificationMethod === 'email' && (
                    <div className="absolute inset-0 bg-background/90 backdrop-blur-sm rounded-xl border-2 flex items-center justify-center p-4" style={{ borderColor: 'var(--boxed-inputfield-error-color, #ef4444)' }}>
                      <p className="text-sm text-center font-medium" style={{ color: 'var(--boxed-inputfield-error-color, #ef4444)' }}>{error}</p>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <button
                    onClick={() => {
                      setVerificationMethod('phone');
                    }}
                    className={`border-2 rounded-xl p-6 hover:border-green-600 transition-colors flex flex-col items-center text-center w-full ${
                      verificationMethod === 'phone'
                        ? 'border-green-600 bg-green-500/5'
                        : 'border-border'
                    }`}
                  >
                    <div className={`p-3 rounded-lg mb-3 ${
                      verificationMethod === 'phone' 
                        ? 'bg-green-500/10 text-green-600' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      <FiPhone size={24} />
                    </div>
                    <div className={`font-semibold mb-1 ${verificationMethod === 'phone' ? 'text-green-600' : 'text-foreground'}`}>
                      {t('common:phone', 'Phone')}
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">
                      {t('dashboardProfile:billingInformation.sendToPhone', 'Send code via SMS')}
                    </div>
                    {formattedPhone && (
                      <div className={`text-xs font-mono px-2 py-1 rounded ${
                        verificationMethod === 'phone' 
                          ? 'bg-green-100 dark:bg-green-900/30 text-foreground' 
                          : 'bg-muted/50 text-foreground'
                      }`}>
                        {formattedPhone}
                      </div>
                    )}
                    {isLookingUpPhone && (
                      <div className="text-xs text-muted-foreground mt-2">
                        {t('auth.login.passwordReset.lookingUpPhone', 'Looking up phone number...')}
                      </div>
                    )}
                    {!formattedPhone && !isLookingUpPhone && (
                      <div className="text-xs text-muted-foreground mt-2">
                        {t('auth.login.passwordReset.noPhone', 'Phone number not available')}
                      </div>
                    )}
                  </button>
                  {error && verificationMethod === 'phone' && (
                    <div className="absolute inset-0 bg-background/90 backdrop-blur-sm rounded-xl border-2 flex items-center justify-center p-4" style={{ borderColor: 'var(--boxed-inputfield-error-color, #ef4444)' }}>
                      <p className="text-sm text-center font-medium" style={{ color: 'var(--boxed-inputfield-error-color, #ef4444)' }}>{error}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-3 pt-4">
              <button
                onClick={handleCancel}
                disabled={sendingCode}
                className="px-4 py-2 rounded-lg border-2 border-border bg-transparent hover:bg-muted text-foreground font-medium transition-colors"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={() => handleSendCode(verificationMethod)}
                disabled={sendingCode || !verificationMethod || (verificationMethod === 'email' && !userEmail && !resetEmail)}
                className="px-6 py-2 rounded-lg border-2 border-blue-600 bg-blue-600 text-white hover:bg-blue-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingCode ? t('dashboardProfile:billingInformation.sendingCode', 'Sending code...') : t('dashboardProfile:billingInformation.sendCode', 'Send Code')}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center mb-4">
              <button 
                onClick={handleBackToMethodSelection}
                className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                <FiArrowLeft className="w-4 h-4" />
                {t('dashboardProfile:billingInformation.backToMethodSelection', 'Back to method selection')}
              </button>
            </div>

            <div className={`border-2 rounded-xl p-6 flex flex-col items-center text-center mb-4 ${
              verificationMethod === 'email'
                ? 'border-blue-600 bg-blue-500/5'
                : 'border-green-600 bg-green-500/5'
            }`}>
              <div className={`p-3 rounded-lg mb-3 ${
                verificationMethod === 'email' 
                  ? 'bg-blue-500/10 text-blue-600' 
                  : 'bg-green-500/10 text-green-600'
              }`}>
                {verificationMethod === 'email' ? <FiMail size={24} /> : <FiPhone size={24} />}
              </div>
              <div className={`font-semibold mb-1 ${
                verificationMethod === 'email' ? 'text-blue-600' : 'text-green-600'
              }`}>
                {t('dashboardProfile:billingInformation.codeSentTo', 'Code sent to')}
              </div>
              <div className="text-sm text-foreground font-mono">
                {verificationMethod === 'email' 
                  ? (resetEmail || userEmail || t('dashboardProfile:billingInformation.yourEmail', 'your email'))
                  : (formattedPhone || t('dashboardProfile:billingInformation.yourPhone', 'your phone'))
                }
              </div>
            </div>

            <div className="space-y-4">
              <InputField
                label={t('dashboardProfile:billingInformation.accessCodeLabel', 'Enter 6-digit verification code')}
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                error={error}
                placeholder={t('dashboardProfile:billingInformation.accessCodePlaceholder', '000000')}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && accessCode.length === 6) {
                    handleVerify();
                  }
                }}
                autoFocus
              />

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <FiLock className="w-3 h-3" />
                  {t('dashboardProfile:billingInformation.accessValidityInfo', 'Access valid for 1 hour')}
                </div>
                <button
                  onClick={handleSendCode}
                  disabled={sendingCode}
                  className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
                >
                  {t('dashboardProfile:billingInformation.resendCode', 'Resend code')}
                </button>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-border">
              <button
                onClick={handleCancel}
                disabled={isVerifying}
                className="px-4 py-2 rounded-lg border-2 border-border bg-transparent hover:bg-muted text-foreground font-medium transition-colors"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleVerify}
                disabled={!accessCode || accessCode.length !== 6 || isVerifying}
                className="px-6 py-2 rounded-lg border-2 border-blue-600 bg-transparent text-blue-600 hover:bg-blue-600 hover:text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerifying ? t('common:verifying', 'Verifying...') : t('dashboardProfile:billingInformation.unlockBanking', 'Unlock Banking Data')}
              </button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
};

PasswordResetModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func,
  userEmail: PropTypes.string,
  userPhone: PropTypes.string,
  userPhonePrefix: PropTypes.string
};

export default PasswordResetModal;

