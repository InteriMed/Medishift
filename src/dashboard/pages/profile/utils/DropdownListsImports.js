import { useTranslation } from 'react-i18next';

const DROPDOWN_FALLBACK = {
  phonePrefixes: {},
  cantons: {},
  nationality: {},
  gender: {},
  facilityTypes: {}
};

export const useDropdownOptions = () => {
  const { i18n } = useTranslation();
  
  const getDropdownData = (key) => {
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

  return {
    phonePrefixOptions,
    cantonOptions,
    nationalityOptions,
    genderOptions,
    facilityTypeOptions,
    getDropdownData
  };
};
