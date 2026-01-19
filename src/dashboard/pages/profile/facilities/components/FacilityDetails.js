// FILE: /src/pages/dashboard/profile/facilities/components/FacilityDetails.js
// Renders sections like Facility Core Details, Legal/Billing, Facility Documents

import React, { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FiUser, FiMapPin, FiInfo, FiFileText, FiBriefcase, FiCreditCard, FiHome } from 'react-icons/fi';

// --- Import Base Components ---
import InputField from '../../../../../components/BoxedInputFields/Personnalized-InputField';
import SimpleDropdown from '../../../../../components/BoxedInputFields/Dropdown-Field';
import Button from '../../../../../components/BoxedInputFields/Button';

// Import the dropdown options hook
import { useDropdownOptions } from '../../utils/DropdownListsImports';
import useAutoSave from '../../../../hooks/useAutoSave';

// Tailwind styles (copied from PersonalDetails.js to ensure consistency)
const styles = {
  sectionContainer: "flex flex-col gap-6 p-1 w-full max-w-[1400px] mx-auto",
  headerCard: "bg-card rounded-xl border border-border/60 p-6 pb-4 shadow-sm w-full max-w-[1400px] mx-auto",
  sectionTitle: "text-2xl font-semibold mb-0",
  sectionTitleStyle: { fontSize: '18px', color: 'hsl(var(--foreground))', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  sectionSubtitle: "text-sm font-medium text-muted-foreground",
  subtitleRow: "flex items-end justify-between gap-4",
  mandatoryFieldLegend: "text-xs text-muted-foreground",
  mandatoryMark: "text-destructive",
  sectionsWrapper: "facility-details-sections-wrapper flex flex-col gap-6 w-full max-w-[1400px] mx-auto",
  leftColumn: "flex flex-col gap-6 flex-1",
  rightColumn: "flex flex-col gap-6 flex-1",
  sectionCard: "bg-card rounded-xl border border-border/60 p-6 shadow-sm w-full",
  cardHeader: "flex items-center gap-4 mb-0",
  cardIconWrapper: "p-2 rounded-lg bg-primary/10 text-primary",
  cardTitle: "flex-1",
  cardTitleH3: "m-0",
  cardTitleH3Style: { color: 'hsl(var(--card-foreground))', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  grid: "grid grid-cols-1 gap-6",
  fieldWrapper: "space-y-2",
  fullWidth: "md:col-span-2",
  formActions: "flex justify-end gap-4 w-full max-w-[1400px] mx-auto"
};

const FacilityDetails = ({
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
}) => {
  const { t, i18n } = useTranslation(['dashboardProfile', 'dropdowns', 'validation', 'common']);

  // Get dropdown options using the hook
  const dropdownOptionsFromHook = useDropdownOptions();

  // Memoize the fields to render for the currently active facility sub-tab
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
    getNestedValue
  });

  // Get options from translations if available
  const getDropdownOptions = useCallback((optionsKey) => {
    // First try using the hook with the standard naming convention
    const optionsFromHook = dropdownOptionsFromHook[`${optionsKey}Options`];
    if (optionsFromHook && optionsFromHook.length > 0) {
      return optionsFromHook;
    }

    // Try the hook with legacy naming (no 's' at the end)
    const legacyOptionName = `${optionsKey.replace(/s$/, '')}Options`;
    const legacyOptionsFromHook = dropdownOptionsFromHook[legacyOptionName];
    if (legacyOptionsFromHook && legacyOptionsFromHook.length > 0) {
      return legacyOptionsFromHook;
    }

    // Then try direct access to translations
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

    // Finally, check in config
    return getNestedValue(config?.dropdownOptionsResolved, optionsKey) || [];
  }, [config, getNestedValue, dropdownOptionsFromHook, i18n]);

  const checkDependency = useCallback((fieldConfig) => {
    if (!fieldConfig.dependsOn) return true;
    const dependentValue = getNestedValue(formData, fieldConfig.dependsOn);
    if (fieldConfig.dependsOnValue) return fieldConfig.dependsOnValue.includes(dependentValue);
    if (fieldConfig.dependsOnValueExclude) return !fieldConfig.dependsOnValueExclude.includes(dependentValue);
    return true;
  }, [formData, getNestedValue]);

  // Renders a single field
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

      // Improve selection logic (copied from original)
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

  // Group fields by 'group' property from config for better structure
  const groupedFields = useMemo(() => {
    // Default grouping for core details if not specified
    const fields = fieldsToRender;
    const groups = {};
    const order = ['general', 'address', 'legal', 'legalRep', 'billing', 'bankingFacility'];

    fields.forEach(field => {
      let groupName = field.group;
      if (!groupName) {
        // Infer group if not present
        if (field.name.startsWith('address')) groupName = 'address';
        else if (field.name.startsWith('legalRepresentative')) groupName = 'legalRep';
        else if (field.name.startsWith('billingContact')) groupName = 'billing';
        else if (field.name.startsWith('facilityIBAN') || field.name.startsWith('facilityBank')) groupName = 'bankingFacility';
        else groupName = 'general';
      }

      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(field);
    });

    // Sort keys based on defined order
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

  const currentTabConfig = config?.tabs?.find(tab => tab.id === activeTab);

  const getGroupIcon = (groupKey) => {
    switch (groupKey) {
      case 'general': return <FiHome />;
      case 'address': return <FiMapPin />;
      case 'legal': return <FiBriefcase />;
      case 'legalRep': return <FiUser />;
      case 'billing': return <FiFileText />;
      case 'bankingFacility': return <FiCreditCard />;
      default: return <FiInfo />;
    }
  };

  const getGroupTitle = (groupKey) => {
    if (groupKey === 'legalRep') return t('facilityDetails.groupTitle_legalRep', 'Responsible Person');

    // If translations exist for group titles, use them, otherwise fallback
    const key = `facilityDetails.groupTitle_${groupKey}`;
    const fallback = groupKey.replace(/([A-Z])/g, ' $1').trim().replace(/^\w/, c => c.toUpperCase());
    return t(key, fallback);
  };

  return (
    <>
      <style>{`
        .facility-details-container {
          container-type: inline-size;
        }
        @container (min-width: 700px) {
          .facility-details-sections-wrapper {
            flex-direction: row;
          }
        }
      `}</style>
      <div className={`${styles.sectionContainer} facility-details-container`}>
        {/* Title Card */}
        <div className={styles.headerCard}>
          <div className="flex-1">
            <h2 className={styles.sectionTitle} style={styles.sectionTitleStyle}>{currentTabConfig ? t(currentTabConfig.labelKey) : activeTab}</h2>
            <div className={styles.subtitleRow}>
              <p className={styles.sectionSubtitle} style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>{t('facilityDetails.subtitle', 'Please ensure facility details are accurate and up to date.')}</p>
              <div className={styles.mandatoryFieldLegend}><span className={styles.mandatoryMark}>*</span> {t('common.mandatoryFields')}</div>
            </div>
          </div>
        </div>

        <div className={styles.sectionsWrapper}>
          {/* Logic to split groups into columns - simplistic approach: odd/even or specific groups */}
          <div className={styles.leftColumn}>
            {groupedFields.filter((_, i) => i % 2 === 0).map((group) => (
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

export default FacilityDetails;