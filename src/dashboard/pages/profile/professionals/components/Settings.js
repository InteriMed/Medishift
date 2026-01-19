// FILE: /src/pages/dashboard/profile/professionals/components/Settings.js
// VERSION: Config-Driven - Updated for Firebase Database Organization

import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import { FiSettings, FiBell, FiShield, FiGlobe, FiClock, FiUserX } from 'react-icons/fi';

// Account Deletion Component (Swiss nFADP/GDPR compliant)
import AccountDeletion from '../../components/AccountDeletion';

// --- Import Base Components (Adjust Paths) ---
import CheckboxField from '../../../../../components/BoxedInputFields/CheckboxField';
import SimpleDropdown from '../../../../../components/BoxedInputFields/Dropdown-Field';
import InputField from '../../../../../components/BoxedInputFields/Personnalized-InputField';
import TextareaField from '../../../../../components/BoxedInputFields/TextareaField';
import Button from '../../../../../components/BoxedInputFields/Button';
import Switch from '../../../../../components/BoxedInputFields/Switch';

// Import the dropdown options hook
import { useDropdownOptions } from '../../utils/DropdownListsImports';
import useAutoSave from '../../../../hooks/useAutoSave';


// Tailwind styles
const styles = {
  sectionContainer: "flex flex-col gap-6 p-1 w-full max-w-[1400px] mx-auto",
  headerCard: "bg-card rounded-xl border border-border/60 p-6 pb-4 shadow-sm w-full max-w-[1400px] mx-auto",
  sectionTitle: "text-2xl font-semibold mb-2",
  sectionTitleStyle: { fontSize: '18px', color: 'hsl(var(--foreground))', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  sectionSubtitle: "text-sm font-medium text-muted-foreground",
  subtitleRow: "flex items-end justify-between gap-4",
  mandatoryFieldLegend: "text-xs text-muted-foreground",
  mandatoryMark: "text-destructive",
  sectionsWrapper: "flex flex-col lg:flex-row gap-6 w-full max-w-[1400px] mx-auto",
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

const Settings = ({
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
  const { t, i18n } = useTranslation(['dashboardProfile', 'dropdowns', 'common', 'validation']);

  // Use the dropdown options hook
  const dropdownOptionsFromHook = useDropdownOptions();

  const fieldsToRender = useMemo(() => config?.fields?.settings || [], [config]);

  useAutoSave({
    formData,
    config,
    activeTab: 'settings',
    onInputChange,
    onSave,
    getNestedValue
  });

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
    const finalLabel = <>{label} {isActuallyRequired && <span className="boxed-inputfield-required">*</span>}</>;

    // Common props without the key
    const commonProps = {
      label: finalLabel,
      error: error,
      required: isActuallyRequired,
      wrapperClassName: styles.fieldWrapper
    };

    const wrapInput = (component) => (
      <div key={name} className={classNames(styles.fieldWrapper, { [styles.fullWidth]: type === 'textarea' })}>
        {component}
      </div>
    );

    switch (type) {
      case 'date':
        const maxDateValue = maxYear
          ? new Date(maxYear, 11, 31).toISOString().split('T')[0]
          : undefined;
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
                borderColor: error ? 'var(--red-3)' : 'hsl(var(--border) / 0.6)',
                color: error ? 'var(--red-3)' : 'inherit'
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
        // Use Switch for notification group AND marketplace group (requested by user)
        if (fieldConfig.group === 'notifications' || fieldConfig.group === 'marketplace') {
          return wrapInput(
            <Switch
              key={name}
              label={label}
              checked={!!value}
              onChange={(newValue) => onInputChange(name, newValue)}
              marginBottom="0"
            />
          );
        }
        // Pass label without mandatory mark styling for checkbox itself
        return wrapInput(
          <CheckboxField
            key={name}
            {...commonProps}
            label={label}
            checked={!!value}
            onChange={(e) => onInputChange(name, e.target.checked)}
          />
        );
      case 'textarea':
        return wrapInput(
          <TextareaField
            key={name}
            {...commonProps}
            value={value || ''}
            onChange={(e) => onInputChange(name, e.target.value)}
            placeholder={placeholder}
            maxLength={restConfig.maxLength}
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
            placeholder={placeholder}
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
    return groups;
  }, [fieldsToRender]);

  // Separate notes field from platform settings
  const platformSettingsWithoutNotes = useMemo(() => {
    return groupedFields.platformSettings?.filter(field =>
      field.name !== 'platformSettings.detailedAvailability.notes'
    ) || [];
  }, [groupedFields.platformSettings]);

  const notesField = useMemo(() => {
    return groupedFields.platformSettings?.find(field =>
      field.name === 'platformSettings.detailedAvailability.notes'
    );
  }, [groupedFields.platformSettings]);

  return (
    <div className={styles.sectionContainer}>
      <div className={styles.headerCard}>
        <h2 className={styles.sectionTitle} style={styles.sectionTitleStyle}>{t('settings.title')}</h2>
        <div className={styles.subtitleRow}>
          <p className={styles.sectionSubtitle} style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>{t('settings.subtitle')}</p>
          <div className={styles.mandatoryFieldLegend}><span className={styles.mandatoryMark}>*</span> {t('common.mandatoryFields')}</div>
        </div>
      </div>

      {/* Two Column Flexbox Layout */}
      <div className={styles.sectionsWrapper}>
        {/* Left Column */}
        <div className={styles.leftColumn}>
          {/* Platform Settings */}
          {platformSettingsWithoutNotes.length > 0 && (
            <div className={styles.sectionCard}>
              <div className={styles.grid}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardIconWrapper}><FiSettings /></div>
                  <div className={styles.cardTitle}>
                    <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{t('settings.platformSettingsTitle')}</h3>
                  </div>
                </div>
                {platformSettingsWithoutNotes.map(renderField)}
              </div>
            </div>
          )}

          {/* Privacy Settings */}
          {groupedFields.privacy && (
            <div className={styles.sectionCard}>
              <div className={styles.grid}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardIconWrapper}><FiShield /></div>
                  <div className={styles.cardTitle}>
                    <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{t('settings.privacySettingsTitle')}</h3>
                  </div>
                </div>
                {groupedFields.privacy.map(renderField)}
              </div>
            </div>
          )}

          {/* Marketplace Settings */}
          {groupedFields.marketplace && (
            <div className={styles.sectionCard}>
              <div className={styles.grid}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardIconWrapper}><FiGlobe /></div>
                  <div className={styles.cardTitle}>
                    <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{t('settings.marketplaceSettingsTitle')}</h3>
                  </div>
                </div>
                {groupedFields.marketplace.map(renderField)}
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className={styles.rightColumn}>
          {/* Availability Settings */}
          {groupedFields.availability && (
            <div className={styles.sectionCard}>
              <div className={styles.grid}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardIconWrapper}><FiClock /></div>
                  <div className={styles.cardTitle}>
                    <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{t('settings.availabilitySettingsTitle')}</h3>
                  </div>
                </div>
                {groupedFields.availability.map(renderField)}
              </div>
            </div>
          )}

          {/* Notification Preferences */}
          {groupedFields.notifications && (
            <div className={styles.sectionCard}>
              <div className={styles.grid}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardIconWrapper}><FiBell /></div>
                  <div className={styles.cardTitle}>
                    <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{t('settings.notificationPreferencesTitle')}</h3>
                  </div>
                </div>
                {groupedFields.notifications.map(renderField)}
              </div>
            </div>
          )}

          {/* Notes Section */}
          {notesField && (
            <div className={styles.sectionCard}>
              <div className={styles.grid}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardIconWrapper}><FiClock /></div>
                  <div className={styles.cardTitle}>
                    <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{t('settings.availabilityNotes')}</h3>
                  </div>
                </div>
                {renderField(notesField)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Account Management Section */}
      <div className="w-full max-w-[1400px] mx-auto">
        <div className={styles.sectionCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIconWrapper}><FiUserX /></div>
            <div className={styles.cardTitle}>
              <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{t('settings.accountDeletion.title', 'Account Management')}</h3>
            </div>
          </div>
          <div className="mt-4">
            <AccountDeletion />
          </div>
        </div>
      </div>

    </div>
  );
};

Settings.propTypes = {
  formData: PropTypes.object.isRequired,
  config: PropTypes.shape({
    fields: PropTypes.shape({
      settings: PropTypes.array
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

export default Settings;
