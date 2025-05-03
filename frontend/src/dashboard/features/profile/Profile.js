import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiUser, FiSettings, FiLock } from 'react-icons/fi';
import useProfileData from '../../hooks/useProfileData';
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage/ErrorMessage';
import ProfileHeader from './components/ProfileHeader';
import PersonalInfo from './components/PersonalInfo';
import ProfileSettings from './components/ProfileSettings';
import ChangePassword from './components/ChangePassword';
import styles from './profile.module.css';

const Profile = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('personal');
  const { profile, isLoading, error, updateProfile, changePassword } = useProfileData();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={t('dashboard.profile.errorLoadingProfile')} />;

  return (
    <div className={styles.profileContainer}>
      <ProfileHeader profile={profile} />
      
      <div className={styles.profileContent}>
        <div className={styles.sidebar}>
          <ul className={styles.tabList}>
            <li 
              className={`${styles.tabItem} ${activeTab === 'personal' ? styles.active : ''}`}
              onClick={() => setActiveTab('personal')}
            >
              <FiUser className={styles.tabIcon} />
              <span>{t('dashboard.profile.personalInfo')}</span>
            </li>
            <li
              className={`${styles.tabItem} ${activeTab === 'settings' ? styles.active : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <FiSettings className={styles.tabIcon} />
              <span>{t('dashboard.profile.settings')}</span>
            </li>
            <li
              className={`${styles.tabItem} ${activeTab === 'password' ? styles.active : ''}`}
              onClick={() => setActiveTab('password')}
            >
              <FiLock className={styles.tabIcon} />
              <span>{t('dashboard.profile.changePassword')}</span>
            </li>
          </ul>
        </div>
        
        <div className={styles.tabContent}>
          {activeTab === 'personal' && <PersonalInfo profile={profile} onUpdate={updateProfile} />}
          {activeTab === 'settings' && <ProfileSettings profile={profile} onUpdate={updateProfile} />}
          {activeTab === 'password' && <ChangePassword onChangePassword={changePassword} />}
        </div>
      </div>
    </div>
  );
};

export default Profile; 