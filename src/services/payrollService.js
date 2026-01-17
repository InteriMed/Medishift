/**
 * Payroll Service
 * 
 * Frontend service for interacting with PayrollPlus integration
 * Cloud Functions.
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

/**
 * Create a new payroll request
 * 
 * @param {Object} data - Payroll request data
 * @param {string} data.shiftId - ID of the shift
 * @param {string} data.workerId - UID of the worker
 * @param {Object} data.shiftDetails - Shift details
 * @param {number} data.hourlyRate - Hourly rate in CHF
 * @returns {Promise<Object>} Result with requestId and financials
 */
export const createPayrollRequest = async (data) => {
    try {
        const createFn = httpsCallable(functions, 'createPayrollRequest');
        const result = await createFn(data);
        return result.data;
    } catch (error) {
        console.error('Error creating payroll request:', error);
        throw error;
    }
};

/**
 * Get payroll requests for current facility
 * 
 * @param {Object} options - Query options
 * @param {string} options.status - Filter by status (optional)
 * @param {number} options.limit - Maximum number of results
 * @returns {Promise<Object>} Result with requests array
 */
export const getPayrollRequests = async (options = {}) => {
    try {
        const getFn = httpsCallable(functions, 'getPayrollRequests');
        const result = await getFn(options);
        return result.data;
    } catch (error) {
        console.error('Error fetching payroll requests:', error);
        throw error;
    }
};

/**
 * Calculate fees for a shift
 * Returns pilot mode pricing if applicable
 * 
 * @param {number} baseAmount - Base amount (hours * hourly rate)
 * @returns {Object} Fee calculation with isPilot flag
 */
export const calculateShiftFees = (baseAmount) => {
    // Client-side calculation for preview purposes
    // Actual calculation happens server-side

    const pilotEndDate = new Date('2025-02-28');
    const now = new Date();
    const isPilot = now < pilotEndDate;

    if (isPilot) {
        return {
            workerGrossPay: baseAmount,
            commission: 0,
            totalCost: baseAmount,
            markup: 0,
            isPilot: true,
            message: 'Pilot Program: 0% commission until Feb 28, 2025'
        };
    }

    // Standard 15% markup
    const markup = 15;
    const commission = baseAmount * (markup / 100);

    return {
        workerGrossPay: baseAmount,
        commission: Math.round(commission * 100) / 100,
        totalCost: Math.round((baseAmount + commission) * 100) / 100,
        markup,
        isPilot: false,
        message: null
    };
};

/**
 * Format currency in Swiss Francs
 * 
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
export const formatCHF = (amount) => {
    return new Intl.NumberFormat('de-CH', {
        style: 'currency',
        currency: 'CHF'
    }).format(amount || 0);
};

/**
 * Check if currently in pilot mode
 * 
 * @returns {boolean} True if pilot mode is active
 */
export const isPilotMode = () => {
    const pilotEndDate = new Date('2025-02-28');
    return new Date() < pilotEndDate;
};

/**
 * Get pilot mode message
 * 
 * @returns {Object|null} Pilot mode info or null
 */
export const getPilotInfo = () => {
    if (isPilotMode()) {
        return {
            active: true,
            endDate: '2025-02-28',
            message: 'Pilot Program: 0% commission until Feb 28, 2025',
            feePercentage: 0
        };
    }
    return null;
};
