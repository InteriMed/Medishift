import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './profileHeader.module.css';

const ProfileHeader = ({ profile }) => {
  const { t } = useTranslation();
  
  return (
    <div className={styles.header}>
      <div className={styles.profilePictureContainer}>
        {profile?.profilePicture ? (
          <img 
            src={profile.profilePicture} 
            alt={`${profile.firstName} ${profile.lastName}`} 
            className={styles.profilePicture}
          />
        ) : (
          <div className={styles.profileInitials}>
            {profile?.firstName?.[0] || ''}{profile?.lastName?.[0] || ''}
          </div>
        )}
      </div>
      
      <div className={styles.profileInfo}>
        <h1 className={styles.profileName}>
          {profile?.firstName} {profile?.lastName}
        </h1>
        <p className={styles.profileEmail}>{profile?.email}</p>
        <p className={styles.profileRole}>{profile?.role || t('dashboard.profile.userRole')}</p>
      </div>
    </div>
  );
};

export default ProfileHeader; 