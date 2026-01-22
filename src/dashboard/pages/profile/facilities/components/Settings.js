import React, { useMemo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { get } from 'lodash';
import classNames from 'classnames';
import { FiSettings, FiClock, FiFileText, FiUserX, FiCreditCard, FiStar, FiCheck, FiZap } from 'react-icons/fi';

import AccountDeletion from '../../components/AccountDeletion';

import CheckboxField from '../../../../../components/BoxedInputFields/CheckboxField';
import DropdownField from '../../../../../components/BoxedInputFields/Dropdown-Field';
import SimpleDropdown from '../../../../../components/BoxedInputFields/Dropdown-Field';
import InputField from '../../../../../components/BoxedInputFields/Personnalized-InputField';
import TextareaField from '../../../../../components/BoxedInputFields/TextareaField';
import Button from '../../../../../components/BoxedInputFields/Button';
import Switch from '../../../../../components/BoxedInputFields/Switch';

import { useDropdownOptions } from '../../utils/DropdownListsImports';
import useAutoSave from '../../../../hooks/useAutoSave';

const styles = {
  sectionContainer: "flex flex-col gap-6 p-1 w-full max-w-[1400px] mx-auto",
  headerCard: "bg-card rounded-xl border border-border/60 px-6 py-2 shadow-sm w-full max-w-[1400px] mx-auto h-16 flex items-center",
  sectionTitle: "text-2xl font-semibold mb-0",
  sectionTitleStyle: { fontSize: '18px', color: 'hsl(var(--foreground))', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  sectionSubtitle: "text-sm font-medium text-muted-foreground",
  subtitleRow: "flex items-end justify-between gap-4",
  mandatoryFieldLegend: "text-xs text-muted-foreground",
  mandatoryMark: "text-destructive",
  sectionsWrapper: "grid grid-cols-1 lg:grid-cols-2 gap-4 w-full max-w-[1400px] mx-auto",
  sectionCard: "bg-card rounded-xl border border-border/60 p-5 shadow-sm w-full",
  cardHeader: "flex items-center gap-3 mb-4 pb-3 border-b border-border/40",
  cardIconWrapper: "p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0",
  cardTitle: "flex-1 min-w-0",
  cardTitleH3: "m-0 text-sm font-semibold truncate",
  cardTitleH3Style: { color: 'hsl(var(--card-foreground))', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  grid: "flex flex-col gap-4",
  fieldWrapper: "space-y-2",
  fullWidth: "col-span-full",
  formActions: "flex justify-end gap-4 w-full max-w-[1400px] mx-auto",
  subscriptionWrapper: "grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-[1400px] mx-auto",
  subscriptionCard: "bg-card rounded-xl border-2 p-5 shadow-sm w-full transition-all duration-200",
  subscriptionCardActive: "border-green-500 bg-green-500/5",
  subscriptionCardPremium: "border-amber-500 bg-amber-500/5",
  subscriptionCardInactive: "border-border/60 hover:border-border",
  subscriptionHeader: "flex items-center gap-3 mb-4",
  subscriptionPrice: "text-2xl font-bold mb-1",
  subscriptionPeriod: "text-xs text-muted-foreground",
  subscriptionFeatures: "space-y-2 mb-4",
  subscriptionFeatureItem: "flex items-start gap-2 text-sm",
  subscriptionBadge: "px-2 py-0.5 rounded-full text-xs font-semibold"
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
  const [isUpgrading, setIsUpgrading] = useState(false);

  const dropdownOptionsFromHook = useDropdownOptions();

  const fieldsToRender = useMemo(() => config?.fields?.settings || [], [config]);

  const currentSubscription = useMemo(() => {
    const subscription = formData?.platformSubscriptionPlan ||
      formData?.subscriptionTier ||
      formData?.subscription?.tier ||
      'classic';
    return subscription === 'premium' ? 'premium' : 'classic';
  }, [formData]);

  const isPremium = currentSubscription === 'premium';

  const handleUpgradeToPremium = useCallback(async () => {
    setIsUpgrading(true);
    try {
      onInputChange('platformSubscriptionPlan', 'premium');
      if (onSave) {
        await onSave();
      }
    } catch (error) {
      console.error('Error upgrading subscription:', error);
    } finally {
      setIsUpgrading(false);
    }
  }, [onInputChange, onSave]);

  const classicFeatures = [
    t('subscription.features.classic.basicMatching'),
    t('subscription.features.classic.emailNotifications'),
    t('subscription.features.classic.profileManagement'),
    t('subscription.features.classic.documentStorage')
  ];

  const premiumFeatures = [
    t('subscription.features.premium.priorityMatching'),
    t('subscription.features.premium.smsNotifications'),
    t('subscription.features.premium.advancedAnalytics'),
    t('subscription.features.premium.dedicatedSupport'),
    t('subscription.features.premium.bankingAccess')
  ];

  useAutoSave({
    formData,
    config,
    activeTab: 'settings',
    onInputChange,
    onSave,
    getNestedValue,
    validateCurrentTabData,
    onTabCompleted,
    isTutorialActive
  });

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    }
    window.location.reload();
  }, [onCancel]);

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
      console.warn(`No options found for key: ${optionsKey}`);
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
      {/* HEADER */}
      <div className={styles.headerCard}>
        <h2 className={styles.sectionTitle} style={styles.sectionTitleStyle}>{t('settings.title')}</h2>
        <div className={styles.subtitleRow}>
          <p className={styles.sectionSubtitle} style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>{t('settings.subtitle')}</p>
          <div className={styles.mandatoryFieldLegend}><span className={styles.mandatoryMark}>*</span> {t('common.mandatoryFields')}</div>
        </div>
      </div>

      {/* SUBSCRIPTION SECTION */}
      <div className={styles.subscriptionWrapper}>
        {/* CLASSIC PLAN */}
        <div className={`${styles.subscriptionCard} ${!isPremium ? styles.subscriptionCardActive : styles.subscriptionCardInactive}`}>
          <div className={styles.subscriptionHeader}>
            <div className={`${styles.cardIconWrapper} ${!isPremium ? 'bg-green-500/10 text-green-600' : ''}`}>
              <FiCreditCard className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{t('subscription.classic.title')}</h3>
            </div>
            {!isPremium && (
              <span className={`${styles.subscriptionBadge} bg-green-500/10 text-green-600`}>
                {t('subscription.currentPlan')}
              </span>
            )}
          </div>
          <div className="mb-3">
            <div className={styles.subscriptionPrice}>{t('subscription.classic.price')}</div>
            <div className={styles.subscriptionPeriod}>{t('subscription.perMonth')}</div>
          </div>
          <div className={styles.subscriptionFeatures}>
            {classicFeatures.map((feature, index) => (
              <div key={index} className={styles.subscriptionFeatureItem}>
                <FiCheck className={`w-4 h-4 flex-shrink-0 mt-0.5 ${!isPremium ? 'text-green-600' : 'text-muted-foreground'}`} />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* PREMIUM PLAN */}
        <div 
          className={`${styles.subscriptionCard} ${isPremium ? styles.subscriptionCardPremium : styles.subscriptionCardInactive}`}
          style={isPremium ? { borderColor: '#D4AF37' } : {}}
        >
          <div className={styles.subscriptionHeader}>
            <div className={`${styles.cardIconWrapper}`} style={isPremium ? { backgroundColor: 'rgba(212, 175, 55, 0.1)', color: '#D4AF37' } : {}}>
              <FiStar className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className={styles.cardTitleH3} style={isPremium ? { ...styles.cardTitleH3Style, color: '#D4AF37' } : styles.cardTitleH3Style}>
                {t('subscription.premium.title')}
              </h3>
            </div>
            {isPremium && (
              <span className={styles.subscriptionBadge} style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)', color: '#D4AF37' }}>
                {t('subscription.currentPlan')}
              </span>
            )}
          </div>
          <div className="mb-3">
            <div className={styles.subscriptionPrice}>{t('subscription.premium.price')}</div>
            <div className={styles.subscriptionPeriod}>{t('subscription.perMonth')}</div>
          </div>
          <div className={styles.subscriptionFeatures}>
            {premiumFeatures.map((feature, index) => (
              <div key={index} className={styles.subscriptionFeatureItem}>
                <FiZap className="w-4 h-4 flex-shrink-0 mt-0.5" style={isPremium ? { color: '#D4AF37' } : { color: 'var(--muted-foreground)' }} />
                <span>{feature}</span>
              </div>
            ))}
          </div>
          {!isPremium && (
            <Button
              type="button"
              onClick={handleUpgradeToPremium}
              disabled={isUpgrading}
              className="w-full mt-2"
              style={{ backgroundColor: '#D4AF37', borderColor: '#D4AF37', color: 'white' }}
            >
              <FiZap className="w-4 h-4 mr-2" />
              {isUpgrading ? t('subscription.upgrading') : t('subscription.upgradeToPremium')}
            </Button>
          )}
        </div>
      </div>

      {/* SETTINGS GRID */}
      <div className={styles.sectionsWrapper}>
        {groupedFields.operationalSettings && (
          <div className={styles.sectionCard}>
            <div className={styles.cardHeader}>
              <div className={styles.cardIconWrapper}><FiClock className="w-4 h-4" /></div>
              <div className={styles.cardTitle}>
                <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{t('settings.operationalSettingsTitle')}</h3>
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
              <div className={styles.cardIconWrapper}><FiFileText className="w-4 h-4" /></div>
              <div className={styles.cardTitle}>
                <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{t('settings.contractSettingsTitle')}</h3>
              </div>
            </div>
            <div className={styles.grid}>
              {groupedFields.contractSettings.map(renderField)}
            </div>
          </div>
        )}
      </div>

      {/* ACCOUNT MANAGEMENT SECTION */}
      <div className="w-full max-w-[1400px] mx-auto">
        <div className={styles.sectionCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIconWrapper}><FiUserX className="w-4 h-4" /></div>
            <div className={styles.cardTitle}>
              <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{t('settings.accountDeletion.title', 'Account Management')}</h3>
            </div>
          </div>
          <AccountDeletion />
        </div>
      </div>
    </div>
  );
};

export default Settings;



