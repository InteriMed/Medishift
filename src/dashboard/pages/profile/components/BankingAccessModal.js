import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import Dialog from '../../../../components/Dialog/Dialog';
import InputField from '../../../../components/BoxedInputFields/Personnalized-InputField';
import Button from '../../../../components/BoxedInputFields/Button';
import { FiLock, FiUnlock, FiMail, FiPhone, FiShield, FiArrowLeft } from 'react-icons/fi';
import SpinnerLoader from '../../../../components/LoadingAnimations/SpinnerLoader';
import { LOCALSTORAGE_KEYS } from '../../../../config/keysDatabase';

const BankingAccessModal = ({ isOpen, onClose, onSuccess, userEmail, userPhone, userPhonePrefix }) => {
  const { t } = useTranslation(['dashboardProfile', 'common']);
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState('email');
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);


  const formattedPhone = useMemo(() => {
    if (!userPhone) return null;
    const prefix = userPhonePrefix || '';
    return `${prefix} ${userPhone}`.trim();
  }, [userPhone, userPhonePrefix]);

  const handleSendCode = async (method) => {
    const selectedMethod = method || verificationMethod;
    setError('');
    setSendingCode(true);

    try {
      const { httpsCallable } = await import('firebase/functions');
      const { functions, auth } = await import('../../../../services/firebaseService');
      
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('You must be logged in to request a banking access code');
      }

      await currentUser.getIdToken(true);
      
      const requestBankingAccessCode = httpsCallable(functions, 'requestBankingAccessCode');
      
      await requestBankingAccessCode({ method: selectedMethod });
      
      setCodeSent(true);
    } catch (err) {
      const errorMessage = err.message || t('billingInformation.sendCodeError', 'Failed to send access code');
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
      const { functions, auth } = await import('../../../../services/firebaseService');
      
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('You must be logged in to verify the banking access code');
      }

      await currentUser.getIdToken(true);
      
      const verifyBankingAccess = httpsCallable(functions, 'verifyBankingAccessCode');
      const result = await verifyBankingAccess({ code: accessCode });

      if (result.data.success) {
        const editDurationMs = result.data.editDuration || (60 * 60 * 1000);
        const expiresAt = Date.now() + editDurationMs;
        localStorage.setItem(LOCALSTORAGE_KEYS.BANKING_ACCESS_GRANTED, expiresAt.toString());
        
        setAccessCode('');
        setCodeSent(false);
        onSuccess?.();
      } else {
        setError(t('billingInformation.invalidAccessCode', 'Invalid access code'));
      }
    } catch (err) {
      setError(t('billingInformation.accessCodeError', 'Failed to verify access code'));
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
    onClose?.();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleCancel}
      title={t('billingInformation.bankingAccessTitle', 'Secure Banking Access')}
      blurred_background={true}
      size="medium"
      centerTitle={true}
    >
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
            <FiShield className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-muted-foreground text-sm">
            {t('billingInformation.bankingAccessMessage', 'For your security, please verify your identity to access banking information.')}
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
                {t('billingInformation.verificationMethod', 'Choose verification method')}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <button
                    onClick={() => {
                      setVerificationMethod('email');
                      handleSendCode('email');
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
                      {t('billingInformation.sendToEmail', 'Send code to your email')}
                    </div>
                    {userEmail && (
                      <div className={`text-xs font-mono px-2 py-1 rounded ${
                        verificationMethod === 'email' 
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-foreground' 
                          : 'bg-muted/50 text-foreground'
                      }`}>
                        {userEmail}
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
                      handleSendCode('phone');
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
                      {t('billingInformation.sendToPhone', 'Send code via SMS')}
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
                  </button>
                  {error && verificationMethod === 'phone' && (
                    <div className="absolute inset-0 bg-background/90 backdrop-blur-sm rounded-xl border-2 flex items-center justify-center p-4" style={{ borderColor: 'var(--boxed-inputfield-error-color, #ef4444)' }}>
                      <p className="text-sm text-center font-medium" style={{ color: 'var(--boxed-inputfield-error-color, #ef4444)' }}>{error}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <button
                onClick={handleCancel}
                disabled={sendingCode}
                className="px-4 py-2 rounded-lg border-2 border-border bg-transparent hover:bg-muted text-foreground font-medium transition-colors"
              >
                {t('common.cancel', 'Cancel')}
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
                {t('billingInformation.backToMethodSelection', 'Back to method selection')}
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
                {t('billingInformation.codeSentTo', 'Code sent to')}
              </div>
              <div className="text-sm text-foreground font-mono">
                {verificationMethod === 'email' 
                  ? (userEmail || t('billingInformation.yourEmail', 'your email'))
                  : (formattedPhone || t('billingInformation.yourPhone', 'your phone'))
                }
              </div>
            </div>

            <div className="space-y-4">
              <InputField
                label={t('billingInformation.accessCodeLabel', 'Enter 6-digit verification code')}
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                error={error}
                placeholder={t('billingInformation.accessCodePlaceholder', '000000')}
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
                  {t('billingInformation.accessValidityInfo', 'Access valid for 1 hour')}
                </div>
                <button
                  onClick={handleSendCode}
                  disabled={sendingCode}
                  className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
                >
                  {t('billingInformation.resendCode', 'Resend code')}
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
                {isVerifying ? t('common:verifying', 'Verifying...') : t('billingInformation.unlockBanking', 'Unlock Banking Data')}
              </button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
};

BankingAccessModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func,
  onSuccess: PropTypes.func,
  userEmail: PropTypes.string,
  userPhone: PropTypes.string,
  userPhonePrefix: PropTypes.string
};

export default BankingAccessModal;

