// FILE: /src/pages/dashboard/profile/professionals/components/BillingInformation.js
// VERSION: Config-Driven

import React, { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { get } from 'lodash';
import classNames from 'classnames';

// --- Import Base Components (Adjust Paths) ---
import CheckboxField from '../../../../../components/BoxedInputFields/CheckboxField';
import DropdownDate from '../../../../../components/BoxedInputFields/Dropdown-Date';
import DropdownField from '../../../../../components/BoxedInputFields/Dropdown-Field';
import SimpleDropdown from '../../../../../components/BoxedInputFields/Dropdown-Field';
import InputField from '../../../../../components/BoxedInputFields/Personnalized-InputField';
import Button from '../../../../../components/BoxedInputFields/Button';
import styles from '../../Profile.module.css'; // Use CSS module instead of regular CSS

// --- FAKE Dropdown Options (Replace with real data loading/i18n) ---
const FAKE_DROPDOWN_TRANSLATIONS = {
    cantons: [/* ... */],
    workPermits: [/* ... */]
};
// =====================================================================

const BillingInformation = ({
  formData,
  config,
  errors,
  isSubmitting,
  onInputChange, // Use this for all updates
  onSaveAndContinue,
  onCancel,
  getNestedValue,
}) => {
  const { t, i18n } = useTranslation(['dashboardProfile', 'dropdowns', 'common', 'validation']);

  const fieldsToRender = useMemo(() => config?.fields?.billingInformation || [], [config]);

  const getDropdownOptions = useCallback((optionsKey) => {
    // First, try to get the options from i18n dropdowns
    const dropdownTranslations = i18n.getResourceBundle(i18n.language, 'dropdowns');
    
    if (dropdownTranslations) {
      // Special case for key mappings
      const mappedKey = optionsKey === 'educationLevels' ? 'education' : optionsKey;
      
      // Try the original key first
      if (dropdownTranslations[optionsKey]) {
        return Object.entries(dropdownTranslations[optionsKey]).map(([key, value]) => ({
          value: key,
          label: value
        }));
      }
      
      // Then try the mapped key if it's different
      if (mappedKey !== optionsKey && dropdownTranslations[mappedKey]) {
        return Object.entries(dropdownTranslations[mappedKey]).map(([key, value]) => ({
          value: key,
          label: value
        }));
      }
    }
    
    // If nothing found, return empty array and warn in development
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`No options found for dropdown key: ${optionsKey}`);
    }
    
    return [];
  }, [i18n]);

  // Helper function to check dependency conditions from config
  const checkDependency = useCallback((fieldConfig) => {
      if (!fieldConfig.dependsOn) return true; // No dependency

      const dependentValue = getNestedValue(formData, fieldConfig.dependsOn);

      if (fieldConfig.dependsOnValue) {
          return fieldConfig.dependsOnValue.includes(dependentValue);
      }
      if (fieldConfig.dependsOnValueExclude) {
          return !fieldConfig.dependsOnValueExclude.includes(dependentValue);
      }
      return true; // Default if dependsOn is present but no values specified (shouldn't happen)
  }, [formData, getNestedValue]);

  // Renders a single field based on its configuration
  const renderField = (fieldConfig) => {
      const { name, type, required, labelKey, optionsKey, dependsOn, dependsOnValue, dependsOnValueExclude, maxYear, placeholder, ...restConfig } = fieldConfig;

      // Check dependency before rendering
      if (!checkDependency(fieldConfig)) {
          return null;
      }

      const value = getNestedValue(formData, name);
      const error = getNestedValue(errors, name);
      const label = t(labelKey, name);

      // Determine if field is *currently* required based on dependencies
       let isActuallyRequired = required;
       if (dependsOn && isActuallyRequired) {
          if (!checkDependency(fieldConfig)) {
             isActuallyRequired = false;
          }
       }
       const finalLabel = <>{label} {isActuallyRequired && <span className={styles.mandatoryMark}>*</span>}</>;

      const commonProps = { key: name, label: finalLabel, error: error, required: isActuallyRequired };

      switch (type) {
          case 'date':
              return <DropdownDate {...commonProps} value={value ? new Date(value) : null} onChange={(date) => onInputChange(name, date ? date.toISOString().split('T')[0] : null)} />;
          case 'dropdown':
              const options = getDropdownOptions(optionsKey);
              
              // Debug option loading issues
              if (options.length === 0 && process.env.NODE_ENV !== 'production') {
                console.warn(`No options found for dropdown ${name} with optionsKey ${optionsKey}`);
              }
              
              return (
                <SimpleDropdown
                  key={name}
                  label={commonProps.label}
                  options={options}
                  value={value}
                  onChange={(newValue) => {
                    console.log('SimpleDropdown onChange:', { name, newValue });
                    onInputChange(name, newValue);
                  }}
                  placeholder={placeholder || t('common.selectPlaceholder', 'Select...')}
                  required={commonProps.required}
                  error={commonProps.error}
                />
              );
          case 'checkbox':
              // Pass label without mandatory mark styling for checkbox itself
              return <CheckboxField {...commonProps} label={label} checked={!!value} onChange={(e) => onInputChange(name, e.target.checked)} />;
          case 'text':
          case 'number':
          default:
              return <InputField {...commonProps} name={name} type={type === 'number' ? 'number' : 'text'} value={value || ''} onChange={(e) => onInputChange(name, e.target.value)} min={type === 'number' ? restConfig.min : undefined} max={type === 'number' ? restConfig.max : undefined} />;
      }
  };

  // --- Component Render ---
  // Group fields by 'group' property from config for better structure
  const groupedFields = useMemo(() => {
      const groups = {};
      fieldsToRender.forEach(field => {
          const groupName = field.group || 'general';
          if (!groups[groupName]) {
              groups[groupName] = [];
          }
          groups[groupName].push(field);
      });
      return groups;
  }, [fieldsToRender]);


  return (
    <div className={styles.sectionContainer}>
      <h2 className={styles.sectionTitle}>{t('billingInformation.title')}</h2>
      <p className={styles.sectionSubtitle}>{t('billingInformation.subtitle')}</p>
      <div className={styles.mandatoryFieldLegend}><span className={styles.mandatoryMark}>*</span> {t('common.mandatoryFields')}</div>

      {/* Render sections based on groups */}
      {groupedFields.residency && (
          <>
            <h3 className={styles.subsectionTitle}>{t('billingInformation.residencyPermitTitle')}</h3>
            {groupedFields.residency.map(renderField)}
            <div className={styles.horizontalLine}></div>
          </>
      )}
      {groupedFields.banking && (
          <>
            <h3 className={styles.subsectionTitle}>{t('billingInformation.bankingInfo')}</h3>
            {groupedFields.banking.map(renderField)}
            <div className={styles.horizontalLine}></div>
          </>
      )}
       {groupedFields.insurance && (
          <>
            <h3 className={styles.subsectionTitle}>{t('billingInformation.insurance')}</h3>
            {groupedFields.insurance.map(renderField)}
            <div className={styles.horizontalLine}></div>
          </>
      )}
       {groupedFields.billingAddress && (
          <>
            <h3 className={styles.subsectionTitle}>{t('billingInformation.billingAddress')}</h3>
            {/* Render checkbox first */}
            {groupedFields.billingAddress.find(f => f.name === 'sameAsResidential') && renderField(groupedFields.billingAddress.find(f => f.name === 'sameAsResidential'))}
            {/* Render other fields (they will be filtered by dependency check in renderField) */}
             <div className={styles.nestedFormSection}> {/* Optional wrapper */}
                {groupedFields.billingAddress.filter(f => f.name !== 'sameAsResidential').map(renderField)}
            </div>
            <div className={styles.horizontalLine}></div>
          </>
      )}
      {/* Add rendering for other groups like 'family', 'spouse' if defined */}

      {/* --- Action Buttons --- */}
      <div className={styles.onboardingActions}>
        <Button onClick={onCancel} variant="secondary" disabled={isSubmitting}>
          {t('common.cancel')}
        </Button>
        <Button onClick={onSaveAndContinue} variant="confirmation" disabled={isSubmitting}>
          {isSubmitting ? t('common.saving') : t('common.saveAndContinue')}
        </Button>
      </div>
    </div>
  );
};

export default BillingInformation;