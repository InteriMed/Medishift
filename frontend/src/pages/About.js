import React from 'react';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

const About = () => {
  const { t } = useTranslation();
  
  return (
    <div className="about-page">
      <Helmet>
        <title>{t('about.meta.title', 'About PharmaSoft - Revolutionizing Pharmaceutical Staffing & Solutions')}</title>
        <meta name="description" content={t('about.meta.description', 'PharmaSoft connects healthcare professionals with pharmacies, offering job listings, staffing solutions, and a marketplace for collaboration.')} />
        <meta property="og:title" content={t('about.meta.ogTitle', 'About PharmaSoft - Revolutionizing Pharmaceutical Staffing & Solutions')} />
        <meta property="og:description" content={t('about.meta.ogDescription', 'Explore PharmaSoft\'s mission, values, and services in pharmaceutical staffing and job listings.')} />
        <meta property="og:image" content="/path-to-your-image.jpg" />
        <meta property="og:url" content="https://www.pharmasoft.com/about" />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <div className="content">
        <Header />

        {/* About Section */}
        <section className="about-section">
          <div className="container">
            <h1 className="about-title">{t('about.title', 'About PharmaSoft')}</h1>
            <p className="about-introduction">
              {t('about.introduction', 'PharmaSoft is an innovative platform connecting healthcare professionals with pharmacies, offering reliable pharmaceutical staffing solutions, job listings, and marketplace opportunities. Our team, composed of dedicated pharmacists, is passionate about creating a thriving environment where pharmacists can excel and healthcare professionals can find fulfilling work opportunities. We are committed to fostering a culture that values freedom of work, allowing professionals to choose roles that best suit their skills and aspirations.')}
            </p>
            <h2 className="mission-title">{t('about.mission.title', 'Our Mission')}</h2>
            <p className="mission-description">
              {t('about.mission.description', 'Our mission is to provide the pharmaceutical industry with top talent, simplifying staffing and recruitment for pharmacies and healthcare professionals. We foster a reliable, compliant, and well-managed workforce to enhance healthcare delivery worldwide.')}
            </p>

            <h2 className="vision-title">{t('about.vision.title', 'Our Vision')}</h2>
            <p className="vision-description">
              {t('about.vision.description', 'We aim to create a seamless ecosystem for pharmacies and healthcare professionals to connect, collaborate, and build long-term relationships. Our vision is to be the leading platform for pharmaceutical staffing solutions and job listings globally.')}
            </p>

            <h2 className="services-title">{t('about.services.title', 'What We Offer')}</h2>
            <div className="services-offered">
              <div className="service-item">
                <h3>{t('about.services.jobListings.title', 'Job Listings')}</h3>
                <p>{t('about.services.jobListings.description', 'Browse the latest job openings in the pharmaceutical industry. Whether you\'re a pharmacist, pharmacy assistant, or looking for an internship, PharmaSoft has opportunities for everyone.')}</p>
              </div>
              <div className="service-item">
                <h3>{t('about.services.staffing.title', 'Temporary & Permanent Staffing')}</h3>
                <p>{t('about.services.staffing.description', 'Find temporary or permanent staffing solutions tailored to your pharmacy\'s needs. We provide quick and reliable matching of professionals to meet your operational requirements.')}</p>
              </div>
              <div className="service-item">
                <h3>{t('about.services.marketplace.title', 'Marketplace')}</h3>
                <p>{t('about.services.marketplace.description', 'PharmaSoft offers a marketplace for pharmacies and pharmacists to interact, collaborate, and expand their professional networks. It\'s an all-in-one platform to foster business relationships.')}</p>
              </div>
            </div>

            <h2 className="core-values-title">{t('about.coreValues.title', 'Our Core Values')}</h2>
            <div className="core-values">
              <div className="core-value-item">
                <h3>{t('about.coreValues.integrity.title', 'Integrity')}</h3>
                <p>{t('about.coreValues.integrity.description', 'We are committed to transparency, ethics, and honesty in everything we do.')}</p>
              </div>
              <div className="core-value-item">
                <h3>{t('about.coreValues.innovation.title', 'Innovation')}</h3>
                <p>{t('about.coreValues.innovation.description', 'We continuously innovate to ensure our platform provides the best experience for our users.')}</p>
              </div>
              <div className="core-value-item">
                <h3>{t('about.coreValues.excellence.title', 'Excellence')}</h3>
                <p>{t('about.coreValues.excellence.description', 'We aim for the highest standards in quality and service delivery, ensuring satisfaction for all stakeholders.')}</p>
              </div>
            </div>

            <h2 className="team-title">{t('about.team.title', 'Meet Our Team')}</h2>
            <p className="team-description">
              {t('about.team.description', 'Our team consists of experienced pharmacists and industry experts who are deeply committed to revolutionizing the pharmaceutical staffing landscape. With a profound understanding of the challenges faced by both pharmacies and healthcare professionals, we strive to provide innovative solutions that enhance job satisfaction and operational efficiency. We believe in empowering pharmacists and healthcare professionals by offering flexible work arrangements and opportunities for professional growth, ensuring a balanced and rewarding career path.')}
            </p>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
};

export default About;
