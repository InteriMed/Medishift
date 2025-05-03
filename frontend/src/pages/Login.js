import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../contexts/NotificationContext';

const Login = () => {
  const { t } = useTranslation();
  const { login, loginWithGoogle, resetPassword } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  
  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      showNotification('error', t('login.emailPasswordRequired'));
      return;
    }
    
    setLoading(true);
    
    try {
      await login(email, password);
      showNotification('success', t('login.loginSuccess'));
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      showNotification('error', t('login.loginFailed'));
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoogleLogin = async () => {
    setLoading(true);
    
    try {
      await loginWithGoogle();
      showNotification('success', t('login.loginSuccess'));
      navigate('/dashboard');
    } catch (error) {
      console.error('Google login error:', error);
      showNotification('error', t('login.loginFailed'));
    } finally {
      setLoading(false);
    }
  };
  
  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (!email) {
      showNotification('error', t('login.emailRequired'));
      return;
    }
    
    setLoading(true);
    
    try {
      await resetPassword(email);
      showNotification('success', t('login.passwordResetSent'));
      setForgotPassword(false);
    } catch (error) {
      console.error('Password reset error:', error);
      showNotification('error', t('login.passwordResetFailed'));
    } finally {
      setLoading(false);
    }
  };
  
  if (forgotPassword) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h2>{t('login.resetPassword')}</h2>
          <form onSubmit={handleResetPassword}>
            <div className="form-group">
              <label htmlFor="email">{t('login.email')}</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? t('common.loading') : t('login.sendResetLink')}
            </button>
            <button 
              type="button" 
              className="btn btn-link" 
              onClick={() => setForgotPassword(false)}
              disabled={loading}
            >
              {t('login.backToLogin')}
            </button>
          </form>
        </div>
      </div>
    );
  }
  
  return (
    <div className="login-container">
      <div className="login-card">
        <h2>{t('login.title')}</h2>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">{t('login.email')}</label>
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
            <label htmlFor="password">{t('login.password')}</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? t('common.loading') : t('login.login')}
          </button>
        </form>
        
        <div className="login-options">
          <button 
            type="button" 
            className="btn btn-google" 
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            {t('login.loginWithGoogle')}
          </button>
          
          <button 
            type="button" 
            className="btn btn-link" 
            onClick={() => setForgotPassword(true)}
            disabled={loading}
          >
            {t('login.forgotPassword')}
          </button>
        </div>
        
        <div className="login-footer">
          <p>
            {t('login.noAccount')}{' '}
            <Link to="/signup">{t('login.signup')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login; 