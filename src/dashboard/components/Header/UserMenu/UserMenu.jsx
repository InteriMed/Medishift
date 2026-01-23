import React, { useState, useRef, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiSettings, FiGlobe } from 'react-icons/fi';
import { useAuth } from '../../../../contexts/AuthContext';
import Button from '../../../../components/BoxedInputFields/Button'; // Import the Button component
import './UserMenu.css'; // Import the CSS file

const UserMenu = () => {
  const { t, i18n } = useTranslation(['dashboard']);

  const getTranslation = (key, defaultValue) => {
    const translated = t(key, defaultValue);
    if (typeof translated === 'object' && translated !== null) {
      return translated.title || defaultValue;
    }
    return translated;
  };
  const { lang } = useParams();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const menuRef = useRef(null);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
    setShowLanguageDropdown(false);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowLanguageDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode);
    // Navigate to the same page but with the new language
    const currentPath = window.location.pathname;
    const pathWithoutLang = currentPath.replace(/^\/[a-z]{2}/, '');
    navigate(`/${langCode}${pathWithoutLang}`);
    setShowLanguageDropdown(false);
    setIsOpen(false);
  };

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' }
  ];

  return (
    <div className="user-menu" ref={menuRef}>
      <div className="user-menu-trigger" onClick={toggleMenu}>
        <div className="user-avatar">
          {currentUser?.photoURL ? (
            <img src={currentUser.photoURL} alt={currentUser.displayName} />
          ) : (
            <div className="avatar-placeholder">
              {currentUser?.displayName?.charAt(0) || 'U'}
            </div>
          )}
        </div>
        <span className="user-name">{currentUser?.displayName || getTranslation('userMenu.user', 'User')}</span>
      </div>
      
      {isOpen && (
        <div className="user-menu-dropdown">
          <Link to={`/${lang}/dashboard/profile`} className="menu-item">
            <FiSettings />
            {getTranslation('userMenu.profile', 'My Profile')}
          </Link>
          
          <Link to={`/${lang}/dashboard/settings`} className="menu-item">
            <FiSettings />
            {getTranslation('userMenu.settings', 'Settings')}
          </Link>
          
          <div className="menu-divider"></div>
          
          {/* Language Switcher */}
          <div className="language-section">
            <div 
              className="menu-item language-trigger"
              onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
            >
              <FiGlobe />
              {getTranslation('userMenu.language', 'Language')}
              <span className={`chevron ${showLanguageDropdown ? 'open' : ''}`}>▼</span>
            </div>
            
            {showLanguageDropdown && (
              <div className="language-dropdown">
                {languages.map((language) => (
                  <button
                    key={language.code}
                    className={`language-option ${i18n.language === language.code ? 'active' : ''}`}
                    onClick={() => handleLanguageChange(language.code)}
                  >
                    <span className="flag">{language.flag}</span>
                    <span className="language-name">{language.name}</span>
                    {i18n.language === language.code && <span className="checkmark">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="menu-divider"></div>
          
          <div className="menu-item-logout">
            <Button onClick={handleLogout} variant="warning">
              {getTranslation('userMenu.logout', 'Log Out')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu; 