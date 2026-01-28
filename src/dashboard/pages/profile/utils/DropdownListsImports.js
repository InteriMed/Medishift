import { useTranslation } from 'react-i18next';

const DROPDOWN_FALLBACK = {
  phonePrefixes: {},
  cantons: {},
  nationality: {},
  gender: {},
  facilityTypes: {}
};

export const useDropdownOptions = () => {
  const { t } = useTranslation(['dropdowns']);
  
  const getDropdownData = (key) => {
    try {
      const data = t(key, { returnObjects: true });
      if (data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length > 0) {
        return data;
      }
    } catch (error) {
      console.warn(`Failed to load dropdown data for key "${key}":`, error);
    }
    return DROPDOWN_FALLBACK[key] || {};
  };

  const phonePrefixOptions = Object.entries(getDropdownData('phonePrefixes')).map(([value, label]) => ({
    value,
    label
  }));

  const cantonOptions = Object.entries(getDropdownData('cantons')).map(([value, label]) => ({
    value,
    label
  }));

  const nationalityOptions = Object.entries(getDropdownData('nationality')).map(([value, label]) => ({
    value,
    label
  }));

  const genderOptions = Object.entries(getDropdownData('gender')).map(([value, label]) => ({
    value,
    label
  }));

  const facilityTypeOptions = Object.entries(getDropdownData('facilityTypes')).map(([value, label]) => ({
    value,
    label
  }));

  const idDocumentTypeData = getDropdownData('idDocumentTypes');
  const idDocumentTypeOptions = Object.entries(idDocumentTypeData).map(([value, label]) => ({
    value,
    label
  }));

  const profileDocumentTypeData = getDropdownData('profileDocumentTypes');
  const profileDocumentTypeOptions = Object.entries(profileDocumentTypeData).map(([value, label]) => ({
    value,
    label
  }));

  const medicalProfessionData = getDropdownData('medicalProfessions');
  const medicalProfessionOptions = Object.entries(medicalProfessionData).map(([key, label]) => ({
    value: label,
    label: label
  })).sort((a, b) => a.label.localeCompare(b.label));

  return {
    phonePrefixOptions,
    cantonOptions,
    nationalityOptions,
    genderOptions,
    facilityTypeOptions,
    idDocumentTypeOptions,
    profileDocumentTypeOptions,
    medicalProfessionOptions,
    getDropdownData
  };
};
