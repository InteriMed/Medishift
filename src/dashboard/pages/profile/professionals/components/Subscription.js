import React, { useMemo, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiCreditCard, FiStar, FiCheck, FiZap, FiSettings } from 'react-icons/fi';
import Button from '../../../../../components/BoxedInputFields/Button';
import useAutoSave from '../../../../hooks/useAutoSave';

const styles = {
  sectionContainer: "flex flex-col gap-6 p-1 w-full max-w-[1400px] mx-auto",
  headerCard: "bg-card rounded-2xl border border-border/50 px-6 py-4 shadow-lg backdrop-blur-sm w-full max-w-[1400px] mx-auto",
  sectionTitle: "text-2xl font-semibold mb-0",
  sectionTitleStyle: { fontSize: '18px', color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  sectionSubtitle: "text-sm font-medium",
  sectionSubtitleStyle: { color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  currentPlanCard: "bg-card rounded-xl border p-6 shadow-md w-full max-w-[1400px] mx-auto",
  currentPlanContent: "flex items-start justify-between gap-6",
  currentPlanInfo: "flex-1",
  currentPlanTitle: "flex items-center gap-3 mb-4",
  planFeatures: "grid grid-cols-1 md:grid-cols-2 gap-2",
  featureItem: "flex items-center gap-2 text-sm",
  upgradeActions: "flex flex-col items-end gap-3"
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
        <div className="flex flex-col gap-1 flex-1">
          <h2 className={styles.sectionTitle} style={styles.sectionTitleStyle}>{t('subscription.title')}</h2>
          <p className={styles.sectionSubtitle} style={styles.sectionSubtitleStyle}>
            {t('subscription.subtitle')}
          </p>
        </div>
      </div>

      <div 
        className={styles.currentPlanCard}
        style={{ 
          borderColor: isPremium ? 'var(--premium-gold)' : 'var(--border-color)',
          backgroundColor: isPremium ? 'var(--premium-gold-bg)' : '#ffffff',
          borderWidth: isPremium ? '2px' : '1px'
        }}
      >
        <div className={styles.currentPlanContent}>
          <div className={styles.currentPlanInfo}>
            <div className={styles.currentPlanTitle}>
              {isPremium ? (
                <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--premium-gold-light)' }}>
                  <FiStar className="w-5 h-5" style={{ color: 'var(--premium-gold)' }} />
                </div>
              ) : (
                <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--muted)' }}>
                  <FiCreditCard className="w-5 h-5" style={{ color: 'var(--text-color)' }} />
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold m-0" style={{ color: isPremium ? 'var(--premium-gold)' : 'var(--text-color)' }}>
                  {isPremium ? t('subscription.premium.title') : t('subscription.classic.title')}
                </h3>
                <p className="text-xs m-0 mt-1" style={{ color: 'var(--text-light-color)' }}>
                  {t('subscription.currentPlan')}
                </p>
              </div>
            </div>

            <div className={styles.planFeatures}>
              {(isPremium ? premiumFeatures : classicFeatures).map((feature, index) => (
                <div key={index} className={styles.featureItem}>
                  {isPremium ? (
                    <FiZap className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--premium-gold)' }} />
                  ) : (
                    <FiCheck className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-color)' }} />
                  )}
                  <span style={{ color: 'var(--text-color)' }}>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.upgradeActions}>
            <div className="text-right mb-2">
              <div className="text-2xl font-bold" style={{ color: isPremium ? 'var(--premium-gold)' : 'var(--text-color)' }}>
                {isPremium ? t('subscription.premium.price') : t('subscription.classic.price')}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-light-color)' }}>
                {t('subscription.perMonth')}
              </div>
            </div>

            {!isPremium && (
              <Button
                type="button"
                onClick={handleUpgradeToPremium}
                disabled={isUpgrading}
                style={{ 
                  backgroundColor: 'var(--premium-gold)',
                  borderColor: 'var(--premium-gold)',
                  color: 'white',
                  fontWeight: '600',
                  minWidth: '180px'
                }}
              >
                <FiZap className="w-4 h-4 mr-2" />
                {isUpgrading ? t('subscription.upgrading') : t('subscription.upgradeToPremium')}
              </Button>
            )}

            <Button
              type="button"
              variant="secondary"
              style={{ 
                minWidth: '180px',
                borderColor: 'var(--border-color)',
                color: 'var(--text-color)'
              }}
            >
              <FiSettings className="w-4 h-4 mr-2" />
              {t('subscription.manageSubscription')}
            </Button>
          </div>
        </div>
      </div>

      {!isPremium && (
        <div 
          className="rounded-xl p-5 shadow-md border-2 w-full max-w-[1400px] mx-auto"
          style={{ 
            borderColor: 'var(--premium-gold)',
            background: 'linear-gradient(135deg, var(--premium-gold-bg) 0%, rgba(212, 175, 55, 0.03) 100%)'
          }}
        >
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--premium-gold-light)' }}>
              <FiStar className="w-6 h-6" style={{ color: 'var(--premium-gold)' }} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold m-0 mb-1" style={{ color: 'var(--premium-gold)' }}>
                {t('subscription.premium.title')}
              </h3>
              <p className="text-sm m-0" style={{ color: 'var(--text-color)' }}>
                {t('subscription.unlockPremiumFeatures')}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold" style={{ color: 'var(--premium-gold)' }}>
                {t('subscription.premium.price')}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-light-color)' }}>
                {t('subscription.perMonth')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
            {premiumFeatures.map((feature, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <FiZap className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--premium-gold)' }} />
                <span style={{ color: 'var(--text-color)' }}>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      )}
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

