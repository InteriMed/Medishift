import { get } from 'lodash';

export const isTabCompleted = (profileData, tabId, config) => {
    if (!profileData || !config?.fields) return false;

    // Account and Marketplace tabs have no required fields, so they are always considered complete
    if (tabId === 'account' || tabId === 'marketplace') {
        return true;
    }

    if (!config.fields[tabId]) return true;
    const fieldsOrRules = config.fields[tabId];

    if (Array.isArray(fieldsOrRules)) {
        const allFieldsComplete = fieldsOrRules.every(field => {
            if (!field.required) return true;

            // Special handling for document uploads - Swiss citizens need ID card instead of work permit
            if (tabId === 'documentUploads' && field.docType === 'workPermit') {
                const nationality = get(profileData, 'identity.nationality');
                const isSwiss = nationality === 'switzerland';

                if (isSwiss) {
                    // Swiss citizens MUST upload ID card (stored in same field)
                    // Check both direct field value and storage files
                    const directValue = get(profileData, field.name);
                    const verificationDocs = get(profileData, 'verification.verificationDocuments') || [];
                    const hasStorageFile = verificationDocs.some(doc => {
                        const docType = doc.type || doc.category;
                        return docType === 'idCard' || docType === 'workPermit';
                    });
                    const hasDirectValue = directValue !== null && directValue !== undefined && directValue !== '' && (typeof directValue !== 'string' || directValue.trim() !== '');
                    return hasDirectValue || hasStorageFile;
                }
                // For non-Swiss, continue with normal dependsOn check below
            }

            // For other document upload fields, check both direct value and storage files
            if (tabId === 'documentUploads' && field.docType) {
                const directValue = get(profileData, field.name);
                const verificationDocs = get(profileData, 'verification.verificationDocuments') || [];
                const hasStorageFile = verificationDocs.some(doc => {
                    const docType = doc.type || doc.category;
                    return docType === field.docType;
                });
                const hasDirectValue = directValue !== null && directValue !== undefined && directValue !== '' && (typeof directValue !== 'string' || directValue.trim() !== '');
                if (hasDirectValue || hasStorageFile) {
                    return true;
                }
                // If no value found, continue with normal validation below
            }

            if (field.dependsOn) {
                const dependentValue = get(profileData, field.dependsOn);
                if (field.dependsOnValue && !field.dependsOnValue.includes(dependentValue)) return true;
                if (field.dependsOnValueExclude && field.dependsOnValueExclude.includes(dependentValue)) return true;
            }
            const value = get(profileData, field.name);
            const isEmpty = value === null || value === undefined || value === '' || (typeof value === 'string' && value.trim() === '');

            return !isEmpty;
        });

        return allFieldsComplete;
    }
    else if (typeof fieldsOrRules === 'object') {
        let isComplete = true;
        Object.entries(fieldsOrRules).forEach(([key, rules]) => {
            const list = get(profileData, `professionalDetails.${key}`) || get(profileData, key);

            if (rules.minItems > 0) {
                if (!Array.isArray(list) || list.length < rules.minItems) {
                    isComplete = false;
                }
            }

            if (Array.isArray(list) && list.length > 0) {
                const itemSchemaRef = rules.itemSchemaRef;
                const itemSchema = config?.itemSchemas?.[itemSchemaRef] || [];
                list.forEach((item) => {
                    itemSchema.forEach((fieldRule) => {
                        const { name, required, dependsOn, dependsOnValue, dependsOnValueExclude } = fieldRule;
                        let isActuallyRequired = required;
                        if (dependsOn) {
                            const dependentValue = get(item, dependsOn);
                            let conditionMet = true;
                            if (dependsOnValue && !dependsOnValue.includes(dependentValue)) conditionMet = false;
                            if (dependsOnValueExclude && dependsOnValueExclude.includes(dependentValue)) conditionMet = false;
                            if (!conditionMet) isActuallyRequired = false;
                        }
                        if (isActuallyRequired) {
                            const value = get(item, name);
                            const isEmpty = value === null || value === undefined || value === '' || (typeof value === 'string' && value.trim() === '');
                            if (isEmpty) {
                                isComplete = false;
                            }
                        }
                    });
                });
            }
        });
        return isComplete;
    }
    return true;
};

export const isTabAccessible = (profileData, tabId, config) => {
    // Accessibility is now open for all tabs to allow non-linear completion
    if (!config?.tabs) return false;
    // Check if tabId exists in config
    return config.tabs.some(t => t.id === tabId);
};

export const calculateProfileCompleteness = (data, config) => {
    if (!data || !config?.tabs) return 0;
    const TABS_FOR_COMPLETENESS = config.tabs
        .map(t => t.id)
        .filter(tabId => {
            const isFacility = data?.role === 'facility' || data?.role === 'company';
            if (isFacility && tabId === 'account') return false;
            return true;
        });
    const completedTabs = TABS_FOR_COMPLETENESS.filter(tabId => isTabCompleted(data, tabId, config));
    return TABS_FOR_COMPLETENESS.length > 0 ? Math.round((completedTabs.length / TABS_FOR_COMPLETENESS.length) * 100) : 0;
};

