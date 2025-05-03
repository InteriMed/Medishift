import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboard } from '../context/DashboardContext';
import userService from '../../services/userService';
import { showNotification } from '../utils/notifications';

const useProfileData = () => {
  const { t } = useTranslation();
  const { userId, isLoading: isDashboardLoading } = useDashboard();
  
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Load profile data
  const loadProfile = useCallback(async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const profileData = await userService.getUserProfile(userId);
      setProfile(profileData);
      setError(null);
    } catch (err) {
      console.error('Error loading profile:', err);
      setError(err);
      showNotification(t('dashboard.profile.errorLoadingProfile'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [userId, t]);

  // Initial load
  useEffect(() => {
    if (!isDashboardLoading) {
      loadProfile();
    }
  }, [isDashboardLoading, loadProfile]);
  
  // Update profile
  const updateProfile = async (profileData) => {
    try {
      const updatedProfile = await userService.updateUserProfile(userId, profileData);
      setProfile(updatedProfile);
      showNotification(t('dashboard.profile.profileUpdated'), 'success');
      return updatedProfile;
    } catch (err) {
      console.error('Error updating profile:', err);
      showNotification(t('dashboard.profile.errorUpdatingProfile'), 'error');
      throw err;
    }
  };
  
  // Change password
  const changePassword = async (passwordData) => {
    try {
      await userService.changePassword(passwordData);
      showNotification(t('dashboard.profile.passwordChanged'), 'success');
    } catch (err) {
      console.error('Error changing password:', err);
      showNotification(t('dashboard.profile.errorChangingPassword'), 'error');
      throw err;
    }
  };
  
  // Upload profile picture
  const uploadProfilePicture = async (formData) => {
    try {
      const result = await userService.uploadProfilePicture(formData);
      setProfile(prev => ({
        ...prev,
        profilePicture: result.url
      }));
      showNotification(t('dashboard.profile.profilePictureUpdated'), 'success');
      return result;
    } catch (err) {
      console.error('Error uploading profile picture:', err);
      showNotification(t('dashboard.profile.errorUploadingProfilePicture'), 'error');
      throw err;
    }
  };
  
  return {
    profile,
    isLoading,
    error,
    loadProfile,
    updateProfile,
    changePassword,
    uploadProfilePicture
  };
};

export default useProfileData; 