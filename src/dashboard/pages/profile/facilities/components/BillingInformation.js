// FILE: /src/pages/dashboard/profile/professionals/components/BillingInformation.js
// VERSION: Config-Driven

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { get } from 'lodash';
import classNames from 'classnames';
import { FiEye, FiShield } from 'react-icons/fi';

// --- Import Base Components (Adjust Paths) ---
import CheckboxField from '../../../../../components/BoxedInputFields/CheckboxField';
import DateField from '../../../../../components/BoxedInputFields/DateField';
import DropdownField from '../../../../../components/BoxedInputFields/Dropdown-Field';
import SimpleDropdown from '../../../../../components/BoxedInputFields/Dropdown-Field';
import InputField from '../../../../../components/BoxedInputFields/Personnalized-InputField';
import Button from '../../../../../components/BoxedInputFields/Button';
import BankingAccessModal from '../../components/BankingAccessModal';
import styles from '../../Profile.module.css'; // Use CSS module instead of regular CSS
import useAutoSave from '../../../../hooks/useAutoSave';
import { LOCALSTORAGE_KEYS } from '../../../../../config/keysDatabase';

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
  onInputChange,
  onSaveAndContinue,
  onSave,
  onCancel,
  getNestedValue,
  validateCurrentTabData,
  onTabCompleted,
  isTutorialActive
}) => {
  const { t, i18n } = useTranslation(['dashboardProfile', 'dropdowns', 'common', 'validation']);
  const [showBankingAccessModal, setShowBankingAccessModal] = useState(false);
  const [hasBankingAccess, setHasBankingAccess] = useState(false);

  const fieldsToRender = useMemo(() => config?.fields?.billingInformation || [], [config]);

  const checkBankingAccess = useCallback(() => {
    const accessExpiry = localStorage.getItem(LOCALSTORAGE_KEYS.BANKING_ACCESS_GRANTED);
    if (!accessExpiry) return false;
    
    const expiryTime = parseInt(accessExpiry, 10);
    if (Date.now() > expiryTime) {
      localStorage.removeItem(LOCALSTORAGE_KEYS.BANKING_ACCESS_GRANTED);
      return false;
    }
    return true;
  }, []);

  useEffect(() => {
    setHasBankingAccess(checkBankingAccess());
    
    const interval = setInterval(() => {
      const stillHasAccess = checkBankingAccess();
      if (hasBankingAccess && !stillHasAccess) {
        setHasBankingAccess(false);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [checkBankingAccess, hasBankingAccess]);

  const handleBankingAccessSuccess = () => {
    setHasBankingAccess(true);
    setShowBankingAccessModal(false);
  };

  const handleUnlockBanking = () => {
    setShowBankingAccessModal(true);
  };

  const getMaskedValue = (value, fieldName) => {
    if (!value) return '';
    
    if (fieldName.includes('iban')) {
      return '•••• •••• •••• ••••';
    }
    return '•'.repeat(Math.min(value.length, 20));
  };

  useAutoSave({
    formData,
    config,
    activeTab: 'facilityLegalBilling',
    onInputChange,
    onSave,
    getNestedValue,
    validateCurrentTabData,
    onTabCompleted,
    isTutorialActive,
    disableLocalStorage: true
  });

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
      // No options found for dropdown key
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

      const rawValue = getNestedValue(formData, name);
      const isBankingField = fieldConfig.group === 'banking';
      const shouldMaskValue = isBankingField && !hasBankingAccess;
      
      const value = shouldMaskValue ? getMaskedValue(rawValue, name) : rawValue;
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
              return <DateField {...commonProps} value={value ? new Date(value) : null} onChange={(date) => onInputChange(name, date ? date.toISOString().split('T')[0] : null)} />;
          case 'dropdown':
              const options = getDropdownOptions(optionsKey);
              
              // Debug option loading issues
              if (options.length === 0 && process.env.NODE_ENV !== 'production') {
                // No options found for dropdown
              }
              
              return (
                <SimpleDropdown
                  key={name}
                  label={commonProps.label}
                  options={options}
                  value={value}
                  onChange={(newValue) => {
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
              return <InputField {...commonProps} name={name} type={type === 'number' ? 'number' : 'text'} value={value || ''} onChange={(e) => onInputChange(name, e.target.value)} min={type === 'number' ? restConfig.min : undefined} max={type === 'number' ? restConfig.max : undefined} disabled={shouldMaskValue} readOnly={shouldMaskValue} className={shouldMaskValue ? 'banking-masked' : ''} />;
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
            <div className="flex items-center justify-between mb-4">
              <h3 className={styles.subsectionTitle}>{t('billingInformation.bankingInfo')}</h3>
              {!hasBankingAccess && (
                <Button
                  variant="outline"
                  onClick={handleUnlockBanking}
                  className="flex items-center gap-2"
                >
                  <FiEye className="w-4 h-4" />
                  {t('billingInformation.viewBankingData', 'View Data')}
                </Button>
              )}
              {hasBankingAccess && (
                <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                  <FiShield className="w-4 h-4" />
                  {t('billingInformation.bankingAccessGranted', 'Access granted')}
                </div>
              )}
            </div>
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

      <BankingAccessModal
        isOpen={showBankingAccessModal}
        onClose={() => setShowBankingAccessModal(false)}
        onSuccess={handleBankingAccessSuccess}
        userEmail={getNestedValue(formData, 'billingContact.email') || getNestedValue(formData, 'mainEmail')}
        userPhone={getNestedValue(formData, 'billingContact.phone') || getNestedValue(formData, 'legalRepresentative.phone')}
      />
    </div>
  );
};

export default BillingInformation;