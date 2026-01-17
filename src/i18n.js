import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

// English locales
import authEN from './locales/en/auth.json';
import homeEN from './locales/en/pages/home.json';
import blogEN from './locales/en/pages/blog.json';
import aboutEN from './locales/en/pages/about.json';
import faqEN from './locales/en/pages/faq.json';
import facilitiesEN from './locales/en/pages/facilities.json';
import professionalsEN from './locales/en/pages/professionals.json';
import calendarEN from './locales/en/dashboard/calendar.json';
import blogArticlesEN from './locales/en/pages/blog.json';
import contactEN from './locales/en/pages/contact.json';
import privacyEN from './locales/en/legal/privacy.json';
import termsEN from './locales/en/legal/terms.json';
import commonEN from './locales/en/common.json';
import dropdownsEN from './locales/en/dropdowns.json'; // Import the dropdowns translations
import validationEN from './locales/en/validation.json';

import dashboardEN from './locales/en/dashboard/dashboard.json';
import dashboardPersonalEN from './locales/en/dashboard/personalDashboard.json';
import dashboardProfileEN from './locales/en/dashboard/profile.json';
import messagesEN from './locales/en/dashboard/messages.json';
import marketplaceEN from './locales/en/dashboard/marketplace.json';
import organizationEN from './locales/en/dashboard/organization.json';
import payrollEN from './locales/en/dashboard/payroll.json';
import contractsEN from './locales/en/dashboard/contracts.json';

// French locales (assuming same structure under './locales/fr/')
import authFR from './locales/fr/auth.json';
import homeFR from './locales/fr/pages/home.json';
import blogFR from './locales/fr/pages/blog.json';
import aboutFR from './locales/fr/pages/about.json';
import faqFR from './locales/fr/pages/faq.json';
import facilitiesFR from './locales/fr/pages/facilities.json';
import professionalsFR from './locales/fr/pages/professionals.json';
import calendarFR from './locales/fr/dashboard/calendar.json';
import blogArticlesFR from './locales/fr/pages/blog.json';
import contactFR from './locales/fr/pages/contact.json';
import privacyFR from './locales/fr/legal/privacy.json';
import termsFR from './locales/fr/legal/terms.json';
import commonFR from './locales/fr/common.json';
import dropdownsFR from './locales/fr/dropdowns.json'; // Import the dropdowns translations
import validationFR from './locales/fr/validation.json';

import dashboardFR from './locales/fr/dashboard/dashboard.json';
import dashboardPersonalFR from './locales/fr/dashboard/personalDashboard.json';
import dashboardProfileFR from './locales/fr/dashboard/profile.json';
import marketplaceFR from './locales/fr/dashboard/marketplace.json';
import messagesFR from './locales/fr/dashboard/messages.json';
import organizationFR from './locales/fr/dashboard/organization.json';
import payrollFR from './locales/fr/dashboard/payroll.json';
import contractsFR from './locales/fr/dashboard/contracts.json';

// German locales
import authDE from './locales/de/auth.json';
import homeDE from './locales/de/pages/home.json';
import blogDE from './locales/de/pages/blog.json';
import aboutDE from './locales/de/pages/about.json';
import faqDE from './locales/de/pages/faq.json';
import facilitiesDE from './locales/de/pages/facilities.json';
import professionalsDE from './locales/de/pages/professionals.json';
import calendarDE from './locales/de/dashboard/calendar.json';
import contactDE from './locales/de/pages/contact.json';
import termsDE from './locales/de/legal/terms.json';
import commonDE from './locales/de/common.json';
import dropdownsDE from './locales/de/dropdowns.json';
import validationDE from './locales/de/validation.json';
import dashboardDE from './locales/de/dashboard/dashboard.json';
import dashboardPersonalDE from './locales/de/dashboard/personalDashboard.json';
import dashboardProfileDE from './locales/de/dashboard/profile.json';
import marketplaceDE from './locales/de/dashboard/marketplace.json';
import messagesDE from './locales/de/dashboard/messages.json';
import organizationDE from './locales/de/dashboard/organization.json';
import payrollDE from './locales/de/dashboard/payroll.json';
import contractsDE from './locales/de/dashboard/contracts.json';

// Italian locales
import authIT from './locales/it/auth.json';
import homeIT from './locales/it/pages/home.json';
import blogIT from './locales/it/pages/blog.json';
import aboutIT from './locales/it/pages/about.json';
import faqIT from './locales/it/pages/faq.json';
import facilitiesIT from './locales/it/pages/facilities.json';
import professionalsIT from './locales/it/pages/professionals.json';
import calendarIT from './locales/it/dashboard/calendar.json';
import contactIT from './locales/it/pages/contact.json';
import termsIT from './locales/it/legal/terms.json';
import commonIT from './locales/it/common.json';
import dropdownsIT from './locales/it/dropdowns.json';
import validationIT from './locales/it/validation.json';
import dashboardIT from './locales/it/dashboard/dashboard.json';
import dashboardPersonalIT from './locales/it/dashboard/personalDashboard.json';
import dashboardProfileIT from './locales/it/dashboard/profile.json';
import marketplaceIT from './locales/it/dashboard/marketplace.json';
import messagesIT from './locales/it/dashboard/messages.json';
import organizationIT from './locales/it/dashboard/organization.json';
import payrollIT from './locales/it/dashboard/payroll.json';
import contractsIT from './locales/it/dashboard/contracts.json';

const resources = {
  en: {
    home: homeEN,
    blog: blogEN,
    about: aboutEN,
    faq: faqEN,
    facilities: facilitiesEN,
    professionals: professionalsEN,
    blogArticles: blogArticlesEN, // Ensure this is the correct variable if different from blogEN
    contact: contactEN,
    privacy: privacyEN,
    terms: termsEN,
    common: commonEN,
    dashboard: dashboardEN,
    calendar: calendarEN,
    dashboardPersonal: dashboardPersonalEN,
    dashboardProfile: dashboardProfileEN,
    messages: messagesEN,
    auth: authEN,
    dropdowns: dropdownsEN,
    validation: validationEN,
    'pages/faq': faqEN,
    marketplace: marketplaceEN,
    organization: organizationEN,
    payroll: payrollEN,
    contracts: contractsEN,
  },
  fr: { // Adding French resources
    home: homeFR,
    blog: blogFR,
    about: aboutFR,
    faq: faqFR,
    facilities: facilitiesFR,
    professionals: professionalsFR,
    blogArticles: blogArticlesFR, // Ensure this is the correct variable
    contact: contactFR,
    privacy: privacyFR,
    terms: termsFR,
    common: commonFR,
    dashboard: dashboardFR,
    calendar: calendarFR,
    dashboardPersonal: dashboardPersonalFR,
    dashboardProfile: dashboardProfileFR,
    messages: messagesFR,
    auth: authFR,
    dropdowns: dropdownsFR,
    validation: validationFR,
    'pages/faq': faqFR,
    marketplace: marketplaceFR,
    organization: organizationFR,
    payroll: payrollFR,
    contracts: contractsFR,
  },
  de: { // German resources
    home: homeDE,
    blog: blogDE,
    about: aboutDE,
    faq: faqDE,
    facilities: facilitiesDE,
    professionals: professionalsDE,
    blogArticles: blogDE,
    contact: contactDE,
    privacy: privacyEN, // Using English until German is available
    terms: termsDE,
    common: commonDE,
    dashboard: dashboardDE,
    calendar: calendarDE,
    dashboardPersonal: dashboardPersonalDE,
    dashboardProfile: dashboardProfileDE,
    messages: messagesDE,
    auth: authDE,
    dropdowns: dropdownsDE,
    validation: validationDE,
    'pages/faq': faqDE,
    marketplace: marketplaceDE,
    organization: organizationDE,
    payroll: payrollDE,
    contracts: contractsDE,
  },
  it: { // Italian resources
    home: homeIT,
    blog: blogIT,
    about: aboutIT,
    faq: faqIT,
    facilities: facilitiesIT,
    professionals: professionalsIT,
    blogArticles: blogIT,
    contact: contactIT,
    privacy: privacyEN, // Using English until Italian is available
    terms: termsIT,
    common: commonIT,
    dashboard: dashboardIT,
    calendar: calendarIT,
    dashboardPersonal: dashboardPersonalIT,
    dashboardProfile: dashboardProfileIT,
    messages: messagesIT,
    auth: authIT,
    dropdowns: dropdownsIT,
    validation: validationIT,
    'pages/faq': faqIT,
    marketplace: marketplaceIT,
    organization: organizationIT,
    payroll: payrollIT,
    contracts: contractsIT,
  }
};

i18n
  // detect user language
  // learn more: https://github.com/i18next/i18next-browser-languageDetector
  .use(Backend)
  .use(LanguageDetector)
  // pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // init i18next
  // for all options read: https://www.i18next.com/overview/configuration-options
  .init({
    resources,
    lng: 'fr', // Changed from 'en' to 'fr' to set default language to French
    fallbackLng: 'fr', // Changed from 'en' to 'fr' to use French as fallback
    debug: process.env.NODE_ENV === 'development',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    ns: ['translations', 'home', 'about', 'pages/faq', 'facilities', 'professionals',
      'blogArticles', 'contact', 'privacy', 'terms', 'sitemap', 'support', 'common', 'auth',
      'dashboard', 'dashboardPersonal', 'dashboardProfile', 'calendar', 'dropdowns', 'messages',
      'marketplace', 'validation', 'organization', 'payroll', 'contracts'],
    defaultNS: 'common', // Set common as default namespace
    react: {
      useSuspense: false,
    },
    returnObjects: true,
  });

// Define route mappings for each language
export const routeMappings = {
  en: {
    home: 'home',
    about: 'about',
    professionals: 'professionals',
    facilities: 'facilities',
    'healthcare facilities': 'healthcare facilities',
    faq: 'faq',
    contact: 'contact',
    blog: 'blog',
    privacy: 'privacy-policy',
    terms: 'terms-of-service',
    sitemap: 'sitemap',
    login: 'login',
    signup: 'signup',
    forgotPassword: 'forgot-password',
    dashboard: 'dashboard',
    loading: 'loading',
    notFound: 'not-found'
  },
  fr: {
    // Using English route names for consistency across languages
    home: 'home',
    about: 'about',
    professionals: 'professionals',
    facilities: 'facilities',
    'healthcare facilities': 'healthcare facilities',
    faq: 'faq',
    contact: 'contact',
    blog: 'blog',
    privacy: 'privacy-policy',
    terms: 'terms-of-service',
    sitemap: 'sitemap',
    login: 'login',
    signup: 'signup',
    forgotPassword: 'forgot-password',
    dashboard: 'dashboard',
    loading: 'loading',
    notFound: 'not-found'
  },
  de: {
    // Using English route names for consistency across languages
    home: 'home',
    about: 'about',
    professionals: 'professionals',
    facilities: 'facilities',
    'healthcare facilities': 'healthcare facilities',
    faq: 'faq',
    contact: 'contact',
    blog: 'blog',
    privacy: 'privacy-policy',
    terms: 'terms-of-service',
    sitemap: 'sitemap',
    login: 'login',
    signup: 'signup',
    forgotPassword: 'forgot-password',
    dashboard: 'dashboard',
    loading: 'loading',
    notFound: 'not-found'
  },
  it: {
    // Using English route names for consistency across languages
    home: 'home',
    about: 'about',
    professionals: 'professionals',
    facilities: 'facilities',
    'healthcare facilities': 'healthcare facilities',
    faq: 'faq',
    contact: 'contact',
    blog: 'blog',
    privacy: 'privacy-policy',
    terms: 'terms-of-service',
    sitemap: 'sitemap',
    login: 'login',
    signup: 'signup',
    forgotPassword: 'forgot-password',
    dashboard: 'dashboard',
    loading: 'loading',
    notFound: 'not-found'
  }
};

// Helper function to get localized route
export const getLocalizedRoute = (routeName, language = i18n.language) => {
  const lang = routeMappings[language] ? language : 'en';
  const route = routeMappings[lang][routeName] || routeName;
  return route;
};

// Consider how you want to handle routes for different languages.
// Hardcoding '/en/' might not be ideal for a multilingual app.
// You might use a prefix from i18n.language or a routing library that supports localization.

export default i18n;