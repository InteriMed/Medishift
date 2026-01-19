import React, { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../contexts/AuthContext';
import { useNotification } from '../../../../contexts/NotificationContext';
import { auth, db } from '../../../../services/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import googleAuthLogo from '../../../../assets/pages/auth/googleAuthLogo.png';
import {
  updatePassword,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import Button from '../../../../components/BoxedInputFields/Button';
import InputFieldHideUnhide from '../../../../components/BoxedInputFields/InputFieldHideUnhide';
import PersonnalizedInputField from '../../../../components/BoxedInputFields/Personnalized-InputField';
import Dialog from '../../../../components/Dialog/Dialog';
import useProfileData from '../../../hooks/useProfileData';
import AccountDeletion from './AccountDeletion';
import { FiLogOut } from 'react-icons/fi';

const AccountManagement = ({
  formData,
  config,
  errors,
  isSubmitting,
  onInputChange,
  onSaveAndContinue,
  onCancel,
  getNestedValue,
  currentUser: propCurrentUser,
}) => {
  const { t } = useTranslation(['dashboardProfile', 'common']);
  const { currentUser: authCurrentUser } = useAuth();
  const { showNotification } = useNotification();
  const { uploadImageAndRetrieveURL } = useProfileData();

  const currentUser = propCurrentUser || authCurrentUser;

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [showPasswordChange, setShowPasswordChange] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isReauthDialogOpen, setIsReauthDialogOpen] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthError, setReauthError] = useState('');
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);

  const [authProvider, setAuthProvider] = useState(null);

  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [pictureError, setPictureError] = useState('');
  const fileInputRef = useRef(null);

  const [facilityMemberships, setFacilityMemberships] = useState([]);
  const [showLeaveFacilityDialog, setShowLeaveFacilityDialog] = useState(false);
  const [targetFacility, setTargetFacility] = useState(null);
  const [leaveFacilityConfirmText, setLeaveFacilityConfirmText] = useState('');
  const [isLeavingFacility, setIsLeavingFacility] = useState(false);

  useEffect(() => {
    const loadFacilityMemberships = async () => {
      if (!currentUser?.uid) return;
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setFacilityMemberships(userData.facilityMemberships || []);
        }
      } catch (error) {
        console.error('Error loading facility memberships:', error);
      }
    };
    loadFacilityMemberships();
  }, [currentUser?.uid]);

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

    setIsProcessingDelete(true);
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
      } else {
        showNotification(t('accountBasics.errors.passwordUpdateFailed'), 'error');
      }
    } finally {
      setIsProcessingDelete(false);
    }
  };

  const handleDeleteAccountClick = () => {
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteAccount = () => {
    setIsDeleteDialogOpen(false);
    setIsReauthDialogOpen(true);
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
        await signInWithPopup(auth, provider);
        await deleteUser(auth.currentUser);
        showNotification(t('accountBasics.deleted'), 'success');
      } else {
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
      setIsReauthDialogOpen(false);
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

  const handleLeaveFacility = async () => {
    if (leaveFacilityConfirmText !== 'LEAVE FACILITY') return;
    if (!targetFacility || !currentUser?.uid) return;

    setIsLeavingFacility(true);
    try {
      const facilityId = targetFacility.facilityId || targetFacility.facilityProfileId;
      const userId = currentUser.uid;

      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const updatedMemberships = (userData.facilityMemberships || []).filter(
          m => m.facilityId !== facilityId && m.facilityProfileId !== facilityId
        );
        await updateDoc(userRef, {
          facilityMemberships: updatedMemberships,
          updatedAt: serverTimestamp()
        });
        setFacilityMemberships(updatedMemberships);
      }

      const facilityRef = doc(db, 'facilityProfiles', facilityId);
      const facilitySnap = await getDoc(facilityRef);
      if (facilitySnap.exists()) {
        const facilityData = facilitySnap.data();
        const updatedEmployees = (facilityData.employees || []).filter(e => e.uid !== userId);
        const updatedAdmins = (facilityData.admins || []).filter(a => a !== userId);
        await updateDoc(facilityRef, {
          employees: updatedEmployees,
          admins: updatedAdmins,
          updatedAt: serverTimestamp()
        });
      }

      showNotification(t('settings.leaveFacility.success', 'Successfully left the facility'), 'success');
      setShowLeaveFacilityDialog(false);
      setLeaveFacilityConfirmText('');
      setTargetFacility(null);
    } catch (error) {
      console.error('Error leaving facility:', error);
      showNotification(t('settings.leaveFacility.error', 'Failed to leave facility'), 'error');
    } finally {
      setIsLeavingFacility(false);
    }
  };

  const displayProfile = formData || currentUser || {};
  const profilePicture = getNestedValue(formData, 'documents.profile_picture') || getNestedValue(formData, 'profilePicture') || formData?.profilePicture || currentUser?.photoURL;

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1200px] mx-auto px-4 py-6">
      <div className="bg-card rounded-xl border border-border/60 p-6 pb-4 shadow-sm w-full">
        <h2 className="text-2xl font-semibold mb-2" style={{ fontSize: '18px', color: 'hsl(var(--foreground))', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
          {t('tabs.accountManagement', 'Account Management')}
        </h2>
        <p className="text-sm font-medium text-muted-foreground" style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
          {t('settings.accountManagement.subtitle', 'Manage your account settings, password, and account deletion')}
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border/60 p-6 shadow-sm w-full">
        <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
          {t('accountBasics.loginInfo', 'Login Information')}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">{t('accountBasics.email', 'Email')}</label>
            <div className="mt-1 p-3 bg-muted/50 rounded-md text-sm border border-border/50">
              {formData?.email || currentUser?.email}
            </div>
          </div>

          {authProvider === 'password' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-muted-foreground">{t('accountBasics.password', 'Password')}</label>
                <Button
                  onClick={() => setShowPasswordChange(prev => !prev)}
                  variant="text"
                  size="sm"
                >
                  {showPasswordChange ? t('common.cancel') : t('accountBasics.changePassword', 'Change Password')}
                </Button>
              </div>

              {showPasswordChange && (
                <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border/50 space-y-4">
                  <InputFieldHideUnhide
                    label={t('accountBasics.currentPassword', 'Current Password')}
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={(e) => {
                      setPasswordData({ ...passwordData, currentPassword: e.target.value });
                      if (passwordErrors.currentPassword) setPasswordErrors(prev => ({ ...prev, currentPassword: null }));
                    }}
                    error={passwordErrors.currentPassword}
                    type="password"
                    showErrors={true}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputFieldHideUnhide
                      label={t('accountBasics.newPassword', 'New Password')}
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={(e) => {
                        setPasswordData({ ...passwordData, newPassword: e.target.value });
                        if (passwordErrors.newPassword) setPasswordErrors(prev => ({ ...prev, newPassword: null }));
                      }}
                      error={passwordErrors.newPassword}
                      type="password"
                      showErrors={true}
                    />
                    <InputFieldHideUnhide
                      label={t('accountBasics.confirmPassword', 'Confirm Password')}
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={(e) => {
                        setPasswordData({ ...passwordData, confirmPassword: e.target.value });
                        if (passwordErrors.confirmPassword) setPasswordErrors(prev => ({ ...prev, confirmPassword: null }));
                      }}
                      error={passwordErrors.confirmPassword}
                      type="password"
                      showErrors={true}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={handleUpdatePassword}
                      disabled={isProcessingDelete || !passwordData.currentPassword || !passwordData.newPassword}
                      variant="primary"
                      size="sm"
                    >
                      {isProcessingDelete ? t('common.saving') : t('accountBasics.updatePassword', 'Update Password')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {authProvider === 'google.com' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-primary/5 dark:bg-primary/10 rounded-lg border border-primary/20 dark:border-primary/30">
              <img
                src={googleAuthLogo}
                alt="Google"
                className="w-5 h-5"
              />
              {t('accountBasics.googleAuthMessage', 'You signed in with Google. Password changes are managed through your Google account.')}
            </div>
          )}
        </div>
      </div>

      {facilityMemberships.length > 0 && (
        <div className="bg-card rounded-xl border border-border/60 p-6 shadow-sm w-full">
          <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
            {t('settings.facilityMemberships.title', 'Facility Memberships')}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t('settings.facilityMemberships.subtitle', 'Manage your facility associations')}
          </p>
          <div className="space-y-3">
            {facilityMemberships.map((facility, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
                <div>
                  <div className="font-medium">{facility.facilityName}</div>
                  <div className="text-sm text-muted-foreground">Role: {facility.role}</div>
                </div>
                <Button
                  onClick={() => { setTargetFacility(facility); setShowLeaveFacilityDialog(true); }}
                  variant="secondary"
                  size="sm"
                >
                  <FiLogOut className="mr-1" size={14} /> {t('settings.leaveFacility.button', 'Leave')}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border/60 p-6 shadow-sm w-full">
        <h3 className="text-sm font-semibold mb-4 text-red-600 dark:text-red-400" style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
          {t('accountBasics.deleteAccount', 'Delete Account')}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {t('settings.accountDeletion.subtitle', 'Permanently delete your account and all associated data')}
        </p>
        <AccountDeletion />
      </div>

      <Dialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        title={t('accountBasics.deleteAccountDialogTitle', 'Delete Account')}
        size="small"
        messageType="warning"
        actions={
          <>
            <Button onClick={() => setIsDeleteDialogOpen(false)} type="button" variant="secondary" disabled={isProcessingDelete}>
              {t('common.cancel')}
            </Button>
            <Button onClick={confirmDeleteAccount} type="button" variant="warning" disabled={isProcessingDelete}>
              {t('accountBasics.confirmDelete', 'Confirm Delete')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="font-bold text-red-600">{t('accountBasics.deleteWarningPermanent', 'This action cannot be undone!')}</p>
          <p>{t('accountBasics.deleteConfirmationDetails', 'Are you sure you want to delete your account? This will permanently delete all your data.')}</p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            <li>{t('accountBasics.deleteEffect1', 'All your profile data will be deleted')}</li>
            <li>{t('accountBasics.deleteEffect2', 'All your contracts and messages will be deleted')}</li>
          </ul>
        </div>
      </Dialog>

      <Dialog
        isOpen={isReauthDialogOpen}
        onClose={() => {
          setIsReauthDialogOpen(false);
          setReauthPassword('');
          setReauthError('');
        }}
        title={t('accountBasics.reauthenticateTitle', 'Re-authenticate')}
        size="small"
        messageType="warning"
        actions={
          <>
            <Button onClick={() => { setIsReauthDialogOpen(false); setReauthPassword(''); setReauthError(''); }} type="button" variant="secondary" disabled={isProcessingDelete}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleReauthenticateAndDelete} type="button" variant="warning" disabled={isProcessingDelete}>
              {isProcessingDelete ? t('common.processing') : t('accountBasics.confirmDeleteAccount', 'Confirm Delete Account')}
            </Button>
          </>
        }
      >
        <div className="mb-4">
          <p>
            {authProvider === 'google.com'
              ? t('accountBasics.reauthenticateMessageGoogleDelete', 'Please sign in with Google again to confirm account deletion.')
              : t('accountBasics.reauthenticateMessagePasswordDelete', 'Please enter your password to confirm account deletion.')}
          </p>
        </div>
        {authProvider !== 'google.com' && (
          <InputFieldHideUnhide
            label={t('accountBasics.password', 'Password')}
            name="reauthPassword"
            value={reauthPassword}
            onChange={(e) => {
              setReauthPassword(e.target.value);
              if (reauthError) setReauthError('');
            }}
            error={reauthError}
            type="password"
            marginTop={10}
            showErrors={true}
          />
        )}
      </Dialog>

      <Dialog
        isOpen={showLeaveFacilityDialog}
        onClose={() => { setShowLeaveFacilityDialog(false); setLeaveFacilityConfirmText(''); setTargetFacility(null); }}
        title={t('settings.leaveFacility.dialogTitle', 'Leave Facility')}
        size="small"
        messageType="warning"
        actions={
          <>
            <Button onClick={() => { setShowLeaveFacilityDialog(false); setLeaveFacilityConfirmText(''); }} variant="secondary" disabled={isLeavingFacility}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleLeaveFacility} variant="warning" disabled={isLeavingFacility || leaveFacilityConfirmText !== 'LEAVE FACILITY'}>
              {isLeavingFacility ? t('common.processing') : t('settings.leaveFacility.confirm', 'Leave Facility')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p>{t('settings.leaveFacility.message', 'You are about to leave')} <strong>{targetFacility?.facilityName}</strong>.</p>
          <p className="text-sm text-muted-foreground">{t('settings.leaveFacility.warning', 'You will lose access to this facility and its resources.')}</p>
          <p className="text-sm text-muted-foreground">{t('settings.leaveFacility.confirmPrompt', 'Type')} <strong>LEAVE FACILITY</strong> {t('settings.leaveFacility.toConfirm', 'to confirm')}:</p>
          <PersonnalizedInputField
            value={leaveFacilityConfirmText}
            onChange={e => setLeaveFacilityConfirmText(e.target.value)}
            placeholder="LEAVE FACILITY"
          />
        </div>
      </Dialog>
    </div>
  );
};

AccountManagement.propTypes = {
  formData: PropTypes.object.isRequired,
  config: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  isSubmitting: PropTypes.bool.isRequired,
  onInputChange: PropTypes.func.isRequired,
  onSaveAndContinue: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  getNestedValue: PropTypes.func.isRequired,
  currentUser: PropTypes.object,
};

export default AccountManagement;


