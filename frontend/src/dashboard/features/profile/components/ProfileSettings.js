import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './profileSettings.module.css';

const ProfileSettings = ({ profile, onUpdate }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    notifications: profile?.settings?.notifications || true,
    darkMode: profile?.settings?.darkMode || false,
    language: profile?.settings?.language || 'en',
    timezone: profile?.settings?.timezone || 'UTC',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    try {
      await onUpdate({
        settings: formData
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h2 className={styles.sectionTitle}>{t('dashboard.profile.settings')}</h2>
      
      <div className={styles.formFields}>
        <div className={styles.formGroup}>
          <label className={styles.checkboxLabel}>
            <input
              name="notifications"
              type="checkbox"
              checked={formData.notifications}
              onChange={handleChange}
              className={styles.checkbox}
            />
            {t('dashboard.profile.emailNotifications')}
          </label>
        </div>
        
        <div className={styles.formGroup}>
          <label className={styles.checkboxLabel}>
            <input
              name="darkMode"
              type="checkbox"
              checked={formData.darkMode}
              onChange={handleChange}
              className={styles.checkbox}
            />
            {t('dashboard.profile.darkMode')}
          </label>
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="language">{t('dashboard.profile.language')}</label>
          <select
            id="language"
            name="language"
            value={formData.language}
            onChange={handleChange}
            className={styles.select}
          >
            <option value="en">English</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="es">Español</option>
          </select>
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="timezone">{t('dashboard.profile.timezone')}</label>
          <select
            id="timezone"
            name="timezone"
            value={formData.timezone}
            onChange={handleChange}
            className={styles.select}
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time (ET)</option>
            <option value="America/Chicago">Central Time (CT)</option>
            <option value="America/Denver">Mountain Time (MT)</option>
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
            <option value="Europe/London">Greenwich Mean Time (GMT)</option>
            <option value="Europe/Paris">Central European Time (CET)</option>
          </select>
        </div>
      </div>
      
      <div className={styles.formActions}>
        <button
          type="submit"
          className={styles.submitButton}
          disabled={isSubmitting}
        >
          {isSubmitting ? t('dashboard.profile.saving') : t('dashboard.profile.saveChanges')}
        </button>
      </div>
    </form>
  );
};

export default ProfileSettings; 