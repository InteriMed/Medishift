import { getFunctions } from 'firebase/functions';
import { functions, db, auth } from './firebase';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { getLocalStorageKey, FIRESTORE_COLLECTIONS, DEFAULT_VALUES, getEnvVar } from '../config/keysDatabase';

/**
 * Get cached extracted data from professional profile in Firestore
 * Data persists for user to reuse in case of issues
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Cached data or null
 */
export const getCachedExtractedData = async (userId) => {
    try {
        const localKey = getLocalStorageKey('AUTOFILL_CACHE', userId);
        const localDataRaw = localStorage.getItem(localKey);
        if (localDataRaw) {
            try {
                const localData = JSON.parse(localDataRaw);
                const now = Date.now();
                if (localData.expiresAt > now) {
                    console.log('[DocumentProcessing] Found valid data in localStorage');
                    return localData.data;
                }
            } catch (e) {
                console.error('[DocumentProcessing] Error parsing localStorage data:', e);
            }
        }

        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('./firebase');

        const profileRef = doc(db, FIRESTORE_COLLECTIONS.PROFESSIONAL_PROFILES, userId);
        const profileDoc = await getDoc(profileRef);

        if (!profileDoc.exists()) {
            return null;
        }

        const profileData = profileDoc.data();
        const autofill = profileData.autofill;

        if (!autofill || !autofill.data) {
            return null;
        }

        // Check if cache has expired (30 days max)
        if (autofill.expiresAt) {
            const expiresAt = autofill.expiresAt.toMillis();
            const now = Date.now();
            if (expiresAt < now) {
                console.log('[DocumentProcessing] Cached data expired');
                return null;
            }
        }

        // Sync back to localStorage if it was missing
        localStorage.setItem(localKey, JSON.stringify({
            data: autofill.data,
            expiresAt: autofill.expiresAt.toMillis(),
            savedAt: autofill.savedAt.toMillis()
        }));

        return autofill.data;
    } catch (error) {
        console.error('[DocumentProcessing] Error getting cached data from profile:', error);
        return null;
    }
};

/**
 * Save extracted data to professional profile in Firestore and localStorage
 * Data persists for user to reuse in case of issues
 * @param {string} userId - User ID
 * @param {Object} data - Extracted data to cache
 */
export const saveCachedExtractedData = async (userId, data) => {
    try {
        const { doc, updateDoc, getDoc, setDoc, Timestamp } = await import('firebase/firestore');
        const { db } = await import('./firebase');

        const profileRef = doc(db, FIRESTORE_COLLECTIONS.PROFESSIONAL_PROFILES, userId);
        const profileDoc = await getDoc(profileRef);

        const now = Date.now();
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        const expiresAtMs = now + thirtyDaysMs;

        const autofillData = {
            data,
            savedAt: Timestamp.now(),
            expiresAt: Timestamp.fromMillis(expiresAtMs)
        };

        try {
            const localKey = getLocalStorageKey('AUTOFILL_CACHE', userId);
            localStorage.setItem(localKey, JSON.stringify({
                data,
                savedAt: now,
                expiresAt: expiresAtMs
            }));
        } catch (lsError) {
            console.error('[DocumentProcessing] Error saving to localStorage:', lsError);
        }

        if (profileDoc.exists()) {
            await updateDoc(profileRef, {
                autofill: autofillData,
                updatedAt: Timestamp.now()
            });
        } else {
            await setDoc(profileRef, {
                userId,
                autofill: autofillData,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });
        }

        console.log('[DocumentProcessing] Saved extracted data to professional profile (DB & Local)');
    } catch (error) {
        console.error('[DocumentProcessing] Error saving cached data to profile:', error);
    }
};

/**
 * Clear cached extracted data from professional profile in Firestore
 * Called when onboarding is complete
 * @param {string} userId - User ID
 */
export const clearCachedExtractedData = async (userId) => {
    try {
        const { doc, updateDoc, Timestamp } = await import('firebase/firestore');
        const { db } = await import('./firebase');

        const profileRef = doc(db, FIRESTORE_COLLECTIONS.PROFESSIONAL_PROFILES, userId);
        await updateDoc(profileRef, {
            autofill: null,
            updatedAt: Timestamp.now()
        });

        console.log('[DocumentProcessing] Cleared cached extracted data from profile');
    } catch (error) {
        console.error('[DocumentProcessing] Error clearing cached data from profile:', error);
    }
};

/**
 * Process a document using Cloud Vision OCR and AI extraction
 * 
 * @param {string} documentUrl - Firebase Storage URL of the uploaded document
 * @param {string} documentType - Type of document ('cv', 'resume', 'businessDocument')
 * @returns {Promise<Object>} Extracted and structured data
 */
export const processDocumentWithAI = async (documentUrl, documentType = 'cv', storagePath = null, mimeType = null, dropdownOptions = null) => {
    try {
        // console.log('[DocumentProcessing] Processing document:', { documentUrl, documentType, storagePath, mimeType });

        // Get auth token for authenticated request
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User must be authenticated to process documents');
        }

        const token = await user.getIdToken();

        const region = DEFAULT_VALUES.FIREBASE_REGION;
        const projectId = getEnvVar('FIREBASE_PROJECT_ID') || DEFAULT_VALUES.FIREBASE_PROJECT_ID;
        const functionUrl = `https://${region}-${projectId}.cloudfunctions.net/processDocument`;

        // Create AbortController with 10-minute timeout
        // const controller = new AbortController();
        // const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minutes

        try {
            // Call the Cloud Function using REST API with extended timeout
            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    data: {
                        documentUrl,
                        documentType,
                        storagePath,
                        mimeType,
                        dropdownOptions
                    }
                }),
                // signal: controller.signal
            });

            // clearTimeout(timeoutId);

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch {
                    errorData = { error: { message: response.statusText } };
                }

                const errorMessage = errorData.error?.message || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
                const error = new Error(errorMessage);

                // Check for timeout/deadline errors
                if (errorMessage.toLowerCase().includes('deadline') || errorMessage.toLowerCase().includes('timeout')) {
                    error.code = 'timeout';
                } else if (errorData.error?.code) {
                    error.code = errorData.error.code;
                }

                throw error;
            }

            const result = await response.json();

            // Firebase Functions v2 onCall returns { result: { ... } }
            const functionResult = result.result || result;

            // console.log('[DocumentProcessing] Processing complete:', functionResult);

            if (!functionResult || !functionResult.success) {
                throw new Error(functionResult?.error?.message || 'Document processing failed');
            }

            return functionResult;
        } catch (fetchError) {
            // clearTimeout(timeoutId);

            // if (fetchError.name === 'AbortError') {
            //     const timeoutError = new Error('TIMEOUT: Document processing took longer than 10 minutes. Please try again.');
            //     timeoutError.code = 'timeout';
            //     throw timeoutError;
            // }

            throw fetchError;
        }
    } catch (error) {
        console.error('[DocumentProcessing] Error:', error);

        // Check if it's a timeout error
        if (error.message && error.message.includes('TIMEOUT')) {
            const timeoutError = new Error('TIMEOUT');
            timeoutError.code = 'timeout';
            timeoutError.message = error.message;
            throw timeoutError;
        }

        // Check if it's a rate limit error
        if (error.code === 'functions/resource-exhausted') {
            throw new Error(error.message); // Pass through the specific rate limit message
        }

        // Check for Firebase function timeout errors
        if (error.code === 'functions/deadline-exceeded' || error.message?.includes('deadline') || error.message?.includes('timeout')) {
            const timeoutError = new Error('TIMEOUT: Document processing took longer than expected. Please try again.');
            timeoutError.code = 'timeout';
            throw timeoutError;
        }

        throw new Error(`Failed to process document: ${error.message}`);
    }
};

/**
 * Merge extracted data with existing form data
 * Never overwrites existing data, only fills empty fields
 * 
 * @param {Object} existingData - Current form data
 * @param {Object} extractedData - Data extracted from document
 * @param {Object} dropdownOptions - Available dropdown options for validation
 * @returns {Object} Merged data
 */
export const mergeExtractedData = (existingData, extractedData, dropdownOptions = null) => {
    const merged = { ...existingData };

    /**
     * Helper to check if a value is valid for a dropdown
     * @param {string} value - Value to check
     * @param {string} optionsKey - Key in dropdownOptions (e.g., 'countriesOptions')
     * @returns {boolean} True if valid or if no options available
     */
    const isValidForDropdown = (value, optionsKey) => {
        if (!dropdownOptions || !dropdownOptions[optionsKey] || !Array.isArray(dropdownOptions[optionsKey])) {
            return true; // No options to check against
        }

        if (!value) return true;

        // Check if value exists as a key (value property) in the options
        const exists = dropdownOptions[optionsKey].some(opt =>
            opt.value === value ||
            (typeof value === 'string' && opt.value?.toLowerCase() === value.toLowerCase())
        );

        if (!exists && getEnvVar('NODE_ENV') !== 'production') {
            console.warn(`[DocumentProcessing] Extracted value "${value}" is not valid for ${optionsKey}`);
        }

        return exists;
    };

    const setNestedValue = (obj, path, value, optionsKey = null) => {
        if (value === null || value === undefined) return;

        // If it's a dropdown field, validate it first
        if (optionsKey && !isValidForDropdown(value, optionsKey)) {
            // If invalid, try to find a matching value from labels if it's a string
            if (typeof value === 'string' && dropdownOptions?.[optionsKey]) {
                const matchByLabel = dropdownOptions[optionsKey].find(opt =>
                    opt.label?.toLowerCase() === value.toLowerCase()
                );
                if (matchByLabel) {
                    value = matchByLabel.value;
                } else {
                    return; // Skip invalid value
                }
            } else {
                return; // Skip invalid value
            }
        }

        const keys = path.split('.');
        let current = obj;

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }

        const lastKey = keys[keys.length - 1];
        if (!current[lastKey] || current[lastKey] === '' || current[lastKey] === null) {
            current[lastKey] = value;
        }
    };

    // Merge personal details
    if (extractedData.personalDetails) {
        const { identity, address, contact } = extractedData.personalDetails;

        if (identity) {
            Object.entries(identity).forEach(([key, value]) => {
                // Map basic identity fields to the specific naming used in the profile config
                if (key === 'firstName') setNestedValue(merged, 'identity.legalFirstName', value);
                else if (key === 'lastName') setNestedValue(merged, 'identity.legalLastName', value);
                else if (key === 'nationality') setNestedValue(merged, `identity.${key}`, value, 'countriesOptions');
                else setNestedValue(merged, `identity.${key}`, value);
            });
        }

        if (address) {
            Object.entries(address).forEach(([key, value]) => {
                // Map address fields to residentialAddress group used in professional profiles
                let optionsKey = null;
                if (key === 'country') optionsKey = 'countriesOptions';
                else if (key === 'canton') optionsKey = 'cantonsOptions';

                setNestedValue(merged, `contact.residentialAddress.${key}`, value, optionsKey);
                // Also map to top-level address for consistency if needed by other components
                setNestedValue(merged, `address.${key}`, value, optionsKey);
            });
        }

        if (contact) {
            Object.entries(contact).forEach(([key, value]) => {
                let optionsKey = null;
                if (key === 'primaryPhonePrefix') optionsKey = 'phonePrefixOptions';
                setNestedValue(merged, `contact.${key}`, value, optionsKey);
            });
        }
    }

    // Merge professional background - REPLACE arrays instead of adding
    if (extractedData.professionalBackground) {
        const { professionalSummary, studies, qualifications, skills, specialties, workExperience } = extractedData.professionalBackground;

        if (professionalSummary) {
            setNestedValue(merged, 'professionalDetails.professionalSummary', professionalSummary);
            if (!merged.bio || merged.bio === '') {
                merged.bio = professionalSummary;
            }
        }

        merged.professionalDetails = merged.professionalDetails || {};

        if (studies && Array.isArray(studies)) {
            merged.professionalDetails.education = studies;
        }

        if (qualifications && Array.isArray(qualifications)) {
            const filteredQualifications = qualifications.filter(qual => {
                if (!qual || typeof qual !== 'object') {
                    return false;
                }

                const title = qual.title || qual.name || '';
                const hasTitle = typeof title === 'string' && title.trim().length > 0;

                return hasTitle;
            }).map(qual => {
                const cleaned = {};

                if (qual.title) {
                    cleaned.title = qual.title.trim();
                } else if (qual.name) {
                    cleaned.title = qual.name.trim();
                }

                if (qual.type && typeof qual.type === 'string' && qual.type.trim().length > 0) {
                    cleaned.type = qual.type.trim();
                }

                if (qual.institution && typeof qual.institution === 'string' && qual.institution.trim().length > 0) {
                    cleaned.institution = qual.institution.trim();
                } else if (qual.issuingOrganization && typeof qual.issuingOrganization === 'string' && qual.issuingOrganization.trim().length > 0) {
                    cleaned.institution = qual.issuingOrganization.trim();
                }

                if (qual.licenseNumber && typeof qual.licenseNumber === 'string' && qual.licenseNumber.trim().length > 0) {
                    cleaned.licenseNumber = qual.licenseNumber.trim();
                }

                if (qual.dateObtained && typeof qual.dateObtained === 'string' && qual.dateObtained.trim().length > 0) {
                    cleaned.dateObtained = qual.dateObtained.trim();
                } else if (qual.issueDate && typeof qual.issueDate === 'string' && qual.issueDate.trim().length > 0) {
                    cleaned.dateObtained = qual.issueDate.trim();
                }

                if (qual.expiryDate && typeof qual.expiryDate === 'string' && qual.expiryDate.trim().length > 0) {
                    cleaned.expiryDate = qual.expiryDate.trim();
                }

                if (typeof qual.validForLife === 'boolean') {
                    cleaned.validForLife = qual.validForLife;
                }

                if (qual.source) {
                    cleaned.source = qual.source;
                }

                return cleaned;
            });

            merged.professionalDetails.qualifications = filteredQualifications;
        }

        if (skills && Array.isArray(skills)) {
            merged.professionalDetails.skills = skills;
        }

        if (specialties && Array.isArray(specialties)) {
            merged.professionalDetails.specialties = specialties;
        }

        if (workExperience && Array.isArray(workExperience)) {
            merged.professionalDetails.workExperience = workExperience;
        }
    }

    // Merge billing information
    if (extractedData.billingInformation?.bankDetails) {
        const { bankDetails } = extractedData.billingInformation;
        Object.entries(bankDetails).forEach(([key, value]) => {
            // Map bankDetails to banking group used in professional profiles
            setNestedValue(merged, `banking.${key}`, value);
            // Backup for legacy components
            setNestedValue(merged, `bankDetails.${key}`, value);
        });
    }

    // Merge facility details (for facilities)
    if (extractedData.facilityDetails) {
        Object.entries(extractedData.facilityDetails).forEach(([key, value]) => {
            setNestedValue(merged, `facilityDetails.${key}`, value);
        });
    }

    return merged;
};

/**
 * Validate extracted data before merging
 * 
 * @param {Object} data - Extracted data to validate
 * @returns {Object} Validation result with warnings
 */
export const validateExtractedData = (data) => {
    const warnings = [];
    const validData = { ...data };

    // Validate email format
    if (data.personalDetails?.contact?.primaryEmail) {
        const email = data.personalDetails.contact.primaryEmail;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            warnings.push(`Invalid email format: ${email}`);
            validData.personalDetails.contact.primaryEmail = null;
        }
    }

    // Validate phone number format
    if (data.personalDetails?.contact?.primaryPhone) {
        const phone = data.personalDetails.contact.primaryPhone;
        // Remove all non-digit characters for validation
        const digitsOnly = phone.replace(/\D/g, '');
        if (digitsOnly.length < 7 || digitsOnly.length > 15) {
            warnings.push(`Invalid phone number: ${phone}`);
            validData.personalDetails.contact.primaryPhone = null;
        }
    }

    // Validate IBAN format (basic check)
    if (data.billingInformation?.bankDetails?.iban) {
        const iban = data.billingInformation.bankDetails.iban.replace(/\s/g, '');
        if (iban.length < 15 || iban.length > 34) {
            warnings.push(`Invalid IBAN format: ${iban}`);
            validData.billingInformation.bankDetails.iban = null;
        }
    }

    // Validate dates
    const validateDate = (dateStr, fieldName) => {
        if (!dateStr) return true;
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            warnings.push(`Invalid date format for ${fieldName}: ${dateStr}`);
            return false;
        }
        return true;
    };

    if (data.personalDetails?.identity?.dateOfBirth) {
        if (!validateDate(data.personalDetails.identity.dateOfBirth, 'Date of Birth')) {
            validData.personalDetails.identity.dateOfBirth = null;
        }
    }

    return {
        data: validData,
        warnings,
        isValid: warnings.length === 0
    };
};

const documentProcessingService = {
    processDocumentWithAI,
    mergeExtractedData,
    validateExtractedData
};

export default documentProcessingService;
