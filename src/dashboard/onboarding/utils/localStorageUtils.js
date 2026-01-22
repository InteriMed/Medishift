// LocalStorage utilities for onboarding data persistence

const ONBOARDING_STORAGE_KEY = 'onboarding_form_data';

export const saveOnboardingData = (data) => {
    try {
        const existingData = loadOnboardingData() || {};
        const mergedData = { ...existingData, ...data, lastSaved: new Date().toISOString() };
        localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(mergedData));
        console.log('[OnboardingStorage] Saved data to localStorage:', mergedData);
        return true;
    } catch (error) {
        console.error('[OnboardingStorage] Failed to save data:', error);
        return false;
    }
};

export const loadOnboardingData = () => {
    try {
        const data = localStorage.getItem(ONBOARDING_STORAGE_KEY);
        if (data) {
            const parsed = JSON.parse(data);
            console.log('[OnboardingStorage] Loaded data from localStorage:', parsed);
            return parsed;
        }
        return null;
    } catch (error) {
        console.error('[OnboardingStorage] Failed to load data:', error);
        return null;
    }
};

export const clearOnboardingData = () => {
    try {
        localStorage.removeItem(ONBOARDING_STORAGE_KEY);
        console.log('[OnboardingStorage] Cleared onboarding data');
        return true;
    } catch (error) {
        console.error('[OnboardingStorage] Failed to clear data:', error);
        return false;
    }
};

export const saveField = (fieldName, value) => {
    const data = loadOnboardingData() || {};
    data[fieldName] = value;
    return saveOnboardingData(data);
};
