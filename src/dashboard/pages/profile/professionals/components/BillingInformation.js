import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import classNames from 'classnames';
import { FiBriefcase, FiCreditCard, FiDollarSign, FiHome, FiShield, FiEye, FiEdit2, FiMail, FiZap } from 'react-icons/fi';
import { httpsCallable } from 'firebase/functions';

import BoxedSwitchField from '../../../../../components/BoxedInputFields/BoxedSwitchField';
import SimpleDropdown from '../../../../../components/BoxedInputFields/Dropdown-Field';

import InputField from '../../../../../components/BoxedInputFields/Personnalized-InputField';
import DateField from '../../../../../components/BoxedInputFields/DateField';
import Button from '../../../../../components/BoxedInputFields/Button';
import Dialog from '../../../../../components/Dialog/Dialog';
import BankingAccessModal from '../../components/BankingAccessModal';
import useAutoSave from '../../../../hooks/useAutoSave';
import { functions } from '../../../../../services/firebase';
import UploadFile from '../../../../../components/BoxedInputFields/UploadFile';
import LoadingSpinner from '../../../../../components/LoadingSpinner/LoadingSpinner';
import { cn } from '../../../../../utils/cn';

import { useDropdownOptions } from '../../utils/DropdownListsImports';
import { LOCALSTORAGE_KEYS } from '../../../../../config/keysDatabase';

// --- FAKE Dropdown Options (Replace with real data loading/i18n) ---

// Tailwind styles
const styles = {
  sectionContainer: "flex flex-col gap-6 p-1 w-full max-w-[1400px] mx-auto",
  headerCard: "bg-card rounded-2xl border border-border/50 px-6 py-4 shadow-lg backdrop-blur-sm w-full max-w-[1400px] mx-auto flex flex-col billing-information-header",
  sectionTitle: "text-2xl font-semibold mb-0",
  sectionTitleStyle: { fontSize: '18px', color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  sectionSubtitle: "text-sm font-medium",
  sectionSubtitleStyle: { color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  subtitleRow: "flex items-end justify-between gap-4",
  mandatoryFieldLegend: "text-xs",
  mandatoryFieldLegendStyle: { color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  hiringMandatoryMark: "text-orange-500",
  sectionsWrapper: "billing-information-sections-wrapper w-full max-w-[1400px] mx-auto",
  leftColumn: "flex flex-col gap-6 flex-1",
  rightColumn: "flex flex-col gap-6 flex-1",
  sectionCard: "bg-card rounded-2xl border border-border/50 p-6 shadow-lg backdrop-blur-sm w-full overflow-visible",
  cardHeader: "flex items-center gap-3 mb-4 pb-3 border-b border-border/40",
  cardIconWrapper: "p-2.5 rounded-xl bg-primary/10 flex-shrink-0",
  cardIconStyle: { color: 'var(--primary-color)' },
  cardTitle: "flex-1 min-w-0",
  cardTitleH3: "m-0 text-sm font-semibold truncate",
  cardTitleH3Style: { color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  grid: "grid grid-cols-1 gap-6 overflow-visible",
  gridSingle: "grid grid-cols-1 gap-6",
  fieldWrapper: "space-y-2",
  fullWidth: "md:col-span-2",
  formActions: "flex justify-end gap-4 w-full max-w-[1400px] mx-auto"
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
  onTabCompleted,
  isTutorialActive,
  completionPercentage,
  handleAutoFillClick,
  isUploading,
  isAnalyzing,
  autoFillButtonRef,
  uploadInputRef,
  handleFileUpload,
  uploadProgress,
  t: tProp,
  stepData
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

  const handleTestEmail = useCallback(async () => {
    try {
      const notifyBankingUpdate = httpsCallable(functions, 'notifyBankingUpdate');
      const ibanLast4 = formData?.banking?.iban ? formData.banking.iban.slice(-4) : 'XXXX';
      await notifyBankingUpdate({
        bankName: formData?.banking?.bankName || 'Test Bank',
        ibanLast4
      });
      alert(t('billingInformation.testEmailSent', 'Test email sent successfully'));
    } catch (error) {
      alert(t('billingInformation.testEmailFailed', 'Failed to send test email'));
    }
  }, [formData?.banking, t]);

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
    onTabCompleted,
    isTutorialActive,
    disableLocalStorage: true
  });

  const hasExistingBillingInfo = useMemo(() => {
    return formData && (
      (formData.billingInformation && Object.keys(formData.billingInformation).length > 0) ||
      (formData.payrollData && Object.keys(formData.payrollData).length > 0) ||
      (formData.banking && Object.keys(formData.banking).length > 0)
    );
  }, [formData]);


  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    }
    window.location.reload();
  }, [onCancel]);

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
          <BoxedSwitchField
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


  // Save and Continue handler that shows info dialog if hiring-required fields are missing
  const handleSaveAndContinueClick = useCallback(() => {
    try {
      const missingHiring = fieldsToRender
        .filter(f => f.requiredForHiring)
        .filter(f => checkDependency(f))
        .some(f => {
          const v = getNestedValue(formData, f.name);
          return v === undefined || v === null || v === '';
        });
      if (missingHiring) {
        setShowHiringInfo(true);
      }
    } catch { }
    onSaveAndContinue();
  }, [fieldsToRender, formData, getNestedValue, onSaveAndContinue, checkDependency]);

  return (
    <div className={styles.sectionContainer} style={{ position: 'relative' }}>
      <style>{`
        .billing-information-container {
          container-type: inline-size;
        }
        
        .billing-information-header-grid {
          display: grid;
          gap: 1.5rem;
          width: 100%;
          grid-template-columns: 1fr 1fr;
          grid-template-areas: 
            "title title"
            "completion autofill";
          align-items: center;
        }

        .header-title-row {
          grid-area: title;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .header-completion-centered {
          grid-area: completion;
          display: flex;
          justify-content: flex-start;
          width: 100%;
        }

        .header-autofill-right {
          grid-area: autofill;
          display: flex;
          justify-content: flex-end;
        }

        .billing-information-sections-wrapper {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        @container (max-width: 700px) {
          .billing-information-sections-wrapper {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <div className={styles.headerCard}>
        <div className="billing-information-header-grid">
          <div className="header-title-row">
            <h2 className={styles.sectionTitle} style={styles.sectionTitleStyle}>{t('billingInformation.title')}</h2>
            <p className={styles.sectionSubtitle} style={styles.sectionSubtitleStyle}>{t('billingInformation.subtitle', 'Provide your employment and billing details.')}</p>
          </div>

          {isTutorialActive && (
            <>
              <div className="header-completion-centered">
                {formData && completionPercentage !== undefined && (
                  <div className="flex items-center gap-3 px-4 bg-muted/30 rounded-xl border-2 border-input" style={{ height: 'var(--boxed-inputfield-height)' }}>
                    <span className="text-sm font-medium text-muted-foreground">{t('dashboardProfile:profile.profileCompletion')}</span>
                    <div className="w-32 h-2.5 bg-muted rounded-full overflow-hidden shadow-inner">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 rounded-full"
                        style={{ width: `${completionPercentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-semibold text-foreground">{completionPercentage}%</span>
                  </div>
                )}
              </div>

              <div className="header-autofill-right">
                <div className="relative" ref={autoFillButtonRef}>
                  <button
                    onClick={handleAutoFillClick}
                    disabled={isUploading || isAnalyzing}
                    className={cn(
                      "group px-4 flex items-center justify-center gap-2 rounded-xl transition-all shrink-0",
                      (isUploading || isAnalyzing) && "opacity-50 cursor-not-allowed",
                      (stepData?.highlightUploadButton) && "tutorial-highlight"
                    )}
                    style={{ height: 'var(--boxed-inputfield-height)', backgroundColor: 'rgba(255, 191, 14, 1)' }}
                    data-tutorial="profile-upload-button"
                  >
                    {isAnalyzing ? <LoadingSpinner size="sm" /> : <FiZap className="w-4 h-4 text-muted-foreground group-hover:text-black transition-colors" />}
                    <span className="text-sm font-medium text-muted-foreground group-hover:text-black transition-colors">
                      {isAnalyzing
                        ? t('dashboardProfile:documents.analyzing', 'Analyzing...')
                        : t('dashboardProfile:documents.autofill', 'Auto Fill')
                      }
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        {isTutorialActive && uploadInputRef && (
          <UploadFile
            ref={uploadInputRef}
            onChange={handleFileUpload}
            isLoading={isUploading}
            progress={uploadProgress}
            accept=".pdf,.doc,.docx,.jpg,.png"
            label=""
            className="hidden"
          />
        )}
      </div>

      <div className="billing-information-container w-full max-w-[1400px] mx-auto">
        <div className={styles.sectionsWrapper}>
          <div className={styles.leftColumn}>
            {groupedFields.employmentEligibility && (
              <div className={styles.sectionCard} style={{ position: 'relative', zIndex: 10 }}>
                <div className={styles.grid}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardIconWrapper}><FiBriefcase className="w-4 h-4" style={styles.cardIconStyle} /></div>
                    <div className={styles.cardTitle}>
                      <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{t('billingInformation.employmentEligibilityTitle')}</h3>
                    </div>
                  </div>
                  {groupedFields.employmentEligibility.map(renderField)}
                </div>
              </div>
            )}

            {/* Banking Information Section */}
            {groupedFields.banking && (
              <div className={styles.sectionCard} style={{ position: 'relative', zIndex: 5 }}>
                <div className={styles.grid}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardIconWrapper}><FiCreditCard className="w-4 h-4" style={styles.cardIconStyle} /></div>
                    <div className={styles.cardTitle}>
                      <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{t('billingInformation.bankingInfo')}</h3>
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
                  {groupedFields.banking.map(renderField)}
                </div>
              </div>
            )}

            {/* Legacy sections for backward compatibility */}
            {groupedFields.residency && (
              <div className={styles.sectionCard}>
                <div className={styles.grid}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardIconWrapper}><FiBriefcase className="w-4 h-4" style={styles.cardIconStyle} /></div>
                    <div className={styles.cardTitle}>
                      <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{t('billingInformation.residencyPermitTitle')}</h3>
                    </div>
                  </div>
                  {groupedFields.residency.map(renderField)}
                </div>
              </div>
            )}

            {groupedFields.insurance && (
              <div className={styles.sectionCard}>
                <div className={styles.grid}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardIconWrapper}><FiShield className="w-4 h-4" style={styles.cardIconStyle} /></div>
                    <div className={styles.cardTitle}>
                      <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{t('billingInformation.insurance')}</h3>
                    </div>
                  </div>
                  {groupedFields.insurance.map(renderField)}
                </div>
              </div>
            )}

            {groupedFields.billingAddress && (
              <div className={styles.sectionCard}>
                <div className={styles.grid}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardIconWrapper}><FiHome className="w-4 h-4" style={styles.cardIconStyle} /></div>
                    <div className={styles.cardTitle}>
                      <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{t('billingInformation.billingAddress')}</h3>
                    </div>
                  </div>
                  {groupedFields.billingAddress.find(f => f.name === 'sameAsResidential') && renderField(groupedFields.billingAddress.find(f => f.name === 'sameAsResidential'))}
                  {groupedFields.billingAddress.filter(f => f.name !== 'sameAsResidential').map(renderField)}
                </div>
              </div>
            )}
          </div>

          <div className={styles.rightColumn}>
            {groupedFields.payrollData && (
              <div className={styles.sectionCard}>
                <div className={styles.gridSingle}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardIconWrapper}><FiDollarSign className="w-4 h-4" style={styles.cardIconStyle} /></div>
                    <div className={styles.cardTitle}>
                      <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{t('billingInformation.payrollDataTitle')}</h3>
                    </div>
                  </div>
                  {groupedFields.payrollData.map(field => renderField(field, true))}
                </div>
              </div>
            )}
          </div>
        </div>
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
    </div>
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
  getNestedValue: PropTypes.func.isRequired
};

export default BillingInformation;