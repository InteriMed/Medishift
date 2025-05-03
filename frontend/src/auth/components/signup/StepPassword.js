import React, { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import styles from './SignupSteps.module.css';

const StepPassword = ({ formData, updateFields, errors }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };
  
  return (
    <div className={styles.step}>
      <h2>Create Password</h2>
      <p className={styles.instructions}>
        Your password must be at least 8 characters long and include a mix of letters, numbers, and symbols.
      </p>
      
      <div className={styles.inputGroup}>
        <label htmlFor="password">Password</label>
        <div className={styles.passwordInputContainer}>
          <input
            type={showPassword ? "text" : "password"}
            id="password"
            value={formData.password}
            onChange={(e) => updateFields({ password: e.target.value })}
            placeholder="Enter your password"
            className={errors.password ? styles.inputError : ''}
          />
          <button 
            type="button" 
            className={styles.passwordToggle}
            onClick={togglePasswordVisibility}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <FiEyeOff /> : <FiEye />}
          </button>
        </div>
        {errors.password && <div className={styles.error}>{errors.password}</div>}
      </div>
      
      <div className={styles.inputGroup}>
        <label htmlFor="confirmPassword">Confirm Password</label>
        <div className={styles.passwordInputContainer}>
          <input
            type={showConfirmPassword ? "text" : "password"}
            id="confirmPassword"
            value={formData.confirmPassword}
            onChange={(e) => updateFields({ confirmPassword: e.target.value })}
            placeholder="Confirm your password"
            className={errors.confirmPassword ? styles.inputError : ''}
          />
          <button 
            type="button" 
            className={styles.passwordToggle}
            onClick={toggleConfirmPasswordVisibility}
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
          >
            {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
          </button>
        </div>
        {errors.confirmPassword && <div className={styles.error}>{errors.confirmPassword}</div>}
      </div>
      
      <div className={styles.passwordStrength}>
        <div className={styles.passwordStrengthBar}>
          <div 
            className={styles.passwordStrengthFill}
            style={{ 
              width: `${formData.password ? Math.min(formData.password.length * 10, 100) : 0}%`,
              backgroundColor: 
                !formData.password ? '#e0e0e0' :
                formData.password.length < 6 ? '#ff4d4f' :
                formData.password.length < 8 ? '#faad14' :
                '#52c41a'
            }}
          />
        </div>
        <span className={styles.passwordStrengthLabel}>
          {!formData.password ? 'Password strength' :
           formData.password.length < 6 ? 'Weak' :
           formData.password.length < 8 ? 'Moderate' :
           'Strong'}
        </span>
      </div>
    </div>
  );
};

export default StepPassword; 