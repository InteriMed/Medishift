import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './changePassword.module.css';

const ChangePassword = ({ onChangePassword }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
  };
  
  const validateForm = () => {
    if (formData.newPassword.length < 8) {
      setError(t('dashboard.profile.passwordTooShort'));
      return false;
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      setError(t('dashboard.profile.passwordsDontMatch'));
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      await onChangePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });
      
      // Clear form on success
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      setError(err.message || t('dashboard.profile.errorChangingPassword'));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h2 className={styles.sectionTitle}>{t('dashboard.profile.changePassword')}</h2>
      
      {error && (
        <div className={styles.errorMessage}>{error}</div>
      )}
      
      <div className={styles.formFields}>
        <div className={styles.formGroup}>
          <label htmlFor="currentPassword">{t('dashboard.profile.currentPassword')}</label>
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            value={formData.currentPassword}
            onChange={handleChange}
            className={styles.input}
            required
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="newPassword">{t('dashboard.profile.newPassword')}</label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            value={formData.newPassword}
            onChange={handleChange}
            className={styles.input}
            required
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="confirmPassword">{t('dashboard.profile.confirmPassword')}</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            className={styles.input}
            required
          />
        </div>
      </div>
      
      <div className={styles.formActions}>
        <button
          type="submit"
          className={styles.submitButton}
          disabled={isSubmitting}
        >
          {isSubmitting ? t('dashboard.profile.changing') : t('dashboard.profile.changePassword')}
        </button>
      </div>
    </form>
  );
};

export default ChangePassword; 