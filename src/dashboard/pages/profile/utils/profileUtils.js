import { get } from 'lodash';

export const isTabCompleted = (profileData, tabId, config) => {
    if (!profileData || !config?.fields) return false;
    if (!config.fields[tabId]) return true;
    const fieldsOrRules = config.fields[tabId];

    if (Array.isArray(fieldsOrRules)) {
        return fieldsOrRules.every(field => {
            if (!field.required) return true;
            if (field.dependsOn) {
                const dependentValue = get(profileData, field.dependsOn);
                if (field.dependsOnValue && !field.dependsOnValue.includes(dependentValue)) return true;
                if (field.dependsOnValueExclude && field.dependsOnValueExclude.includes(dependentValue)) return true;
            }
            const value = get(profileData, field.name);
            const isEmpty = value === null || value === undefined || value === '' || (typeof value === 'string' && value.trim() === '');

            return !isEmpty;
        });
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
    if (!config?.tabs) return tabId === config?.tabs?.[0]?.id;
    const tabIndex = config.tabs.findIndex(t => t.id === tabId);
    if (tabIndex <= 0) return true;

    for (let i = 0; i < tabIndex; i++) {
        if (!isTabCompleted(profileData, config.tabs[i].id, config)) {
            return false;
        }
    }
    return true;
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

