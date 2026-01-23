import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

// Mapping of namespaces to file paths in public/locales/{{lng}}/
// All paths now in pages/ or dashboard/ folders
const nsMapping = {
  home: 'pages/home',
  blog: 'pages/blog',
  about: 'pages/about',
  faq: 'pages/faq',
  facilities: 'pages/facilities',
  professionals: 'pages/professionals',
  blogArticles: 'pages/blog',
  contact: 'pages/contact',
  privacy: 'legal/privacy',
  terms: 'legal/terms',
  support: 'support',
  sitemap: 'pages/sitemap',
  notFound: 'pages/notFound',
  auth: 'pages/auth/auth',
  onboarding: 'pages/onboarding/onboarding',
  admin: 'dashboard/admin',
  dashboard: 'dashboard/dashboard',
  calendar: 'dashboard/calendar',
  dashboardPersonal: 'dashboard/personalDashboard',
  dashboardProfile: 'dashboard/profile',
  messages: 'dashboard/messages',
  marketplace: 'dashboard/marketplace',
  organization: 'dashboard/organization',
  payroll: 'dashboard/payroll',
  contracts: 'dashboard/contracts',
  team: 'dashboard/team',
  validation: 'dashboard/validation',
  common: 'dashboard/common',
  dropdowns: 'dropdowns',
  'pages/faq': 'pages/faq',
  tutorial: 'config/tutorial'
};

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'fr',
    lng: 'fr', // Default language
    debug: false,

    backend: {
      loadPath: (lng, ns) => {
        const path = nsMapping[ns] || ns;
        return `/locales/${lng}/${path}.json`;
      }
    },

    interpolation: {
      escapeValue: false, // react already safes from xss
    },

    ns: ['home', 'about', 'pages/faq', 'facilities', 'professionals',
      'blogArticles', 'contact', 'privacy', 'terms', 'sitemap', 'support', 'auth', 'onboarding',
      'dashboard', 'dashboardPersonal', 'dashboardProfile', 'admin', 'calendar', 'messages',
      'marketplace', 'validation', 'organization', 'payroll', 'contracts', 'team', 'common', 'dropdowns',
      'notFound', 'tutorial'],

    defaultNS: 'dashboard',

    react: {
      useSuspense: true, // Enable suspense for loading
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
    onboarding: 'onboarding',
    notFound: 'not-found'
  },
  fr: {
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
    onboarding: 'onboarding',
    notFound: 'not-found'
  },
  de: {
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
    onboarding: 'onboarding',
    notFound: 'not-found'
  },
  it: {
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
    onboarding: 'onboarding',
    notFound: 'not-found'
  }
};

// Helper function to get localized route
export const getLocalizedRoute = (routeName, language = i18n.language) => {
  const lang = routeMappings[language] ? language : 'en';
  const route = routeMappings[lang][routeName] || routeName;
  return route;
};

export default i18n;