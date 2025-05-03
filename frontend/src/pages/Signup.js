import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../contexts/NotificationContext';

const Signup = () => {
  const { t } = useTranslation();
  const { register, loginWithGoogle } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSignup = async (e) => {
    e.preventDefault();
    
    if (!email || !password || !displayName) {
      showNotification('error', t('signup.allFieldsRequired'));
      return;
    }
    
    if (password !== confirmPassword) {
      showNotification('error', t('signup.passwordsDoNotMatch'));
      return;
    }
    
    setLoading(true);
    
    try {
      await register(email, password, displayName);
      showNotification('success', t('signup.signupSuccess'));
      navigate('/login');
    } catch (error) {
      console.error('Signup error:', error);
      showNotification('error', t('signup.signupFailed'));
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoogleSignup = async () => {
    setLoading(true);
    
    try {
      await loginWithGoogle();
      showNotification('success', t('signup.signupSuccess'));
      navigate('/dashboard');
    } catch (error) {
      console.error('Google signup error:', error);
      showNotification('error', t('signup.signupFailed'));
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="signup-container">
      <div className="signup-card">
        <h2>{t('signup.title')}</h2>
        <form onSubmit={handleSignup}>
          <div className="form-group">
            <label htmlFor="displayName">{t('signup.name')}</label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">{t('signup.email')}</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">{t('signup.password')}</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">{t('signup.confirmPassword')}</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? t('common.loading') : t('signup.signup')}
          </button>
        </form>
        
        <div className="signup-options">
          <button 
            type="button" 
            className="btn btn-google" 
            onClick={handleGoogleSignup}
            disabled={loading}
          >
            {t('signup.signupWithGoogle')}
          </button>
        </div>
        
        <div className="signup-footer">
          <p>
            {t('signup.alreadyHaveAccount')}{' '}
            <Link to="/login">{t('signup.login')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup; 