import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiBriefcase, FiCreditCard, FiEdit2, FiFileText, FiHome, FiShield } from 'react-icons/fi';

import SimpleDropdown from '../../../../../components/BoxedInputFields/Dropdown-Field';
import InputField from '../../../../../components/BoxedInputFields/Personnalized-InputField';
import DateField from '../../../../../components/BoxedInputFields/DateField';
import useAutoSave from '../../../../hooks/useAutoSave';

import { useDropdownOptions } from '../../utils/DropdownListsImports';

const styles = {
  sectionContainer: "flex flex-col gap-6 p-0 w-full max-w-[1400px] mx-auto",
  sectionsWrapper: "organization-billing-sections-wrapper w-full max-w-[1400px] mx-auto",
  leftColumn: "flex flex-col gap-6 flex-1",
  rightColumn: "flex flex-col gap-6 flex-1",
  sectionCard: "bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow w-full relative overflow-visible",
  cardHeader: "flex items-center gap-3 mb-4 pb-3 border-b border-border/40",
  cardIconWrapper: "p-2.5 rounded-xl bg-primary/10 flex-shrink-0",
  cardIconStyle: { color: 'var(--primary-color)' },
  cardTitle: "flex-1 min-w-0",
  cardTitleH3: "m-0 text-sm font-semibold truncate",
  cardTitleH3Style: { color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  grid: "grid grid-cols-1 gap-6 overflow-visible",
  fieldWrapper: "space-y-2",
  fullWidth: "md:col-span-2",
  formActions: "flex justify-end gap-4 w-full max-w-[1400px] mx-auto"
};

const OrganizationBillingInformation = ({
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
}) => {
  const { t, i18n } = useTranslation(['dashboardProfile', 'dropdowns', 'common', 'validation']);
  const isTutorialActive = false;

  const dropdownOptionsFromHook = useDropdownOptions();

  const fieldsToRender = useMemo(() => config?.fields?.organizationLegalBilling || [], [config]);

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
    activeTab: 'organizationLegalBilling',
    onInputChange,
    onSave,
    getNestedValue,
    extractTabData: extractBillingData,
    validateCurrentTabData,
    disableLocalStorage: true
  });

  const getDropdownOptions = useCallback((optionsKey) => {
    const suffixedKey = `${optionsKey}Options`;
    const optionsFromHook = dropdownOptionsFromHook[suffixedKey];
    if (optionsFromHook && optionsFromHook.length > 0) {
      return optionsFromHook;
    }

    const dropdownTranslations = i18n.getResourceBundle(i18n.language, 'dropdowns');
    if (dropdownTranslations) {
      if (dropdownTranslations[optionsKey]) {
        return Object.entries(dropdownTranslations[optionsKey]).map(([key, value]) => ({
          value: key,
          label: value
        }));
      }
    }

    return [];
  }, [dropdownOptionsFromHook, i18n]);

  const checkDependency = useCallback((fieldConfig) => {
    if (!fieldConfig.dependsOn) return true;

    const dependentValue = getNestedValue(formData, fieldConfig.dependsOn);

    if (fieldConfig.dependsOnValue) {
      return fieldConfig.dependsOnValue.includes(dependentValue);
    }
    if (fieldConfig.dependsOnValueExclude) {
      return !fieldConfig.dependsOnValueExclude.includes(dependentValue);
    }
    return true;
  }, [formData, getNestedValue]);

  const renderField = (fieldConfig, isSingleColumn = false) => {
    const { name, type, required, labelKey, optionsKey, dependsOn, maxYear, placeholder, infoKey, ...restConfig } = fieldConfig;

    if (!checkDependency(fieldConfig)) {
      return null;
    }

    const value = getNestedValue(formData, name);
    const error = getNestedValue(errors, name);
    const label = t(labelKey, name);

    let isActuallyRequired = required;
    if (dependsOn && isActuallyRequired) {
      if (!checkDependency(fieldConfig)) {
        isActuallyRequired = false;
      }
    }
    const finalLabel = <>{label} {isActuallyRequired && <span className="boxed-inputfield-required">*</span>}</>;

    const commonProps = {
      label: finalLabel,
      error: error,
      required: isActuallyRequired
    };

    switch (type) {
      case 'date':
        const maxDateValue = maxYear
          ? new Date(maxYear, 11, 31).toISOString().split('T')[0]
          : undefined;

        return (
          <DateField
            key={name}
            label={finalLabel}
            value={value}
            onChange={(dateObj) => {
              const dateStr = dateObj ? dateObj.toISOString().split('T')[0] : null;
              onInputChange(name, dateStr);
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
              onInputChange(name, newValue);
            }}
            placeholder={placeholder || t('common.selectPlaceholder', 'Select...')}
            required={isActuallyRequired}
            error={commonProps.error}
          />
        );
      case 'text':
      case 'number':
      case 'email':
      case 'tel':
      case 'url':
      default:
        return (
          <InputField
            key={name}
            label={label}
            error={error}
            required={isActuallyRequired}
            name={name}
            type={type === 'number' ? 'number' : (type === 'email' ? 'email' : (type === 'tel' ? 'tel' : (type === 'url' ? 'url' : 'text')))}
            value={value || ''}
            onChange={(e) => onInputChange(name, e.target.value)}
            min={type === 'number' ? restConfig.min : undefined}
            max={type === 'number' ? restConfig.max : undefined}
            infoText={infoKey ? t(infoKey) : undefined}
            placeholder={placeholder}
          />
        );
    }
  };

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

  const getGroupIcon = (groupKey) => {
    switch (groupKey) {
      case 'legal': return <FiBriefcase className="w-4 h-4" style={styles.cardIconStyle} />;
      case 'billing': return <FiFileText className="w-4 h-4" style={styles.cardIconStyle} />;
      default: return <FiHome className="w-4 h-4" style={styles.cardIconStyle} />;
    }
  };

  const getGroupTitle = (groupKey) => {
    if (groupKey === 'legal') return t('organizationDetails.groupTitle_legal', 'Legal Information');
    if (groupKey === 'billing') return t('organizationDetails.groupTitle_billing', 'Billing Information');
    const key = `organizationDetails.groupTitle_${groupKey}`;
    const fallback = groupKey.replace(/([A-Z])/g, ' $1').trim().replace(/^\w/, c => c.toUpperCase());
    return t(key, fallback);
  };

  return (
    <div className={styles.sectionContainer} style={{ position: 'relative' }}>
      <style>{`
        .organization-billing-sections-wrapper {
          container-type: inline-size;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        @container (max-width: 700px) {
          .organization-billing-sections-wrapper {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <div className={styles.sectionsWrapper}>
          <div className={styles.leftColumn}>
            {groupedFields.legal && (
              <div className={styles.sectionCard} style={{ position: 'relative', zIndex: 10 }}>
                <div className={styles.grid}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardIconWrapper}>{getGroupIcon('legal')}</div>
                    <div className={styles.cardTitle}>
                      <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{getGroupTitle('legal')}</h3>
                    </div>
                  </div>
                  {groupedFields.legal.map(renderField)}
                </div>
              </div>
            )}
          </div>

          <div className={styles.rightColumn}>
            {groupedFields.billing && (
              <div className={styles.sectionCard}>
                <div className={styles.grid}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardIconWrapper}>{getGroupIcon('billing')}</div>
                    <div className={styles.cardTitle}>
                      <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{getGroupTitle('billing')}</h3>
                    </div>
                  </div>
                  {groupedFields.billing.map(field => renderField(field))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
  );
};

OrganizationBillingInformation.propTypes = {
  formData: PropTypes.object.isRequired,
  config: PropTypes.shape({
    fields: PropTypes.shape({
      organizationLegalBilling: PropTypes.array
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

export default OrganizationBillingInformation;

