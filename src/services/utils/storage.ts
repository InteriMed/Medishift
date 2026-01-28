/**
 * Centralized localStorage utilities
 * Type-safe storage operations with error handling
 */

/**
 * Save data to localStorage with JSON serialization
 */
export const saveToStorage = <T = any>(key: string, data: T): boolean => {
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    console.error(`[Storage] Failed to save ${key}:`, error);
    return false;
  }
};

/**
 * Load data from localStorage with JSON parsing
 */
export const loadFromStorage = <T = any>(key: string): T | null => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`[Storage] Failed to load ${key}:`, error);
    return null;
  }
};

/**
 * Remove data from localStorage
 */
export const removeFromStorage = (key: string): boolean => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`[Storage] Failed to remove ${key}:`, error);
    return false;
  }
};

/**
 * Clear all localStorage data
 */
export const clearStorage = (): boolean => {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.error('[Storage] Failed to clear storage:', error);
    return false;
  }
};

/**
 * Save data with merge capability
 */
export const mergeToStorage = <T extends Record<string, any>>(
  key: string, 
  data: Partial<T>
): boolean => {
  try {
    const existing = loadFromStorage<T>(key) || {} as T;
    const merged = { ...existing, ...data, lastUpdated: new Date().toISOString() };
    return saveToStorage(key, merged);
  } catch (error) {
    console.error(`[Storage] Failed to merge ${key}:`, error);
    return false;
  }
};

/**
 * Update a specific field in stored data
 */
export const updateStorageField = <T extends Record<string, any>>(
  key: string,
  field: keyof T,
  value: any
): boolean => {
  const data = loadFromStorage<T>(key) || {} as T;
  data[field] = value;
  return saveToStorage(key, data);
};

const ONBOARDING_STORAGE_KEY = 'onboarding_data';

export const saveOnboardingData = (data: any): boolean => {
  return saveToStorage(ONBOARDING_STORAGE_KEY, data);
};

export const loadOnboardingData = (): any => {
  return loadFromStorage(ONBOARDING_STORAGE_KEY);
};

export const clearOnboardingData = (): boolean => {
  return removeFromStorage(ONBOARDING_STORAGE_KEY);
};

