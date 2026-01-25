import React from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';

const SitemapPage = () => {
  const { t } = useTranslation(['sitemap', 'common']);
  const { lang } = useParams();

  // Helper to create language-aware links
  const createLink = (path) => {
    // If path already starts with /, don't add another one
    const formattedPath = path.startsWith('/') ? path : `/${path}`;
    return `/${lang || 'en'}${formattedPath}`;
  };

  return (
    <div className="sitemap-page">
      <Helmet>
        <title>{t('title')} | MediShift</title>
        <meta name="description" content={t('introduction')} />
      </Helmet>

      <div className="container sitemap-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1>{t('title')}</h1>
        <p className="intro-text">{t('introduction')}</p>

        <div className="sitemap-content">
          {/* Core Pages */}
          <section className="sitemap-section">
            <h2>{t('corePages.title')}</h2>
            <ul className="sitemap-links">
              <li>
                <Link to={createLink('/home')}>{t('corePages.home')}</Link>
              </li>
              <li>
                <Link to={createLink('/healthcare facilities')}>{t('corePages.forFacilities')}</Link>
              </li>
              <li>
                <Link to={createLink('/professionals')}>{t('corePages.forProfessionals')}</Link>
              </li>
              <li>
                <Link to={createLink('/about')}>{t('corePages.aboutUs')}</Link>
              </li>
              <li>
                <Link to={createLink('/faq')}>{t('corePages.faq')}</Link>
              </li>
              <li>
                <Link to={createLink('/contact')}>{t('corePages.contact')}</Link>
              </li>
            </ul>
          </section>

          {/* Resources */}
          <section className="sitemap-section">
            <h2>{t('resources.title')}</h2>
            <ul className="sitemap-links">
              <li>
                <Link to={createLink('/blog')}>{t('resources.blog')}</Link>
                <ul className="sitemap-sublinks">
                  <li>
                    <Link to={createLink('/blog/category/compliance-corner')}>
                      {t('resources.blog')}
                    </Link>
                  </li>
                  <li>
                    <Link to={createLink('/blog/category/professional-development')}>
                      {t('resources.blog')}
                    </Link>
                  </li>
                  <li>
                    <Link to={createLink('/blog/category/pharmacy-management')}>
                      {t('resources.blog')}
                    </Link>
                  </li>
                  <li>
                    <Link to={createLink('/blog/category/platform-updates')}>
                      {t('resources.blog')}
                    </Link>
                  </li>
                </ul>
              </li>
            </ul>
          </section>

          {/* Legal & Compliance */}
          <section className="sitemap-section">
            <h2>{t('legal.title')}</h2>
            <ul className="sitemap-links">
              <li>
                <Link to={createLink('/privacy-policy')}>{t('legal.privacy')}</Link>
              </li>
              <li>
                <Link to={createLink('/terms-of-service')}>{t('legal.terms')}</Link>
              </li>
            </ul>
          </section>

          {/* Account Access */}
          <section className="sitemap-section">
            <h2>{t('account.title')}</h2>
            <ul className="sitemap-links">
              <li>
                <a href="https://app.medishift.ch/login" target="_blank" rel="noopener noreferrer">
                  {t('account.login') || 'Login'}
                </a>
              </li>
              <li>
                <a href="https://app.medishift.ch/register" target="_blank" rel="noopener noreferrer">
                  {t('account.signup') || 'Sign Up'}
                </a>
              </li>
            </ul>
          </section>

          {/* This Page */}
          <section className="sitemap-section">
            <h2>{t('thisPage.title')}</h2>
            <ul className="sitemap-links">
              <li>
                <span className="current-page">{t('thisPage.sitemap')}</span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SitemapPage; 