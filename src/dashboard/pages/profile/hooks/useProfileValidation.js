import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { get, set } from 'lodash';

export const useProfileValidation = (formData, profileConfig, activeTab, isLoadingConfig, isLoadingData) => {
    const { t } = useTranslation(['validation']);
    const [errors, setErrors] = useState({});
    const initialValidationRun = useRef(false);
    const prevActiveTab = useRef(null);

    const validateCurrentTabData = useCallback((dataToValidate = null, tabId = null, silent = false) => {
        const data = dataToValidate || formData;
        const currentTabId = tabId || activeTab;

        if (!profileConfig || !data) return false;
        const fieldsOrRules = profileConfig.fields[currentTabId];
        let isValid = true;
        const newErrors = {};

        const checkField = (fieldRule) => {
            const { name, required, dependsOn, dependsOnValue, dependsOnValueExclude, validationRules } = fieldRule;
            let isActuallyRequired = required;
            let shouldValidate = true;

            if (dependsOn) {
                const dependentValue = get(data, dependsOn);
                let conditionMet = true;
                if (dependsOnValue && !dependsOnValue.includes(dependentValue)) conditionMet = false;
                if (dependsOnValueExclude && dependsOnValueExclude.includes(dependentValue)) conditionMet = false;
                if (!conditionMet) { isActuallyRequired = false; shouldValidate = false; }
            }

            const value = get(data, name);
            const isEmpty = value === null || value === undefined || value === '' || (typeof value === 'string' && value.trim() === '');

            if (isActuallyRequired && isEmpty) {
                isValid = false;
                set(newErrors, name, t('validation:required'));
                shouldValidate = false;
            }

            if (shouldValidate && value && validationRules) {
                if (validationRules.minLength && String(value).length < validationRules.minLength) {
                    isValid = false;
                    set(newErrors, name, t('validation:minLength', { count: validationRules.minLength }));
                } else if (validationRules.pattern) {
                    try {
                        const regex = new RegExp(validationRules.pattern);
                        if (!regex.test(String(value))) {
                            isValid = false;
                            set(newErrors, name, t(validationRules.patternErrorKey || 'validation:invalidFormat'));
                        }
                    } catch (e) { }
                }
            }
        };

        if (Array.isArray(fieldsOrRules)) {
            fieldsOrRules.forEach(checkField);
        } else if (typeof fieldsOrRules === 'object') {
            Object.entries(fieldsOrRules).forEach(([key, rules]) => {
                const list = get(data, `professionalDetails.${key}`) || get(data, key);

                if (rules.minItems > 0) {
                    if (!Array.isArray(list) || list.length < rules.minItems) {
                        isValid = false;
                        set(newErrors, key, t('validation:minItemsRequired', { count: rules.minItems }));
                    }
                }

                if (Array.isArray(list) && list.length > 0) {
                    const itemSchemaRef = rules.itemSchemaRef;
                    const itemSchema = profileConfig?.itemSchemas?.[itemSchemaRef] || [];
                    list.forEach((item, itemIndex) => {
                        itemSchema.forEach((fieldRule) => {
                            const { name, required, dependsOn, dependsOnValue, dependsOnValueExclude, validationRules } = fieldRule;
                            let isActuallyRequired = required;
                            let shouldValidate = true;
                            if (dependsOn) {
                                const dependentValue = get(item, dependsOn);
                                let conditionMet = true;
                                if (dependsOnValue && !dependsOnValue.includes(dependentValue)) conditionMet = false;
                                if (dependsOnValueExclude && dependsOnValueExclude.includes(dependentValue)) conditionMet = false;
                                if (!conditionMet) { isActuallyRequired = false; shouldValidate = false; }
                            }
                            const fieldPath = `professionalDetails.${key}.${itemIndex}.${name}`;
                            const value = get(item, name);
                            const isEmpty = value === null || value === undefined || value === '' || (typeof value === 'string' && value.trim() === '');
                            if (isActuallyRequired && isEmpty) {
                                isValid = false;
                                set(newErrors, fieldPath, t('validation:required'));
                                shouldValidate = false;
                            }
                            if (shouldValidate && value && validationRules) {
                                if (validationRules.minLength && String(value).length < validationRules.minLength) {
                                    isValid = false;
                                    set(newErrors, fieldPath, t('validation:minLength', { count: validationRules.minLength }));
                                } else if (validationRules.pattern) {
                                    try {
                                        const regex = new RegExp(validationRules.pattern);
                                        if (!regex.test(String(value))) {
                                            isValid = false;
                                            set(newErrors, fieldPath, t(validationRules.patternErrorKey || 'validation:invalidFormat'));
                                        }
                                    } catch (e) { }
                                }
                            }
                        });
                    });
                }
            });
        }
        
        // Only set errors if not in silent mode
        if (!silent) {
            setErrors(newErrors);
        }
        
        return isValid;
    }, [activeTab, formData, profileConfig, t]);

    useEffect(() => {
        if (!isLoadingConfig && !isLoadingData && profileConfig && formData && activeTab && !initialValidationRun.current) {
            validateCurrentTabData();
            initialValidationRun.current = true;
        }
    }, [isLoadingConfig, isLoadingData, profileConfig, formData, activeTab, validateCurrentTabData]);

    useEffect(() => {
        if (!isLoadingConfig && !isLoadingData && profileConfig && formData && activeTab === 'professionalBackground') {
            validateCurrentTabData(null, null, false);
        }
        prevActiveTab.current = activeTab;
    }, [activeTab, isLoadingConfig, isLoadingData, profileConfig, formData, validateCurrentTabData]);

    useEffect(() => {
        if (!isLoadingConfig && !isLoadingData && profileConfig && formData && activeTab && initialValidationRun.current) {
            if (activeTab === 'professionalBackground') {
                return;
            }
            const timeoutId = setTimeout(() => {
                setErrors({});
            }, 400);
            return () => clearTimeout(timeoutId);
        }
    }, [activeTab, isLoadingConfig, isLoadingData, profileConfig, formData]);

    useEffect(() => {
        if (!isLoadingConfig && !isLoadingData && profileConfig && formData && activeTab && initialValidationRun.current) {
            if (activeTab === 'professionalBackground') {
                validateCurrentTabData(null, null, false);
                return;
            }
            const timeoutId = setTimeout(() => {
                validateCurrentTabData(null, null, true);
            }, 300);
            return () => clearTimeout(timeoutId);
        }
    }, [formData, isLoadingConfig, isLoadingData, profileConfig, activeTab, validateCurrentTabData]);

    return {
        errors,
        setErrors,
        validateCurrentTabData
    };
};

