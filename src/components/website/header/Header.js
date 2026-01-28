import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { NavLink, Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getLocalizedRoute } from '../../../i18n';
import { Menu, X, Globe, ChevronDown } from 'lucide-react';
import Button from '../../boxedInputFields/button';

const Header = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const { lang = i18n.language || 'en' } = useParams();
  const currentLanguage = i18n.language || 'en';

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
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

  const createPath = (path) => {
    const cleanPath = path.replace(/^\/+/, '');
    return `/${currentLanguage}/${cleanPath}`;
  };

  const NavLinks = ({ mobile = false }) => {
    const baseClass = mobile
      ? "block py-3 px-4 text-base font-medium hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 rounded-lg transition-all duration-200 active:scale-[0.98] border-l-4 border-transparent hover:border-blue-500"
      : "text-sm font-semibold transition-all duration-200 px-4 py-2 rounded-lg hover:bg-slate-50 relative group";

    const links = [
      { to: 'home', label: t('common.home', 'Home') },
      { to: 'facilities', label: t('common.forFacilities', 'For Facilities') },
      { to: 'professionals', label: t('common.forProfessionals', 'For Professionals') },
      { to: 'about', label: t('common.aboutUs', 'About Us') },
      { to: 'contact', label: t('common.contact', 'Contact') },
      { to: 'blog', label: t('common.blog', 'Blog') },
      { to: 'faq', label: t('common.faq', 'FAQ') },
      { to: 'support', label: t('common.support', 'Support') },
    ];

    return (
      <>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={`/${lang}/${getLocalizedRoute(link.to, lang)}`}
            style={{ color: 'var(--color-logo-2, #0f172a)' }}
            className={({ isActive }) =>
              `${baseClass} ${!mobile && isActive ? 'bg-blue-50 font-bold' : ''} ${!mobile && !isActive ? 'after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-0 after:h-0.5 after:bg-blue-600 after:transition-all after:duration-300 group-hover:after:w-4/5' : ''} ${mobile && isActive ? 'border-blue-500 bg-blue-50' : ''}`
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

  NavLinks.propTypes = {
    mobile: PropTypes.bool
  };

  const AuthButtons = ({ mobile = false }) => (
    <div className={`flex ${mobile ? 'flex-col gap-3 w-full' : 'items-center gap-3'}`}>
      <Button
        variant="secondary"
        onClick={() => navigate(createPath('login'))}
        className={mobile ? 'w-full' : ''}
      >
        {t('auth.login.button', 'Login')}
      </Button>
      <Button
        variant="primary"
        onClick={() => navigate(createPath('signup'))}
        className={mobile ? 'w-full' : ''}
      >
        {t('auth.signup.button', 'Register')}
      </Button>
    </div>
  );

  AuthButtons.propTypes = {
    mobile: PropTypes.bool
  };

  const LanguageSwitcher = ({ mobile = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const changeLanguage = (lng) => {
      i18n.changeLanguage(lng);
      const currentPath = window.location.pathname.split('/').slice(2).join('/');
      navigate(`/${lng}/${currentPath}`);
      setIsOpen(false);
    };

    const languages = [
      { code: 'en', label: 'English', short: 'EN' },
      { code: 'fr', label: 'Français', short: 'FR' }
    ];

    const currentLang = languages.find(l => l.code === currentLanguage) || languages[0];

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isOpen]);

    if (mobile) {
      return (
        <div className="w-full">
          <span className="text-sm font-medium flex items-center gap-2 mb-3" style={{ color: 'var(--color-logo-2, #0f172a)' }}>
            <Globe size={16} />
            {t('header.changeLanguage', 'Language')}
          </span>
          <div className="flex flex-col gap-2">
            {languages.map((lng) => (
              <button
                key={lng.code}
                onClick={() => changeLanguage(lng.code)}
                className={`text-sm font-medium px-4 py-2.5 rounded-lg transition-all duration-200 text-left ${
                  currentLanguage === lng.code
                    ? 'bg-blue-50 font-semibold'
                    : 'hover:bg-slate-50'
                }`}
                style={{ color: 'var(--color-logo-2, #0f172a)' }}
              >
                {lng.label}
              </button>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 transition-all duration-200"
          style={{ color: 'var(--color-logo-2, #0f172a)' }}
        >
          <Globe size={16} />
          <span className="text-sm font-semibold">{currentLang.short}</span>
          <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg py-2 min-w-[140px] z-50">
            {languages.map((lng) => (
              <button
                key={lng.code}
                onClick={() => changeLanguage(lng.code)}
                className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                  currentLanguage === lng.code
                    ? 'bg-blue-50 font-semibold'
                    : 'hover:bg-slate-50'
                }`}
                style={{ color: 'var(--color-logo-2, #0f172a)' }}
              >
                {lng.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  LanguageSwitcher.propTypes = {
    mobile: PropTypes.bool
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-sm transition-all duration-300">
      <div className="w-full flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto">
        <Link 
          to={`/${lang}/${getLocalizedRoute('home', lang)}`} 
          className="flex items-center gap-3 hover:opacity-90 transition-opacity duration-200 group flex-shrink-0"
        >
          <div className="relative">
            <img
              src="/logo.png"
              alt={t('header.logoAlt', 'MediShift')}
              className="h-9 w-auto transition-transform duration-200 group-hover:scale-105"
            />
          </div>
          <span className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--color-logo-2, #0f172a)' }}>
            {t('header.brandName', 'MediShift')}
          </span>
        </Link>

        {isMobile ? (
          <div className="flex items-center gap-2">
            <button
              className="p-2.5 hover:bg-slate-100 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
              onClick={toggleMenu}
              aria-label={t('header.toggleMenu', 'Toggle menu')}
              style={{ color: 'var(--color-logo-2, #0f172a)' }}
            >
              {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        ) : (
          <>
            <nav className="hidden lg:flex items-center gap-1">
              <NavLinks />
            </nav>
            <div className="hidden lg:flex items-center gap-4">
              <LanguageSwitcher />
              <div className="w-px h-6 bg-slate-200"></div>
              <AuthButtons />
            </div>
          </>
        )}

        {isMobile && isMenuOpen && (
          <div className="fixed inset-0 top-16 bg-white border-b border-slate-100 shadow-2xl p-6 flex flex-col overflow-y-auto z-50">
            <nav className="flex flex-col gap-1 mb-6">
              <NavLinks mobile />
            </nav>
            <div className="border-t border-slate-200 pt-6 space-y-6">
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
