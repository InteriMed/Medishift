import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../../contexts/authContext';
import { useNotification } from '../../../../../contexts/notificationContext';
import ContentSection from '../../../components/contentSection';
import Button from '../../../../../components/boxedInputFields/button';
import { FiKey, FiMail } from 'react-icons/fi';
import PasswordChangeModal from '../../modals/passwordChangeModal';
import AccountDeletion from '../../modals/accountDeletion';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../../../../services/firebase';

const AccountTab = () => {
  const { t } = useTranslation(['dashboard/profile', 'common']);
  const { currentUser } = useAuth();
  const { showNotification } = useNotification();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [authProvider, setAuthProvider] = useState(null);

  useEffect(() => {
    if (currentUser) {
      const isGoogleUser = currentUser.providerData?.some(
        provider => provider.providerId === 'google.com'
      );
      setAuthProvider(isGoogleUser ? 'google.com' : 'password');
    }
  }, [currentUser]);

  const handlePasswordChange = async (passwordData) => {
    try {
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(
        user.email,
        passwordData.currentPassword
      );
      
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passwordData.newPassword);
      
      showNotification(t('settings.password.changeSuccess'), 'success');
    } catch (error) {
      console.error('Error changing password:', error);
      
      if (error.code === 'auth/wrong-password') {
        throw new Error(t('settings.password.wrongPassword'));
      } else if (error.code === 'auth/weak-password') {
        throw new Error(t('settings.password.weakPassword'));
      }
      
      throw new Error(t('settings.password.changeError'));
    }
  };

  return (
    <div className="space-y-6">
      <ContentSection
        title={t('settings.accountInfo.title')}
        subtitle={t('settings.accountInfo.subtitle')}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FiMail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t('settings.accountInfo.email')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {currentUser?.email}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FiKey className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t('settings.password.title')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {authProvider === 'google.com'
                    ? t('settings.password.managedByGoogle')
                    : t('settings.password.lastChanged')}
                </p>
              </div>
            </div>
            <Button
              onClick={() => setIsPasswordModalOpen(true)}
              variant="secondary"
              size="small"
            >
              {t('settings.password.changeButton')}
            </Button>
          </div>
        </div>
      </ContentSection>

      <AccountDeletion />

      <PasswordChangeModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onConfirm={handlePasswordChange}
        authProvider={authProvider}
      />
    </div>
  );
};

AccountTab.propTypes = {
  data: PropTypes.object,
  errors: PropTypes.object,
  updateField: PropTypes.func
};

export default AccountTab;

