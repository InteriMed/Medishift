import { Link, NavLink, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

const Header = () => {
  const { t } = useTranslation('common');
  const { lang = 'en' } = useParams();

  return (
    <header>
      <nav>
        <NavLink to="/en/home" className={({ isActive }) => (isActive ? 'active' : '')}>Home</NavLink>
        <NavLink to="/en/sitemap" className={({ isActive }) => (isActive ? 'active' : '')}>Sitemap</NavLink>
        <Link to={`/${lang}/pharmacies`}>
          {t('navigation.forPharmacies')}
        </Link>
        <Link to={`/${lang}/professionals`}>
          {t('navigation.forProfessionals')}
        </Link>
        <Link to={`/${lang}/about`}>
          {t('navigation.aboutUs')}
        </Link>
        <Link to={`/${lang}/contact`}>
          {t('navigation.contact')}
        </Link>
        <Link to={`/${lang}/blog`}>
          {t('navigation.blog')}
        </Link>
      </nav>
      <div>
        <Link to={`/${lang}/login`} className="login-button">
          {t('auth.login.button')}
        </Link>
        <Link to={`/${lang}/signup`} className="signup-button">
          {t('auth.signup.button')}
        </Link>
      </div>
      <LanguageSwitcher />
    </header>
  );
};

export default Header; 