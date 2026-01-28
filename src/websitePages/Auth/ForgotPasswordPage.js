import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import InputField from '../../components/boxedInputFields/personnalizedInputField';
import UnderlinedLink from '../../components/boxedInputFields/links/links';
import { firebaseApp } from '../../services/services/firebase';
import './auth.css';

function ForgotPassword() {
  const { t } = useTranslation(['auth']);
  const { lang } = useParams();
  const navigate = useNavigate();
  const auth = getAuth(firebaseApp);
  
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const handleInputChange = (e) => {
    setEmail(e.target.value);
    setError('');
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError(t('auth.errors.emailRequired'));
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      await sendPasswordResetEmail(auth, email);
      setIsSuccess(true);
      setMessage(t('auth.resetEmailSent'));
    } catch (error) {
      console.error('Password reset error:', error);
      
      let errorMessage;
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = t('auth.errors.userNotFound');
          break;
        case 'auth/invalid-email':
          errorMessage = t('auth.errors.invalidEmail');
          break;
        case 'auth/too-many-requests':
          errorMessage = t('auth.errors.tooManyRequests');
          break;
        default:
          errorMessage = t('auth.errors.resetFailed');
      }
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleBackToLogin = () => {
    navigate(`/${lang}/login`);
  };
  
  return (
    <div className="auth-container">
      <div className="auth-content">
        <div className="auth-logo-container">
          <img src="/logo.png" alt="Logo" className="auth-logo" />
        </div>
        
        <h1 className="auth-title">
          {t('auth.forgotPassword.title')}
        </h1>
        
        <p className="auth-subtitle">
          {t('auth.forgotPassword.subtitle')}
        </p>
        
        {isSuccess ? (
          <div className="success-message">
            <div className="success-icon">✓</div>
            <p>{message}</p>
            <button 
              className="auth-button primary-button"
              onClick={handleBackToLogin}
              style={{ marginTop: '20px' }}
            >
              {t('auth.backToLogin')}
            </button>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <InputField
                label={t('auth.forgotPassword.email')}
                type="email"
                name="email"
                value={email}
                onChange={handleInputChange}
                placeholder="name@example.com"
                required
                error={error}
              />
            </div>
            
            <button 
              type="submit"
              className="auth-button primary-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? t('auth.forgotPassword.sending') : t('auth.forgotPassword.button')}
            </button>
          </form>
        )}
        
        <div className="auth-footer">
          <p>
            {t('auth.rememberPassword')}
            <UnderlinedLink
              text={t('auth.loginLink')}
              to={`/${lang}/login`}
              color="#000000"
              margin="0 0 0 5px"
            />
          </p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword; 