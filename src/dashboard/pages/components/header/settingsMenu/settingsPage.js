import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../../contexts/authContext';
import { useNotification } from '../../../../../contexts/notificationContext';
import useProfileData from '../../../hooks/useProfileData';
import Button from '../../../../../components/boxedInputFields/button';
import modal from '../../../../../components/modals/modal';
import InputFieldHideUnhide from '../../../../../components/boxedInputFields/inputFieldHideUnhide';
import Switch from '../../../../../components/boxedInputFields/switch';
import { FiTrash } from 'react-icons/fi';
import { 
  updatePassword,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '../../../../../services/services/firebase';
import styles from './styles/settingsPage.module.css';
import unifiedStyles from './styles/profileUnified.module.css';

const SettingsPage = () => {
  const { t } = useTranslation(['dashboardProfile', 'common']);
  const { currentUser } = useAuth();
  const { showNotification } = useNotification();
  const { profileData, isLoading, updateProfileData, uploadImageAndRetrieveURL } = useProfileData();
  
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('settings'); // 'settings' or 'advanced'
  
  // Local state for profile picture upload
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [pictureError, setPictureError] = useState('');
  const fileInputRef = React.useRef(null);
  
  // Local state for password management
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  
  // Local state for account deletion and reauthentication
  const [isDeletemodalOpen, setIsDeletemodalOpen] = useState(false);
  const [isReauthmodalOpen, setIsReauthmodalOpen] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthError, setReauthError] = useState('');
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);
  
  // Local state for auth provider
  const [authProvider, setAuthProvider] = useState(null);

  useEffect(() => {
    if (profileData) {
      setFormData(profileData);
    }
  }, [profileData]);
  
  useEffect(() => {
    if (currentUser) {
      const isGoogleUser = currentUser.providerData.some(
        provider => provider.providerId === 'google.com'
      );
      setAuthProvider(isGoogleUser ? 'google.com' : 'password');
    }
  }, [currentUser]);

  const handleInputChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when user makes changes
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleNotificationPreferenceChange = (preferenceName, value) => {
    setFormData(prev => ({
      ...prev,
      notificationPreferences: {
        ...prev.notificationPreferences,
        [preferenceName]: value
      }
    }));
    
    if (errors.notificationPreferences) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.notificationPreferences;
        return newErrors;
      });
    }
  };

  const handleNestedInputChange = (objectName, fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [objectName]: {
        ...prev[objectName],
        [fieldName]: value
      }
    }));
    
    if (errors[objectName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        if (newErrors[objectName]) {
          delete newErrors[objectName][fieldName];
          if (Object.keys(newErrors[objectName]).length === 0) {
            delete newErrors[objectName];
          }
        }
        return newErrors;
      });
    }
  };
  
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
        const updatedFormData = {
          ...formData,
          documents: {
            ...(formData.documents || {}),
            profile_picture: photoURL
          },
          profilePicture: photoURL
        };
        handleInputChange('documents.profile_picture', photoURL);
        handleInputChange('profilePicture', photoURL);
        setFormData(updatedFormData);
        await updateProfileData(updatedFormData);
        setIsUploadingPicture(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      setPictureError(t('accountBasics.errors.uploadFailed'));
      setIsUploadingPicture(false);
    }
  };
  
  // Password validation and update
  const validatePasswordForm = () => {
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
  };

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
  
  // Account deletion
  const handleDeleteAccountClick = () => {
    setIsDeletemodalOpen(true);
  };

  const confirmDeleteAccount = () => {
    setIsDeletemodalOpen(false);
    setIsReauthmodalOpen(true);
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
        await signInWithPopup(auth, provider);
        // User is now re-authenticated, proceed with delete
        await deleteUser(auth.currentUser);
        showNotification(t('accountBasics.deleted'), 'success');
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
      }
      setIsReauthmodalOpen(false);
    } catch (err) {
      console.error('Error deleting account:', err);
      if (err.code === 'auth/wrong-password') {
        setReauthError(t('accountBasics.errors.wrongPassword'));
      } else if (err.code === 'auth/too-many-requests') {
         showNotification(t('errors.tooManyRequests'), 'error');
      } else if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        showNotification(t('errors.popupClosed'), 'info');
      } else {
        setReauthError(t('accountBasics.errors.deleteFailed'));
        showNotification(t('accountBasics.errors.deleteFailed'), 'error');
      }
    } finally {
      setIsProcessingDelete(false);
      setReauthPassword('');
    }
  };

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;
    
    // Add validation logic for settings fields
    if (!formData.profileVisibility) {
      newErrors.profileVisibility = t('validation.required');
      isValid = false;
    }
    
    // Job preferences validation
    if (!formData.availabilityStatus) {
      newErrors.availabilityStatus = t('validation.required');
      isValid = false;
    }
    
    // Only validate job-specific fields if user is looking for work
    if (formData.availabilityStatus && formData.availabilityStatus !== 'not_looking') {
      // Validate desiredWorkPercentage
      if (!formData.desiredWorkPercentage || 
          formData.desiredWorkPercentage.min === undefined || 
          formData.desiredWorkPercentage.max === undefined) {
        newErrors.desiredWorkPercentage = t('validation.required');
        isValid = false;
      }
      
      // Validate preferredWorkRadiusKm
      if (!formData.preferredWorkRadiusKm && formData.preferredWorkRadiusKm !== 0) {
        newErrors.preferredWorkRadiusKm = t('validation.required');
        isValid = false;
      }
      
      // Validate targetHourlyRate
      if (!formData.targetHourlyRate || 
          formData.targetHourlyRate.min === undefined || 
          formData.targetHourlyRate.max === undefined) {
        newErrors.targetHourlyRate = t('validation.required');
        isValid = false;
      }
    }
    
    setErrors(newErrors);
    return isValid;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      await updateProfileData(formData);
      showNotification(t('settings.savedSuccessfully'), 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      showNotification(t('settings.saveFailed'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original profile data
    if (profileData) {
      setFormData(profileData);
    }
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setShowPasswordChange(false);
    setPasswordErrors({});
    setErrors({});
  };

  if (isLoading) {
    return <div className={styles.loadingContainer}>{t('common:loading', 'Loading settings...')}</div>;
  }
  
  const displayProfile = profileData || currentUser || {};
  const profilePicture = displayProfile?.documents?.profile_picture || displayProfile?.profilePicture || currentUser?.photoURL;

  return (
    <div className={styles.settingsPageContainer}>
      <h1 className={styles.pageTitle}>{t('settings.title')}</h1>
      
      <div className={styles.settingsTabs}>
        <button 
          className={`${styles.tabButton} ${activeTab === 'settings' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          {t('settings.generalTab')}
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'advanced' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('advanced')}
        >
          {t('settings.advancedTab')}
        </button>
      </div>
      
      {activeTab === 'settings' && (
        <div className={styles.settingsContent}>
          <div className={styles.mainSettingsPanel}>
            {/* Profile Header with Picture */}
            <div className={unifiedStyles.header}>
              <div 
                className={unifiedStyles.profilePictureContainer}
                onClick={() => fileInputRef.current.click()}
              >
                {profilePicture ? (
                  <div className={unifiedStyles.profilePictureWrapper}>
                    <img 
                      src={profilePicture} 
                      alt={`${displayProfile.firstName} ${displayProfile.lastName}`} 
                      className={unifiedStyles.profilePicture}
                    />
                    <div className={unifiedStyles.profilePictureOverlay}>
                      <span>{t('accountBasics.changePicture')}</span>
                    </div>
                  </div>
                ) : (
                  <div className={unifiedStyles.profileInitialsWrapper}>
                    <div className={unifiedStyles.profileInitials} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {displayProfile?.firstName?.[0] || ''}{displayProfile?.lastName?.[0] || ''}
                    </div>
                    <div className={unifiedStyles.profilePictureOverlay}>
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
              
              <div className={unifiedStyles.profileInfo}>
                <p className={unifiedStyles.profileEmail}>{displayProfile?.email}</p>
                <p className={unifiedStyles.profileRole}>{displayProfile?.role || t('userRole')}</p>
              </div>
            </div>

            {pictureError && <p className={unifiedStyles.errorText}>{pictureError}</p>}
            {isUploadingPicture && <p className={unifiedStyles.uploadingText}>{t('accountBasics.uploading')}</p>}

            {/* Account Security Section */}
            <div className={styles.sectionContainer}>
              <h2 className={styles.sectionTitle}>{t('accountBasics.loginInfo')}</h2>
              
              <div className={unifiedStyles.formRow}>
                <div className={unifiedStyles.formFieldHalf}>
                  <p className={unifiedStyles.readOnlyField}>
                      <strong>{t('accountBasics.email')}:</strong> {formData?.email || currentUser?.email}
                  </p>
                </div>
              </div>

              {/* Password Change Section */}
              {authProvider === 'password' && (
                <div className={unifiedStyles.formRow}>
                  <div className={unifiedStyles.formFieldHalf}>
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
                <div className={unifiedStyles.passwordChangeContainer}>
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
                <div className={unifiedStyles.googleAuthMessage}>
                  <img
                    src="/assets/images/googleAuthLogo.png"
                    alt="Google Auth"
                    style={{ height: '24px', marginRight: '8px', verticalAlign: 'middle' }}
                  />
                  {t('accountBasics.googleAuthMessage')}
                </div>
              )}
            </div>

            <div className={styles.sectionDivider}></div>

            {/* Notification Preferences */}
            <div className={styles.sectionContainer}>
              <h2 className={styles.sectionTitle}>{t('accountBasics.notificationPreferences')}</h2>
              
              <div className={unifiedStyles.FormGroupNotificationPreferences}>
                <Switch
                  id="email-notifications"
                  label={t('accountBasics.emailNotifications')}
                  checked={formData?.notificationPreferences?.email || false}
                  onChange={(checked) => handleNotificationPreferenceChange('email', checked)}
                  disabled={isSubmitting}
                />
                <Switch
                  id="sms-notifications"
                  label={t('accountBasics.smsNotifications')}
                  checked={formData?.notificationPreferences?.sms || false}
                  onChange={(checked) => handleNotificationPreferenceChange('sms', checked)}
                  disabled={isSubmitting}
                />
                <Switch
                  id="push-notifications"
                  label={t('accountBasics.pushNotifications')}
                  checked={formData?.notificationPreferences?.push || false}
                  onChange={(checked) => handleNotificationPreferenceChange('push', checked)}
                  disabled={isSubmitting}
                />
                {errors?.notificationPreferences && <p className={unifiedStyles.errorText}>{errors.notificationPreferences}</p>}
              </div>
            </div>

            <div className={styles.sectionDivider}></div>

            {/* Privacy Settings */}
            <div className={styles.sectionContainer}>
              <h2 className={styles.sectionTitle}>{t('accountBasics.privacySettings')}</h2>
              
              <div className={unifiedStyles.radioGroup} role="radiogroup" aria-labelledby="profileVisibilityLabel">
                <span id="profileVisibilityLabel" className="sr-only">{t('accountBasics.profileVisibility')}</span>
                <label className={unifiedStyles.radioOption}>
                  <input
                    type="radio"
                    name="profileVisibility"
                    value="public"
                    checked={formData?.profileVisibility === 'public'}
                    onChange={() => handleInputChange('profileVisibility', 'public')}
                    disabled={isSubmitting}
                  />
                  {t('accountBasics.public')}
                </label>
                <label className={unifiedStyles.radioOption}>
                  <input
                    type="radio"
                    name="profileVisibility"
                    value="private"
                    checked={formData?.profileVisibility === 'private'}
                    onChange={() => handleInputChange('profileVisibility', 'private')}
                    disabled={isSubmitting}
                  />
                  {t('accountBasics.private')}
                </label>
              </div>
              {errors?.profileVisibility && <p className={unifiedStyles.errorText}>{errors.profileVisibility}</p>}
            </div>

            <div className={styles.sectionDivider}></div>

            {/* Job Preferences */}
            <div className={styles.sectionContainer}>
              <h2 className={styles.sectionTitle}>{t('jobPreferences.title')}</h2>
              <p className={styles.sectionSubtitle}>{t('jobPreferences.subtitle')}</p>
              
              {/* Availability Status */}
              <h3 className={unifiedStyles.subsectionTitle}>{t('jobPreferences.availability')}</h3>
              <div className={unifiedStyles.formGroup}>
                <select
                  value={formData?.availabilityStatus || ''}
                  onChange={(e) => handleInputChange('availabilityStatus', e.target.value)}
                  disabled={isSubmitting}
                  className={styles.selectField}
                >
                  <option value="">{t('jobPreferences.selectStatus')}</option>
                  <option value="active">{t('jobPreferences.activelyLooking')}</option>
                  <option value="open">{t('jobPreferences.openToOffers')}</option>
                  <option value="not_looking">{t('jobPreferences.notLooking')}</option>
                </select>
                {errors?.availabilityStatus && <p className={unifiedStyles.errorText}>{errors.availabilityStatus}</p>}
              </div>

              {/* Work Preferences - Only shown if not "not_looking" */}
              {formData?.availabilityStatus && formData.availabilityStatus !== 'not_looking' && (
                <>
                  {/* We'll add a simplified version of the job preferences here */}
                  <h3 className={unifiedStyles.subsectionTitle}>{t('jobPreferences.workPreferences')}</h3>
                  <div className={unifiedStyles.formGroup}>
                    <label>{t('jobPreferences.workRadius')}</label>
                    <input 
                      type="range" 
                      min="0" 
                      max="200" 
                      step="5"
                      value={formData?.preferredWorkRadiusKm || 0}
                      onChange={(e) => handleInputChange('preferredWorkRadiusKm', parseInt(e.target.value))}
                      disabled={isSubmitting}
                      className={styles.rangeSlider}
                    />
                    <div className={styles.rangeValue}>
                      {formData?.preferredWorkRadiusKm || 0} km
                    </div>
                    {errors?.preferredWorkRadiusKm && <p className={unifiedStyles.errorText}>{errors.preferredWorkRadiusKm}</p>}
                  </div>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className={unifiedStyles.onboardingActions}>
              <Button onClick={handleCancel} variant="secondary" disabled={isSubmitting}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSave} variant="confirmation" disabled={isSubmitting}>
                {isSubmitting ? t('common.saving') : t('common.save')}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'advanced' && (
        <div className={styles.settingsContent}>
          <div className={styles.advancedSettingsPanel}>
            {/* Delete Account Section */}
            <div className={styles.dangerZone}>
              <h2 className={styles.dangerZoneTitle}>{t('settings.dangerZone')}</h2>
              <div className={styles.dangerZoneContent}>
                <div className={styles.dangerItem}>
                  <div className={styles.dangerItemInfo}>
                    <h3>{t('accountBasics.deleteAccount')}</h3>
                    <p>{t('accountBasics.deleteAccountDescription')}</p>
                  </div>
                  <Button
                    onClick={handleDeleteAccountClick}
                    type="button"
                    variant="danger"
                    disabled={isProcessingDelete}
                    icon={<FiTrash />}
                  >
                    {t('accountBasics.deleteAccountButton')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
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
        <div className={unifiedStyles.deletemodalContent}>
          <p className={unifiedStyles.deleteWarning}>{t('accountBasics.deleteWarningPermanent')}</p>
          <p>{t('accountBasics.deleteConfirmationDetails')}</p>
          <ul>
            <li>{t('accountBasics.deleteEffect1')}</li>
            <li>{t('accountBasics.deleteEffect2')}</li>
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
        <div className={unifiedStyles.reauthmodalContent}>
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

export default SettingsPage; 