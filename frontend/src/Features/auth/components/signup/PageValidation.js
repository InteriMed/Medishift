import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import checkmarkIcon from '../../assets/checkmark.png';
import Button from '../../../../components/Button/Button';
import UploadFile from '../../../../components/UploadFile/UploadFile';
import InputField from '../../../../components/Boxed-InputFields/Personnalized-InputField/Personnalized-InputField';
import './combined_css.css';

const PageValidation = ({ 
  email = localStorage.getItem('userData') ? JSON.parse(localStorage.getItem('userData')).email : '', 
  verificationCode = '', 
  handleInputChange = () => {}, 
  errors = {}, 
  handleErrorReset = () => {}, 
  textColor = '#000000' 
}) => {
  const { t } = useTranslation();
  const { lang } = useParams();
  const navigate = useNavigate();
  const [isUploaded, setIsUploaded] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [localVerificationCode, setLocalVerificationCode] = useState(verificationCode);

  const handleContinue = () => {
    if (!isUploaded) return;
    navigate(`/${lang}/dashboard`);
  };

  useEffect(() => {
    if (isUploaded) {
      setTimeout(() => {
        setShowButton(true);
      }, 300);
    }
  }, [isUploaded]);

  useEffect(() => {
    let interval;
    if (timer > 0 && !canResend) {
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleResendCode = () => {
    if (canResend) {
      // Resend verification code logic here
      setTimer(60);
      setCanResend(false);
    }
  };

  const handleLocalInputChange = (e) => {
    setLocalVerificationCode(e.target.value);
    if (handleInputChange) {
      handleInputChange(e);
    }
  };

  const handleUploadComplete = async () => {
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');
    
    if (!userId || !token) {
      setError('Missing user credentials');
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/users/update-documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          documentsUploaded: true,
        }),
      });

      if (response.ok) {
        setIsUploaded(true);
        setError('');
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update document status');
      }
    } catch (error) {
      console.error('Error updating document status:', error);
      setError(error.message);
    }
  };

  return (
    <div className="validation-container">
      <div className="validation-content">
        <img src={checkmarkIcon} alt="Success" className="checkmark-icon" />
        <h2 style={{ color: textColor, fontWeight: 'normal', fontSize: '32px', marginTop: '40px' }}>
          {t('auth.signup.forms.validation.title')}
        </h2>
        <p>{t('auth.signup.forms.validation.subtitle')}: {email}</p>
        
        {error && <div className="error-message">{error}</div>}
        <InputField
          label={t('auth.signup.forms.validation.code')}
          name="verificationCode"
          value={localVerificationCode}
          onChange={handleLocalInputChange}
          error={errors.verificationCode}
          onErrorReset={() => handleErrorReset && handleErrorReset('verificationCode')}
          required
        />
        <button
          className={`resend-button ${!canResend ? 'disabled' : ''}`}
          onClick={handleResendCode}
          disabled={!canResend}
        >
          {canResend ? t('auth.signup.forms.validation.resend') : t('auth.signup.forms.validation.timer', { seconds: timer })}
        </button>
      </div>
    </div>
  );
};

export default PageValidation;
