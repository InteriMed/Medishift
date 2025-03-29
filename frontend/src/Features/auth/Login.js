import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import './styles/Login.css'; // Import the CSS file
import signInImage from "./assets/signInImage.png";
import logoImage from "../../assets/global/logo.png";
import InputField from '../../components/Boxed-InputFields/Personnalized-InputField/Personnalized-InputField'; // Import the new component
import UnderlinedLink from '../../components/Links/UnderlinedLink';
import { getFirebaseAuth } from './utils/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import API_CONFIG from '../../config/api.config';

function SignIn() {
  const { t } = useTranslation();
  const { lang } = useParams();
  const textColor = "#000000"; // black
  const backgroundColor = "#f0f8e7"; // light green
  const [isMobile, setIsMobile] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 500);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Step 1: Authenticate with Firebase
      const auth = getFirebaseAuth();
      if (!auth) {
        throw new Error('Firebase authentication not initialized');
      }

      // Sign in with Firebase
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
      
      // Step 2: Get user data from backend (similar to Marketplace.js)
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/users/profile`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
        });

        if (response.ok) {
          const userData = await response.json();
          localStorage.setItem('user', JSON.stringify(userData));
        } else {
          // If we can't get user data from backend, still allow login with basic Firebase info
          localStorage.setItem('user', JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
          }));
        }

        // Redirect to dashboard with language parameter
        navigate(`/${lang}/dashboard`);
      } catch (backendError) {
        console.error('Backend fetch error:', backendError);
        // Still allow login if backend fails
        localStorage.setItem('user', JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0],
        }));
        navigate(`/${lang}/dashboard`);
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle specific Firebase auth errors
      switch (error.code) {
        case 'auth/invalid-email':
          setError(t('auth.errors.invalidEmail'));
          break;
        case 'auth/user-disabled':
          setError(t('auth.errors.accountDisabled'));
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          setError(t('auth.errors.invalidCredentials'));
          break;
        default:
          setError(t('auth.errors.loginFailed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'flex', height: '100vh', backgroundColor }}>
      <div
        style={{
          maxWidth: isMobile ? '100%' : '100%',
          width: isMobile ? 'calc(100%px)' : '100%', // Set max width to 50% for non-mobile
          minWidth: isMobile ? 'auto' : '550px',
          margin: isMobile ? '0px' : '0px',
          display: 'flex',
          justifyContent: 'center',
          backgroundColor: 'white',
          padding: isMobile ? '60px' : '40px',
          alignItems: 'center'
        }}
      >
        <div style={{ width: isMobile ? '100%' : '500px', textAlign: 'left' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              padding: isMobile ? '20px' : '40px',
              alignItems: 'center',
              verticalAlign: 'middle',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center'}}>
              <img src={logoImage} alt="Logo" className="login-logo"/>
            </div>
            <p className="text-light-grey" style={{ fontSize: '14px', marginBottom: '5vh', textAlign: 'center' }}>
              {t('auth.loginPrompt')}
            </p>
            <InputField
              label={t('auth.email')}
              placeholder={t('auth.placeholders.email')}
              value={formData.email}
              onChange={(e) => handleInputChange({ target: { name: 'email', value: e.target.value } })}
              marginBottom="20px"
            />
            <InputField
              label={t('auth.password')}
              placeholder={t('auth.placeholders.password')}
              value={formData.password}
              onChange={(e) => handleInputChange({ target: { name: 'password', value: e.target.value } })}
              marginBottom="5vh"
              type="password"
            />
            <button
              onClick={handleLogin}
              disabled={isLoading}
              style={{
                fontSize: '14px',
                backgroundColor: textColor,
                width: '100%',
                height: '45px',
                color: 'white',
                border: 'none',
                paddingTop: '10px',
                borderRadius: '5px',
                cursor: 'pointer',
                transition: 'background-color 0.3s ease',
                marginBottom: '10px',
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? 'Logging in...' : t('auth.login')}
            </button>
            <UnderlinedLink
              text={t('auth.forgotPassword')}
              to={`/${lang}/forgot-password`}
              bottomMargin="5px"
              color={textColor}
              fontSize="14px"
            />
            <UnderlinedLink
              text={t('auth.signupPrompt')}
              to={`/${lang}/signup`}
              color={textColor}
              bottomMargin="8px"
              fontSize="14px"
            />
            <p className="text-light-grey-centered" style={{ fontSize: '16px', marginTop: '20px' }}>
              Copyright © Linky 2024.
            </p>
            {error && (
              <p style={{ color: 'red', textAlign: 'center', marginTop: '10px' }}>
                {error}
              </p>
            )}
          </div>
        </div>
      </div>
      {!isMobile && (
        <div
          style={{
            width: '50%',
            backgroundImage: `url(${signInImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        ></div>
      )}
    </div>
  );
}

export default SignIn;
