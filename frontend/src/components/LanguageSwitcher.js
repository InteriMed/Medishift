import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const changeLanguage = (lng) => {
    // Get the current path without the language prefix
    const pathParts = location.pathname.split('/');
    const currentPath = pathParts.slice(2).join('/');
    
    // Only navigate if the language is actually changing
    if (lng !== i18n.language) {
      const newPath = currentPath ? `/${lng}/${currentPath}` : `/${lng}`;
      navigate(newPath);
      i18n.changeLanguage(lng);
    }
  };

  // Return null to hide the component while keeping the functionality
  return null;

  /* Original return statement kept for reference
  return (
    <div className="language-switcher">
      <button onClick={() => changeLanguage('en')} className={i18n.language === 'en' ? 'active' : ''}>
        🇬🇧 EN
      </button>
      <button onClick={() => changeLanguage('fr')} className={i18n.language === 'fr' ? 'active' : ''}>
        🇫🇷 FR
      </button>
      <button onClick={() => changeLanguage('de')} className={i18n.language === 'de' ? 'active' : ''}>
        🇩🇪 DE
      </button>
      <button onClick={() => changeLanguage('it')} className={i18n.language === 'it' ? 'active' : ''}>
        🇮🇹 IT
      </button>
    </div>
  );
  */
};

export default LanguageSwitcher; 