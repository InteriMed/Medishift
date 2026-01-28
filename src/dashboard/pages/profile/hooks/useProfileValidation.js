import { useState, useCallback } from 'react';

export const useProfileValidation = (formData, profileConfig, activeTab, isLoadingConfig, isLoadingData) => {
  const [errors, setErrors] = useState({});

  const validateCurrentTabData = useCallback(() => {
    const newErrors = {};
    return {
      isValid: Object.keys(newErrors).length === 0,
      errors: newErrors
    };
  }, [formData, profileConfig, activeTab]);

  return {
    errors,
    setErrors,
    validateCurrentTabData
  };
};

export default useProfileValidation;

