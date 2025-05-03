// Enhanced mock i18n implementation
const i18n = {
  language: 'en',
  t: (key) => key, // Just return the key as the translation
  changeLanguage: () => Promise.resolve(),
  use: function(plugin) {
    // Simply return this for method chaining
    console.log('i18n mock: plugin registered', plugin);
    return this;
  },
  init: function(config) {
    console.log('i18n mock: initialized with config', config);
    return this;
  },
  services: {
    languageDetector: {
      addDetector: (detector) => {
        console.log('i18n mock: detector added', detector);
      }
    }
  },
  options: {}
};

export const useTranslation = () => {
  return { 
    t: i18n.t, 
    i18n 
  };
};

export const initReactI18next = {
  type: 'i18next',
  init: () => i18n
};

export default i18n; 