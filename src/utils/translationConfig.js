/**
 * Translation Configuration and Helper Functions
 * 
 * This file provides documentation and helper functions for the i18next
 * translation system used throughout the application.
 */

import i18next from 'i18next';

/**
 * Translation Namespace Structure
 * 
 * Our application uses the following namespace structure:
 * 
 * - common: General translations used across the app
 * - auth: Authentication-related translations
 * - dashboard: Dashboard-specific translations
 * - contact: Contact page translations
 * - profile: User profile translations
 * - dropdowns: Dropdown options translations
 * - pages: Page-specific translations
 *   - home: Homepage translations
 *   - faq: FAQ page translations
 *   - blogArticles: Blog article translations
 * 
 * When accessing nested namespaces (like pages.home), use the dot notation
 * in the useTranslation hook: useTranslation('pages.home')
 */

/**
 * Generates dropdown options from translation keys
 * @param {string} namespace - The translation namespace (e.g., 'dropdowns.cantons')
 * @param {Object} translationObj - The translation object containing the keys and values
 * @returns {Array} - Array of option objects with value and label properties
 */
export const generateOptionsFromTranslations = (namespace, translationObj) => {
  const options = [];
  
  Object.keys(translationObj).forEach(key => {
    options.push({
      value: key,
      label: i18next.t(`${namespace}.${key}`, translationObj[key])
    });
  });
  
  return options;
};

/**
 * Gets the correct namespace for page translations
 * @param {string} pageName - The name of the page (e.g., 'home', 'faq')
 * @returns {string} - The full namespace path
 */
export const getPageNamespace = (pageName) => {
  return `pages.${pageName}`;
};

/**
 * Example usage in components:
 * 
 * // For a page component:
 * import { getPageNamespace } from '../utils/translationConfig';
 * const { t } = useTranslation(getPageNamespace('home'));
 * 
 * // For a general component:
 * const { t } = useTranslation('common');
 * 
 * // For a nested translation:
 * t('section.subsection.key')
 */ 