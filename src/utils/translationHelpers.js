import i18next from 'i18next';

/**
 * Generates dropdown options from translation namespace
 * @param {Function} t - Translation function from useTranslation
 * @param {String} path - Path to the translations (e.g., 'dropdowns:cantons')
 * @returns {Array} Array of options with value and label
 */
export const generateOptionsFromTranslations = (t, path) => {
  const [namespace, key] = path.split(':');
  
  // Get all keys that start with the specified path
  const keys = Object.keys(i18next.getResourceBundle(i18next.language, namespace) || {})
    .filter(k => k.startsWith(`${key}.`))
    .map(k => k.replace(`${key}.`, ''));
  
  // Create options array
  return keys.map(k => ({
    value: k,
    label: t(`${path}.${k}`)
  }));
}; 