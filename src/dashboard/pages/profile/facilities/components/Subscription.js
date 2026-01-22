import React, { useMemo, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiCreditCard, FiStar, FiCheck, FiZap, FiUsers } from 'react-icons/fi';
import Button from '../../../../../components/BoxedInputFields/Button';
import useAutoSave from '../../../../hooks/useAutoSave';

const styles = {
  sectionContainer: "flex flex-col gap-6 p-1 w-full max-w-[1400px] mx-auto",
  headerCard: "bg-card rounded-xl border border-border/60 p-6 pb-4 shadow-sm w-full max-w-[1400px] mx-auto",
  sectionTitle: "text-2xl font-semibold mb-2",
  sectionTitleStyle: { fontSize: '18px', color: 'hsl(var(--foreground))', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  sectionSubtitle: "text-sm font-medium text-muted-foreground",
  subtitleRow: "flex items-end justify-between gap-4",
  sectionsWrapper: "flex flex-col gap-6 w-full max-w-[1400px] mx-auto",
  sectionCard: "bg-card rounded-xl border border-border/60 p-6 shadow-sm w-full",
  cardHeader: "flex items-center gap-4 mb-4",
  cardIconWrapper: "p-2 rounded-lg bg-primary/10 text-primary",
  cardTitle: "flex-1",
  cardTitleH3: "m-0",
  cardTitleH3Style: { color: 'hsl(var(--card-foreground))', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  grid: "grid grid-cols-1 gap-6"
};

const Subscription = ({
  formData,
  config,
  errors,
  isSubmitting,
  onInputChange,
  onSave,
  onCancel,
  getNestedValue,
  validateCurrentTabData,
  onTabCompleted,
  isTutorialActive
}) => {
  const { t } = useTranslation(['dashboardProfile', 'common']);
  const [isUpgrading, setIsUpgrading] = useState(false);

  useAutoSave({
    formData,
    config,
    activeTab: 'subscription',
    onInputChange,
    onSave,
    getNestedValue,
    validateCurrentTabData,
    onTabCompleted,
    isTutorialActive
  });

  const currentSubscription = useMemo(() => {
    const subscription = formData?.platformSubscriptionPlan ||
      formData?.subscriptionTier ||
      formData?.subscription?.tier ||
      'basic';
    
    return subscription;
  }, [formData]);

  const handleUpgrade = useCallback(async (planType) => {
    setIsUpgrading(true);
    try {
      onInputChange('platformSubscriptionPlan', planType);
      if (onSave) {
        await onSave();
      }
    } catch (error) {
      console.error('Error upgrading subscription:', error);
    } finally {
      setIsUpgrading(false);
    }
  }, [onInputChange, onSave]);

  const basicFeatures = [
    t('subscription.features.facility.basic.basicPosting'),
    t('subscription.features.facility.basic.emailNotifications'),
    t('subscription.features.facility.basic.facilityProfile'),
    t('subscription.features.facility.basic.documentStorage')
  ];

  const standardFeatures = [
    t('subscription.features.facility.standard.unlimitedPosting'),
    t('subscription.features.facility.standard.prioritySupport'),
    t('subscription.features.facility.standard.advancedSearch'),
    t('subscription.features.facility.standard.analytics')
  ];

  const premiumFeatures = [
    t('subscription.features.facility.premium.dedicatedManager'),
    t('subscription.features.facility.premium.customBranding'),
    t('subscription.features.facility.premium.apiAccess'),
    t('subscription.features.facility.premium.advancedReporting')
  ];

  return (
    <div className={styles.sectionContainer}>
      <div className={styles.headerCard}>
        <h2 className={styles.sectionTitle} style={styles.sectionTitleStyle}>{t('subscription.facilityTitle')}</h2>
        <div className={styles.subtitleRow}>
          <p className={styles.sectionSubtitle} style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
            {t('subscription.facilitySubtitle')}
          </p>
        </div>
      </div>

      <div className={styles.sectionsWrapper}>
        {/* BASIC PLAN */}
        <div className={`${styles.sectionCard} ${currentSubscription === 'basic' ? 'border-2 border-green-500' : ''}`}>
          <div className={styles.cardHeader}>
            <div className={`${styles.cardIconWrapper} ${currentSubscription === 'basic' ? 'bg-green-500/10 text-green-600' : ''}`}>
              <FiCreditCard />
            </div>
            <div className={styles.cardTitle}>
              <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>
                {t('subscription.facility.basic.title')}
              </h3>
            </div>
            {currentSubscription === 'basic' && (
              <div className="px-3 py-1 bg-green-500/10 text-green-600 rounded-full text-xs font-semibold">
                {t('subscription.currentPlan')}
              </div>
            )}
          </div>

          <div className="mb-4">
            <div className="text-3xl font-bold text-foreground">
              {t('subscription.facility.basic.price')}
            </div>
            <div className="text-sm text-muted-foreground">
              {t('subscription.perMonth')}
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {basicFeatures.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <FiCheck className={`w-5 h-5 mt-0.5 flex-shrink-0 ${currentSubscription === 'basic' ? 'text-green-600' : 'text-muted-foreground'}`} />
                <span className="text-sm text-foreground">{feature}</span>
              </div>
            ))}
          </div>

          {currentSubscription === 'basic' && (
            <div className="mt-4 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                {t('subscription.youAreOnThisPlan')}
              </p>
            </div>
          )}
        </div>

        {/* STANDARD PLAN */}
        <div className={`${styles.sectionCard} ${currentSubscription === 'standard' ? 'border-2 border-blue-500' : ''}`}>
          <div className={styles.cardHeader}>
            <div className={`${styles.cardIconWrapper} ${currentSubscription === 'standard' ? 'bg-blue-500/10 text-blue-600' : ''}`}>
              <FiUsers />
            </div>
            <div className={styles.cardTitle}>
              <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>
                {t('subscription.facility.standard.title')}
              </h3>
            </div>
            {currentSubscription === 'standard' && (
              <div className="px-3 py-1 bg-blue-500/10 text-blue-600 rounded-full text-xs font-semibold">
                {t('subscription.currentPlan')}
              </div>
            )}
          </div>

          <div className="mb-4">
            <div className="text-3xl font-bold text-foreground">
              {t('subscription.facility.standard.price')}
            </div>
            <div className="text-sm text-muted-foreground">
              {t('subscription.perMonth')}
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {standardFeatures.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <FiCheck className={`w-5 h-5 mt-0.5 flex-shrink-0 ${currentSubscription === 'standard' ? 'text-blue-600' : 'text-muted-foreground'}`} />
                <span className="text-sm text-foreground">{feature}</span>
              </div>
            ))}
          </div>

          {currentSubscription === 'standard' ? (
            <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">
                {t('subscription.youAreOnThisPlan')}
              </p>
            </div>
          ) : currentSubscription === 'basic' && (
            <Button
              type="button"
              onClick={() => handleUpgrade('standard')}
              disabled={isUpgrading}
              className="w-full"
            >
              {isUpgrading ? t('subscription.upgrading') : t('subscription.upgradeToStandard')}
            </Button>
          )}
        </div>

        {/* PREMIUM PLAN */}
        <div className={`${styles.sectionCard} ${currentSubscription === 'premium' ? 'border-2' : ''}`} style={currentSubscription === 'premium' ? { borderColor: '#D4AF37' } : {}}>
          <div className={styles.cardHeader}>
            <div className={`${styles.cardIconWrapper} ${currentSubscription === 'premium' ? 'text-yellow-600' : ''}`} style={currentSubscription === 'premium' ? { backgroundColor: 'rgba(212, 175, 55, 0.1)', color: '#D4AF37' } : {}}>
              <FiStar />
            </div>
            <div className={styles.cardTitle}>
              <h3 className={styles.cardTitleH3} style={currentSubscription === 'premium' ? { ...styles.cardTitleH3Style, color: '#D4AF37' } : styles.cardTitleH3Style}>
                {t('subscription.facility.premium.title')}
              </h3>
            </div>
            {currentSubscription === 'premium' && (
              <div className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)', color: '#D4AF37' }}>
                {t('subscription.currentPlan')}
              </div>
            )}
          </div>

          <div className="mb-4">
            <div className="text-3xl font-bold text-foreground">
              {t('subscription.facility.premium.price')}
            </div>
            <div className="text-sm text-muted-foreground">
              {t('subscription.perMonth')}
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {premiumFeatures.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <FiZap className={`w-5 h-5 mt-0.5 flex-shrink-0 ${currentSubscription === 'premium' ? 'text-yellow-600' : 'text-muted-foreground'}`} style={currentSubscription === 'premium' ? { color: '#D4AF37' } : {}} />
                <span className="text-sm text-foreground">{feature}</span>
              </div>
            ))}
          </div>

          {currentSubscription === 'premium' ? (
            <div className="mt-4 p-3 rounded-lg border" style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)', borderColor: 'rgba(212, 175, 55, 0.2)' }}>
              <p className="text-sm font-medium" style={{ color: '#D4AF37' }}>
                {t('subscription.youAreOnThisPlan')}
              </p>
            </div>
          ) : (
            <Button
              type="button"
              onClick={() => handleUpgrade('premium')}
              disabled={isUpgrading}
              className="w-full"
              style={{ 
                backgroundColor: '#D4AF37',
                borderColor: '#D4AF37',
                color: 'white'
              }}
            >
              <FiZap className="w-4 h-4 mr-2" />
              {isUpgrading ? t('subscription.upgrading') : t('subscription.upgradeToPremium')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

Subscription.propTypes = {
  formData: PropTypes.object.isRequired,
  config: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  isSubmitting: PropTypes.bool.isRequired,
  onInputChange: PropTypes.func.isRequired,
  onSave: PropTypes.func,
  onCancel: PropTypes.func.isRequired,
  getNestedValue: PropTypes.func.isRequired,
  validateCurrentTabData: PropTypes.func,
  onTabCompleted: PropTypes.func,
  isTutorialActive: PropTypes.bool
};

export default Subscription;

