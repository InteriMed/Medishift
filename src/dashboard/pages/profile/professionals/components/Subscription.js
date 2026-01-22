import React, { useMemo, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiCreditCard, FiStar, FiCheck, FiZap } from 'react-icons/fi';
import Button from '../../../../../components/BoxedInputFields/Button';
import useAutoSave from '../../../../hooks/useAutoSave';

const styles = {
  sectionContainer: "flex flex-col gap-6 p-1 w-full max-w-[1400px] mx-auto",
  headerCard: "bg-card rounded-xl border border-border/60 p-6 pb-4 shadow-sm w-full max-w-[1400px] mx-auto",
  sectionTitle: "text-2xl font-semibold mb-2",
  sectionTitleStyle: { fontSize: '18px', color: 'hsl(var(--foreground))', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  sectionSubtitle: "text-sm font-medium text-muted-foreground",
  subtitleRow: "flex items-end justify-between gap-4",
  sectionsWrapper: "flex flex-col lg:flex-row gap-6 w-full max-w-[1400px] mx-auto",
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

  return (
    <div className={styles.sectionContainer}>
      <div className={styles.headerCard}>
        <h2 className={styles.sectionTitle} style={styles.sectionTitleStyle}>{t('subscription.title')}</h2>
        <div className={styles.subtitleRow}>
          <p className={styles.sectionSubtitle} style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
            {t('subscription.subtitle')}
          </p>
        </div>
      </div>

      <div className={styles.sectionsWrapper}>
        {/* CLASSIC PLAN */}
        <div className={`${styles.sectionCard} ${!isPremium ? 'border-2 border-green-500' : ''}`}>
          <div className={styles.cardHeader}>
            <div className={`${styles.cardIconWrapper} ${!isPremium ? 'bg-green-500/10 text-green-600' : ''}`}>
              <FiCreditCard />
            </div>
            <div className={styles.cardTitle}>
              <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>
                {t('subscription.classic.title')}
              </h3>
            </div>
            {!isPremium && (
              <div className="px-3 py-1 bg-green-500/10 text-green-600 rounded-full text-xs font-semibold">
                {t('subscription.currentPlan')}
              </div>
            )}
          </div>

          <div className="mb-4">
            <div className="text-3xl font-bold text-foreground">
              {t('subscription.classic.price')}
            </div>
            <div className="text-sm text-muted-foreground">
              {t('subscription.perMonth')}
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {classicFeatures.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <FiCheck className={`w-5 h-5 mt-0.5 flex-shrink-0 ${!isPremium ? 'text-green-600' : 'text-muted-foreground'}`} />
                <span className="text-sm text-foreground">{feature}</span>
              </div>
            ))}
          </div>

          {!isPremium && (
            <div className="mt-4 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                {t('subscription.youAreOnThisPlan')}
              </p>
            </div>
          )}
        </div>

        {/* PREMIUM PLAN */}
        <div className={`${styles.sectionCard} ${isPremium ? 'border-2 border-yellow-500' : ''}`} style={isPremium ? { borderColor: '#D4AF37' } : {}}>
          <div className={styles.cardHeader}>
            <div className={`${styles.cardIconWrapper} ${isPremium ? 'text-yellow-600' : ''}`} style={isPremium ? { backgroundColor: 'rgba(212, 175, 55, 0.1)', color: '#D4AF37' } : {}}>
              <FiStar />
            </div>
            <div className={styles.cardTitle}>
              <h3 className={styles.cardTitleH3} style={isPremium ? { ...styles.cardTitleH3Style, color: '#D4AF37' } : styles.cardTitleH3Style}>
                {t('subscription.premium.title')}
              </h3>
            </div>
            {isPremium && (
              <div className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)', color: '#D4AF37' }}>
                {t('subscription.currentPlan')}
              </div>
            )}
          </div>

          <div className="mb-4">
            <div className="text-3xl font-bold text-foreground">
              {t('subscription.premium.price')}
            </div>
            <div className="text-sm text-muted-foreground">
              {t('subscription.perMonth')}
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {premiumFeatures.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <FiZap className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isPremium ? 'text-yellow-600' : 'text-muted-foreground'}`} style={isPremium ? { color: '#D4AF37' } : {}} />
                <span className="text-sm text-foreground">{feature}</span>
              </div>
            ))}
          </div>

          {isPremium ? (
            <div className="mt-4 p-3 rounded-lg border" style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)', borderColor: 'rgba(212, 175, 55, 0.2)' }}>
              <p className="text-sm font-medium" style={{ color: '#D4AF37' }}>
                {t('subscription.youAreOnThisPlan')}
              </p>
            </div>
          ) : (
            <Button
              type="button"
              onClick={handleUpgradeToPremium}
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

