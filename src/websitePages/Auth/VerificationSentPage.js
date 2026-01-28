import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import './auth.css';

const VerificationSentPage = () => {
  const { t } = useTranslation(['auth']);
  const { lang } = useParams();
  const navigate = useNavigate();
  
  const handleBackToHome = () => {
    navigate(`/${lang}/`);
  };

  return (
    <div className="auth-container">
      <div className="auth-content">
        <div className="auth-form-container">
          <div className="signup-step success-step">
            <div className="success-icon">✓</div>
            <h1 className="auth-title">{t('auth.verificationSent.title')}</h1>
            <p className="auth-subtitle">
              {t('auth.verificationSent.message')}
            </p>
            <button
              className="auth-button primary-button"
              onClick={handleBackToHome}
            >
              {t('auth.verificationSent.backToHome')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationSentPage; 