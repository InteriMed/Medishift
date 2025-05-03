import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './personalInfo.module.css';

const PersonalInfo = ({ profile, onUpdate }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    firstName: profile?.firstName || '',
    lastName: profile?.lastName || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    bio: profile?.bio || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    try {
      await onUpdate(formData);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h2 className={styles.sectionTitle}>{t('dashboard.profile.personalInfo')}</h2>
      
      <div className={styles.formFields}>
        <div className={styles.formGroup}>
          <label htmlFor="firstName">{t('dashboard.profile.firstName')}</label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            value={formData.firstName}
            onChange={handleChange}
            className={styles.input}
            required
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="lastName">{t('dashboard.profile.lastName')}</label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            value={formData.lastName}
            onChange={handleChange}
            className={styles.input}
            required
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="email">{t('dashboard.profile.email')}</label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            className={styles.input}
            required
            disabled
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="phone">{t('dashboard.profile.phone')}</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            className={styles.input}
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="bio">{t('dashboard.profile.bio')}</label>
          <textarea
            id="bio"
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            className={styles.textarea}
            rows={4}
          />
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

export default PersonalInfo; 