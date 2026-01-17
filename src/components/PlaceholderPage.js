import React from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import './styles/PlaceholderPage.css';

const PlaceholderPage = ({ title, description }) => {
  const { t } = useTranslation('common');
  
  return (
    <div className="placeholder-page">
      <Helmet>
        <title>{title} | InteriMed</title>
        <meta name="description" content={description} />
      </Helmet>
      
      <div className="container">
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="placeholder-notice">
          This page is currently under development. Please check back soon!
        </div>
      </div>
    </div>
  );
};

export default PlaceholderPage; 