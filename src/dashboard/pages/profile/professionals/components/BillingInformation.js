import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiBriefcase, FiCreditCard, FiDollarSign, FiHome, FiShield, FiEdit2 } from 'react-icons/fi';
import { httpsCallable } from 'firebase/functions';

import SimpleDropdown from '../../../../../components/BoxedInputFields/Dropdown-Field';
import InputField from '../../../../../components/BoxedInputFields/Personnalized-InputField';
import DateField from '../../../../../components/BoxedInputFields/DateField';
import Switch from '../../../../../components/BoxedInputFields/Switch';
import Button from '../../../../../components/BoxedInputFields/Button';
import Dialog from '../../../../../components/Dialog/Dialog';
import BankingAccessModal from '../../components/BankingAccessModal';
import useAutoSave from '../../../../hooks/useAutoSave';
import { functions } from '../../../../../services/firebase';

import { useDropdownOptions } from '../../utils/DropdownListsImports';
import { LOCALSTORAGE_KEYS } from '../../../../../config/keysDatabase';

// --- FAKE Dropdown Options (Replace with real data loading/i18n) ---

// Tailwind styles
const styles = {
  headerCard: "bg-card rounded-xl border border-border px-6 py-4 hover:shadow-md transition-shadow w-full max-w-[1400px] mx-auto flex flex-col billing-information-header",
  sectionTitle: "text-2xl font-semibold mb-0",
  sectionTitleStyle: { fontSize: '18px', color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  sectionSubtitle: "text-sm font-medium",
  sectionSubtitleStyle: { color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  subtitleRow: "flex items-end justify-between gap-4",
  mandatoryFieldLegend: "text-xs",
  mandatoryFieldLegendStyle: { color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  hiringMandatoryMark: "text-orange-500"
};

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
  completionPercentage,
  handleAutoFillClick,
  isUploading,
  isAnalyzing,
  autoFillButtonRef,
  uploadInputRef,
  handleFileUpload,
  uploadProgress,
  t: tProp,
  isTutorialActive = false,
  stepData = null,
}) => {
  const { t, i18n } = useTranslation(['dashboardProfile', 'dropdowns', 'common', 'validation']);
  const [showHiringInfo, setShowHiringInfo] = useState(false);
  const [showBankingAccessModal, setShowBankingAccessModal] = useState(false);
  const [hasBankingAccess, setHasBankingAccess] = useState(false);

  const previousBankingRef = useRef(null);
  const bankingModifiedRef = useRef(false);

  const dropdownOptionsFromHook = useDropdownOptions();

  useEffect(() => {
    if (formData?.banking && !previousBankingRef.current) {
      previousBankingRef.current = JSON.stringify({
        iban: formData.banking?.iban || '',
        bankName: formData.banking?.bankName || '',
        accountHolderName: formData.banking?.accountHolderName || ''
      });
    }
  }, [formData?.banking]);

  const trackBankingChange = useCallback((fieldName) => {
    if (fieldName.startsWith('banking.')) {
      bankingModifiedRef.current = true;
    }
  }, []);

  const wrappedOnInputChange = useCallback((name, value) => {
    trackBankingChange(name);
    onInputChange(name, value);
  }, [onInputChange, trackBankingChange]);

  const sendBankingUpdateNotification = useCallback(async () => {
    if (!bankingModifiedRef.current || !hasBankingAccess) return;

    const currentBanking = JSON.stringify({
      iban: formData?.banking?.iban || '',
      bankName: formData?.banking?.bankName || '',
      accountHolderName: formData?.banking?.accountHolderName || ''
    });

    if (currentBanking === previousBankingRef.current) return;

    try {
      const notifyBankingUpdate = httpsCallable(functions, 'notifyBankingUpdate');
      const ibanLast4 = formData?.banking?.iban ? formData.banking.iban.slice(-4) : '';
      await notifyBankingUpdate({
        bankName: formData?.banking?.bankName || '',
        ibanLast4
      });
      previousBankingRef.current = currentBanking;
      bankingModifiedRef.current = false;
    } catch (error) {
      // Error silently ignored
    }
  }, [formData?.banking, hasBankingAccess]);

  const handleSaveWithNotification = useCallback(async () => {
    const result = await onSave();
    if (result) {
      await sendBankingUpdateNotification();
    }
    return result;
  }, [onSave, sendBankingUpdateNotification]);


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

  const hasExistingBankingInfo = useMemo(() => {
    return formData?.banking && (
      formData.banking.iban ||
      formData.banking.bankName ||
      formData.banking.accountHolderName
    );
  }, [formData]);

  useEffect(() => {
    if (!hasExistingBankingInfo) {
      const expiresAt = Date.now() + (60 * 60 * 1000);
      localStorage.setItem(LOCALSTORAGE_KEYS.BANKING_ACCESS_GRANTED, expiresAt.toString());
      setHasBankingAccess(true);
    } else {
      setHasBankingAccess(checkBankingAccess());
    }

    const interval = setInterval(() => {
      const stillHasAccess = checkBankingAccess();
      if (hasBankingAccess && !stillHasAccess) {
        setHasBankingAccess(false);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [checkBankingAccess, hasBankingAccess, hasExistingBankingInfo]);

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

  const fieldsToRender = useMemo(() => config?.fields?.billingInformation || [], [config]);

  const extractBillingData = useCallback(() => {
    if (!formData || !fieldsToRender) return null;
    const billingData = {};
    fieldsToRender.forEach(field => {
      const value = getNestedValue(formData, field.name);
      if (value !== undefined && value !== null) {
        billingData[field.name] = value;
      }
    });
    return billingData;
  }, [formData, fieldsToRender, getNestedValue]);

  useAutoSave({
    formData,
    config,
    activeTab: 'billingInformation',
    onInputChange: wrappedOnInputChange,
    onSave: handleSaveWithNotification,
    getNestedValue,
    extractTabData: extractBillingData,
    validateCurrentTabData,
    disableLocalStorage: true
  });


  const getDropdownOptions = useCallback((optionsKey) => {
    // Handle special cases for optionsKey mapping
    const mappedOptionsKey = optionsKey === 'educationLevels' ? 'education' : optionsKey;

    // First try using the hook with mapped key
    const suffixedKey = `${mappedOptionsKey}Options`;
    const optionsFromHook = dropdownOptionsFromHook[suffixedKey];
    if (optionsFromHook && optionsFromHook.length > 0) {
      return optionsFromHook;
    }

    // Also try with specific educationLevel naming (legacy support)
    if (optionsKey === 'educationLevels') {
      const educationLevelOptions = dropdownOptionsFromHook['educationLevelOptions'];
      if (educationLevelOptions && educationLevelOptions.length > 0) {
        return educationLevelOptions;
      }
    }

    // Try direct access to translations
    const dropdownTranslations = i18n.getResourceBundle(i18n.language, 'dropdowns');
    if (dropdownTranslations) {
      // First try the original key
      if (dropdownTranslations[optionsKey]) {
        return Object.entries(dropdownTranslations[optionsKey]).map(([key, value]) => ({
          value: key,
          label: value
        }));
      }
      // Then try the mapped key if different
      if (mappedOptionsKey !== optionsKey && dropdownTranslations[mappedOptionsKey]) {
        return Object.entries(dropdownTranslations[mappedOptionsKey]).map(([key, value]) => ({
          value: key,
          label: value
        }));
      }
    }

    return [];
  }, [dropdownOptionsFromHook, i18n]);

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
  const renderField = (fieldConfig, isSingleColumn = false) => {
    const { name, type, required, labelKey, optionsKey, dependsOn, dependsOnValue, dependsOnValueExclude, maxYear, placeholder, hidden, ...restConfig } = fieldConfig;

    if (hidden) {
      return null;
    }

    // Check dependency before rendering
    if (!checkDependency(fieldConfig)) {
      return null;
    }

    const rawValue = getNestedValue(formData, name);
    const isBankingField = fieldConfig.group === 'banking';
    const shouldMaskValue = isBankingField && hasExistingBankingInfo && !hasBankingAccess;

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
    const showHiringStar = fieldConfig.requiredForHiring && !isActuallyRequired && checkDependency(fieldConfig);
    const finalLabel = <>{label} {isActuallyRequired && <span className="boxed-inputfield-required">*</span>} {showHiringStar && <span className={styles.hiringMandatoryMark}>*</span>}</>;

    // Common props without the key
    const commonProps = {
      label: finalLabel,
      error: error,
      required: isActuallyRequired
    };

    switch (type) {
      case 'date':
        const maxDateValue = maxYear
          ? new Date(maxYear, 11, 31).toISOString().split('T')[0]
          : new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0];

        return (
          <DateField
            key={name}
            label={finalLabel}
            value={value}
            onChange={(dateObj) => {
              const dateStr = dateObj ? dateObj.toISOString().split('T')[0] : null;
              wrappedOnInputChange(name, dateStr);
            }}
            max={maxDateValue}
            error={error}
            required={isActuallyRequired}
            marginBottom={0}
          />
        );
      case 'dropdown':
        const options = getDropdownOptions(optionsKey);

        return (
          <SimpleDropdown
            key={name}
            label={label}
            options={options}
            value={value}
            onChange={(newValue) => {
              wrappedOnInputChange(name, newValue);
            }}
            placeholder={placeholder || t('common.selectPlaceholder', 'Select...')}
            required={isActuallyRequired}
            error={commonProps.error}
          />
        );
      case 'checkbox':
      case 'switch':
        return (
          <Switch
            key={name}
            label={label}
            checked={!!value}
            onChange={(checked) => wrappedOnInputChange(name, checked)}
            marginBottom={name === 'payrollData.withholdingTaxInfo.isSubject' ? '0' : '20px'}
          />
        );
      case 'text':
      case 'number':
      default:
        return (
          <InputField
            key={name}
            label={label}
            error={error}
            required={isActuallyRequired}
            name={name}
            type={type === 'number' ? 'number' : 'text'}
            value={value || ''}
            onChange={(e) => wrappedOnInputChange(name, e.target.value)}
            min={type === 'number' ? restConfig.min : undefined}
            max={type === 'number' ? restConfig.max : undefined}
            disabled={shouldMaskValue}
            readOnly={shouldMaskValue}
            className={shouldMaskValue ? 'banking-masked' : ''}
          />
        );
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

    // Reorder payrollData fields: tax fields should come after religion
    if (groups.payrollData) {
      const payrollFields = groups.payrollData;
      const taxFields = payrollFields.filter(f => f.name && f.name.includes('withholdingTaxInfo'));
      const beforeTax = [];
      const afterTax = [];
      let foundReligion = false;

      payrollFields.forEach(field => {
        if (field.name && field.name.includes('withholdingTaxInfo')) {
          return; // Skip tax fields, they'll be added separately
        }
        if (field.name === 'payrollData.religion') {
          foundReligion = true;
          beforeTax.push(field);
        } else if (foundReligion) {
          afterTax.push(field);
        } else {
          beforeTax.push(field);
        }
      });

      groups.payrollData = [...beforeTax, ...taxFields, ...afterTax];
    }

    return groups;
  }, [fieldsToRender]);



  return (
    <>
      <div className="profile-sections-wrapper">
        {/* Employment Eligibility Section */}
        {groupedFields.employmentEligibility && (
          <div className="profile-section-card" style={{ zIndex: 10 }}>
            <div className="profile-card-header">
              <div className="profile-card-icon-wrapper"><FiBriefcase className="w-4 h-4" style={{ color: 'var(--primary-color)' }} /></div>
              <div className="profile-card-title">
                <h3 className="profile-card-title-h3">{t('billingInformation.employmentEligibilityTitle')}</h3>
              </div>
            </div>
            <div className="profile-field-grid">
              {groupedFields.employmentEligibility.map(renderField)}
            </div>
          </div>
        )}

        {/* Banking Information Section */}
        {groupedFields.banking && (
          <div className="profile-section-card" style={{ zIndex: 9 }}>
            <div className="profile-card-header">
              <div className="profile-card-icon-wrapper"><FiCreditCard className="w-4 h-4" style={{ color: 'var(--primary-color)' }} /></div>
              <div className="profile-card-title">
                <h3 className="profile-card-title-h3">{t('billingInformation.bankingInfo')}</h3>
              </div>
              {hasExistingBankingInfo && !hasBankingAccess && (
                <button
                  onClick={handleUnlockBanking}
                  className="p-2 text-muted-foreground hover:text-primary transition-colors"
                  title={t('common.edit', 'Edit')}
                >
                  <FiEdit2 className="w-4 h-4" />
                </button>
              )}
              {hasBankingAccess && (
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-logo-1)' }}>
                  <FiShield className="w-3 h-3" style={{ color: 'var(--color-logo-1)' }} />
                  {t('billingInformation.bankingAccessGranted', 'Access granted')}
                </div>
              )}
            </div>
            <div className="profile-field-grid">
              {groupedFields.banking.map(renderField)}
            </div>
          </div>
        )}

        {/* Billing Address Section */}
        {groupedFields.billingAddress && (
          <div className="profile-section-card">
            <div className="profile-card-header">
              <div className="profile-card-icon-wrapper"><FiHome className="w-4 h-4" style={{ color: 'var(--primary-color)' }} /></div>
              <div className="profile-card-title">
                <h3 className="profile-card-title-h3">{t('billingInformation.billingAddress')}</h3>
              </div>
            </div>
            <div className="profile-field-grid">
              {groupedFields.billingAddress.find(f => f.name === 'sameAsResidential') && renderField(groupedFields.billingAddress.find(f => f.name === 'sameAsResidential'))}
              {groupedFields.billingAddress.filter(f => f.name !== 'sameAsResidential').map(renderField)}
            </div>
          </div>
        )}

        {/* Payroll Data Section */}
        {groupedFields.payrollData && (
          <div className="profile-section-card">
            <div className="profile-card-header">
              <div className="profile-card-icon-wrapper"><FiDollarSign className="w-4 h-4" style={{ color: 'var(--primary-color)' }} /></div>
              <div className="profile-card-title">
                <h3 className="profile-card-title-h3">{t('billingInformation.payrollDataTitle')}</h3>
              </div>
            </div>
            <div className="profile-field-grid">
              {groupedFields.payrollData.map(field => renderField(field, true))}
            </div>
          </div>
        )}
      </div>
      <Dialog
        isOpen={showHiringInfo}
        onClose={() => setShowHiringInfo(false)}
        title={t('billingInformation.hiringInfoTitle')}
        actions={<Button onClick={() => setShowHiringInfo(false)} variant="primary">OK</Button>}
      >
        <p>{t('billingInformation.hiringInfoMessage')}</p>
      </Dialog>

      <BankingAccessModal
        isOpen={showBankingAccessModal}
        onClose={() => setShowBankingAccessModal(false)}
        onSuccess={handleBankingAccessSuccess}
        userEmail={getNestedValue(formData, 'contact.primaryEmail')}
        userPhone={getNestedValue(formData, 'contact.primaryPhone')}
        userPhonePrefix={getNestedValue(formData, 'contact.primaryPhonePrefix')}
      />
    </>
  );
};

BillingInformation.propTypes = {
  formData: PropTypes.object.isRequired,
  config: PropTypes.shape({
    fields: PropTypes.shape({
      billingInformation: PropTypes.array
    })
  }).isRequired,
  errors: PropTypes.object.isRequired,
  isSubmitting: PropTypes.bool.isRequired,
  onInputChange: PropTypes.func.isRequired,
  onSaveAndContinue: PropTypes.func.isRequired,
  onSave: PropTypes.func,
  onCancel: PropTypes.func.isRequired,
  getNestedValue: PropTypes.func.isRequired,
  isTutorialActive: PropTypes.bool,
  stepData: PropTypes.object
};

export default BillingInformation;