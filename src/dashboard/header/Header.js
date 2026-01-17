import React from 'react';
import { useTranslation } from 'react-i18next';
import './Header.css';

// This is a stub Header component
const Header = ({ lang, uid, currentSection }) => {
  const { t } = useTranslation();
  
  return (
    <header className="dashboard-header">
      <div className="header-content">
        <div className="header-section">
          <h2 className="section-title">{t(`dashboard.sections.${currentSection}`)}</h2>
        </div>
        <div className="header-actions">
          {/* User profile and actions could go here */}
        </div>
      </div>
    </header>
  );
};

export default Header; 