import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './LanguageSwitcher.css';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const currentLanguage = i18n.language || 'en';

  // Supported languages
  const languages = [
    { code: 'en', label: 'EN' },
    { code: 'fr', label: 'FR' },
    { code: 'de', label: 'DE' },
    { code: 'it', label: 'IT' }
  ];

  const changeLanguage = (languageCode) => {
    if (languageCode === currentLanguage) return;

    i18n.changeLanguage(languageCode);
    
    // Update URL to reflect language change
    const pathSegments = location.pathname.split('/').filter(Boolean);
    
    // Handle special case for root path
    if (pathSegments.length === 0 || (pathSegments.length === 1 && supportedLanguages.includes(pathSegments[0]))) {
      navigate(`/${languageCode}`);
      return;
    }
    
    // For other paths, replace the language segment
    if (supportedLanguages.includes(pathSegments[0])) {
      pathSegments[0] = languageCode;
    } else {
      pathSegments.unshift(languageCode);
    }
    
    navigate(`/${pathSegments.join('/')}`);
  };

  // List of supported language codes for URL checking
  const supportedLanguages = languages.map(lang => lang.code);

  return (
    <div className="language-switcher">
      {languages.map(language => (
        <button
          key={language.code}
          className={`lang-button ${currentLanguage === language.code ? 'active' : ''}`}
          onClick={() => changeLanguage(language.code)}
        >
          {language.label}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher; 