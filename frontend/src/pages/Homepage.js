import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import './styles/Homepage.css';

// Create placeholder image URLs if assets are missing
const partTimeImg = 'https://via.placeholder.com/80';
const permanentImg = 'https://via.placeholder.com/80';
const workforceImg = 'https://via.placeholder.com/80';

const Homepage = () => {
  const { t } = useTranslation();
  const { lang } = useParams();
  const [displayText, setDisplayText] = useState('');
  const phrases = [
    t('homepage.hero.roles.pharmacist'),
    t('homepage.hero.roles.assistant'),
    t('homepage.hero.roles.pharmacy'),
    t('homepage.hero.roles.internship')
  ];
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentPhrase = phrases[currentPhraseIndex];
    
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        // Typing
        if (displayText !== currentPhrase) {
          setDisplayText(currentPhrase.substring(0, displayText.length + 1));
        } else {
          // Wait before starting to delete
          setTimeout(() => setIsDeleting(true), 6000);
        }
      } else {
        // Deleting
        if (displayText === '') {
          setIsDeleting(false);
          setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
        } else {
          setDisplayText(currentPhrase.substring(0, displayText.length - 1));
        }
      }
    }, isDeleting ? 60 : 90);

    return () => clearTimeout(timeout);
  }, [displayText, currentPhraseIndex, isDeleting, phrases]);

  // Simplified component to avoid dependency issues
  return (
    <div className="bg-light-creme">
      <Helmet>
        <title>PharmaSoft - Pharmaceutical Job Listings & Marketplace</title>
        <meta name="description" content="Find the best pharmaceutical jobs, explore the marketplace, and manage your pharmacy or pharmacist profile with PharmaSoft. Join now!" />
      </Helmet>

      <div className="content">
        {/* Temporarily comment out Header until it's fixed */}
        {/* <Header /> */}
        <h1 style={{ padding: "40px 20px", textAlign: "center", marginTop: "80px" }}>PharmaSoft</h1>

        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-content">
            <h1 className="hero-title">
              <span>{t('homepage.hero.find')} </span>
              <span className="typing-text">{displayText}</span>
              <span className="cursor">|</span>
            </h1>
            <p className="hero-subtitle">{t('homepage.hero.subtitle')}</p>
            <div className="hero-cta">
              <NavLink to={`/${lang || 'en'}/signup`} className="hire-button">
                {t('homepage.hero.cta.hire')}
              </NavLink>
              <NavLink to={`/${lang || 'en'}/how-it-works`} className="apply-button">
                {t('homepage.hero.cta.find')}
              </NavLink>
            </div>
            
            {/* Service Categories */}
            <div className="service-categories">
              <div className="category-icon">
                <span>Dashboard</span>
              </div>
              <div className="category-icon">
                <span>Calendar</span>
              </div>
              <div className="category-icon">
                <span>Messages</span>
              </div>
              <div className="category-icon">
                <span>HR Core</span>
              </div>
              <div className="category-icon">
                <span>Marketplace</span>
              </div>
            </div>
          </div>
        </section>

        {/* Services Grid */}
        <section className="services-showcase">
          <div className="container">
            <h2 className="section-title">{t('homepage.services.title')}</h2>
            <div className="services-grid">
              <div className="service-card">
                <div className="service-image-container">
                  <img src={partTimeImg} alt="Temporary Staffing" className="service-icon-image" />
                </div>
                <h3>{t('homepage.services.temp.title')}</h3>
                <p>{t('homepage.services.temp.description')}</p>
                <NavLink to={`/${lang || 'en'}/temp-staffing`} className="learn-more">
                  {t('common.learnMore')} →
                </NavLink>
              </div>
              <div className="service-card">
                <div className="service-image-container">
                  <img src={permanentImg} alt="Permanent Placement" className="service-icon-image" />
                </div>
                <h3>{t('homepage.services.permanent.title')}</h3>
                <p>{t('homepage.services.permanent.description')}</p>
                <NavLink to={`/${lang || 'en'}/permanent-staffing`} className="learn-more">
                  {t('common.learnMore')} →
                </NavLink>
              </div>
              <div className="service-card">
                <div className="service-image-container">
                  <img src={workforceImg} alt="Workforce Management" className="service-icon-image" />
                </div>
                <h3>{t('homepage.services.workforce.title')}</h3>
                <p>{t('homepage.services.workforce.description')}</p>
                <NavLink to={`/${lang || 'en'}/workforce-management`} className="learn-more">
                  {t('common.learnMore')} →
                </NavLink>
              </div>
            </div>
          </div>
        </section>

        {/* Temporarily comment out Footer until it's fixed */}
        {/* <Footer /> */}
        <footer style={{ padding: "40px 20px", textAlign: "center", backgroundColor: "#f5f5f5" }}>
          <p>© 2024 PharmaSoft. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default Homepage;
