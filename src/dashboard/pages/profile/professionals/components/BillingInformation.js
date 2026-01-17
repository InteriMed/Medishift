import React, { useMemo, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import { FiBriefcase, FiCreditCard, FiDollarSign, FiHome, FiShield } from 'react-icons/fi';

import Switch from '../../../../../components/BoxedInputFields/Switch';
import SimpleDropdown from '../../../../../components/BoxedInputFields/Dropdown-Field';
import InputField from '../../../../../components/BoxedInputFields/Personnalized-InputField';
import Button from '../../../../../components/BoxedInputFields/Button';
import Dialog from '../../../../../components/Dialog/Dialog';
// Use CSS module instead of regular CSS

// Import the dropdown options hook
import { useDropdownOptions } from '../../utils/DropdownListsImports';

// --- FAKE Dropdown Options (Replace with real data loading/i18n) ---

// Tailwind styles
const styles = {
  sectionContainer: "flex flex-col gap-6 p-1 w-full max-w-[1000px] mx-auto",
  headerCard: "bg-card rounded-xl border border-border/60 p-6 pb-4 shadow-sm w-full max-w-[1000px] mx-auto",
  sectionTitle: "text-2xl font-semibold mb-2",
  sectionTitleStyle: { fontSize: '18px', color: 'hsl(var(--foreground))', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  sectionSubtitle: "text-sm font-medium text-muted-foreground",
  subtitleRow: "flex items-end justify-between gap-4",
  mandatoryFieldLegend: "text-xs text-muted-foreground",
  hiringMandatoryMark: "text-orange-500",
  sectionsWrapper: "flex flex-col lg:flex-row gap-6 w-full max-w-[1000px] mx-auto",
  leftColumn: "flex flex-col gap-6 flex-1",
  rightColumn: "flex flex-col gap-6 flex-1",
  sectionCard: "bg-card rounded-xl border border-border/60 p-6 shadow-sm w-full",
  cardHeader: "flex items-center gap-4 mb-0",
  cardIconWrapper: "p-2 rounded-lg bg-primary/10 text-primary",
  cardTitle: "flex-1",
  cardTitleH3: "m-0",
  cardTitleH3Style: { color: 'hsl(var(--card-foreground))', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  grid: "grid grid-cols-1 gap-6",
  gridSingle: "grid grid-cols-1 gap-6",
  fieldWrapper: "space-y-2",
  fullWidth: "md:col-span-2",
  formActions: "flex justify-end gap-4 w-full max-w-[1000px] mx-auto"
};

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
  const [showHiringInfo, setShowHiringInfo] = useState(false);

  // Use the dropdown options hook
  const dropdownOptionsFromHook = useDropdownOptions();

  const fieldsToRender = useMemo(() => config?.fields?.billingInformation || [], [config]);

  // Handle cancel with page reload
  const handleCancel = useCallback(() => {
    // First call the original onCancel handler if provided
    if (onCancel) {
      onCancel();
    }

    // Then reload the page
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

    if (process.env.NODE_ENV !== 'production') {
      console.warn(`No options found for key: ${optionsKey} (mapped to: ${mappedOptionsKey})`);
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
    const showHiringStar = fieldConfig.requiredForHiring && !isActuallyRequired && checkDependency(fieldConfig);
    const finalLabel = <>{label} {isActuallyRequired && <span className="boxed-inputfield-required">*</span>} {showHiringStar && <span className={styles.hiringMandatoryMark}>*</span>}</>;

    // Common props without the key
    const commonProps = {
      label: finalLabel,
      error: error,
      required: isActuallyRequired,
      wrapperClassName: styles.fieldWrapper
    };

    // Helper to wrap inputs in a div for grid layout
    const wrapInput = (component) => (
      <div key={name} className={classNames(styles.fieldWrapper, { [styles.fullWidth]: !isSingleColumn && type === 'checkbox' && name !== 'withholdingTaxSubject' })}>
        {component}
      </div>
    );

    switch (type) {
      case 'date':
        const maxDateValue = maxYear
          ? new Date(maxYear, 11, 31).toISOString().split('T')[0]
          : new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0];
        const dateValue = value ? (typeof value === 'string' ? value : new Date(value).toISOString().split('T')[0]) : '';
        return wrapInput(
          <div>
            {finalLabel && (
              <label className={`boxed-date-label ${error ? 'boxed-date-label--error' : ''}`}>
                {finalLabel}
              </label>
            )}
            <input
              type="date"
              value={dateValue}
              onChange={(e) => onInputChange(name, e.target.value || null)}
              max={maxDateValue}
              className={`w-full h-9 px-3 rounded-lg border bg-background text-xs text-left focus:outline-none focus:ring-2 focus:ring-ring transition-all ${error ? 'date-input-error' : ''}`}
              style={{
                fontFamily: 'var(--font-family-text, Roboto, sans-serif)',
                borderColor: error ? 'var(--boxed-inputfield-error-color)' : 'hsl(var(--border) / 0.6)',
                color: error ? 'var(--boxed-inputfield-error-color)' : 'inherit'
              }}
            />
          </div>
        );
      case 'dropdown':
        const options = getDropdownOptions(optionsKey);

        // Debug option loading issues
        if (options.length === 0 && process.env.NODE_ENV !== 'production') {
          console.warn(`No options found for dropdown ${name} with optionsKey ${optionsKey}`);
        }

        return wrapInput(
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
        return wrapInput(
          <Switch
            key={name}
            label={label}
            checked={!!value}
            onChange={(checked) => onInputChange(name, checked)}
            marginBottom={name === 'payrollData.withholdingTaxInfo.isSubject' ? '0' : '20px'}
          />
        );
      case 'text':
      case 'number':
      default:
        return wrapInput(
          <InputField
            key={name}
            {...commonProps}
            name={name}
            type={type === 'number' ? 'number' : 'text'}
            value={value || ''}
            onChange={(e) => onInputChange(name, e.target.value)}
            min={type === 'number' ? restConfig.min : undefined}
            max={type === 'number' ? restConfig.max : undefined}
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
    <div className={styles.sectionContainer}>
      <div className={styles.headerCard}>
        <h2 className={styles.sectionTitle} style={styles.sectionTitleStyle}>{t('billingInformation.title')}</h2>
        <div className={styles.subtitleRow}>
          <p className={styles.sectionSubtitle} style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>{t('billingInformation.subtitle', 'Provide your employment and billing details.')}</p>
          <div className={styles.mandatoryFieldLegend}><span className={styles.hiringMandatoryMark}>*</span> {t('billingInformation.hiringRequiredLegend')}</div>
        </div>
      </div>

      <div className={styles.sectionsWrapper}>
        {/* Left Column */}
        <div className={styles.leftColumn}>
          {/* Employment Eligibility Section */}
          {groupedFields.employmentEligibility && (
            <div className={styles.sectionCard}>
              <div className={styles.grid}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardIconWrapper}><FiBriefcase /></div>
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
            <div className={styles.sectionCard}>
              <div className={styles.grid}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardIconWrapper}><FiCreditCard /></div>
                  <div className={styles.cardTitle}>
                    <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{t('billingInformation.bankingInfo')}</h3>
                  </div>
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
                  <div className={styles.cardIconWrapper}><FiBriefcase /></div>
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
                  <div className={styles.cardIconWrapper}><FiShield /></div>
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
                  <div className={styles.cardIconWrapper}><FiHome /></div>
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

        {/* Right Column */}
        <div className={styles.rightColumn}>
          {/* Payroll Data Section */}
          {groupedFields.payrollData && (
            <div className={styles.sectionCard}>
              <div className={styles.gridSingle}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardIconWrapper}><FiDollarSign /></div>
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

      {/* --- Action Buttons --- */}
      <div className={styles.sectionCard}>
        <div className={styles.formActions} style={{ marginTop: 0 }}>
          <Button onClick={handleCancel} variant="secondary" disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSaveAndContinueClick} variant="confirmation" disabled={isSubmitting}>
            {isSubmitting ? t('common.saving') : t('common.saveAndContinue')}
          </Button>
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
  onCancel: PropTypes.func.isRequired,
  getNestedValue: PropTypes.func.isRequired
};

export default BillingInformation;