import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import InputField_Hide_Unhide from '../../../../components/Boxed-InputFields/InputField-Hide-Unhide/InputField-Hide-Unhide';
import './combined_css.css';

const validatePassword = (password) => {
  const errors = [];
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*]/.test(password);
  
  if (password.length < minLength) {
    errors.push("Password must be at least 8 characters long");
  }
  if (!hasUpperCase) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!hasLowerCase) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!hasNumber) {
    errors.push("Password must contain at least one number");
  }
  if (!hasSpecialChar) {
    errors.push("Password must contain at least one special character (!@#$%^&*)");
  }
  
  return errors.length > 0 ? errors[0] : "";
};

const validateConfirmPassword = (password, confirmPassword) => {
  if (!confirmPassword) return "Please confirm your password";
  if (password !== confirmPassword) return "Passwords do not match";
  return "";
};

const PagePassword = ({ formData, handleInputChange, errors, handleErrorReset, showErrors, textColor }) => {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handlePasswordChange = (e) => {
    const password = e.target.value;
    handleInputChange({ 
      target: { 
        name: 'password', 
        value: password 
      }
    });

    const validationError = validatePassword(password);
    if (validationError) {
      handleErrorReset('password');
      handleInputChange({
        target: {
          name: 'passwordError',
          value: validationError
        }
      });
    } else {
      handleErrorReset('passwordError');
    }

    // Also validate confirm password if it exists
    if (formData.confirmPassword) {
      const confirmError = validateConfirmPassword(password, formData.confirmPassword);
      if (confirmError) {
        handleInputChange({
          target: {
            name: 'confirmPasswordError',
            value: confirmError
          }
        });
      } else {
        handleErrorReset('confirmPasswordError');
      }
    }
  };

  const handleConfirmPasswordChange = (e) => {
    const confirmPassword = e.target.value;
    handleInputChange({ 
      target: { 
        name: 'confirmPassword', 
        value: confirmPassword 
      }
    });

    const confirmError = validateConfirmPassword(formData.password, confirmPassword);
    if (confirmError) {
      handleErrorReset('confirmPassword');
      handleInputChange({
        target: {
          name: 'confirmPasswordError',
          value: confirmError
        }
      });
    } else {
      handleErrorReset('confirmPasswordError');
    }
  };

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="page-password">
      <h2 className="page-title">Create Password</h2>
      <p className="page-subtitle" style={{ marginBottom: '3vh' }}>Set up a secure password for your account</p>
      <div className="password-requirements">
        <h3>{t('auth.signup.forms.password.requirements.title')}</h3>
        <ul>
          <li>{t('auth.signup.forms.password.requirements.length')}</li>
          <li>{t('auth.signup.forms.password.requirements.uppercase')}</li>
          <li>{t('auth.signup.forms.password.requirements.lowercase')}</li>
          <li>{t('auth.signup.forms.password.requirements.number')}</li>
          <li>{t('auth.signup.forms.password.requirements.special')}</li>
        </ul>
      </div>

      <div className="email-display">
        <div className="email-box">
          {formData.email}
        </div>
      </div>

      <form className="signup-form">
        <div className="form-group">
          <InputField_Hide_Unhide
            label="Password*"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password (min. 8 characters)"
            value={formData.password || ''}
            onChange={handlePasswordChange}
            error={errors.password || errors.passwordError}
            onErrorReset={() => {
              handleErrorReset('password');
              handleErrorReset('passwordError');
            }}
            marginBottom={20}
            rightIcon={
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            }
          />
        </div>

        <div className="form-group">
          <InputField_Hide_Unhide
            label="Confirm Password*"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Re-enter your password"
            value={formData.confirmPassword || ''}
            onChange={handleConfirmPasswordChange}
            error={errors.confirmPassword || errors.confirmPasswordError}
            onErrorReset={() => {
              handleErrorReset('confirmPassword');
              handleErrorReset('confirmPasswordError');
            }}
            rightIcon={
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex="-1"
              >
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            }
          />
        </div>
      </form>
    </div>
  );
};

export default PagePassword;
