import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProfileData } from '../../hooks/useProfileData';
import ProfileHeader from '../../features/profile/components/ProfileHeader';
import PersonalInfo from '../../features/profile/components/PersonalInfo';
import ProfileSettings from '../../features/profile/components/ProfileSettings';
import ChangePassword from '../../features/profile/components/ChangePassword';
import styles from './profilePage.module.css';

const ProfilePage = () => {
  const { t } = useTranslation();
  const { 
    profile, 
    isLoading, 
    updateProfile, 
    changePassword,
    uploadProfilePicture
  } = useProfileData();
  
  const [activeTab, setActiveTab] = useState('personal');
  
  if (isLoading) {
    return <div className={styles.loading}>{t('dashboard.profile.loading')}</div>;
  }
  
  return (
    <div className={styles.profilePage}>
      <ProfileHeader profile={profile} />
      
      <div className={styles.tabsContainer}>
        <div className={styles.tabs}>
          <button 
            className={`${styles.tabButton} ${activeTab === 'personal' ? styles.active : ''}`}
            onClick={() => setActiveTab('personal')}
          >
            {t('dashboard.profile.personalInfo')}
          </button>
          
          <button 
            className={`${styles.tabButton} ${activeTab === 'settings' ? styles.active : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            {t('dashboard.profile.settings')}
          </button>
          
          <button 
            className={`${styles.tabButton} ${activeTab === 'password' ? styles.active : ''}`}
            onClick={() => setActiveTab('password')}
          >
            {t('dashboard.profile.security')}
          </button>
        </div>
      </div>
      
      <div className={styles.tabContent}>
        {activeTab === 'personal' && (
          <PersonalInfo 
            profile={profile} 
            onUpdate={updateProfile} 
          />
        )}
        
        {activeTab === 'settings' && (
          <ProfileSettings 
            profile={profile} 
            onUpdate={updateProfile} 
          />
        )}
        
        {activeTab === 'password' && (
          <ChangePassword onChangePassword={changePassword} />
        )}
      </div>
    </div>
  );
};

export default ProfilePage; 