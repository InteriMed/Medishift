import { useState, useCallback } from 'react';

export const useProfileFormHandlers = (
  formData,
  setFormData,
  profileConfig,
  activeTab,
  setActiveTab,
  originalData,
  updateProfileData,
  validateCurrentTabData,
  setErrors,
  setIsSubmitting
) => {
  const [showCancelmodal, setShowCancelmodal] = useState(false);

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, [setFormData]);

  const handleArrayChange = useCallback((field, index, value) => {
    setFormData(prev => {
      const array = prev[field] || [];
      const newArray = [...array];
      newArray[index] = value;
      return {
        ...prev,
        [field]: newArray
      };
    });
  }, [setFormData]);

  const handleBatchChange = useCallback((updates) => {
    setFormData(prev => ({
      ...prev,
      ...updates
    }));
  }, [setFormData]);

  const getNestedValue = useCallback((obj, path) => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }, []);

  const handleSave = useCallback(async () => {
    const validation = validateCurrentTabData();
    if (!validation.isValid) {
      setErrors(validation.errors);
      return false;
    }
    
    try {
      setIsSubmitting(true);
      await updateProfileData(formData);
      return true;
    } catch (error) {
      console.error('Error saving profile:', error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateCurrentTabData, updateProfileData, setErrors, setIsSubmitting]);

  const handleSaveOnly = useCallback(async () => {
    return await handleSave();
  }, [handleSave]);

  const handleSaveAndContinue = useCallback(async () => {
    const saved = await handleSave();
    if (saved && profileConfig?.tabs) {
      const currentIndex = profileConfig.tabs.findIndex(t => t.id === activeTab);
      if (currentIndex < profileConfig.tabs.length - 1) {
        setActiveTab(profileConfig.tabs[currentIndex + 1].id);
      }
    }
    return saved;
  }, [handleSave, profileConfig, activeTab, setActiveTab]);

  const handleCancelChanges = useCallback(() => {
    setShowCancelmodal(true);
  }, []);

  const confirmCancelChanges = useCallback(() => {
    if (originalData.current) {
      setFormData(originalData.current);
    }
    setShowCancelmodal(false);
  }, [originalData, setFormData]);

  const isFormModified = useCallback(() => {
    return JSON.stringify(formData) !== JSON.stringify(originalData.current);
  }, [formData, originalData]);

  return {
    handleInputChange,
    handleArrayChange,
    handleBatchChange,
    getNestedValue,
    handleSave,
    handleSaveOnly,
    handleSaveAndContinue,
    handleCancelChanges,
    confirmCancelChanges,
    isFormModified
  };
};

export default useProfileFormHandlers;

