/**
 * Account Management Service
 * 
 * Frontend service for account deletion and data export
 * Compliant with Swiss nFADP/revDSG and GDPR
 */

import { auth } from './firebase';
import { DEFAULT_VALUES, getEnvVar } from '../config/keysDatabase';

const API_BASE = getEnvVar('API_BASE') || DEFAULT_VALUES.API_BASE;

/**
 * Get authentication token for API calls
 */
const getAuthToken = async () => {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('User not authenticated');
    }
    return await user.getIdToken();
};

/**
 * Make authenticated API request
 */
const apiRequest = async (endpoint, options = {}) => {
    const token = await getAuthToken();

    const response = await fetch(`${API_BASE}/${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || `API error: ${response.status}`);
    }

    return data;
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
        const result = await apiRequest('accountDeletionPreview', {
            method: 'GET'
        });
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
        const result = await apiRequest('accountDelete', {
            method: 'POST',
            body: JSON.stringify({
                confirmPhrase: 'DELETE MY ACCOUNT',
                reason: reason || 'User requested account deletion'
            })
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
        const result = await apiRequest('accountDataExport', {
            method: 'GET'
        });
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
        const result = await apiRequest('accountBonusEligibility', {
            method: 'POST',
            body: JSON.stringify({ identifier, type })
        });
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
