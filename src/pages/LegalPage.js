import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import './styles/LegalPage.css';
import './styles/homepage.css'; // Import homepage styles

const LegalPage = ({ type }) => {
  const { t } = useTranslation(['legal', 'common']);
  const { lang } = useParams();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('');
  const [sections, setSections] = useState([]);

  useEffect(() => {
    window.scrollTo(0, 0);
    
    // Parse all section IDs from the legal content
    const sectionElements = document.querySelectorAll('.legal-section');
    const sectionIds = Array.from(sectionElements).map(section => section.id);
    setSections(sectionIds);
    
    // Set up intersection observer to update active section
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-20% 0px -70% 0px'
      }
    );
    
    sectionElements.forEach(section => observer.observe(section));
    
    return () => {
      sectionElements.forEach(section => observer.unobserve(section));
    };
  }, []);
  
  const getLegalTitle = () => {
    switch (type) {
      case 'terms':
        return t('terms.title');
      case 'privacy':
        return t('privacy.title');
      case 'cookies':
        return t('cookies.title');
      default:
        return t('terms.title');
    }
  };
  
  const getLegalContent = () => {
    switch (type) {
      case 'terms':
        return renderTermsContent();
      case 'privacy':
        return renderPrivacyContent();
      case 'cookies':
        return renderCookiesContent();
      default:
        return renderTermsContent();
    }
  };
  
  const renderSidebar = () => {
    return (
      <div className="legal-sidebar">
        <h3>{t('tableOfContents')}</h3>
        <ul className="table-of-contents">
          {sections.map(section => (
            <li key={section}>
              <a 
                href={`#${section}`}
                className={activeSection === section ? "active" : ""}
              >
                {t(`${type}.sections.${section}.title`)}
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  };
  
  const renderTermsContent = () => {
    return Object.keys(t('terms.sections', { returnObjects: true })).map(sectionKey => (
      <div id={sectionKey} key={sectionKey} className="legal-section">
        <h2>{t(`terms.sections.${sectionKey}.title`)}</h2>
        <div dangerouslySetInnerHTML={{ __html: t(`terms.sections.${sectionKey}.content`) }} />
      </div>
    ));
  };
  
  const renderPrivacyContent = () => {
    return Object.keys(t('privacy.sections', { returnObjects: true })).map(sectionKey => (
      <div id={sectionKey} key={sectionKey} className="legal-section">
        <h2>{t(`privacy.sections.${sectionKey}.title`)}</h2>
        <div dangerouslySetInnerHTML={{ __html: t(`privacy.sections.${sectionKey}.content`) }} />
      </div>
    ));
  };
  
  const renderCookiesContent = () => {
    return Object.keys(t('cookies.sections', { returnObjects: true })).map(sectionKey => (
      <div id={sectionKey} key={sectionKey} className="legal-section">
        <h2>{t(`cookies.sections.${sectionKey}.title`)}</h2>
        <div dangerouslySetInnerHTML={{ __html: t(`cookies.sections.${sectionKey}.content`) }} />
      </div>
    ));
  };
  
  return (
    <div className="legal-page">
      <Helmet>
        <title>{getLegalTitle()} | InteriMed</title>
        <meta name="description" content={t(`${type}.meta.description`)} />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      <div className="legal-container">
        {renderSidebar()}
        
        <div className="legal-content">
          <h1>{getLegalTitle()}</h1>
          {getLegalContent()}
        </div>
      </div>
    </div>
  );
};

export default LegalPage; 