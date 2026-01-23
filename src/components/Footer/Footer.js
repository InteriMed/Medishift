import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import Cookies from 'js-cookie';
import { COOKIE_KEYS, COOKIE_CONFIG } from '../../config/keysDatabase';
import newsletterService from '../../services/newsletterService';
import { FaLinkedin, FaTwitter, FaFacebook } from 'react-icons/fa';

function Footer() {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const currentLang = i18n.language;
  const [email, setEmail] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    const currentPath = window.location.pathname.split('/').slice(2).join('/');
    navigate(`/${lng}/${currentPath}`);
  };

  useEffect(() => {
    checkRateLimit();
  }, []);

  const checkRateLimit = () => {
    const lastSubscriptionTime = parseInt(Cookies.get(COOKIE_KEYS.NEWSLETTER_LAST_SUBSCRIPTION_TIME) || '0');
    const currentTime = Date.now();

    if (currentTime - lastSubscriptionTime > 3600000) {
      Cookies.set(COOKIE_KEYS.NEWSLETTER_SUBSCRIPTION_COUNT, '0', { expires: COOKIE_CONFIG.NEWSLETTER_EXPIRY_DAYS });
      Cookies.set(COOKIE_KEYS.NEWSLETTER_LAST_SUBSCRIPTION_TIME, currentTime.toString(), { expires: COOKIE_CONFIG.NEWSLETTER_EXPIRY_DAYS });
    }
  };

  const handleSubscribe = async (e) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      setSubscriptionStatus(t('footer.newsletter.invalidEmail'));
      return;
    }

    const subscriptionCount = parseInt(Cookies.get(COOKIE_KEYS.NEWSLETTER_SUBSCRIPTION_COUNT) || '0');
    const currentTime = Date.now();

    if (subscriptionCount >= 3) {
      setSubscriptionStatus(t('footer.newsletter.rateLimitExceeded'));
      return;
    }

    setIsSubmitting(true);

    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      const ipAddress = ipData.ip;

      const userAgent = navigator.userAgent;
      const language = navigator.language;

      await newsletterService.subscribeToNewsletter(email, {
        ipAddress,
        userAgent,
        language,
        referrer: document.referrer || 'direct',
        path: window.location.pathname,
        locale: currentLang
      });

      Cookies.set(COOKIE_KEYS.NEWSLETTER_SUBSCRIPTION_COUNT, (subscriptionCount + 1).toString(), { expires: COOKIE_CONFIG.NEWSLETTER_EXPIRY_DAYS });
      Cookies.set(COOKIE_KEYS.NEWSLETTER_LAST_SUBSCRIPTION_TIME, currentTime.toString(), { expires: COOKIE_CONFIG.NEWSLETTER_EXPIRY_DAYS });

      setEmail('');
      setSubscriptionStatus(t('footer.newsletter.success'));

      setTimeout(() => {
        setSubscriptionStatus('');
      }, 3000);

    } catch (error) {
      console.error('Error subscribing to newsletter:', error);
      setSubscriptionStatus(t('footer.newsletter.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="bg-secondary text-slate-400 pt-20 pb-10 relative overflow-hidden">

      <div className="w-full max-w-[1400px] mx-auto px-6 lg:px-8 relative z-10">
        <div className="mb-20 pb-16 border-b border-slate-800">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="font-bold text-3xl mb-4 text-white">{t('footer.newsletter.title')}</h3>
            <p className="text-slate-400 mb-10 text-lg">{t('footer.newsletter.consent')}</p>
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto items-stretch">
              <input
                type="email"
                placeholder={t('footer.newsletter.placeholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                className="flex-1 px-6 py-4 rounded-xl border border-slate-700 bg-slate-800/50 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all backdrop-blur-sm"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-white hover:shadow-lg hover:shadow-primary/25 px-8 py-4 rounded-xl font-bold transition-all disabled:opacity-50 whitespace-nowrap hover-lift"
              >
                {isSubmitting ? t('footer.newsletter.submitting') : t('footer.newsletter.subscribe')}
              </button>
            </form>
            {subscriptionStatus && <p className="mt-4 text-sm text-primary font-medium">{subscriptionStatus}</p>}
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-12 lg:gap-16 mb-16">
          <div className="md:col-span-1">
            <div className="mb-6">
              <span className="text-2xl font-extrabold text-white tracking-tight">{t('footer.brand.name')}<span className="text-primary">{t('footer.brand.highlight')}</span></span>
            </div>
            <p className="text-sm leading-relaxed mb-6">
              {t('footer.brand.tagline')}
            </p>
          </div>

          <div className="flex flex-col">
            <h4 className="font-bold mb-6 text-lg text-white">{t('footer.links.companies')}</h4>
            <ul className="space-y-4 text-base list-none">
              <li><Link to={`/${currentLang}/facilities`} className="text-white hover:text-white transition-colors">{t('footer.links.pharmacy')}</Link></li>
              <li><span className="opacity-50 cursor-not-allowed">{t('footer.links.soon')}</span></li>
              <li><Link to={`/${currentLang}/faq`} className="text-white hover:text-white transition-colors">{t('footer.links.faqCompany')}</Link></li>
            </ul>
          </div>
          <div className="flex flex-col">
            <h4 className="font-bold mb-6 text-lg text-white">{t('footer.links.tempWorkers')}</h4>
            <ul className="space-y-4 text-base list-none">
              <li><Link to={`/${currentLang}/professionals`} className="text-white hover:text-white transition-colors">{t('footer.links.pharmacyDoctor')}</Link></li>
              <li><Link to={`/${currentLang}/professionals`} className="text-white hover:text-white transition-colors">{t('footer.links.pharmacyTechnician')}</Link></li>
              <li><span className="opacity-50 cursor-not-allowed">{t('footer.links.soon')}</span></li>
              <li><Link to={`/${currentLang}/faq`} className="text-white hover:text-white transition-colors">{t('footer.links.faqCandidate')}</Link></li>
            </ul>
          </div>
          <div className="flex flex-col">
            <h4 className="font-bold mb-6 text-lg text-white">{t('footer.links.practical')}</h4>
            <ul className="space-y-4 text-base list-none">
              <li><Link to={`/${currentLang}/about`} className="text-white hover:text-white transition-colors">{t('footer.links.about')}</Link></li>
              <li><Link to={`/${currentLang}/blog`} className="text-white hover:text-white transition-colors">{t('footer.links.press')}</Link></li>
              <li><Link to={`/${currentLang}/privacy-policy`} className="text-white hover:text-white transition-colors">{t('footer.links.legalNotice')}</Link></li>
              <li><Link to={`/${currentLang}/terms-of-service`} className="text-white hover:text-white transition-colors">{t('footer.links.terms')}</Link></li>
              <li><Link to={`/${currentLang}/contact`} className="text-white hover:text-white transition-colors">{t('footer.links.contact')}</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-sm">
            <div className="flex flex-col md:flex-row items-center gap-4 order-2 md:order-1 opacity-60">
              <p>{t('footer.copyright')}</p>
            </div>

            <div className="flex items-center gap-8 order-1 md:order-2">
              <div className="flex items-center gap-4">
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary hover:text-white transition-all hover:scale-110">
                  <FaLinkedin size={18} />
                </a>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary hover:text-white transition-all hover:scale-110">
                  <FaTwitter size={18} />
                </a>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary hover:text-white transition-all hover:scale-110">
                  <FaFacebook size={18} />
                </a>
              </div>
              <div className="w-px h-6 bg-slate-700 hidden md:block"></div>
              <div className="flex items-center gap-3 bg-slate-800 p-1 rounded-lg">
                <button
                  onClick={() => changeLanguage('en')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${currentLang === 'en' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  EN
                </button>
                <button
                  onClick={() => changeLanguage('fr')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${currentLang === 'fr' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  FR
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
