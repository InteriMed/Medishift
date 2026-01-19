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
  extractTabData
}) => {
  const location = useLocation();
  const localStorageKey = `profile_${activeTab}_draft`;
  const previousLocationRef = useRef(location.pathname);
  const saveTimeoutRef = useRef(null);
  const hasUnsavedChangesRef = useRef(false);
  const hasLoadedFromStorageRef = useRef(false);

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
    const tabData = extractData();
    if (tabData && Object.keys(tabData).length > 0) {
      try {
        localStorage.setItem(localStorageKey, JSON.stringify(tabData));
        hasUnsavedChangesRef.current = true;
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
    }
  }, [extractData, localStorageKey]);

  useEffect(() => {
    if (!formData || hasLoadedFromStorageRef.current) return;
    
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
  }, [formData, getNestedValue, onInputChange, localStorageKey]);

  useEffect(() => {
    if (formData) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveToLocalStorage();
      }, 500);
    }
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [formData, saveToLocalStorage]);

  useEffect(() => {
    const currentPath = location.pathname;
    const previousPath = previousLocationRef.current;
    const isLeavingTab = previousPath && previousPath.includes(`/${activeTab}`) && !currentPath.includes(`/${activeTab}`);

    if (isLeavingTab && hasUnsavedChangesRef.current && onSave) {
      const saveToBackend = async () => {
        try {
          await onSave();
          hasUnsavedChangesRef.current = false;
          localStorage.removeItem(localStorageKey);
        } catch (error) {
          console.error('Error auto-saving to backend:', error);
        }
      };
      saveToBackend();
    }

    previousLocationRef.current = currentPath;
  }, [location.pathname, activeTab, onSave, localStorageKey]);

  useEffect(() => {
    const handlePageHide = async (e) => {
      if (hasUnsavedChangesRef.current && onSave) {
        try {
          await onSave();
          hasUnsavedChangesRef.current = false;
          localStorage.removeItem(localStorageKey);
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
          localStorage.removeItem(localStorageKey);
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
  }, [onSave, localStorageKey]);
};

export default useAutoSave;

