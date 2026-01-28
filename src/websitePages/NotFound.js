import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Auth';
import './styles/NotFound.css';

const NotFound = () => {
  const { t } = useTranslation(['notFound', 'common']);
  const { lang } = useParams();
  const defaultLang = lang || 'en';

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="not-found-logo-container">
          <img src="/logo.png" alt="Logo" className="auth-logo" />
        </div>

        <div className="not-found-code">404</div>

        <h1 className="auth-title">
          {t('title', 'Whoa, You\'re Fast!')}
        </h1>

        <p className="auth-subtitle">
          {t('description', 'The page you are looking for doesn\'t exist or has not been deployed yet, but leave us your contact, in the newsletter or register already. We\'ll be in touch soon!')}
        </p>

        <div className="not-found-actions">
          <Link
            to={`/${defaultLang}`}
            className="not-found-button not-found-button-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span>{t('return_home', 'Return to Homepage')}</span>
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="not-found-button not-found-button-secondary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"></path>
            </svg>
            <span>{t('go_back', 'Go Back')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound; 