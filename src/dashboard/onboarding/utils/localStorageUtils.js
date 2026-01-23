import { LOCALSTORAGE_KEYS } from '../../../config/keysDatabase';

const ONBOARDING_STORAGE_KEY = LOCALSTORAGE_KEYS.ONBOARDING_FORM_DATA;

export const saveOnboardingData = (data) => {
    try {
        const existingData = loadOnboardingData() || {};
        const mergedData = { ...existingData, ...data, lastSaved: new Date().toISOString() };
        localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(mergedData));
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
