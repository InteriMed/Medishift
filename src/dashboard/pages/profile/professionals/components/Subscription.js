import React, { useMemo, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiCreditCard, FiStar, FiCheck, FiZap, FiSettings, FiShield } from 'react-icons/fi';
import Button from '../../../../../components/BoxedInputFields/Button';
import useAutoSave from '../../../../hooks/useAutoSave';

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

  const handleManageSubscription = useCallback(() => {
    // Placeholder for manage subscription logic
    console.log('Manage subscription clicked');
  }, []);

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
    <div className="w-full max-w-5xl mx-auto p-4 space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('subscription.title')}</h2>
          <p className="text-muted-foreground mt-1">
            {t('subscription.subtitle')}
          </p>
        </div>
        {!isPremium && (
          <Button
            type="button"
            onClick={handleUpgradeToPremium}
            disabled={isUpgrading}
            className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white border-0 shadow-md hover:shadow-lg transition-all"
          >
            <FiZap className="w-4 h-4 mr-2" />
            {isUpgrading ? t('subscription.upgrading') : t('subscription.upgradeToPremium')}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Plan Card - Enhanced Free/Classic Design */}
        <div className={`rounded-xl border shadow-sm overflow-hidden flex flex-col h-full transition-all duration-300 ${isPremium
            ? 'bg-gray-100 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
            : 'bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-emerald-200 dark:border-emerald-800/50 shadow-md'
          }`}>
          <div className={`p-6 border-b ${isPremium ? 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20' : 'border-emerald-200/50 dark:border-emerald-800/30 bg-white/50 dark:bg-emerald-900/10'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${isPremium ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 border-2 border-emerald-200 dark:border-emerald-700 shadow-sm'}`}>
                {isPremium ? <FiStar className="w-6 h-6" /> : <FiCreditCard className="w-6 h-6" />}
              </div>
              <div className="text-right">
                <div className={`text-xs font-medium uppercase tracking-wider mb-1 ${isPremium ? 'text-muted-foreground' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {t('subscription.currentPlan')}
                </div>
                <div className={`text-lg font-bold ${isPremium ? 'text-yellow-700 dark:text-yellow-500' : 'text-emerald-700 dark:text-emerald-300'}`}>
                  {isPremium ? t('subscription.premium.title') : t('subscription.classic.title')}
                </div>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-3xl font-bold ${isPremium ? 'text-foreground' : 'text-emerald-700 dark:text-emerald-300'}`}>
                {isPremium ? t('subscription.premium.price') : t('subscription.classic.price')}
              </span>
              {!isPremium && <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">{t('subscription.perMonth')}</span>}
              {isPremium && <span className="text-sm text-muted-foreground">{t('subscription.perMonth')}</span>}
            </div>
          </div>

          <div className="p-6 flex-1">
            <h4 className={`font-semibold mb-4 flex items-center gap-2 ${isPremium ? 'text-foreground' : 'text-emerald-700 dark:text-emerald-300'}`}>
              <FiShield className={`w-4 h-4 ${isPremium ? 'text-primary' : 'text-emerald-600 dark:text-emerald-400'}`} />
              {t('subscription.includedFeatures')}
            </h4>
            <ul className="space-y-3">
              {(isPremium ? premiumFeatures : classicFeatures).map((feature, index) => (
                <li key={index} className={`flex items-start gap-3 text-sm ${isPremium ? 'text-muted-foreground' : 'text-emerald-800 dark:text-emerald-200'}`}>
                  <FiCheck className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isPremium ? 'text-yellow-600' : 'text-emerald-600 dark:text-emerald-400'}`} />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={`p-4 border-t mt-auto ${isPremium ? 'bg-gray-200/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700' : 'bg-emerald-100/50 dark:bg-emerald-900/20 border-emerald-200/50 dark:border-emerald-800/30'}`}>
            <Button
              type="button"
              variant="outline"
              onClick={handleManageSubscription}
              className="w-full justify-center bg-background hover:bg-muted border-gray-300 dark:border-gray-600"
            >
              <FiSettings className="w-4 h-4 mr-2" />
              {t('subscription.manageSubscription')}
            </Button>
          </div>
        </div>

        {/* Upgrade / Premium Benefits Card */}
        {!isPremium ? (
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl shadow-lg overflow-hidden flex flex-col h-full relative">
            <div className="absolute top-0 right-0 p-32 bg-yellow-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

            <div className="p-8 flex-1 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold uppercase tracking-wider mb-6 border border-yellow-500/20">
                <FiStar className="w-3 h-3" />
                Recommended
              </div>

              <h3 className="text-2xl font-bold mb-2 text-white">{t('subscription.premium.title')}</h3>
              <p className="text-slate-300 mb-8 max-w-md">
                {t('subscription.unlockPremiumFeatures')}
              </p>

              <div className="space-y-4 mb-8">
                {premiumFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="p-1 rounded-full bg-yellow-500/20 text-yellow-400 mt-0.5">
                      <FiZap className="w-3 h-3" />
                    </div>
                    <span className="text-sm text-slate-200">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 bg-white/5 border-t border-white/10 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-2xl font-bold text-white">{t('subscription.premium.price')}</span>
                  <span className="text-sm text-slate-400 ml-1">{t('subscription.perMonth')}</span>
                </div>
              </div>
              <Button
                type="button"
                onClick={handleUpgradeToPremium}
                disabled={isUpgrading}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-bold border-0 py-3"
              >
                {isUpgrading ? t('subscription.upgrading') : t('subscription.upgradeToPremium')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-xl border shadow-sm p-6 flex flex-col items-center justify-center text-center h-full bg-gradient-to-br from-yellow-50/50 to-transparent">
            <div className="w-16 h-16 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center mb-4">
              <FiStar className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">{t('subscription.youArePremium')}</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mb-6">
              You have access to all premium features. Thank you for being a premium member!
            </p>
            <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
              <div className="bg-background p-4 rounded-lg border text-center">
                <div className="text-2xl font-bold text-primary mb-1">∞</div>
                <div className="text-xs text-muted-foreground">Matches</div>
              </div>
              <div className="bg-background p-4 rounded-lg border text-center">
                <div className="text-2xl font-bold text-primary mb-1">VIP</div>
                <div className="text-xs text-muted-foreground">Support</div>
              </div>
            </div>
          </div>
        )}
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
