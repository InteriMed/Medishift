import { auth } from './firebase';
import { DEFAULT_VALUES, getEnvVar } from '../config/keysDatabase';

const getAuthToken = async () => {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('User not authenticated');
    }
    return await user.getIdToken();
};

const callHttpFunction = async (functionName, method = 'GET', body = null) => {
    const useEmulators = getEnvVar('USE_EMULATORS') === 'true' || getEnvVar('USE_FIREBASE_EMULATORS') === 'true';
    
    let functionUrl;
    if (useEmulators) {
        const emulatorUrl = getEnvVar('FIREBASE_FUNCTIONS_EMULATOR_URL') || DEFAULT_VALUES.EMULATOR_FUNCTIONS_URL;
        const projectId = getEnvVar('FIREBASE_PROJECT_ID') || DEFAULT_VALUES.FIREBASE_PROJECT_ID;
        const region = DEFAULT_VALUES.FIREBASE_REGION;
        functionUrl = `${emulatorUrl}/${projectId}/${region}/${functionName}`;
    } else {
        const projectId = getEnvVar('FIREBASE_PROJECT_ID') || DEFAULT_VALUES.FIREBASE_PROJECT_ID;
        const region = DEFAULT_VALUES.FIREBASE_REGION;
        const fallbackApiBase = getEnvVar('API_BASE') || DEFAULT_VALUES.API_BASE;
        
        if (fallbackApiBase && fallbackApiBase.includes('cloudfunctions.net')) {
            functionUrl = `${fallbackApiBase}/${functionName}`;
        } else {
            functionUrl = `https://${region}-${projectId}.cloudfunctions.net/${functionName}`;
        }
    }
    
    try {
        const token = await getAuthToken();

        const fetchOptions = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };

        if (body && method !== 'GET') {
            fetchOptions.body = JSON.stringify(body);
        }

        const response = await fetch(functionUrl, fetchOptions);

        if (!response.ok) {
            let errorMessage = `API error: ${response.status}`;
            let errorData = null;
            
            try {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    errorData = await response.json();
                    errorMessage = errorData.message || errorData.error || errorMessage;
                } else {
                    const text = await response.text();
                    if (text) {
                        errorMessage = text;
                    }
                }
            } catch (parseError) {
                console.warn('[AccountManagement] Could not parse error response:', parseError);
            }
            
            const error = new Error(errorMessage);
            error.status = response.status;
            error.data = errorData;
            throw error;
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        } else {
            const text = await response.text();
            return { success: true, data: text };
        }
    } catch (error) {
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            console.error('[AccountManagement] Network error details:', {
                functionName,
                method,
                url: functionUrl,
                error: error.message
            });
            const networkError = new Error(`Network error: Unable to connect to ${functionUrl}. Please check your internet connection and ensure the API is available.`);
            networkError.originalError = error;
            networkError.isNetworkError = true;
            throw networkError;
        }
        throw error;
    }
};

/**
 * Get a preview of what will happen when the account is deleted
 * Shows:
 * - What data will be deleted immediately
 * - What data will be retained for legal compliance
 * - Retention period information
 * 
 * @returns {Promise<Object>} Deletion eligibility info
 */
export const getDeletionPreview = async () => {
    try {
        const result = await callHttpFunction('accountDeletionPreview', 'GET');
        return result.data;
    } catch (error) {
        console.error('[AccountManagement] Error getting deletion preview:', error);
        throw error;
    }
};

/**
 * Request account deletion
 * Implements the "Anonymize & Archive" strategy compliant with Swiss law
 * 
 * @param {Object} options - Deletion options
 * @param {string} options.reason - Optional reason for deletion
 * @returns {Promise<Object>} Deletion result
 */
export const deleteAccount = async ({ reason } = {}) => {
    try {
        const result = await callHttpFunction('accountDelete', 'POST', {
            confirmPhrase: 'DELETE MY ACCOUNT',
            reason: reason || 'User requested account deletion'
        });
        return result;
    } catch (error) {
        console.error('[AccountManagement] Error deleting account:', error);
        throw error;
    }
};

/**
 * Export all user data (GDPR Right of Access)
 * Returns all data the platform holds about the user
 * 
 * @returns {Promise<Object>} User data export
 */
export const exportUserData = async () => {
    try {
        const result = await callHttpFunction('accountDataExport', 'GET');
        return result.data;
    } catch (error) {
        console.error('[AccountManagement] Error exporting data:', error);
        throw error;
    }
};

/**
 * Check if an AVS/GLN number is eligible for bonuses
 * Used to prevent bonus abuse from re-registrations
 * 
 * @param {string} identifier - AVS or GLN number
 * @param {string} type - 'avs' or 'gln'
 * @returns {Promise<Object>} Eligibility result
 */
export const checkBonusEligibility = async (identifier, type = 'avs') => {
    try {
        const result = await callHttpFunction('accountBonusEligibility', 'POST', { identifier, type });
        return result.data;
    } catch (error) {
        console.error('[AccountManagement] Error checking bonus eligibility:', error);
        throw error;
    }
};

/**
 * Download user data as JSON file
 * Convenience function to trigger file download
 */
export const downloadUserData = async () => {
    const data = await exportUserData();

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `my-data-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    return data;
};

export default {
    getDeletionPreview,
    deleteAccount,
    exportUserData,
    checkBonusEligibility,
    downloadUserData
};
