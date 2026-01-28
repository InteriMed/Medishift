import { useState, useEffect } from 'react';

export const useProfileConfig = (initialProfileData) => {
  const [profileConfig, setProfileConfig] = useState(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [formData, setFormData] = useState(initialProfileData || {});

  useEffect(() => {
    setIsLoadingConfig(true);
    setProfileConfig({
      tabs: []
    });
    setIsLoadingConfig(false);
  }, []);

  useEffect(() => {
    if (initialProfileData) {
      setFormData(initialProfileData);
    }
  }, [initialProfileData]);

  return {
    profileConfig,
    isLoadingConfig,
    formData,
    setFormData
  };
};

export default useProfileConfig;

