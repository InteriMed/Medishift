import en from './en.json';
import fr from './fr.json';
import de from './de.json';
import it from './it.json';

const translations = { en, fr, de, it };

export const getTranslation = (lang = 'en') => {
  return translations[lang] || translations.en;
};

export const t = (key, lang = 'en', defaultValue = '') => {
  const translation = getTranslation(lang);
  const keys = key.split('.');
  let value = translation;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return defaultValue || key;
    }
  }
  
  return typeof value === 'string' ? value : defaultValue || key;
};

export default translations;

