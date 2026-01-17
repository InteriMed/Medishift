// FILE: /src/pages/dashboard/profile/professionals/professionalBackgroundUtils.js

import { get, set } from 'lodash';

/**
 * Validates a single item based on its schema definition.
 * @param {object} itemData - The data of the item being validated.
 * @param {array} itemSchema - The schema definition for this item type from the config.
 * @param {function} t - The translation function.
 * @returns {{isValid: boolean, errors: object}} - Validation result and errors object.
 */
export const validateProfileItem = (itemData, itemSchema, t) => {
    const errors = {};
    let isValid = true;

    if (!itemSchema) return { isValid: true, errors: {} };

    itemSchema.forEach(fieldRule => {
        const { name, required, dependsOn, validationRules } = fieldRule;
        let isActuallyRequired = required;

        // Check dependency for required status
        if (dependsOn) {
            const dependentValue = get(itemData, dependsOn);
            // Check if dependency condition is met to make the field required
            // dependsOnValue defines values that MAKE it required (if dependsOnValue is present)
            // dependsOnValueExclude defines values that make it NOT required (if dependsOnValueExclude is present)
            // Note: This logic might need refinement based on exact config needs. Example assumes dependsOnValue makes it required.
            let conditionMet = false;
            if (fieldRule.dependsOnValue) {
               conditionMet = fieldRule.dependsOnValue.includes(dependentValue);
            } else if (fieldRule.dependsOnValueExclude) {
                conditionMet = !fieldRule.dependsOnValueExclude.includes(dependentValue);
            } else {
                conditionMet = true; // If dependsOn is present but no value specified, assume dependency met
            }

            if (!conditionMet) {
                isActuallyRequired = false;
            }
        }

        // Check required field
        if (isActuallyRequired) {
            const value = get(itemData, name);
            if (value === null || value === undefined || value === '') {
                isValid = false;
                set(errors, name, t('validation.required'));
            }
        }

        // Add more specific validation rules based on config
        const value = get(itemData, name);
        if (value && validationRules) {
            // Example: Check minLength
            if (validationRules.minLength && String(value).length < validationRules.minLength) {
                isValid = false;
                set(errors, name, t('validation.minLength', { count: validationRules.minLength }));
            }
            // Example: Check pattern (regex)
            if (validationRules.pattern) {
                 try {
                     const regex = new RegExp(validationRules.pattern);
                     if (!regex.test(String(value))) {
                         isValid = false;
                         set(errors, name, t(validationRules.patternErrorKey || 'validation.invalidFormat'));
                     }
                 } catch (e) {
                     console.error("Invalid regex pattern in config:", validationRules.pattern, e);
                 }
            }
            // Add more rules (maxLength, numeric range, date comparisons, etc.)
        }
    });

    return { isValid, errors };
};

/**
 * Handles adding or updating an item in an array within the main form data.
 * @param {string} sectionKey - The key for the array in formData (e.g., 'education').
 * @param {object} itemData - The data of the item to add/update.
 * @param {number} editIndex - The index of the item being edited (-1 for adding).
 * @param {array} currentList - The current array from formData.
 * @param {function} onArrayChange - Callback to update the array in the parent state.
 * @param {function} resetFormStateCallback - Callback to reset the local form state in the component.
 * @param {object} validationResult - The result from validateProfileItem.
 * @param {function} setLocalErrorsCallback - Callback to set local item errors in the component.
 */
export const addOrUpdateProfileItem = ({
    sectionKey,
    itemData,
    editIndex,
    currentList,
    onArrayChange,
    resetFormStateCallback,
    validationResult,
    setLocalErrorsCallback
}) => {

    setLocalErrorsCallback(validationResult.errors); // Set errors locally regardless

    if (!validationResult.isValid) {
        console.warn(`Validation failed for ${sectionKey} item:`, validationResult.errors);
        return false; // Indicate failure
    }

    let updatedList;
    const list = Array.isArray(currentList) ? currentList : [];

    if (editIndex > -1) {
        updatedList = list.map((item, index) => index === editIndex ? itemData : item);
    } else {
        updatedList = [...list, itemData];
    }

    onArrayChange(sectionKey, updatedList);
    resetFormStateCallback();
    return true; // Indicate success
};

/**
 * Handles deleting an item from an array within the main form data.
 * @param {string} sectionKey - The key for the array in formData (e.g., 'education').
 * @param {number} indexToDelete - The index of the item to delete.
 * @param {array} currentList - The current array from formData.
 * @param {function} onArrayChange - Callback to update the array in the parent state.
 */
export const deleteProfileItem = ({
    sectionKey,
    indexToDelete,
    currentList,
    onArrayChange
}) => {
    const list = Array.isArray(currentList) ? currentList : [];
    const updatedList = list.filter((_, i) => i !== indexToDelete);
    onArrayChange(sectionKey, updatedList);
};