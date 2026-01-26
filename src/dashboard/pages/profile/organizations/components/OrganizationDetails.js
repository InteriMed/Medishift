import React, { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FiUser, FiMapPin, FiInfo, FiFileText, FiBriefcase, FiCreditCard, FiHome, FiZap, FiMail, FiPhone } from 'react-icons/fi';

import InputField from '../../../../../components/BoxedInputFields/Personnalized-InputField';
import SimpleDropdown from '../../../../../components/BoxedInputFields/Dropdown-Field';
import Button from '../../../../../components/BoxedInputFields/Button';
import UploadFile from '../../../../../components/BoxedInputFields/UploadFile';
import LoadingSpinner from '../../../../../components/LoadingSpinner/LoadingSpinner';
import { cn } from '../../../../../utils/cn';

import { useDropdownOptions } from '../../utils/DropdownListsImports';
import useAutoSave from '../../../../hooks/useAutoSave';

const styles = {
  sectionContainer: "flex flex-col gap-6 p-0 w-full max-w-[1400px] mx-auto",
  headerCard: "bg-card rounded-xl border border-border px-6 py-4 hover:shadow-md transition-shadow w-full max-w-[1400px] mx-auto flex items-center",
  sectionTitle: "text-2xl font-semibold mb-0",
  sectionTitleStyle: { fontSize: '18px', color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  sectionSubtitle: "text-sm font-medium",
  sectionSubtitleStyle: { color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  subtitleRow: "flex items-end justify-between gap-4",
  mandatoryFieldLegend: "text-xs",
  mandatoryFieldLegendStyle: { color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  mandatoryMark: "text-destructive",
  sectionsWrapper: "organization-details-sections-wrapper w-full max-w-[1400px] mx-auto",
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

const OrganizationDetails = ({
  activeTab,
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
  const { t, i18n } = useTranslation(['dashboardProfile', 'dropdowns', 'validation', 'common']);
  const isTutorialActive = false;

  const dropdownOptionsFromHook = useDropdownOptions();

  const fieldsToRender = useMemo(() => {
    if (!config || !activeTab || !config.fields || !config.fields[activeTab]) {
      return [];
    }
    return config.fields[activeTab];
  }, [config, activeTab]);

  useAutoSave({
    formData,
    config,
    activeTab,
    onInputChange,
    onSave,
    getNestedValue,
    validateCurrentTabData,
  });

  const getDropdownOptions = useCallback((optionsKey) => {
    const optionsFromHook = dropdownOptionsFromHook[`${optionsKey}Options`];
    if (optionsFromHook && optionsFromHook.length > 0) {
      return optionsFromHook;
    }

    const legacyOptionName = `${optionsKey.replace(/s$/, '')}Options`;
    const legacyOptionsFromHook = dropdownOptionsFromHook[legacyOptionName];
    if (legacyOptionsFromHook && legacyOptionsFromHook.length > 0) {
      return legacyOptionsFromHook;
    }

    const dropdownTranslations = i18n.getResourceBundle(i18n.language, 'dropdowns');
    if (dropdownTranslations && dropdownTranslations[optionsKey]) {
      const directOptions = Object.entries(dropdownTranslations[optionsKey]).map(([key, value]) => ({
        value: key,
        label: value
      }));
      if (directOptions.length > 0) {
        return directOptions;
      }
    }

    return getNestedValue(config?.dropdownOptionsResolved, optionsKey) || [];
  }, [config, getNestedValue, dropdownOptionsFromHook, i18n]);

  const checkDependency = useCallback((fieldConfig) => {
    if (!fieldConfig.dependsOn) return true;
    const dependentValue = getNestedValue(formData, fieldConfig.dependsOn);
    if (fieldConfig.dependsOnValue) return fieldConfig.dependsOnValue.includes(dependentValue);
    if (fieldConfig.dependsOnValueExclude) return !fieldConfig.dependsOnValueExclude.includes(dependentValue);
    return true;
  }, [formData, getNestedValue]);

  const renderField = (fieldConfig) => {
    const { name, type, required, labelKey, optionsKey, placeholderKey, infoKey, dependsOn } = fieldConfig;

    if (!checkDependency(fieldConfig)) return null;

    const value = getNestedValue(formData, name);
    const error = getNestedValue(errors, name);
    const label = t(labelKey, name);
    const placeholder = placeholderKey ? t(placeholderKey) : t('common.selectPlaceholder', 'Select...');
    const fieldKey = name;

    let isActuallyRequired = required;
    if (dependsOn && isActuallyRequired && !checkDependency(fieldConfig)) {
      isActuallyRequired = false;
    }

    const commonProps = {
      label: label,
      error: error,
      required: isActuallyRequired,
      wrapperClassName: styles.fieldWrapper
    };

    if (type === 'date') {
      const maxDate = name.includes('dateOfBirth')
        ? new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]
        : undefined;
      const dateValue = value ? (typeof value === 'string' ? value : new Date(value).toISOString().split('T')[0]) : '';

      return (
        <div key={fieldKey} className={styles.fieldWrapper}>
          {commonProps.label && (
            <label className={`boxed-date-label ${error ? 'boxed-date-label--error' : ''}`}>
              {commonProps.label}
            </label>
          )}
          <input
            type="date"
            value={dateValue}
            onChange={(e) => onInputChange(name, e.target.value || null)}
            max={maxDate}
            className={`w-full h-9 px-3 rounded-lg border bg-background text-xs text-left focus:outline-none focus:ring-2 focus:ring-ring transition-all ${error ? 'date-input-error' : ''}`}
            style={{
              fontFamily: 'var(--font-family-text, Roboto, sans-serif)',
              borderColor: error ? 'var(--boxed-inputfield-error-color)' : 'hsl(var(--border) / 0.6)',
              color: error ? 'var(--boxed-inputfield-error-color)' : 'inherit'
            }}
          />
        </div>
      );
    }

    if (type === 'dropdown') {
      const options = getDropdownOptions(optionsKey);

      if (options.length === 0 && process.env.NODE_ENV !== 'production') {
        console.warn(`No options found for dropdown ${name} with optionsKey ${optionsKey}`);
      }

      let selectedOption = null;
      if (value !== null && value !== undefined && value !== '') {
        selectedOption = options.find(opt => opt.value === value);
        if (!selectedOption) {
          selectedOption = options.find(opt => String(opt.value) === String(value));
        }
      }

      return (
        <div key={fieldKey} className={styles.fieldWrapper}>
          <SimpleDropdown
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
        </div>
      );
    }

    return (
      <div key={fieldKey} className={styles.fieldWrapper}>
        <InputField
          key={name}
          {...commonProps}
          name={name}
          type={type === 'url' ? 'url' : (type === 'email' ? 'email' : (type === 'tel' ? 'tel' : 'text'))}
          value={value || ''}
          onChange={e => onInputChange(name, e.target.value)}
          infoText={infoKey ? t(infoKey) : undefined}
          placeholder={placeholder}
        />
      </div>
    );
  };

  const groupedFields = useMemo(() => {
    const fields = fieldsToRender;
    const groups = {};
    const order = ['general', 'address', 'contact', 'legal', 'billing', 'bankingFacility'];

    fields.forEach(field => {
      let groupName = field.group;
      if (!groupName) {
        if (field.name.startsWith('organizationDetails.headquartersAddress')) groupName = 'address';
        else if (field.name.startsWith('contact')) groupName = 'contact';
        else if (field.name.startsWith('identityLegal')) groupName = 'legal';
        else if (field.name.startsWith('billingInformation')) groupName = 'billing';
        else groupName = 'general';
      }

      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(field);
    });

    const sortedKeys = Object.keys(groups).sort((a, b) => {
      const indexA = order.indexOf(a);
      const indexB = order.indexOf(b);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
    });

    return sortedKeys.map(key => ({
      key: key,
      fields: groups[key]
    }));
  }, [fieldsToRender]);

  const getGroupIcon = (groupKey) => {
    switch (groupKey) {
      case 'general': return <FiHome />;
      case 'address': return <FiMapPin />;
      case 'contact': return <FiMail />;
      case 'legal': return <FiBriefcase />;
      case 'billing': return <FiFileText />;
      case 'bankingFacility': return <FiCreditCard />;
      default: return <FiInfo />;
    }
  };

  const getGroupTitle = (groupKey) => {
    const key = `organizationDetails.groupTitle_${groupKey}`;
    const fallback = groupKey.replace(/([A-Z])/g, ' $1').trim().replace(/^\w/, c => c.toUpperCase());
    return t(key, fallback);
  };

  return (
    <>
      <style>{`
        .organization-details-sections-wrapper {
          container-type: inline-size;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        @container (max-width: 700px) {
          .organization-details-sections-wrapper {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <div className={styles.sectionContainer} style={{ position: 'relative' }}>
        <div className={styles.sectionsWrapper}>
          <div className={styles.leftColumn}>
            {groupedFields.filter((_, i) => i % 2 === 0).map((group) => (
              <div key={group.key} className={styles.sectionCard} style={{ position: 'relative', zIndex: 10 }}>
                <div className={styles.grid}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardIconWrapper}>
                      {getGroupIcon(group.key)}
                    </div>
                    <div className={styles.cardTitle}>
                      <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{getGroupTitle(group.key)}</h3>
                    </div>
                  </div>
                  {group.fields.map(field => renderField(field))}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.rightColumn}>
            {groupedFields.filter((_, i) => i % 2 !== 0).map((group) => (
              <div key={group.key} className={styles.sectionCard}>
                <div className={styles.grid}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardIconWrapper}>
                      {getGroupIcon(group.key)}
                    </div>
                    <div className={styles.cardTitle}>
                      <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{getGroupTitle(group.key)}</h3>
                    </div>
                  </div>
                  {group.fields.map(field => renderField(field))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default OrganizationDetails;

