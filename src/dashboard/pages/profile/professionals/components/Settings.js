// FILE: /src/pages/dashboard/profile/professionals/components/Settings.js
// VERSION: Config-Driven - Updated for Firebase Database Organization

import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiSettings, FiBell, FiShield, FiGlobe, FiClock, FiInfo, FiZap, FiStar, FiCalendar } from 'react-icons/fi';
import SimpleDropdown from '../../../../../components/BoxedInputFields/Dropdown-Field';
import InputField from '../../../../../components/BoxedInputFields/Personnalized-InputField';
import TextareaField from '../../../../../components/BoxedInputFields/TextareaField';
import DateField from '../../../../../components/BoxedInputFields/DateField';
import Switch from '../../../../../components/BoxedInputFields/Switch';
import PreferenceDays from './PreferenceDays';

import { useDropdownOptions } from '../../utils/DropdownListsImports';
import useAutoSave from '../../../../hooks/useAutoSave';

const styles = {
  sectionContainer: "flex flex-col gap-6 p-0 w-full max-w-[1400px] mx-auto",
  headerCard: "bg-card rounded-2xl border border-border/50 px-6 py-4 shadow-lg backdrop-blur-sm w-full max-w-[1400px] mx-auto flex items-center",
  sectionTitle: "text-2xl font-semibold mb-0",
  sectionTitleStyle: { fontSize: '18px', color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  sectionSubtitle: "text-sm font-medium",
  sectionSubtitleStyle: { color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  subtitleRow: "flex items-end justify-between gap-4",
  mandatoryFieldLegend: "text-xs",
  mandatoryFieldLegendStyle: { color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  mandatoryMark: "text-destructive",
  sectionsWrapper: "settings-sections-wrapper w-full max-w-[1400px] mx-auto",
  sectionCard: "bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow w-full relative",
  cardHeader: "flex items-center gap-3 mb-4 pb-3 border-b border-border/40",
  cardIconWrapper: "p-2.5 rounded-xl bg-primary/10 flex-shrink-0",
  cardIconStyle: { color: 'var(--primary-color)' },
  cardTitle: "flex-1 min-w-0",
  cardTitleH3: "m-0 text-sm font-semibold truncate",
  cardTitleH3Style: { color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  cardDescription: "text-xs mt-1",
  cardDescriptionStyle: { color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  grid: "grid grid-cols-1 md:grid-cols-2 gap-6",
  fieldWrapper: "space-y-2",
  fullWidth: "col-span-full",
  infoCard: "bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4 w-full max-w-[1400px] mx-auto",
  infoCardText: "text-sm",
  infoCardTextStyle: { color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }
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
  validateCurrentTabData
}) => {
  const { t, i18n } = useTranslation(['dashboardProfile', 'dropdowns', 'common', 'validation']);

  const dropdownOptionsFromHook = useDropdownOptions();

  const currentSubscription = useMemo(() => {
    const subscription = formData?.platformSubscriptionPlan ||
      formData?.subscriptionTier ||
      formData?.subscription?.tier ||
      'classic';

    return subscription === 'premium' ? 'premium' : 'classic';
  }, [formData]);

  const isPremium = currentSubscription === 'premium';

  const fieldsToRender = useMemo(() => config?.fields?.marketplace || [], [config]);

  useAutoSave({
    formData,
    config,
    activeTab: 'marketplace',
    onInputChange,
    onSave,
    getNestedValue,
    validateCurrentTabData
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
      required: isActuallyRequired
    };

    switch (type) {
      case 'date':
        const maxDateValue = maxYear
          ? new Date(maxYear, 11, 31).toISOString().split('T')[0]
          : undefined;
        const dateValue = value ? (typeof value === 'string' ? new Date(value) : value instanceof Date ? value : new Date(value)) : null;
        return (
          <DateField
            key={name}
            label={finalLabel}
            value={dateValue}
            onChange={(date) => {
              onInputChange(name, date ? date.toISOString().split('T')[0] : null);
            }}
            max={maxDateValue}
            required={commonProps.required}
            error={commonProps.error}
            onErrorReset={() => { }}
          />
        );
      case 'dropdown':
        const options = getDropdownOptions(optionsKey);

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
      case 'switch':
        const isBankingAccess = name === 'banking.access';
        const requiresPremium = isBankingAccess;
        const isDisabled = requiresPremium && !isPremium;
        const descriptionKey = fieldConfig.descriptionKey;

        return (
          <div key={name} className="relative">
            <Switch
              label={
                name === 'isActiveOnMarketplace'
                  ? (
                    <span className="inline-flex items-center gap-2" style={{ color: 'var(--logo-1)' }}>
                      <span>{label}</span>
                      <FiInfo className="w-3.5 h-3.5" />
                    </span>
                  )
                  : label
              }
              checked={!!value}
              onChange={(newValue) => onInputChange(name, newValue)}
              marginBottom="0"
              disabled={isDisabled}
            />
            {descriptionKey && (
              <p className="mt-2 text-xs" style={{ color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                {t(descriptionKey)}
              </p>
            )}
            {requiresPremium && !isPremium && (
              <div className="mt-2 p-3 rounded-lg border-2 flex items-center gap-2" style={{ borderColor: '#D4AF37', backgroundColor: 'rgba(212, 175, 55, 0.05)' }}>
                <FiZap className="w-4 h-4 flex-shrink-0" style={{ color: '#D4AF37' }} />
                <span className="text-sm font-medium" style={{ color: '#D4AF37' }}>
                  {t('settings.premiumFeatureRequired')}
                </span>
              </div>
            )}
            {requiresPremium && isPremium && (
              <div className="mt-2 p-2 rounded-lg border flex items-center gap-2" style={{ borderColor: '#D4AF37', backgroundColor: 'rgba(212, 175, 55, 0.05)' }}>
                <FiStar className="w-3 h-3 flex-shrink-0" style={{ color: '#D4AF37' }} />
                <span className="text-xs font-medium" style={{ color: '#D4AF37' }}>
                  {t('settings.premiumFeature')}
                </span>
              </div>
            )}
          </div>
        );
      case 'textarea':
        return (
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
        return (
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
      <style>{`
        .settings-sections-wrapper {
          container-type: inline-size;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        @container (max-width: 700px) {
          .settings-sections-wrapper {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <div className={styles.sectionsWrapper}>
          {platformSettingsWithoutNotes.length > 0 && (
            <div className={styles.sectionCard}>
              <div className={styles.cardHeader}>
                <div className={styles.cardIconWrapper}><FiSettings className="w-4 h-4" style={styles.cardIconStyle} /></div>
                <div className={styles.cardTitle}>
                  <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{t('settings.platformSettingsTitle')}</h3>
                </div>
              </div>
              <div className={styles.grid}>
                {platformSettingsWithoutNotes.map(renderField)}
              </div>
            </div>
          )}

          {/* Privacy Settings */}
          {groupedFields.privacy && (
            <div className={styles.sectionCard}>
              <div className={styles.cardHeader}>
                <div className={styles.cardIconWrapper}><FiShield className="w-4 h-4" style={styles.cardIconStyle} /></div>
                <div className={styles.cardTitle}>
                  <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{t('settings.privacySettingsTitle')}</h3>
                </div>
              </div>
              <div className={styles.grid}>
                {groupedFields.privacy.map(renderField)}
              </div>
            </div>
          )}

          {/* Notification Preferences */}
          {groupedFields.notifications && (
            <div className={styles.sectionCard}>
              <div className={styles.cardHeader}>
                <div className={styles.cardIconWrapper}><FiBell className="w-4 h-4" style={styles.cardIconStyle} /></div>
                <div className={styles.cardTitle}>
                  <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{t('settings.notificationPreferencesTitle')}</h3>
                </div>
              </div>
              <div className={styles.grid}>
                {groupedFields.notifications.map(renderField)}
              </div>
            </div>
          )}

          {/* Marketplace Settings */}
          {groupedFields.marketplace && (
            <div className={styles.sectionCard}>
              <div className={styles.cardHeader}>
                <div className={styles.cardIconWrapper}><FiGlobe className="w-4 h-4" style={styles.cardIconStyle} /></div>
                <div className={styles.cardTitle}>
                  <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{t('settings.marketplaceSettingsTitle')}</h3>
                </div>
              </div>
              <div className={styles.grid}>
                {groupedFields.marketplace.map(renderField)}
              </div>
            </div>
          )}

          {/* Availability Settings */}
          {groupedFields.availability && (
            <div className={styles.sectionCard}>
              <div className={styles.cardHeader}>
                <div className={styles.cardIconWrapper}><FiClock className="w-4 h-4" style={styles.cardIconStyle} /></div>
                <div className={styles.cardTitle}>
                  <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{t('settings.availabilitySettingsTitle')}</h3>
                </div>
              </div>
              <div className={styles.grid}>
                {groupedFields.availability.map(renderField)}
              </div>
            </div>
          )}

          <div className={styles.sectionCard}>
            <div className={styles.cardHeader}>
              <div className={styles.cardIconWrapper}><FiCalendar className="w-4 h-4" style={styles.cardIconStyle} /></div>
              <div className={styles.cardTitle}>
                <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{t('preferenceDays.title', 'Preference Days')}</h3>
                <p className={styles.cardDescription} style={styles.cardDescriptionStyle}>
                  {t('preferenceDays.subtitle', 'Set your preferred working days and times')}
                </p>
              </div>
            </div>
            <PreferenceDays
              formData={formData}
              onInputChange={onInputChange}
              getNestedValue={getNestedValue}
              errors={errors}
            />
          </div>

          {notesField && (
            <div className={styles.sectionCard}>
              <div className={styles.cardHeader}>
                <div className={styles.cardIconWrapper}><FiInfo className="w-4 h-4" style={styles.cardIconStyle} /></div>
                <div className={styles.cardTitle}>
                  <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{t('settings.availabilityNotes')}</h3>
                </div>
              </div>
              <div className={styles.grid}>
                {renderField(notesField)}
              </div>
            </div>
          )}
        </div>
      </div>
  );
};

Settings.propTypes = {
  formData: PropTypes.object.isRequired,
  config: PropTypes.shape({
    fields: PropTypes.shape({
      marketplace: PropTypes.array
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
