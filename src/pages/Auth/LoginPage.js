import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { getAuth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import InputField from '../../components/BoxedInputFields/Personnalized-InputField';
import InputFieldHideUnhide from '../../components/BoxedInputFields/InputFieldHideUnhide';
import UnderlinedLink from '../../components/Links/UnderlinedLink';
import logoImage from "../../assets/global/logo.png";
import { FcGoogle } from 'react-icons/fc';
import { firebaseApp, db } from '../../services/firebase';
import { useNotification } from '../../contexts/NotificationContext';
import '../../styles/auth.css';

function Login() {
  const { t } = useTranslation(['auth']);
  const { lang } = useParams();
  const navigate = useNavigate();
  const auth = getAuth(firebaseApp);
  const { showError } = useNotification();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [modalError, setModalError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateForm = () => {
    if (!formData.email.trim()) {
      showError(t('auth.errors.emailRequired'));
      return false;
    }
    
    if (!formData.password) {
      showError(t('auth.errors.passwordRequired'));
      return false;
    }
    
    return true;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setModalError('');
    setIsLoading(true);
    
    try {
      // Sign in with email/password
      const result = await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      
      const user = result.user;
      
      // Get fresh token
      const token = await user.getIdToken(true);
      
      // Store the token and basic user data
      localStorage.setItem('token', token);
      localStorage.setItem('firebaseUid', user.uid);
      
      // Get additional user profile data directly from Firestore
      try {
        // Get user data from Firestore instead of API
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          // Store user data from Firestore
          const userData = userDoc.data();
          localStorage.setItem('user', JSON.stringify({
            ...userData,
            uid: user.uid
          }));
          
          // Check if profile is incomplete - redirect to onboarding
          if (!userData.profileCompleted && !userData.isProfessionalProfileComplete) {
            navigate(`/${lang}/dashboard/profile`);
            return;
          }
        } else {
          // User document doesn't exist in Firestore yet - new user
          // Create user document with onboarding flags
          await setDoc(userDocRef, {
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            firstName: user.displayName?.split(' ')[0] || '',
            lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            role: 'professional',
            profileCompleted: false,
            profileStatus: 'incomplete',
            tutorialPassed: false,
            isProfessionalProfileComplete: false,
          });
          
          localStorage.setItem('user', JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
          }));
          
          // Redirect to profile for onboarding
          navigate(`/${lang}/dashboard/profile`);
          return;
        }
      } catch (firestoreError) {
        console.error('Firestore data retrieval error:', firestoreError);
        // Continue with login even if Firestore connection fails
        localStorage.setItem('user', JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0],
        }));
      }
      
      // Save email in localStorage if "Remember me" is checked
      if (formData.rememberMe) {
        localStorage.setItem('rememberedEmail', formData.email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      
      // Redirect to dashboard
      navigate(`/${lang}/dashboard`);
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle specific Firebase auth errors
      let errorMessage = '';
      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = t('auth.errors.invalidEmail');
          break;
        case 'auth/user-disabled':
          errorMessage = t('auth.errors.accountDisabled');
          break;
        case 'auth/user-not-found':
          errorMessage = t('auth.errors.userNotFound');
          break;
        case 'auth/wrong-password':
          errorMessage = t('auth.errors.wrongPassword');
          break;
        case 'auth/too-many-requests':
          errorMessage = t('auth.errors.tooManyAttempts');
          break;
        default:
          errorMessage = t('auth.errors.loginFailed');
      }
      
      // Show error notification
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Get fresh token
      const token = await user.getIdToken(true);
      
      // Store auth data
      localStorage.setItem('token', token);
      localStorage.setItem('firebaseUid', user.uid);
      
      // Check if user document exists in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // New user - create document with onboarding flags
        await setDoc(userDocRef, {
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0],
          firstName: user.displayName?.split(' ')[0] || '',
          lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
          photoURL: user.photoURL || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          role: 'professional',
          profileCompleted: false,
          profileStatus: 'incomplete',
          tutorialPassed: false,
          isProfessionalProfileComplete: false,
        });
        
        localStorage.setItem('user', JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0],
          photoURL: user.photoURL
        }));
        
        // Redirect to profile for onboarding
        navigate(`/${lang}/dashboard/profile`);
      } else {
        // Existing user - check if profile is complete
        const userData = userDoc.data();
        localStorage.setItem('user', JSON.stringify({
          ...userData,
          uid: user.uid,
          photoURL: user.photoURL
        }));
        
        // Check if profile is incomplete - redirect to onboarding
        if (!userData.profileCompleted && !userData.isProfessionalProfileComplete) {
          navigate(`/${lang}/dashboard/profile`);
        } else {
          navigate(`/${lang}/dashboard`);
        }
      }
    } catch (error) {
      console.error('Google login error:', error);
      
      if (error.code === 'auth/popup-closed-by-user') {
        showError(t('auth.errors.loginCancelled'));
      } else {
        showError(t('auth.errors.googleLoginFailed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!resetEmail.trim()) {
      setModalError(t('auth.errors.emailRequired'));
      showError(t('auth.errors.emailRequired'));
      return;
    }

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setModalError('');
      showError(t('auth.passwordReset.emailSent'));
      setIsModalOpen(false);
    } catch (error) {
      console.error('Password reset error:', error);
      setModalError(t('auth.errors.resetFailed'));
      showError(t('auth.errors.resetFailed'));
    }
  };

  return (
    <div className="auth-page-container bg-swiss-cross">
      <div className="auth-card">
        <div className="auth-logo-container">
          <img src={logoImage} alt="Logo" className="auth-logo" />
        </div>
        
        <h1 className="auth-title">{t('auth.login.title')}</h1>
        <p className="auth-subtitle">{t('auth.login.subtitle')}</p>
        
        <form className="auth-form" onSubmit={handleLogin}>
          <div className="form-group">
            <InputField
              label={t('auth.login.email')}
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="name@example.com"
              required
            />
          </div>
          
          <div className="form-group">
            <InputFieldHideUnhide
              label={t('auth.login.password')}
              name="password"
              value={formData.password}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  password: e.target.value
                });
              }}
              placeholder="••••••••"
              type="password"
              required
            />
            <div className="reset-password-row">
              <p>
                {t('auth.login.resetPassword')}
              </p>
              <button 
                type="button"
                onClick={() => setIsModalOpen(true)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline', color: 'inherit', fontSize: 'var(--font-size-small)' }}
              >
                {t('auth.login.resetPasswordLink')}
              </button>
            </div>
          </div>
          
          <div className="form-options">
            <div className="remember-me">
              <input
                type="checkbox"
                id="rememberMe"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleInputChange}
              />
              <label htmlFor="rememberMe">{t('auth.login.rememberMe')}</label>
            </div>
            
            <UnderlinedLink
              text={t('auth.login.forgotPassword')}
              to={`/${lang}/forgot-password`}
              color="#000000"
            />
          </div>
          
          <button 
            type="submit"
            className="auth-button primary-button"
            disabled={isLoading}
          >
            {isLoading ? t('auth.login.loggingIn') : t('auth.login.button')}
          </button>
          
          <button 
            type="button"
            className="auth-button social-button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            <FcGoogle className="social-icon" />
            {t('auth.loginWithGoogle')}
          </button>
        </form>
        
        <div className="auth-footer">
          <p>
            {t('auth.login.noAccount')}
            <a 
              href={`/${lang}/signup`}
              className="text-link"
            >
              {t('auth.login.signupLink')}
            </a>
          </p>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setIsModalOpen(false);
            setModalError('');
          }
        }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>{t('auth.login.passwordReset.title')}</h2>
            </div>
            <div className="modal-body">
              <InputField
                label={t('auth.login.email')}
                type="email"
                value={resetEmail}
                onChange={(e) => {
                  setResetEmail(e.target.value);
                  if (modalError) setModalError('');
                }}
                placeholder="name@example.com"
                required
                error={modalError}
              />
              {modalError && (
                <div className="error-message">
                  {modalError}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={handlePasswordReset} className="auth-button primary-button">
                {t('auth.login.passwordReset.sendEmail')}
              </button>
              <button onClick={() => {
                setIsModalOpen(false);
                setModalError('');
              }} className="auth-button secondary-button">
                {t('auth.login.passwordReset.backToLogin')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login; 