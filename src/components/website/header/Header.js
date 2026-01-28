import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { NavLink, Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getLocalizedRoute } from '../../../i18n';
import { FaBars, FaTimes } from 'react-icons/fa';


const Header = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const { lang = i18n.language || 'en' } = useParams();
  const currentLanguage = i18n.language || 'en';

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 1300);
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
    const cleanPath = path.replace(/^\/+/, '');
    return `/${currentLanguage}/${cleanPath}`;
  };

  const NavLinks = ({ mobile = false }) => {
    const baseClass = mobile
      ? "block py-3 px-4 text-lg font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"
      : "text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors px-3 py-2 rounded-lg hover:bg-slate-50";

    const links = [
      { to: 'home', label: t('common.home') },
      { to: 'facilities', label: t('common.forFacilities') },
      { to: 'professionals', label: t('common.forProfessionals') },
      { to: 'about', label: t('common.aboutUs') },
      { to: 'contact', label: t('common.contact') },
      { to: 'blog', label: t('common.blog') },
      { to: 'faq', label: t('common.faq') },
      { to: 'support', label: t('common.support', 'Support') },
    ];

    return (
      <>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={`/${lang}/${getLocalizedRoute(link.to, lang)}`}
            className={({ isActive }) =>
              `${baseClass} ${!mobile && isActive ? 'text-slate-900 bg-slate-50' : ''}`
            }
            onClick={(e) => {
              if (link.to === 'support') {
                e.stopPropagation();
                navigate(`/${lang}/${getLocalizedRoute(link.to, lang)}`);
                setIsMenuOpen(false);
                window.scrollTo(0, 0);
                return;
              }
              setIsMenuOpen(false);
              window.scrollTo(0, 0);
            }}
          >
            {link.label}
          </NavLink>
        ))}
      </>
    );
  };

  const AuthButtons = ({ mobile = false }) => (
    <div className={`flex ${mobile ? 'flex-col gap-3 mt-6' : 'items-center gap-3'}`}>
      <button
        onClick={() => navigate(createPath('login'))}
        className={`px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all border border-slate-200 ${mobile ? 'w-full border border-slate-200' : ''}`}
      >
        {t('auth.login.button', 'Log In')}
      </button>
      <button
        onClick={() => navigate(createPath('signup'))}
        className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:shadow-primary/40 flex items-center justify-center ${mobile ? 'w-full' : ''}`}
        style={{ background: 'var(--secondary-color)' }}
      >
        {t('auth.signup.button', 'Sign Up')}
      </button>
    </div>
  );

  AuthButtons.propTypes = {
    mobile: PropTypes.bool
  };

  const LanguageSwitcher = ({ mobile = false }) => {
    const changeLanguage = (lng) => {
      i18n.changeLanguage(lng);
      const currentPath = window.location.pathname.split('/').slice(2).join('/');
      navigate(`/${lng}/${currentPath}`);
    };

    return (
      <div className={`flex items-center bg-slate-100 rounded-lg p-1 ${mobile ? 'mt-4 w-fit' : ''}`}>
        {['en', 'fr'].map((lng) => (
          <button
            key={lng}
            className={`text-xs font-bold px-3 py-1.5 rounded-md transition-all ${currentLanguage === lng
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
              }`}
            onClick={() => changeLanguage(lng)}
          >
            {lng.toUpperCase()}
          </button>
        ))}
      </div>
    );
  };

  NavLinks.propTypes = {
    mobile: PropTypes.bool
  };

  LanguageSwitcher.propTypes = {
    mobile: PropTypes.bool
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 transition-all duration-300">
      <div className="w-full flex h-20 items-center justify-between px-6 lg:px-8 max-w-[1400px] mx-auto">
        <Link to={`/${lang}/${getLocalizedRoute('home', lang)}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <img
            src="/logo.png"
            alt={t('common:header.logoAlt', 'MediShift')}
            className="h-10 w-auto"
          />
          <span className="text-2xl font-bold" style={{ color: 'var(--color-logo-2)' }}>{t('common:header.brandName', 'MediShift')}</span>
        </Link>

        {isMobile ? (
          <div className="flex items-center gap-4">
            <button
              className="p-2 text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              onClick={toggleMenu}
            >
              {isMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
            </button>
          </div>
        ) : (
          <>
            <nav className="flex items-center gap-2">
              <NavLinks />
            </nav>
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <div className="w-px h-8 bg-slate-200 mx-2"></div>
              <AuthButtons />
            </div>
          </>
        )}

        {/* Mobile Menu Overlay */}
        {isMobile && isMenuOpen && (
          <div className="absolute top-20 left-0 w-full bg-white border-b border-slate-100 shadow-xl p-6 flex flex-col animate-in slide-in-from-top-2">
            <nav className="flex flex-col gap-2">
              <NavLinks mobile />
            </nav>
            <div className="border-t border-slate-100 my-6 pt-6">
              <LanguageSwitcher mobile />
              <AuthButtons mobile />
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
