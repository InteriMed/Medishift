import { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Custom hook to generate dropdown options from translations
 * for use in profile components
 */
export const useDropdownOptions = () => {
  const { i18n, ready } = useTranslation(['dropdowns', 'common']);

  const dropdownTranslations = useMemo(() => {
    if (!ready) {
      if (process.env.NODE_ENV !== 'production') {
        console.debug('⏳ Waiting for translations to load...');
      }
      return {};
    }

    const translations = i18n.getResourceBundle(i18n.language, 'dropdowns');

    if (!translations || Object.keys(translations).length === 0) {
      console.warn(`⚠️ Dropdown translations not found for language: ${i18n.language}`);
      console.warn('Available languages:', i18n.languages);
      console.warn('Available namespaces:', i18n.options.ns);
      
      const fallbackTranslations = i18n.getResourceBundle(i18n.options.fallbackLng || 'en', 'dropdowns');
      if (fallbackTranslations && Object.keys(fallbackTranslations).length > 0) {
        console.warn('Using fallback language translations');
        return fallbackTranslations;
      }
      
      return {};
    }

    return translations;
  }, [i18n, ready]);

  /**
   * Helper function to directly generate dropdown options from translation entries
   * Creates an array of {value, label} objects from a translation object
   */
  const createOptionsFromObject = useCallback((translationKey) => {
    // Directly check in the loaded translations
    const translationObj = dropdownTranslations[translationKey];

    if (!translationObj || Object.keys(translationObj).length === 0) {
      console.warn(`⚠️ Translation object not found for key: ${translationKey}`);

      // Return at least an empty array to prevent errors
      return [];
    }

    // Convert the object entries to options array
    try {
      const options = Object.entries(translationObj).map(([value, label]) => ({
        value,  // Key becomes the option value (e.g., 'notApplicable')
        label  // Value becomes the visible label (e.g., 'Not Applicable (Swiss Citizen)')
      }));

      return options;
    } catch (err) {
      console.error(`Error creating options for ${translationKey}:`, err);
      return [];
    }
  }, [dropdownTranslations]);

  const optionSets = {
    workPermits: useMemo(() => createOptionsFromObject('workPermits'), [createOptionsFromObject]),
    countries: useMemo(() => createOptionsFromObject('countries'), [createOptionsFromObject]),
    cantons: useMemo(() => createOptionsFromObject('cantons'), [createOptionsFromObject]),
    education: useMemo(() => createOptionsFromObject('education'), [createOptionsFromObject]),
    contractTypes: useMemo(() => createOptionsFromObject('contractTypes'), [createOptionsFromObject]),
    availability: useMemo(() => createOptionsFromObject('availability'), [createOptionsFromObject]),
    jobRoles: useMemo(() => createOptionsFromObject('jobRoles'), [createOptionsFromObject]),
    skills: useMemo(() => createOptionsFromObject('skills'), [createOptionsFromObject]),
    languages: useMemo(() => createOptionsFromObject('languages'), [createOptionsFromObject]),
    jobPreferences: useMemo(() => createOptionsFromObject('jobPreferences'), [createOptionsFromObject]),
    facilityTypes: useMemo(() => createOptionsFromObject('facilityTypes'), [createOptionsFromObject]),
    phonePrefixes: useMemo(() => {
      const options = createOptionsFromObject('phonePrefixes');
      if (process.env.NODE_ENV !== 'production' && (!options || options.length === 0)) {
        console.warn('⚠️ phonePrefixes options are empty. Available translation keys:', Object.keys(dropdownTranslations));
        console.warn('⚠️ phonePrefixes translation object:', dropdownTranslations['phonePrefixes']);
      }
      return options;
    }, [createOptionsFromObject]),
  };

  // Create a standardized options object with consistent naming
  const allOptions = {
    // Standard suffixed versions
    workPermitsOptions: optionSets.workPermits,
    countriesOptions: optionSets.countries,
    cantonsOptions: optionSets.cantons,
    educationOptions: optionSets.education,
    contractTypesOptions: optionSets.contractTypes,
    availabilityOptions: optionSets.availability,
    jobRolesOptions: optionSets.jobRoles,
    skillsOptions: optionSets.skills,
    languagesOptions: optionSets.languages,
    jobPreferencesOptions: optionSets.jobPreferences,
    facilityTypesOptions: optionSets.facilityTypes,
    phonePrefixOptions: optionSets.phonePrefixes,

    // Legacy naming conventions (for backward compatibility)
    residencyPermitOptions: optionSets.workPermits,
    countryOptions: optionSets.countries,
    cantonOptions: optionSets.cantons,
    educationLevelOptions: optionSets.education
  };

  if (process.env.NODE_ENV !== 'production') {
    if (!allOptions.phonePrefixOptions || allOptions.phonePrefixOptions.length === 0) {
      console.error('❌ phonePrefixOptions is empty!');
      console.error('Current language:', i18n.language);
      console.error('Available translation keys:', Object.keys(dropdownTranslations));
      console.error('phonePrefixes translation:', dropdownTranslations['phonePrefixes']);
    }
  }

  return allOptions;
}; 