import React, { useState, useEffect } from 'react';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import { RxDashboard } from 'react-icons/rx';
import { IoCalendarClearOutline, IoSettingsOutline } from 'react-icons/io5';
import { LuMessageSquare } from 'react-icons/lu';
import { AiOutlineTeam } from 'react-icons/ai';
import { RiContactsBook2Line } from 'react-icons/ri';
import './styles/Homepage.css';
import partTimeImg from './assets/icons/chat copy.png';
import permanentImg from './assets/icons/clock.png';
import workforceImg from './assets/icons/setting.png';
import { useTranslation } from 'react-i18next';
import { NavLink, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

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
    }, isDeleting ? 60 : 90); // Faster speeds: 50ms for deletion, 100ms for typing

    return () => clearTimeout(timeout);
  }, [displayText, currentPhraseIndex, isDeleting]);

  return (
    <div className="bg-light-creme">
      <Helmet>
        <title>PharmaSoft - Pharmaceutical Job Listings & Marketplace</title>
        <meta name="description" content="Find the best pharmaceutical jobs, explore the marketplace, and manage your pharmacy or pharmacist profile with PharmaSoft. Join now!" />
        <meta property="og:title" content="PharmaSoft - Pharmaceutical Job Listings & Marketplace" />
        <meta property="og:description" content="Explore a wide range of pharmaceutical jobs, temporary and permanent staffing solutions, and a marketplace for pharmacies and pharmacists." />
        <meta property="og:image" content="/path-to-your-image.jpg" />
        <meta property="og:url" content="https://www.pharmasoft.com" />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <div className="content">
        <Header />

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
              <NavLink to={`/${lang}/signup`} className="hire-button">
                {t('homepage.hero.cta.hire')}
              </NavLink>
              <NavLink to={`/${lang}/how-it-works`} className="apply-button">
                {t('homepage.hero.cta.find')}
              </NavLink>
            </div>
            
            {/* Service Categories */}
            <div className="service-categories">
              <div className="category-icon">
                <RxDashboard size={24} />
                <span>Dashboard</span>
              </div>
              <div className="category-icon">
                <IoCalendarClearOutline size={24} />
                <span>Calendar</span>
              </div>
              <div className="category-icon">
                <LuMessageSquare size={24} />
                <span>Messages</span>
              </div>
              <div className="category-icon">
                <AiOutlineTeam size={24} />
                <span>HR Core</span>
              </div>
              <div className="category-icon">
                <RiContactsBook2Line size={24} />
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
                  <img src={partTimeImg} alt="Temporary Staffing for Pharmaceutical Professionals" className="service-icon-image" />
                </div>
                <h3>{t('homepage.services.temp.title')}</h3>
                <p>{t('homepage.services.temp.description')}</p>
                <NavLink to={`/${lang}/temp-staffing`} className="learn-more">
                  {t('common.learnMore')} →
                </NavLink>
              </div>
              <div className="service-card">
                <div className="service-image-container">
                  <img src={permanentImg} alt="Permanent Placement for Pharmacists and Pharmacies" className="service-icon-image" />
                </div>
                <h3>{t('homepage.services.permanent.title')}</h3>
                <p>{t('homepage.services.permanent.description')}</p>
                <NavLink to={`/${lang}/permanent-staffing`} className="learn-more">
                  {t('common.learnMore')} →
                </NavLink>
              </div>
              <div className="service-card">
                <div className="service-image-container">
                  <img src={workforceImg} alt="Workforce Management Solutions for Pharmacies" className="service-icon-image" />
                </div>
                <h3>{t('homepage.services.workforce.title')}</h3>
                <p>{t('homepage.services.workforce.description')}</p>
                <NavLink to={`/${lang}/workforce-management`} className="learn-more">
                  {t('common.learnMore')} →
                </NavLink>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="features-section">
          <div className="container">
            <h2 className="section-title">Why Choose PharmaSoft?</h2>
            <div className="features-grid">
              <div className="feature-item">
                <h3>Quick Matching</h3>
                <p>Find the right healthcare professional within 24 hours</p>
              </div>
              <div className="feature-item">
                <h3>Verified Professionals</h3>
                <p>All credentials and licenses thoroughly verified</p>
              </div>
              <div className="feature-item">
                <h3>Compliance Assured</h3>
                <p>Stay compliant with all healthcare regulations</p>
              </div>
              <div className="feature-item">
                <h3>24/7 Support</h3>
                <p>Round-the-clock assistance for urgent staffing needs</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section">
          <div className="container">
            <div className="cta-content">
              <h2>Ready to Transform Your Healthcare Staffing?</h2>
              <p>Join thousands of healthcare facilities and professionals using our platform.</p>
              <div className="cta-buttons">
                <a href="/employers" className="hire-button">For Employers</a>
                <a href="/professionals" className="apply-button">For Professionals</a>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
};

export default Homepage;
