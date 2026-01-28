import { useState, useEffect, useCallback, useRef } from 'react';
import debounce from 'lodash/debounce';

export const useAutoSave = (saveFunction, delay = 2000) => {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const saveTimeoutRef = useRef(null);

  const debouncedSave = useCallback(
    debounce(async (data) => {
      try {
        setIsSaving(true);
        await saveFunction(data);
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error('Auto-save error:', error);
      } finally {
        setIsSaving(false);
      }
    }, delay),
    [saveFunction, delay]
  );

  const triggerSave = useCallback((data) => {
    setHasUnsavedChanges(true);
    debouncedSave(data);
  }, [debouncedSave]);

  const forceSave = useCallback(async (data) => {
    debouncedSave.cancel();
    try {
      setIsSaving(true);
      await saveFunction(data);
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Force save error:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [saveFunction, debouncedSave]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  return {
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    triggerSave,
    forceSave
  };
};

export default useAutoSave;

