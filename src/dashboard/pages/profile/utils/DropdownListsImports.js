import { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Custom hook to generate dropdown options from translations
 * for use in profile components
 */
export const useDropdownOptions = () => {
  const { i18n } = useTranslation(['dropdowns', 'common']);

  // Get the current language's dropdown translations
  const dropdownTranslations = useMemo(() => {
    // Try to get from 'dropdowns' namespace first
    const translations = i18n.getResourceBundle(i18n.language, 'dropdowns');

    if (!translations || Object.keys(translations).length === 0) {
      console.warn(`⚠️ Dropdown translations not found for language: ${i18n.language}`);
      return {};
    }

    return translations;
  }, [i18n]);

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

      // Log the created options for debugging
      if (process.env.NODE_ENV !== 'production') {
        console.debug(`Created ${options.length} options for ${translationKey}`);
      }

      return options;
    } catch (err) {
      console.error(`Error creating options for ${translationKey}:`, err);
      return [];
    }
  }, [dropdownTranslations]);

  // Define all the options sets we need in our application
  const optionSets = {
    // Basic information options
    workPermits: useMemo(() => createOptionsFromObject('workPermits'), [createOptionsFromObject]),
    countries: useMemo(() => createOptionsFromObject('countries'), [createOptionsFromObject]),
    cantons: useMemo(() => createOptionsFromObject('cantons'), [createOptionsFromObject]),

    // Professional options 
    education: useMemo(() => createOptionsFromObject('education'), [createOptionsFromObject]),
    contractTypes: useMemo(() => createOptionsFromObject('contractTypes'), [createOptionsFromObject]),
    availability: useMemo(() => createOptionsFromObject('availability'), [createOptionsFromObject]),
    jobRoles: useMemo(() => createOptionsFromObject('jobRoles'), [createOptionsFromObject]),
    skills: useMemo(() => createOptionsFromObject('skills'), [createOptionsFromObject]),
    languages: useMemo(() => createOptionsFromObject('languages'), [createOptionsFromObject]),
    jobPreferences: useMemo(() => createOptionsFromObject('jobPreferences'), [createOptionsFromObject]),
    phonePrefixes: useMemo(() => createOptionsFromObject('phonePrefixes'), [createOptionsFromObject]),
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
    phonePrefixOptions: optionSets.phonePrefixes,

    // Legacy naming conventions (for backward compatibility)
    residencyPermitOptions: optionSets.workPermits,
    countryOptions: optionSets.countries,
    cantonOptions: optionSets.cantons,
    educationLevelOptions: optionSets.education
  };

  // Log stats in development mode
  if (process.env.NODE_ENV !== 'production') {
    const stats = Object.entries(allOptions)
      .map(([key, options]) => ({ key, count: options?.length || 0 }))
      .filter(item => item.count > 0);

    if (stats.length > 0) {
      // console.debug('✅ Loaded dropdown options:', stats);
    } else {
      // console.warn('⚠️ No dropdown options were loaded');
    }
  }

  return allOptions;
}; 