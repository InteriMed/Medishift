import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import AccountDeletion from './AccountDeletion';

const DeleteAccount = ({
  formData,
  config,
  errors,
  isSubmitting,
  onInputChange,
  onSaveAndContinue,
  onCancel,
  getNestedValue,
}) => {
  const { t } = useTranslation(['dashboardProfile', 'common']);

  return (
    <div className="flex flex-col gap-6 p-1 w-full max-w-[1000px] mx-auto">
      <div className="bg-card rounded-xl border border-border/60 p-6 pb-4 shadow-sm w-full max-w-[1000px] mx-auto">
        <h2 className="text-2xl font-semibold mb-2" style={{ fontSize: '18px', color: 'hsl(var(--foreground))', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
          {t('tabs.deleteAccount', 'Delete Account')}
        </h2>
        <p className="text-sm font-medium text-muted-foreground" style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
          {t('settings.accountDeletion.subtitle', 'Permanently delete your account and all associated data')}
        </p>
      </div>

      <AccountDeletion />
    </div>
  );
};

DeleteAccount.propTypes = {
  formData: PropTypes.object.isRequired,
  config: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  isSubmitting: PropTypes.bool.isRequired,
  onInputChange: PropTypes.func.isRequired,
  onSaveAndContinue: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  getNestedValue: PropTypes.func.isRequired,
};

export default DeleteAccount;




