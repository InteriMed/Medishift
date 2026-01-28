import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import Modal from '../../../../components/modals/modal';
import Button from '../../../../components/boxedInputFields/button';
import InputFieldHideUnhide from '../../../../components/boxedInputFields/inputFieldHideUnhide';

const ReauthModal = ({ isOpen, onClose, onConfirm, authProvider }) => {
  const { t } = useTranslation(['dashboard/profile', 'common']);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    if (authProvider === 'password' && !password) {
      setError(t('settings.accountDeletion.passwordRequired'));
      return;
    }

    setIsProcessing(true);
    setError('');
    
    try {
      await onConfirm(password);
    } catch (err) {
      setError(err.message || t('settings.accountDeletion.reauthError'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('settings.accountDeletion.reauthTitle')}
      messageType="warning"
      size="medium"
    >
      <div className="space-y-4">
        <p className="text-foreground">
          {authProvider === 'google.com'
            ? t('settings.accountDeletion.reauthGoogleText')
            : t('settings.accountDeletion.reauthPasswordText')}
        </p>

        {authProvider === 'password' && (
          <InputFieldHideUnhide
            label={t('settings.accountDeletion.passwordLabel')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error}
          />
        )}

        {authProvider === 'google.com' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              {t('settings.accountDeletion.googleReauthInfo')}
            </p>
          </div>
        )}

        <div className="flex gap-3 justify-end pt-4">
          <Button
            onClick={handleClose}
            variant="secondary"
            disabled={isProcessing}
          >
            {t('common:cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            variant="primary"
            loading={isProcessing}
          >
            {authProvider === 'google.com'
              ? t('settings.accountDeletion.continueWithGoogle')
              : t('common:confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

ReauthModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  authProvider: PropTypes.string
};

export default ReauthModal;



