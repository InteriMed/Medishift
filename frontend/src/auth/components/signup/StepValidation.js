import React from 'react';
import styles from './SignupSteps.module.css';

const StepValidation = ({ formData, updateFields, errors }) => {
  return (
    <div className={styles.step}>
      <h2>Final Step</h2>
      
      <div className={styles.termsContainer}>
        <h3>Terms and Conditions</h3>
        <div className={styles.termsContent}>
          <p>
            By creating an account, you agree to our Terms of Service and Privacy Policy.
            This includes our use of cookies and similar technologies to enhance your experience
            and analyze traffic to our website.
          </p>
          <p>
            We will process your personal information in accordance with our Privacy Policy.
            You can unsubscribe from marketing communications at any time.
          </p>
          <p>
            Your data will be stored securely and used only for the purposes described in our policies.
            You have the right to access, correct, or delete your personal information at any time.
          </p>
        </div>
      </div>
      
      <div className={`${styles.inputGroup} ${styles.checkboxGroup}`}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={formData.acceptTerms}
            onChange={(e) => updateFields({ acceptTerms: e.target.checked })}
          />
          <span>I accept the Terms and Conditions</span>
        </label>
        {errors.acceptTerms && <div className={styles.error}>{errors.acceptTerms}</div>}
      </div>
    </div>
  );
};

export default StepValidation; 