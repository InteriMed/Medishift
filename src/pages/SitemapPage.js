import React from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';

const SitemapPage = () => {
  const { t } = useTranslation(['common', 'navigation']);
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
        <title>{t('navigation.sitemap.title')} | MediShift</title>
        <meta name="description" content={t('navigation.sitemap.introduction')} />
      </Helmet>

      <div className="container sitemap-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1>{t('navigation.sitemap.title')}</h1>
        <p className="intro-text">{t('navigation.sitemap.introduction')}</p>

        <div className="sitemap-content">
          {/* Core Pages */}
          <section className="sitemap-section">
            <h2>{t('navigation.sitemap.corePages.title')}</h2>
            <ul className="sitemap-links">
              <li>
                <Link to={createLink('/home')}>{t('navigation.sitemap.corePages.home')}</Link>
              </li>
              <li>
                <Link to={createLink('/healthcare facilities')}>{t('navigation.sitemap.corePages.forPharmacies')}</Link>
              </li>
              <li>
                <Link to={createLink('/professionals')}>{t('navigation.sitemap.corePages.forProfessionals')}</Link>
              </li>
              <li>
                <Link to={createLink('/about')}>{t('navigation.sitemap.corePages.aboutUs')}</Link>
              </li>
              <li>
                <Link to={createLink('/faq')}>{t('navigation.sitemap.corePages.faq')}</Link>
              </li>
              <li>
                <Link to={createLink('/contact')}>{t('navigation.sitemap.corePages.contact')}</Link>
              </li>
            </ul>
          </section>

          {/* Resources */}
          <section className="sitemap-section">
            <h2>{t('navigation.sitemap.resources.title')}</h2>
            <ul className="sitemap-links">
              <li>
                <Link to={createLink('/blog')}>{t('navigation.blog')}</Link>
                <ul className="sitemap-sublinks">
                  <li>
                    <Link to={createLink('/blog/category/compliance-corner')}>
                      {t('navigation.blog')}
                    </Link>
                  </li>
                  <li>
                    <Link to={createLink('/blog/category/professional-development')}>
                      {t('navigation.blog')}
                    </Link>
                  </li>
                  <li>
                    <Link to={createLink('/blog/category/pharmacy-management')}>
                      {t('navigation.blog')}
                    </Link>
                  </li>
                  <li>
                    <Link to={createLink('/blog/category/platform-updates')}>
                      {t('navigation.blog')}
                    </Link>
                  </li>
                </ul>
              </li>
            </ul>
          </section>

          {/* Legal & Compliance */}
          <section className="sitemap-section">
            <h2>{t('navigation.sitemap.legal.title')}</h2>
            <ul className="sitemap-links">
              <li>
                <Link to={createLink('/privacy-policy')}>{t('legal.privacy.title')}</Link>
              </li>
              <li>
                <Link to={createLink('/terms-of-service')}>{t('legal.terms.title')}</Link>
              </li>
            </ul>
          </section>

          {/* Account Access */}
          <section className="sitemap-section">
            <h2>{t('navigation.sitemap.account.title')}</h2>
            <ul className="sitemap-links">
              <li>
                <a href="https://app.medishift.ch/login" target="_blank" rel="noopener noreferrer">
                  {t('navigation.login')}
                </a>
              </li>
              <li>
                <a href="https://app.medishift.ch/register" target="_blank" rel="noopener noreferrer">
                  {t('navigation.signup')}
                </a>
              </li>
            </ul>
          </section>

          {/* This Page */}
          <section className="sitemap-section">
            <h2>{t('navigation.sitemap.thisPage.title')}</h2>
            <ul className="sitemap-links">
              <li>
                <span className="current-page">{t('navigation.sitemap.thisPage.sitemap')}</span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SitemapPage; 