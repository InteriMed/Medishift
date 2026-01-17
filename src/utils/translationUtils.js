/**
 * Get translation with fallback to prevent showing translation keys
 * @param {Function} t - i18next translation function
 * @param {string} key - Translation key
 * @param {string} fallback - Fallback text if translation is missing
 * @returns {string} - Translated text or fallback
 */
export const getTranslation = (t, key, fallback) => {
  const translation = t(key);
  // If translation is the same as the key, it means it's missing
  return translation === key ? fallback || key : translation;
}; 