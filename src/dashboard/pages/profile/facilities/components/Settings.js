import React, { useMemo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { get } from 'lodash';
import classNames from 'classnames';
import { FiSettings, FiClock, FiFileText, FiLock } from 'react-icons/fi';

import CheckboxField from '../../../../../components/BoxedInputFields/CheckboxField';
import DropdownField from '../../../../../components/BoxedInputFields/Dropdown-Field';
import SimpleDropdown from '../../../../../components/BoxedInputFields/Dropdown-Field';
import InputField from '../../../../../components/BoxedInputFields/Personnalized-InputField';
import TextareaField from '../../../../../components/BoxedInputFields/TextareaField';
import Switch from '../../../../../components/BoxedInputFields/Switch';

import { useDropdownOptions } from '../../utils/DropdownListsImports';
import useAutoSave from '../../../../hooks/useAutoSave';
import OpeningHours from './OpeningHours';

const styles = {
  sectionContainer: "flex flex-col gap-6 p-1 w-full max-w-[1400px] mx-auto",
  headerCard: "bg-card rounded-2xl border border-border/50 px-6 py-4 shadow-lg backdrop-blur-sm w-full max-w-[1400px] mx-auto flex items-center",
  sectionTitle: "text-2xl font-semibold mb-0",
  sectionTitleStyle: { fontSize: '18px', color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  sectionSubtitle: "text-sm font-medium",
  sectionSubtitleStyle: { color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  subtitleRow: "flex items-end justify-between gap-4",
  mandatoryFieldLegend: "text-xs",
  mandatoryFieldLegendStyle: { color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  mandatoryMark: "text-destructive",
  sectionsWrapper: "facility-settings-sections-wrapper w-full max-w-[1400px] mx-auto",
  sectionCard: "bg-card rounded-2xl border border-border/50 p-5 shadow-lg backdrop-blur-sm w-full",
  cardHeader: "flex items-center gap-3 mb-4 pb-3 border-b border-border/40",
  cardIconWrapper: "p-2 rounded-lg bg-primary/10 flex-shrink-0",
  cardIconStyle: { color: 'var(--primary-color)' },
  cardTitle: "flex-1 min-w-0",
  cardTitleH3: "m-0 text-sm font-semibold truncate",
  cardTitleH3Style: { color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  cardDescription: "text-xs mt-1",
  cardDescriptionStyle: { color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  grid: "flex flex-col gap-4",
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
  validateCurrentTabData,
  onTabCompleted,
  isTutorialActive
}) => {
  const { t, i18n } = useTranslation(['dashboardProfile', 'dropdowns', 'common', 'validation']);

  const dropdownOptionsFromHook = useDropdownOptions();

  const fieldsToRender = useMemo(() => config?.fields?.marketplace || [], [config]);

  const currentSubscription = useMemo(() => {
    const subscription = formData?.platformSubscriptionPlan ||
      formData?.subscriptionTier ||
      formData?.subscription?.tier ||
      'classic';
    return subscription === 'premium' ? 'premium' : 'classic';
  }, [formData]);

  const isPremium = currentSubscription === 'premium';

  useAutoSave({
    formData,
    config,
    activeTab: 'marketplace',
    onInputChange,
    onSave,
    getNestedValue,
    validateCurrentTabData,
    onTabCompleted,
    isTutorialActive
  });

  const getDropdownOptions = useCallback((optionsKey) => {
    const mappedOptionsKey = optionsKey === 'educationLevels' ? 'education' : optionsKey;
    const suffixedKey = `${mappedOptionsKey}Options`;
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
      if (mappedOptionsKey !== optionsKey && dropdownTranslations[mappedOptionsKey]) {
        return Object.entries(dropdownTranslations[mappedOptionsKey]).map(([key, value]) => ({
          value: key,
          label: value
        }));
      }
    }

    if (process.env.NODE_ENV !== 'production') {
      // No options found for key
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

  const renderField = (fieldConfig) => {
    const { name, type, required, labelKey, optionsKey, dependsOn, placeholder, ...restConfig } = fieldConfig;

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
      required: isActuallyRequired,
      wrapperClassName: styles.fieldWrapper
    };

    const wrapInput = (component) => (
      <div key={name} className={classNames(styles.fieldWrapper, { [styles.fullWidth]: type === 'textarea' })}>
        {component}
      </div>
    );

    switch (type) {
      case 'dropdown':
        const options = getDropdownOptions(optionsKey);
        return wrapInput(
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
        if (fieldConfig.group === 'contractSettings') {
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
      <style>{`
        .facility-settings-container {
          container-type: inline-size;
        }

        .facility-settings-sections-wrapper {
          container-type: inline-size;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        @container (max-width: 700px) {
          .facility-settings-sections-wrapper {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <div className={styles.headerCard}>
        <div className="flex flex-col gap-1 flex-1">
          <h2 className={styles.sectionTitle} style={styles.sectionTitleStyle}>{t('settings.title')}</h2>
          <p className={styles.sectionSubtitle} style={styles.sectionSubtitleStyle}>{t('settings.subtitle')}</p>
        </div>
      </div>

      <OpeningHours
        formData={formData}
        config={config}
        errors={errors}
        isSubmitting={isSubmitting}
        onInputChange={onInputChange}
        getNestedValue={getNestedValue}
        showActions={false}
      />

      <div className={styles.sectionsWrapper}>
        {groupedFields.operationalSettings && (
          <div className={styles.sectionCard}>
            <div className={styles.cardHeader}>
              <div className={styles.cardIconWrapper}><FiClock className="w-4 h-4" style={styles.cardIconStyle} /></div>
              <div className={styles.cardTitle}>
                <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{t('settings.operationalSettingsTitle')}</h3>
                <p className={styles.cardDescription} style={styles.cardDescriptionStyle}>
                  {t('settings.operationalSettingsDescription')}
                </p>
              </div>
            </div>
            <div className={styles.grid}>
              {groupedFields.operationalSettings.map(renderField)}
            </div>
          </div>
        )}

        {groupedFields.contractSettings && (
          <div className={styles.sectionCard}>
            <div className={styles.cardHeader}>
              <div className={styles.cardIconWrapper}><FiFileText className="w-4 h-4" style={styles.cardIconStyle} /></div>
              <div className={styles.cardTitle}>
                <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{t('settings.contractSettingsTitle')}</h3>
                <p className={styles.cardDescription} style={styles.cardDescriptionStyle}>
                  {t('settings.contractSettingsDescription')}
                </p>
              </div>
            </div>
            <div className={styles.grid}>
              {groupedFields.contractSettings.map(renderField)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;



