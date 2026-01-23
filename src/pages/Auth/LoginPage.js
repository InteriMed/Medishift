import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { getAuth, signInWithEmailAndPassword, signInWithRedirect, getRedirectResult, GoogleAuthProvider, sendPasswordResetEmail, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { FIRESTORE_COLLECTIONS } from '../../config/keysDatabase';
import InputField from '../../components/BoxedInputFields/Personnalized-InputField';
import InputFieldHideUnhide from '../../components/BoxedInputFields/InputFieldHideUnhide';
import UnderlinedLink from '../../components/Links/UnderlinedLink';
import { FcGoogle } from 'react-icons/fc';
import { ShieldAlert, X } from 'lucide-react';
import { auth, firebaseApp, db, loginWithGoogle } from '../../services/firebase';
import { useNotification } from '../../contexts/NotificationContext';
import '../../styles/auth.css';

function Login() {
  const { t } = useTranslation(['auth']);
  const { lang } = useParams();
  const navigate = useNavigate();
  // const auth = getAuth(firebaseApp); // Use imported auth instance
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

  // Ban state
  const [isBanModalOpen, setIsBanModalOpen] = useState(false);
  const [banDetails, setBanDetails] = useState(null);

  // Removed unused redirect handling effect since we now use popup for Google Sign In

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

      // Get token (use cached token if offline, don't force refresh)
      let token;
      try {
        token = await user.getIdToken(true);
      } catch (tokenError) {
        if (tokenError.code === 'unavailable' || (tokenError.message && tokenError.message.includes('offline'))) {
          token = await user.getIdToken(false);
        } else {
          throw tokenError;
        }
      }


      // Get additional user profile data directly from Firestore
      try {
        const userDocRef = doc(db, FIRESTORE_COLLECTIONS.USERS, user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();

          // Check if account is disabled/banned
          if (userData.accountStatus === 'disabled') {
            await signOut(auth);
            setBanDetails({
              reason: userData.banReason || 'No reason provided',
              info: userData.banInformation || 'Your account has been disabled. Please contact support if you believe this is a mistake.',
              date: userData.bannedAt?.toDate?.()?.toLocaleDateString() || 'N/A'
            });
            setIsBanModalOpen(true);
            setIsLoading(false);
            return;
          }

          // Check if profile is incomplete - redirect to onboarding
          if (!userData.profileCompleted && !userData.isProfessionalProfileComplete) {
            navigate(`/${lang}/dashboard/profile`);
            return;
          }
        } else {
          // User document doesn't exist in Firestore yet - new user
          // Try to create user document with onboarding flags (non-blocking if offline)
          try {
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
          } catch (setDocError) {
            if (setDocError.code === 'unavailable' || (setDocError.message && setDocError.message.includes('offline'))) {
              // User document creation skipped - client is offline, will be created when online
            } else {
              throw setDocError;
            }
          }


          // Redirect to profile for onboarding
          navigate(`/${lang}/dashboard/profile`);
          return;
        }
      } catch (firestoreError) {
        if (firestoreError.code === 'unavailable' || (firestoreError.message && firestoreError.message.includes('offline'))) {
          // Firestore data retrieval skipped - client is offline
        } else {
          // Firestore data retrieval error
        }
      }


      // Redirect to dashboard
      navigate(`/${lang}/dashboard`);
    } catch (error) {
      // Login error

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
      // Use the centralized loginWithGoogle function which now uses signInWithPopup
      const user = await loginWithGoogle();

      // Let the existing logic in handleRedirectResult (or a new effect) handle the user state?
      // Actually, since we use popup now, we get the user immediately here.
      // We should handle the post-login logic right here.

      const token = await user.getIdToken();

      // Retry helper for checking user existence
      const getDocWithRetry = async (docRef, retries = 3, delay = 1000) => {
        try {
          return await getDoc(docRef);
        } catch (err) {
          if (retries > 0 && (err.code === 'unavailable' || err.message?.includes('offline') || err.message?.includes('network'))) {
            await new Promise(resolve => setTimeout(resolve, delay));
            return getDocWithRetry(docRef, retries - 1, delay);
          }
          throw err;
        }
      };

      try {
        const userDocRef = doc(db, 'users', user.uid);
        // Use retry logic to handle transient offline states
        const userDoc = await getDocWithRetry(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();

          // Check if account is disabled/banned
          if (userData.accountStatus === 'disabled') {
            await signOut(auth);
            setBanDetails({
              reason: userData.banReason || 'No reason provided',
              info: userData.banInformation || 'Your account has been disabled. Please contact support if you believe this is a mistake.',
              date: userData.bannedAt?.toDate?.()?.toLocaleDateString() || 'N/A'
            });
            setIsBanModalOpen(true);
            setIsLoading(false);
            return;
          }

          if (!userData.profileCompleted && !userData.isProfessionalProfileComplete) {
            navigate(`/${lang}/dashboard/profile`);
          } else {
            navigate(`/${lang}/dashboard`);
          }
        } else {
          // New user
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
          navigate(`/${lang}/dashboard/profile`);
        }
      } catch (firestoreError) {
        // Firestore error during login check

        // FAIL-SAFE: If we can't check Firestore (offline), assume the user is valid and let them in.
        // The DashboardContext will attempt to refetch/repair the profile when connection is restored.
        if (firestoreError.code === 'unavailable' || firestoreError.message?.includes('offline')) {
          // Proceeding with offline login fallback
          // Default to profile page to ensure they fill in missing details if it is indeed a new user
          navigate(`/${lang}/dashboard/profile`);
        } else {
          showError(t('auth.errors.networkError') || "Network error. Please try again.");
          setIsLoading(false);
        }
      }

    } catch (error) {
      // Google login error
      setIsLoading(false);
      showError(t('auth.errors.googleLoginFailed'));
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
      // Password reset error
      setModalError(t('auth.errors.resetFailed'));
      showError(t('auth.errors.resetFailed'));
    }
  };

  return (
    <div className="auth-page-container bg-swiss-cross">
      <div className="auth-card">
        <div className="auth-logo-container">
          <img src="/logo.png" alt="Logo" className="auth-logo" />
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

      {/* Ban Information Popup */}
      {isBanModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-content ban-modal" style={{ maxWidth: '450px', borderTop: '4px solid var(--red-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setIsBanModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light-color)' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ textAlign: 'center', padding: '0 20px 20px' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(var(--red-4-rgb), 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--red-4)'
              }}>
                <ShieldAlert size={36} />
              </div>

              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-color)', marginBottom: '10px' }}>
                {t('auth.ban.title')}
              </h2>

              <div style={{
                backgroundColor: 'var(--grey-1)', padding: '15px', borderRadius: '8px', textAlign: 'left',
                marginBottom: '20px', border: '1px solid var(--grey-2)'
              }}>
                <p style={{ fontSize: '14px', marginBottom: '8px' }}>
                  <strong style={{ color: 'var(--text-color)' }}>{t('auth.ban.reason')}:</strong><br />
                  <span style={{ color: 'var(--red-4)' }}>{banDetails?.reason}</span>
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-light-color)', lineHeight: '1.5' }}>
                  {banDetails?.info}
                </p>
                <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-light-color)', textAlign: 'right' }}>
                  {t('auth.ban.disabledOn')}: {banDetails?.date}
                </div>
              </div>

              <button
                onClick={() => setIsBanModalOpen(false)}
                className="auth-button primary-button"
                style={{ width: '100%' }}
              >
                {t('auth.ban.understood')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;
