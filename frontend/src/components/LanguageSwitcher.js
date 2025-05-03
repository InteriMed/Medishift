import React from 'react';
import './LanguageSwitcher.css';

const LanguageSwitcher = () => {
  // Simple mock of language switching functionality
  const currentLanguage = 'en';
  
  const handleLanguageChange = (language) => {
    console.log(`Would change language to: ${language}`);
    // In a real app, we would use i18n.changeLanguage(language) here
  };

  return (
    <div className="language-switcher">
      <button 
        className={currentLanguage === 'en' ? 'active' : ''} 
        onClick={() => handleLanguageChange('en')}
      >
        EN
      </button>
      <button 
        className={currentLanguage === 'fr' ? 'active' : ''} 
        onClick={() => handleLanguageChange('fr')}
      >
        FR
      </button>
    </div>
  );
};

export default LanguageSwitcher; 