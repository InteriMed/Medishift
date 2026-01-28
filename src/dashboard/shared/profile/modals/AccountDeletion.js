import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiTrash2, FiAlertTriangle } from 'react-icons/fi';
import { useAuth } from '../../../../contexts/AuthContext';
import { useNotification } from '../../../../contexts/NotificationContext';
import Button from '../../../../components/boxedInputFields/button';
import ContentSection from '../components/contentSection';
import DeleteAccountModal from './DeleteAccountModal';
import ReauthModal from './ReauthModal';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  GoogleAuthProvider,
  signInWithPopup,
  deleteUser
} from 'firebase/auth';
import { auth } from '../../../../services/firebase';

const AccountDeletion = () => {
  const { t } = useTranslation(['dashboard/profile', 'common']);
  const { currentUser, logout } = useAuth();
  const { showNotification } = useNotification();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isReauthModalOpen, setIsReauthModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [authProvider, setAuthProvider] = useState(null);

  useEffect(() => {
    if (currentUser) {
      const isGoogleUser = currentUser.providerData?.some(
        provider => provider.providerId === 'google.com'
      );
      setAuthProvider(isGoogleUser ? 'google.com' : 'password');
    }
  }, [currentUser]);

  const handleDeleteConfirmed = () => {
    setIsDeleteModalOpen(false);
    setIsReauthModalOpen(true);
  };

  const handleReauthConfirmed = async (password) => {
    setIsProcessing(true);
    try {
      const user = auth.currentUser;

      if (authProvider === 'google.com') {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      } else {
        const credential = EmailAuthProvider.credential(
          user.email,
          password
        );
        await reauthenticateWithCredential(user, credential);
      }

      await deleteUser(user);
      
      showNotification(t('settings.accountDeletion.success'), 'success');
      await logout();
      
    } catch (error) {
      console.error('Error deleting account:', error);
      let errorMessage = t('settings.accountDeletion.error');
      
      if (error.code === 'auth/wrong-password') {
        errorMessage = t('settings.accountDeletion.wrongPassword');
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = t('settings.accountDeletion.requiresRecentLogin');
      }
      
      throw new Error(errorMessage);
    } finally {
      setIsProcessing(false);
      setIsReauthModalOpen(false);
    }
  };

  return (
    <>
      <ContentSection
        title={t('settings.accountDeletion.title')}
        subtitle={t('settings.accountDeletion.subtitle')}
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <FiAlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">
                {t('settings.accountDeletion.warning')}
              </p>
              <p className="text-sm text-red-700 mt-1">
                {t('settings.accountDeletion.warningDetails')}
              </p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <h4 className="text-sm font-semibold text-foreground mb-2">
              {t('settings.accountDeletion.whatWillBeDeleted')}
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>{t('settings.accountDeletion.profileData')}</li>
              <li>{t('settings.accountDeletion.documents')}</li>
              <li>{t('settings.accountDeletion.preferences')}</li>
              <li>{t('settings.accountDeletion.connections')}</li>
            </ul>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <h4 className="text-sm font-semibold text-foreground mb-2">
              {t('settings.accountDeletion.whatWillBeKept')}
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>{t('settings.accountDeletion.contracts')}</li>
              <li>{t('settings.accountDeletion.invoices')}</li>
              <li>{t('settings.accountDeletion.legalRecords')}</li>
            </ul>
          </div>

          <div className="pt-4">
            <Button
              onClick={() => setIsDeleteModalOpen(true)}
              variant="danger"
              icon={<FiTrash2 />}
            >
              {t('settings.accountDeletion.deleteButton')}
            </Button>
          </div>
        </div>
      </ContentSection>

      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirmed}
      />

      <ReauthModal
        isOpen={isReauthModalOpen}
        onClose={() => setIsReauthModalOpen(false)}
        onConfirm={handleReauthConfirmed}
        authProvider={authProvider}
      />
    </>
  );
};

export default AccountDeletion;



