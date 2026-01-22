import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { get } from 'lodash';

const useAutoSave = ({
  formData,
  config,
  activeTab,
  onInputChange,
  onSave,
  getNestedValue,
  extractTabData,
  validateCurrentTabData,
  onTabCompleted,
  isTutorialActive,
  disableLocalStorage = false
}) => {
  const location = useLocation();
  const localStorageKey = `profile_${activeTab}_draft`;
  const previousLocationRef = useRef(location.pathname);
  const saveTimeoutRef = useRef(null);
  const validationTimeoutRef = useRef(null);
  const hasUnsavedChangesRef = useRef(false);
  const hasLoadedFromStorageRef = useRef(false);
  const lastValidationStateRef = useRef(false);
  const lastActiveTabRef = useRef(activeTab);
  const tabChangeTimestampRef = useRef(Date.now());
  const initialValidationDoneRef = useRef(false);

  const extractData = useCallback(() => {
    if (extractTabData) {
      return extractTabData();
    }
    if (!formData || !config?.fields?.[activeTab]) return null;
    const tabData = {};
    const fieldsToRender = Array.isArray(config.fields[activeTab]) 
      ? config.fields[activeTab]
      : [];
    
    fieldsToRender.forEach(field => {
      const value = getNestedValue(formData, field.name);
      if (value !== undefined && value !== null) {
        tabData[field.name] = value;
      }
    });
    return tabData;
  }, [formData, config, activeTab, getNestedValue, extractTabData]);

  const saveToLocalStorage = useCallback(() => {
    if (disableLocalStorage) return;
    
    const tabData = extractData();
    if (tabData && Object.keys(tabData).length > 0) {
      try {
        localStorage.setItem(localStorageKey, JSON.stringify(tabData));
        hasUnsavedChangesRef.current = true;
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
    }
  }, [extractData, localStorageKey, disableLocalStorage]);

  const performValidation = useCallback(() => {
    if (!validateCurrentTabData || !onTabCompleted) return;
    
    if (isTutorialActive) {
      const timeSinceTabChange = Date.now() - tabChangeTimestampRef.current;
      if (timeSinceTabChange < 2000) {
        console.log('[useAutoSave] Skipping auto-validation - recently changed tabs during tutorial');
        return;
      }
    }
    
    const isValid = validateCurrentTabData(null, null, true);
    
    console.log('[useAutoSave] Validation result for', activeTab, ':', isValid);
    
    if (isValid !== lastValidationStateRef.current) {
      lastValidationStateRef.current = isValid;
      console.log('[useAutoSave] Validation state changed to:', isValid);
      
      if (isValid && isTutorialActive && activeTab) {
        console.log('[useAutoSave] Tab validation passed, notifying tutorial:', activeTab);
        onTabCompleted(activeTab, true);
      }
    } else if (isValid && isTutorialActive && activeTab) {
      console.log('[useAutoSave] Tab is valid but state unchanged, notifying tutorial anyway:', activeTab);
      onTabCompleted(activeTab, true);
    }
  }, [validateCurrentTabData, onTabCompleted, isTutorialActive, activeTab]);

  useEffect(() => {
    if (!formData || hasLoadedFromStorageRef.current || disableLocalStorage) return;
    
    try {
      const savedData = localStorage.getItem(localStorageKey);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        Object.entries(parsedData).forEach(([fieldName, value]) => {
          const currentValue = getNestedValue(formData, fieldName);
          if (currentValue === undefined || currentValue === null || currentValue === '') {
            onInputChange(fieldName, value);
          }
        });
        hasLoadedFromStorageRef.current = true;
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  }, [formData, getNestedValue, onInputChange, localStorageKey, disableLocalStorage]);

  useEffect(() => {
    if (activeTab !== lastActiveTabRef.current) {
      console.log('[useAutoSave] Tab changed from', lastActiveTabRef.current, 'to', activeTab);
      lastActiveTabRef.current = activeTab;
      tabChangeTimestampRef.current = Date.now();
      lastValidationStateRef.current = false;
      initialValidationDoneRef.current = false;
    }
  }, [activeTab]);

  useEffect(() => {
    if (formData) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        saveToLocalStorage();
      }, 300);
      
      const validationDelay = initialValidationDoneRef.current ? 500 : 100;
      
      validationTimeoutRef.current = setTimeout(() => {
        performValidation();
        if (!initialValidationDoneRef.current) {
          initialValidationDoneRef.current = true;
          console.log('[useAutoSave] Initial validation completed on mount/tab load');
        }
      }, validationDelay);
    }
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [formData, saveToLocalStorage, performValidation]);

  useEffect(() => {
    const currentPath = location.pathname;
    const previousPath = previousLocationRef.current;
    const isLeavingTab = previousPath && previousPath.includes(`/${activeTab}`) && !currentPath.includes(`/${activeTab}`);

    if (isLeavingTab && hasUnsavedChangesRef.current && onSave) {
      const saveToBackend = async () => {
        try {
          await onSave();
          hasUnsavedChangesRef.current = false;
          if (!disableLocalStorage) {
            localStorage.removeItem(localStorageKey);
          }
        } catch (error) {
          console.error('Error auto-saving to backend:', error);
        }
      };
      saveToBackend();
    }

    previousLocationRef.current = currentPath;
  }, [location.pathname, activeTab, onSave, localStorageKey, disableLocalStorage]);

  useEffect(() => {
    const handlePageHide = async (e) => {
      if (hasUnsavedChangesRef.current && onSave) {
        try {
          await onSave();
          hasUnsavedChangesRef.current = false;
          if (!disableLocalStorage) {
            localStorage.removeItem(localStorageKey);
          }
        } catch (error) {
          console.error('Error auto-saving on page hide:', error);
        }
      }
    };

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden' && hasUnsavedChangesRef.current && onSave) {
        try {
          await onSave();
          hasUnsavedChangesRef.current = false;
          if (!disableLocalStorage) {
            localStorage.removeItem(localStorageKey);
          }
        } catch (error) {
          console.error('Error auto-saving on visibility change:', error);
        }
      }
    };

    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [onSave, localStorageKey, disableLocalStorage]);
};

export default useAutoSave;

