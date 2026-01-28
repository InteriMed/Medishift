import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import Modal from '../../../../components/modals/modal';
import Button from '../../../../components/boxedInputFields/button';
import InputFieldHideUnhide from '../../../../components/boxedInputFields/inputFieldHideUnhide';
import PersonalizedInputField from '../../../../components/boxedInputFields/personnalizedInputField';

const PasswordChangeModal = ({ isOpen, onClose, onConfirm, authProvider }) => {
  const { t } = useTranslation(['dashboard/profile', 'common']);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    
    if (!passwordData.currentPassword) {
      newErrors.currentPassword = t('settings.password.currentRequired');
    }
    
    if (!passwordData.newPassword) {
      newErrors.newPassword = t('settings.password.newRequired');
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = t('settings.password.tooShort');
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = t('settings.password.mismatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = async () => {
    if (!validateForm()) return;

    setIsProcessing(true);
    try {
      await onConfirm(passwordData);
      handleClose();
    } catch (err) {
      setErrors({ general: err.message || t('settings.password.changeError') });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setErrors({});
    onClose();
  };

  const handleChange = (field, value) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (authProvider === 'google.com') {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={t('settings.password.title')}
        messageType="info"
        size="small"
      >
        <div className="space-y-4">
          <p className="text-foreground">
            {t('settings.password.googleAccountInfo')}
          </p>
          <div className="flex justify-end pt-4">
            <Button onClick={handleClose} variant="primary">
              {t('common:ok')}
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('settings.password.title')}
      size="medium"
    >
      <div className="space-y-4">
        {errors.general && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">{errors.general}</p>
          </div>
        )}

        <InputFieldHideUnhide
          label={t('settings.password.currentPassword')}
          value={passwordData.currentPassword}
          onChange={(e) => handleChange('currentPassword', e.target.value)}
          error={errors.currentPassword}
        />

        <InputFieldHideUnhide
          label={t('settings.password.newPassword')}
          value={passwordData.newPassword}
          onChange={(e) => handleChange('newPassword', e.target.value)}
          error={errors.newPassword}
        />

        <InputFieldHideUnhide
          label={t('settings.password.confirmPassword')}
          value={passwordData.confirmPassword}
          onChange={(e) => handleChange('confirmPassword', e.target.value)}
          error={errors.confirmPassword}
        />

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
            {t('settings.password.changeButton')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

PasswordChangeModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  authProvider: PropTypes.string
};

export default PasswordChangeModal;

