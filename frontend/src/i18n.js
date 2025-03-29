import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationEN from './translations/en.json';
import translationFR from './translations/fr.json';
import translationDE from './translations/de.json';
import translationIT from './translations/it.json';

const resources = {
  en: {
    translation: translationEN
  },
  fr: {
    translation: translationFR
  },
  de: {
    translation: translationDE
  },
  it: {
    translation: translationIT
  }
};

// Custom language detector that only looks at the first path segment
const customPathDetector = {
  name: 'customPath',
  lookup(options) {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const pathSegments = path.split('/').filter(segment => segment);
      
      if (pathSegments.length > 0) {
        const firstSegment = pathSegments[0];
        const supportedLanguages = options.supportedLngs || ['en', 'fr', 'de', 'it'];
        
        if (supportedLanguages.includes(firstSegment)) {
          return firstSegment;
        }
      }
    }
    return undefined;
  },
  cacheUserLanguage(lng) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('i18nextLng', lng);
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'fr', 'de', 'it'],
    interpolation: {
      escapeValue: false
    },
    detection: {
      // Use custom path detector first, then fallback to other methods
      order: ['customPath', 'localStorage', 'navigator'],
      lookupFromPathIndex: 0,
      checkWhitelist: true,
      caches: ['localStorage'],
      lookupCookie: 'i18next',
      lookupLocalStorage: 'i18nextLng',
      
      // This is important to prevent duplicate language codes
      cleanPathLookupParams: true
    }
  });

// Register custom detector
i18n.services.languageDetector.addDetector(customPathDetector);

// Helper function to change language and redirect
export const changeLanguage = (lng, currentPath) => {
  i18n.changeLanguage(lng);
  
  if (typeof window !== 'undefined') {
    const pathSegments = window.location.pathname.split('/').filter(segment => segment);
    const supportedLangs = ['en', 'fr', 'de', 'it'];
    
    if (pathSegments.length > 0 && supportedLangs.includes(pathSegments[0])) {
      // Replace first segment with new language
      pathSegments[0] = lng;
    } else {
      // Add language as first segment
      pathSegments.unshift(lng);
    }
    
    window.location.pathname = '/' + pathSegments.join('/');
  }
};

export default i18n; 