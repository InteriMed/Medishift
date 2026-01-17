import React from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import './styles/LegalPage.css';

const PrivacyPolicyPage = () => {
  const { t } = useTranslation(['privacy', 'common']);

  // Function to render a section with its content
  const renderSection = (section) => {
    // Handle both English and French property naming
    const content = section.contenu || section.content;
    const sectionNumber = section.numero_section || section.section_number;
    const sectionTitle = section.titre_complet || section.full_title;
    
    if (!section || !content || !Array.isArray(content)) {
      return null;
    }
    
    return (
      <div className="privacy-section" key={sectionNumber}>
        <h3 id={`section-${sectionNumber}`}>{sectionTitle}</h3>
        {content.map((paragraph, idx) => (
          <p key={idx}>{paragraph}</p>
        ))}
      </div>
    );
  };

  // Safely get sections from translations
  const getSections = () => {
    try {
      const sections = t('privacy.sections.content.sections', { returnObjects: true });
      return Array.isArray(sections) ? sections : [];
    } catch (error) {
      console.error("Error getting privacy policy sections:", error);
      return [];
    }
  };

  const sections = getSections();
  
  return (
    <div className="legal-page privacy-policy-page">
      <Helmet>
        <title>{t('privacy.title')} | MediShift</title>
        <meta name="description" content={t('privacy.description')} />
      </Helmet>

      <div className="legal-container">
        <div className="legal-sidebar">
          <h3>{t('privacy.sections.content.titre_document', t('privacy.sections.content.document_title', 'Privacy Policy'))}</h3>
          <ul className="table-of-contents">
            {sections.map((section) => {
              // Handle both English and French property naming for the sidebar
              const sectionNumber = section.numero_section || section.section_number;
              const shortTitle = section.titre_court || section.short_title;
              
              return (
                <li key={sectionNumber}>
                  <a href={`#section-${sectionNumber}`}>
                    {shortTitle}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
        
        <div className="legal-content">
          <h1>{t('privacy.sections.content.titre_document', t('privacy.sections.content.document_title', 'Privacy Policy'))}</h1>
          <p className="last-updated">
            {t('privacy.sections.content.derniere_mise_a_jour_texte_complet', t('privacy.sections.content.last_updated_full_text', 'Last updated: [Date]'))}
          </p>
          
          {sections.map(section => renderSection(section))}
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage; 