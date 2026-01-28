import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../../contexts/authContext'; // Assuming this is still needed for currentUser details not in props
import { useNotification } from '../../../../../contexts/notificationContext';
import { auth } from '../../../../services/firebase';
import googleAuthLogo from '../../../../assets/pages/auth/googleAuthLogo.png';
import {
  updatePassword,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import Button from '../../../../components/colorPicker/button';
import Switch from '../../../../../components/boxedInputFields/switch';
import InputFieldHideUnhide from '../../../../../components/boxedInputFields/inputFieldHideUnhide';
import modal from '../../../../../components/modals/modal';
import styles from './styles/profileUnified.module.css';
import useProfileData from '../../../hooks/useProfileData';

const AccountBasics = ({
  formData = {}, // Provide default empty object
  currentUser, // Passed from Profile.js, derived from useAuth there
  errors, // Errors specific to AccountBasics fields, from Profile.js state
  isSubmitting, // Global submitting state from Profile.js
  onInputChange, // For simple top-level field changes like profileVisibility
  onNotificationPreferenceChange, // For changes within formData.notificationPreferences
  onSaveAndContinue, // Prop function from Profile.js
  onCancel, // Prop function from Profile.js
  isOnboarding,
  // setErrors, // If AccountBasics needs to set errors directly into Profile.js state (less common now)
}) => {
  const { t } = useTranslation(['dashboardProfile', 'common']);
  const { showNotification } = useNotification();
  const { uploadImageAndRetrieveURL, getUserPhotoURL } = useProfileData(); // Destructure the functions

  // Local state for password management
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({}); // Local errors for password form
  const [showPasswordChange, setShowPasswordChange] = useState(false);

  // Local state for account deletion and reauthentication
  const [isDeletemodalOpen, setIsDeletemodalOpen] = useState(false);
  const [isReauthmodalOpen, setIsReauthmodalOpen] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthError, setReauthError] = useState('');
  const [isProcessingDelete, setIsProcessingDelete] = useState(false); // Local submitting state for delete

  // Local state for auth provider
  const [authProvider, setAuthProvider] = useState(null);

  // Add state for profile picture upload
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [pictureError, setPictureError] = useState('');
  const fileInputRef = useRef(null);

  // Add a debug log at the beginning of the component
  console.log('AccountBasics rendering with:', { 
    formData, 
    currentUser,
    notificationPreferences: formData?.notificationPreferences || {}
  });

  useEffect(() => {
    if (currentUser) {
      const isGoogleUser = currentUser.providerData.some(
        provider => provider.providerId === 'google.com'
      );
      setAuthProvider(isGoogleUser ? 'google.com' : 'password');
    }
  }, [currentUser]);

  const validatePasswordForm = useCallback(() => {
    const { currentPassword, newPassword, confirmPassword } = passwordData;
    const newPassErrors = {};
    let isValid = true;

    if (!currentPassword) {
      newPassErrors.currentPassword = t('accountBasics.errors.currentPasswordRequired');
      isValid = false;
    }
    if (!newPassword) {
      newPassErrors.newPassword = t('accountBasics.errors.newPasswordRequired');
      isValid = false;
    } else if (newPassword.length < 6) {
      newPassErrors.newPassword = t('accountBasics.errors.newPasswordTooShort');
      isValid = false;
    }
    if (newPassword !== confirmPassword) {
      newPassErrors.confirmPassword = t('accountBasics.errors.passwordsDoNotMatch');
      isValid = false;
    }
    setPasswordErrors(newPassErrors);
    return isValid;
  }, [passwordData, t]);

  const handleUpdatePassword = async () => {
    if (!validatePasswordForm()) return;

    setIsProcessingDelete(true); // Using isProcessingDelete as a local busy indicator
    try {
      if (!auth.currentUser) throw new Error("User not authenticated.");
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        passwordData.currentPassword
      );
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, passwordData.newPassword);

      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordChange(false);
      setPasswordErrors({});
      showNotification(t('accountBasics.passwordUpdated'), 'success');
    } catch (error) {
      console.error('Error updating password:', error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-mismatch') {
        setPasswordErrors({ currentPassword: t('accountBasics.errors.wrongPassword') });
      } else if (error.code === 'auth/too-many-requests') {
         showNotification(t('errors.tooManyRequests'), 'error');
      }
      else {
        showNotification(t('accountBasics.errors.passwordUpdateFailed'), 'error');
      }
    } finally {
      setIsProcessingDelete(false);
    }
  };

  const handleDeleteAccountClick = () => {
    setIsDeletemodalOpen(true);
  };

  const confirmDeleteAccount = () => {
    setIsDeletemodalOpen(false);
    setIsReauthmodalOpen(true); // Always require re-auth for deletion
  };

  const handleReauthenticateAndDelete = async () => {
    if (!auth.currentUser) {
        showNotification(t('errors.notLoggedIn'), 'error');
        return;
    }
    setIsProcessingDelete(true);
    setReauthError('');

    try {
      if (authProvider === 'google.com') {
        const provider = new GoogleAuthProvider();
        // Re-authenticate with Google
        await signInWithPopup(auth, provider); // This re-authenticates implicitly
        // User is now re-authenticated, proceed with delete
        await deleteUser(auth.currentUser); // auth.currentUser should be the re-authenticated user
        showNotification(t('accountBasics.deleted'), 'success');
        // navigate('/'); // Navigation should be handled by Profile.js or AuthContext on user deletion
      } else { // Email/Password
        if (!reauthPassword) {
          setReauthError(t('validation.required'));
          setIsProcessingDelete(false);
          return;
        }
        const credential = EmailAuthProvider.credential(
          auth.currentUser.email,
          reauthPassword
        );
        await reauthenticateWithCredential(auth.currentUser, credential);
        await deleteUser(auth.currentUser);
        showNotification(t('accountBasics.deleted'), 'success');
        // navigate('/');
      }
      setIsReauthmodalOpen(false);
      // User will be signed out automatically by Firebase upon deletion.
      // The AuthContext should handle redirecting the user.
    } catch (err) {
      console.error('Error deleting account:', err);
      if (err.code === 'auth/wrong-password') {
        setReauthError(t('accountBasics.errors.wrongPassword'));
      } else if (err.code === 'auth/too-many-requests') {
         showNotification(t('errors.tooManyRequests'), 'error');
      } else if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        showNotification(t('errors.popupClosed'), 'info');
      }
       else {
        setReauthError(t('accountBasics.errors.deleteFailed'));
        showNotification(t('accountBasics.errors.deleteFailed'), 'error');
      }
    } finally {
      setIsProcessingDelete(false);
      setReauthPassword('');
    }
  };

  const { profileData: headerData, isLoading: headerLoading } = useProfileData();
  
  const displayProfile = headerLoading ? currentUser : (headerData || currentUser);
  const profilePicture = displayProfile?.documents?.profile_picture || displayProfile?.profilePicture || currentUser?.photoURL;
  
  const handleProfilePictureChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > 2) {
      setPictureError(t('accountBasics.errors.fileTooLarge'));
      return;
    }

    if (!file.type.startsWith('image/')) {
      setPictureError(t('accountBasics.errors.invalidFileType'));
      return;
    }

    setIsUploadingPicture(true);
    setPictureError('');

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const photoURL = await uploadImageAndRetrieveURL(currentUser.uid, event.target.result);
        onInputChange('documents.profile_picture', photoURL);
        onInputChange('profilePicture', photoURL);
        setIsUploadingPicture(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      setPictureError(t('accountBasics.errors.uploadFailed'));
      setIsUploadingPicture(false);
    }
  };

  return (
    <div className={styles.sectionContainer}>

      {/* Profile Header (Read-only from props) */}
      <div className={styles.header}>
        <div 
          className={styles.profilePictureContainer}
          onClick={() => fileInputRef.current.click()}
        >
          {profilePicture ? (
            <div className={styles.profilePictureWrapper}>
              <img 
                src={profilePicture} 
                alt={`${displayProfile.firstName} ${displayProfile.lastName}`} 
                className={styles.profilePicture}
              />
              <div className={styles.profilePictureOverlay}>
                <span>{t('accountBasics.changePicture')}</span>
              </div>
            </div>
          ) : (
            <div className={styles.profileInitialsWrapper}>
              <div className={styles.profileInitials} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {displayProfile?.firstName?.[0] || ''}{displayProfile?.lastName?.[0] || ''}
              </div>
              <div className={styles.profilePictureOverlay}>
                <span>{t('accountBasics.addPicture')}</span>
              </div>
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleProfilePictureChange}
            accept="image/*"
            style={{ display: 'none' }}
          />
        </div>
        
        <div className={styles.profileInfo}>
          <p className={styles.profileEmail}>{displayProfile?.email}</p>
          <p className={styles.profileRole}>{displayProfile?.role || t('userRole')}</p>
        </div>
      </div>

      {pictureError && <p className={styles.errorText}>{pictureError}</p>}
      {isUploadingPicture && <p className={styles.uploadingText}>{t('accountBasics.uploading')}</p>}

      <h2 className={styles.sectionTitle}>{t('accountBasics.title')}</h2>
      <p className={styles.sectionSubtitle}>{t('accountBasics.subtitle')}</p>

      {/* Email Display (Read-only from props) */}
      <div className={styles.formGroup}>
        <h3>{t('accountBasics.loginInfo')}</h3>
        <div className={styles.formRow}>
          <div className={styles.formFieldHalf}>
            <p className={styles.readOnlyField}>
                <strong>{t('accountBasics.email')}:</strong> {formData?.email || currentUser?.email}
            </p>
            {/* Email verification status could be displayed here */}
            {/* {formData?.emailVerified ? <span className={styles.verified}>{t('accountBasics.emailVerified')}</span> : <span className={styles.notVerified}>{t('accountBasics.emailNotVerified')}</span>} */}
            {/* Add button for "Resend verification email" if needed */}
          </div>
        </div>

        {/* Password Change Section */}
        {authProvider === 'password' && (
          <div className={styles.formRow}>
            <div className={styles.formFieldHalf}>
              <Button
                onClick={() => setShowPasswordChange(prev => !prev)}
                type="button"
                variant="secondary"
              >
                {showPasswordChange ? t('common.cancel') : t('accountBasics.changePassword')}
              </Button>
            </div>
          </div>
        )}

        {showPasswordChange && authProvider === 'password' && (
          <div className={styles.passwordChangeContainer}>
            <InputFieldHideUnhide
              label={t('accountBasics.currentPassword')}
              name="currentPassword"
              value={passwordData.currentPassword}
              onChange={(e) => {
                setPasswordData({ ...passwordData, currentPassword: e.target.value });
                if (passwordErrors.currentPassword) setPasswordErrors(prev => ({...prev, currentPassword: null}));
              }}
              error={passwordErrors.currentPassword}
              type="password"
              showErrors={true}
              marginTop={10}
            />
            <InputFieldHideUnhide
              label={t('accountBasics.newPassword')}
              name="newPassword"
              value={passwordData.newPassword}
              onChange={(e) => {
                setPasswordData({ ...passwordData, newPassword: e.target.value });
                 if (passwordErrors.newPassword) setPasswordErrors(prev => ({...prev, newPassword: null}));
              }}
              error={passwordErrors.newPassword}
              type="password"
              showErrors={true}
              marginTop={10}
            />
            <InputFieldHideUnhide
              label={t('accountBasics.confirmPassword')}
              name="confirmPassword"
              value={passwordData.confirmPassword}
              onChange={(e) => {
                setPasswordData({ ...passwordData, confirmPassword: e.target.value });
                 if (passwordErrors.confirmPassword) setPasswordErrors(prev => ({...prev, confirmPassword: null}));
              }}
              error={passwordErrors.confirmPassword}
              type="password"
              showErrors={true}
              marginTop={10}
            />
            <Button
              onClick={handleUpdatePassword}
              disabled={isProcessingDelete || !passwordData.currentPassword || !passwordData.newPassword}
              type="button"
              variant="primary"
              marginTop={10}
            >
              {isProcessingDelete ? t('common.saving') : t('accountBasics.updatePassword')}
            </Button>
          </div>
        )}

        {authProvider === 'google.com' && (
          <div className={styles.googleAuthMessage}>
            <img
              src={googleAuthLogo}
              alt="Google Auth"
              style={{ height: '24px', marginRight: '8px', verticalAlign: 'middle' }}
            />
            {t('accountBasics.googleAuthMessage')}
          </div>
        )}
      </div>

      <div className={styles.sectionDivider}></div>

      {/* Notification Preferences */}
      <div className={styles.formGroup}>
        <div className={styles.FormGroupNotificationPreferences}>
          <h3>{t('accountBasics.notificationPreferences')}</h3>
          <Switch
            id="email-notifications"
            label={t('accountBasics.emailNotifications')}
            checked={formData?.notificationPreferences?.email || false}
            onChange={(checked) => onNotificationPreferenceChange('email', checked)}
            disabled={isSubmitting}
          />
          <Switch
            id="sms-notifications"
            label={t('accountBasics.smsNotifications')}
            checked={formData?.notificationPreferences?.sms || false}
            onChange={(checked) => onNotificationPreferenceChange('sms', checked)}
            disabled={isSubmitting} // Also, consider if SMS requires phone verification first
          />
          <Switch
            id="push-notifications"
            label={t('accountBasics.pushNotifications')}
            checked={formData?.notificationPreferences?.push || false}
            onChange={(checked) => onNotificationPreferenceChange('push', checked)}
            disabled={isSubmitting}
          />
          {errors?.notificationPreferences && <p className={styles.errorText}>{errors.notificationPreferences}</p>}
        </div>
      </div>
      <div className={styles.sectionDivider}></div>

      {/* Privacy Settings */}
      <div className={styles.formGroup} style={{paddingBottom: '10px'}}>
        <h3>{t('accountBasics.privacySettings')}</h3>
        <div className={styles.radioGroup} role="radiogroup" aria-labelledby="profileVisibilityLabel">
            <span id="profileVisibilityLabel" className="sr-only">{t('accountBasics.profileVisibility')}</span>
            <label className={styles.radioOption}>
                <input
                type="radio"
                name="profileVisibility"
                value="public"
                checked={formData?.profileVisibility === 'public'}
                onChange={() => onInputChange('profileVisibility', 'public')}
                disabled={isSubmitting}
                />
                {t('accountBasics.public')}
            </label>
            <label className={styles.radioOption}>
                <input
                type="radio"
                name="profileVisibility"
                value="private"
                checked={formData?.profileVisibility === 'private'}
                onChange={() => onInputChange('profileVisibility', 'private')}
                disabled={isSubmitting}
                />
                {t('accountBasics.private')}
            </label>
        </div>
        {errors?.profileVisibility && <p className={styles.errorText}>{errors.profileVisibility}</p>}
      </div>

      {/* 2FA - Placeholder if you have this field */}
      {/* <div className={styles.sectionDivider}></div>
      <div className={styles.formGroup}>
        <h3>{t('accountBasics.twoFactorAuthentication')}</h3>
        <Switch
          id="2fa-enabled"
          label={t('accountBasics.enable2FA')}
          checked={formData?.twoFactorEnabled || false}
          onChange={(checked) => onInputChange('twoFactorEnabled', checked)}
          disabled={isSubmitting} // 2FA setup would be more complex
        />
        {formData?.twoFactorEnabled && <p>{t('accountBasics.2faIsEnabledMessage')}</p>}
        {!formData?.twoFactorEnabled && <p>{t('accountBasics.2faIsDisabledMessage')}</p>}
        {errors?.twoFactorEnabled && <p className={styles.errorText}>{errors.twoFactorEnabled}</p>}
      </div> */}


      <div className={styles.sectionDivider}></div>

      {/* Delete Account Section */}
      <div className={styles.formGroup} style={{paddingBottom: '10px'}}>
        <h3>{t('accountBasics.deleteAccount')}</h3>
        <Button
          onClick={handleDeleteAccountClick}
          type="button"
          variant="warning"
          disabled={isSubmitting || isProcessingDelete}
        >
          {t('accountBasics.deleteAccountButton')}
        </Button>
      </div>

      {/* Action Buttons from Profile.js */}
      <div className={styles.onboardingActions}>
        <Button
          onClick={onCancel} // Uses onCancel from Profile.js
          variant="secondary"
          disabled={isSubmitting || isProcessingDelete}
        >
          {t('common.cancel')}
        </Button>
        <Button
          onClick={onSaveAndContinue} // Uses onSaveAndContinue from Profile.js
          variant="confirmation"
          disabled={isSubmitting || isProcessingDelete}
        >
          {isSubmitting ? t('common.saving') : (isOnboarding ? t('common.saveAndContinue') : t('common.save'))}
        </Button>
      </div>

      {/* Delete Account Confirmation modal */}
      <modal
        isOpen={isDeletemodalOpen}
        onClose={() => setIsDeletemodalOpen(false)}
        title={t('accountBasics.deleteAccountmodalTitle')}
        size="small"
        messageType="warning"
        actions={
          <>
            <Button onClick={() => setIsDeletemodalOpen(false)} type="button" variant="secondary" disabled={isProcessingDelete}>
              {t('common.cancel')}
            </Button>
            <Button onClick={confirmDeleteAccount} type="button" variant="warning" disabled={isProcessingDelete}>
              {t('accountBasics.confirmDelete')}
            </Button>
          </>
        }
      >
        <div className={styles.deletemodalContent}>
          <p className={styles.deleteWarning}>{t('accountBasics.deleteWarningPermanent')}</p>
          <p>{t('accountBasics.deleteConfirmationDetails')}</p>
          <ul>
            <li>{t('accountBasics.deleteEffect1')}</li>
            <li>{t('accountBasics.deleteEffect2')}</li>
            {/* Add more effects as per your documentation */}
          </ul>
        </div>
      </modal>

      {/* Reauthenticate modal for Deletion */}
      <modal
        isOpen={isReauthmodalOpen}
        onClose={() => {
            setIsReauthmodalOpen(false);
            setReauthPassword('');
            setReauthError('');
        }}
        title={t('accountBasics.reauthenticateTitle')}
        size="small"
        messageType="warning"
        actions={
          <>
            <Button onClick={() => {setIsReauthmodalOpen(false); setReauthPassword(''); setReauthError('');}} type="button" variant="secondary" disabled={isProcessingDelete}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleReauthenticateAndDelete} type="button" variant="warning" disabled={isProcessingDelete}>
              {isProcessingDelete ? t('common.processing') : t('accountBasics.confirmDeleteAccount')}
            </Button>
          </>
        }
      >
        <div className={styles.reauthmodalContent}>
          <p>
            {authProvider === 'google.com'
              ? t('accountBasics.reauthenticateMessageGoogleDelete')
              : t('accountBasics.reauthenticateMessagePasswordDelete')}
          </p>
        </div>
        {authProvider !== 'google.com' && (
          <InputFieldHideUnhide
            label={t('accountBasics.password')}
            name="reauthPassword"
            value={reauthPassword}
            onChange={(e) => {
                setReauthPassword(e.target.value);
                if(reauthError) setReauthError('');
            }}
            error={reauthError}
            type="password"
            marginTop={10}
            showErrors={true}
          />
        )}
      </modal>
    </div>
  );
};

export default AccountBasics;