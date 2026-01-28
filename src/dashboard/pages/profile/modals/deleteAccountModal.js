import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import Modal from '../../../../components/modals/modals';
import Button from '../../../../components/boxedInputFields/button';
import PersonalizedInputField from '../../../../components/boxedInputFields/personnalizedInputField';

const DeleteAccountModal = ({ isOpen, onClose, onConfirm }) => {
  const { t } = useTranslation(['dashboard/profile', 'common']);
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (confirmPhrase.trim().toLowerCase() !== 'delete my account') {
      setError(t('settings.accountDeletion.confirmMismatch'));
      return;
    }
    setError('');
    onConfirm();
  };

  const handleClose = () => {
    setConfirmPhrase('');
    setError('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('settings.accountDeletion.confirmTitle')}
      messageType="error"
      size="medium"
    >
      <div className="space-y-4">
        <p className="text-foreground">
          {t('settings.accountDeletion.warningText')}
        </p>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800 font-medium">
            {t('settings.accountDeletion.permanentWarning')}
          </p>
        </div>

        <PersonalizedInputField
          label={t('settings.accountDeletion.confirmPhraseLabel')}
          type="text"
          value={confirmPhrase}
          onChange={(e) => setConfirmPhrase(e.target.value)}
          placeholder={t('settings.accountDeletion.confirmPhrasePlaceholder')}
          error={error}
        />

        <div className="flex gap-3 justify-end pt-4">
          <Button
            onClick={handleClose}
            variant="secondary"
          >
            {t('common:cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            variant="danger"
          >
            {t('settings.accountDeletion.confirmButton')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

DeleteAccountModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired
};

export default DeleteAccountModal;

