import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import styles from './Header.module.css';
import logo from '../../../../assets/global/logo.png'; // Import the logo image
import Button from '../../../../components/Button/Button';
import { useTranslation } from 'react-i18next';

const Header = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const currentLanguage = i18n.language || 'en';

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 800);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Helper function to create language-aware absolute paths
  const createPath = (path) => {
    // Remove any trailing slashes from the path
    const cleanPath = path.replace(/^\/+/, '');
    return `/${currentLanguage}/${cleanPath}`;
  };

  const NavLinks = () => (
    <>
      <NavLink 
        to={`/${currentLanguage}`} 
        className={({ isActive }) => 
          `${styles.navLink} ${isActive ? styles.active : ''}`
        }
        onClick={() => setIsMenuOpen(false)}
      >
        {t('navigation.home')}
      </NavLink>
      <NavLink 
        to={`/${currentLanguage}/about`} 
        className={({ isActive }) => 
          `${styles.navLink} ${isActive ? styles.active : ''}`
        }
        onClick={() => setIsMenuOpen(false)}
      >
        {t('navigation.about')}
      </NavLink>
      <NavLink 
        to={`/${currentLanguage}/faqs`} 
        className={({ isActive }) => 
          `${styles.navLink} ${isActive ? styles.active : ''}`
        }
        onClick={() => setIsMenuOpen(false)}
      >
        {t('navigation.faqs')}
      </NavLink>
      <NavLink 
        to={`/${currentLanguage}/support`} 
        className={({ isActive }) => 
          `${styles.navLink} ${isActive ? styles.active : ''}`
        }
        onClick={() => setIsMenuOpen(false)}
      >
        {t('navigation.support')}
      </NavLink>
    </>
  );

  const AuthButtons = () => (
    <div className={styles.authButtons}>
      <Button
        color="#ffffff"
        textColor="#000000"
        focusColor="#e5e9e3"
        borderColor="#cccccc"
        width="calc(150px + 1.4vw)"
        height="40px"
        onClick={() => navigate(`/${currentLanguage}/login`)}
        text={t('auth.login')}
      />
      <div className={styles.buttonSpacer}></div>
      <Button
        color="#000000"
        textColor="#ffffff"
        focusColor="#333333"
        borderColor="#414141"
        width="calc(150px + 1.4vw)"
        height="40px"
        onClick={() => navigate(`/${currentLanguage}/signup`)}
        text={t('auth.signup.welcome')}
      />
    </div>
  );

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link to={`/${currentLanguage}`} className={styles.logoLink}>
          <img src={logo} alt="Logo" className={styles.logoImage} />
        </Link>
        {isMobile ? (
          <div className={styles.mobileMenuContainer}>
            <button 
              className={styles.menuButton}
              onMouseEnter={() => setIsMenuOpen(true)}
              onClick={toggleMenu}
            >
              Menu
            </button>
            {isMenuOpen && (
              <nav className={styles.dropdownMenu}>
                <ul className={styles.dropdownList}>
                  <li><NavLinks /></li>
                  <li className={styles.authButtons}>
                    <AuthButtons />
                  </li>
                </ul>
              </nav>
            )}
          </div>
        ) : (
          <>
            <nav className={styles.desktopNav}>
              <NavLinks />
            </nav>
            <AuthButtons />
          </>
        )}
      </div>
    </header>
  );
};

export default Header;
