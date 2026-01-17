import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const NotFound = () => {
  const { t } = useTranslation(['common']);
  const { lang } = useParams();
  const defaultLang = lang || 'en';

  return (
    <div className="not-found-container">
      <div className="not-found-code">404</div>

      {/* Healthcare related logo */}
      <div className="healthcare-logo">
        <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
        </svg>
      </div>

      <h1 className="not-found-title">
        {t('pages.not_found.title', 'Whoa, You\'re Fast!')}
      </h1>

      <p className="not-found-description">
        {t('pages.not_found.description', 'The page you are looking for doesn\'t exist or has not been deployed yet, but leave us your contact, in the newsletter or register already. We\'ll be in touch soon!')}
      </p>

      <Link
        to={`/${defaultLang}`}
        className="not-found-button"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
        {t('pages.not_found.return_home', 'Return to Homepage')}
      </Link>
    </div>
  );
};

export default NotFound; 