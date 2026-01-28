import React from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import './styles/LegalPage.css';

const TermsOfServicePage = () => {
  const { t } = useTranslation(['terms', 'common']);

  // Safely get sections from translations
  const getSections = () => {
    try {
      const sections = t('terms.sections', { returnObjects: true });
      return Array.isArray(sections) ? sections : [];
    } catch (error) {
      console.error("Error getting terms sections:", error);
      return [];
    }
  };

  // Function to render a section with its content
  const renderSection = (section) => {
    // Handle specific property naming for terms
    const content = section.content;
    const sectionId = section.id;
    const sectionTitle = section.title;

    if (!section || !content) {
      return null;
    }

    return (
      <div className="privacy-section" key={sectionId}>
        <h3 id={sectionId}>{sectionTitle}</h3>
        {Array.isArray(content) ? (
          content.map((paragraph, idx) => (
            <p key={idx}>{paragraph}</p>
          ))
        ) : (
          <p>{content}</p>
        )}
      </div>
    );
  };

  const sections = getSections();

  return (
    <div className="legal-page terms-of-service-page">
      <Helmet>
        <title>{t('terms.meta.title')} | Medishift</title>
        <meta name="description" content={t('terms.meta.description')} />
        <meta name="keywords" content={t('terms.meta.keywords')} />
      </Helmet>

      <div className="legal-container">
        <div className="legal-sidebar">
          <h3>{t('terms.tableOfContents.title', 'Table of Contents')}</h3>
          <ul className="table-of-contents">
            {sections.map((section, index) => (
              <li key={index}>
                <a href={`#${section.id}`}>{section.title}</a>
              </li>
            ))}
          </ul>
        </div>

        <div className="legal-content">
          <h1>{t('terms.title')}</h1>
          <p className="last-updated">
            {t('terms.lastUpdated')}
          </p>

          {sections.map(section => renderSection(section))}

          <div className="legal-disclaimer">
            {t('terms.legalDisclaimer')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServicePage;
