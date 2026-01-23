import React, { useMemo, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiCreditCard, FiStar, FiCheck, FiZap, FiUsers, FiSettings } from 'react-icons/fi';
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

  const handleManageSubscription = useCallback(() => {
    // Placeholder for manage subscription logic
    console.log('Manage subscription clicked');
  }, []);

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

  const PlanCard = ({ title, price, features, type, icon: Icon, isCurrent, onUpgrade, colorClass, borderColorClass, bgClass, iconColorClass }) => (
    <div className={`relative flex flex-col h-full bg-card rounded-2xl border transition-all duration-300 hover:shadow-lg ${isCurrent ? `ring-2 ring-offset-2 ${borderColorClass}` : 'border-border/50 hover:border-border'} ${isCurrent ? 'shadow-md' : ''}`}>
      {isCurrent && (
        <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white ${bgClass} shadow-sm`}>
          {t('subscription.currentPlan')}
        </div>
      )}
      
      <div className="p-6 flex-1 flex flex-col">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${iconColorClass} bg-opacity-10`}>
          <Icon className={`w-6 h-6 ${colorClass}`} />
        </div>
        
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        
        <div className="mb-6">
          <span className="text-3xl font-bold">{price}</span>
          <span className="text-muted-foreground text-sm ml-1">{t('subscription.perMonth')}</span>
        </div>

        <div className="space-y-4 mb-8 flex-1">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className={`mt-1 rounded-full p-0.5 ${colorClass} bg-opacity-10`}>
                <FiCheck className={`w-3 h-3 ${colorClass}`} />
              </div>
              <span className="text-sm text-muted-foreground leading-tight">{feature}</span>
            </div>
          ))}
        </div>

        <div className="mt-auto">
          {isCurrent ? (
            <div className={`w-full py-2.5 px-4 rounded-lg text-center font-medium text-sm bg-muted text-muted-foreground cursor-default`}>
              {t('subscription.activePlan')}
            </div>
          ) : (
            <Button
              type="button"
              onClick={() => onUpgrade(type)}
              disabled={isUpgrading}
              className={`w-full py-2.5 font-medium transition-colors ${
                type === 'premium' 
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white border-0' 
                  : ''
              }`}
              variant={type === 'premium' ? 'primary' : 'outline'}
            >
              {isUpgrading ? t('subscription.upgrading') : (type === 'premium' ? t('subscription.upgradeToPremium') : t('subscription.upgrade'))}
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-8">
      <div className="text-center max-w-2xl mx-auto mb-8">
        <h2 className="text-3xl font-bold tracking-tight mb-3">{t('subscription.facilityTitle')}</h2>
        <p className="text-muted-foreground text-lg">
          {t('subscription.facilitySubtitle')}
        </p>
      </div>

      {/* Grey Div for Current Subscription Management */}
      <div className="bg-gray-100 dark:bg-gray-800/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-5">
          <div className={`p-4 rounded-full bg-background border shadow-sm`}>
             {currentSubscription === 'premium' ? <FiStar className="w-8 h-8 text-yellow-500" /> :
              currentSubscription === 'standard' ? <FiUsers className="w-8 h-8 text-blue-500" /> :
              <FiCreditCard className="w-8 h-8 text-emerald-500" />}
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground mb-1">{t('subscription.currentPlan')}</h3>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="font-medium text-foreground capitalize">{t(`subscription.facility.${currentSubscription}.title`)}</span>
              <span>•</span>
              <span>{t(`subscription.facility.${currentSubscription}.price`)}/{t('subscription.perMonth')}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
           <Button
              type="button"
              variant="outline"
              onClick={handleManageSubscription}
              className="w-full sm:w-auto bg-background hover:bg-muted border-gray-300 dark:border-gray-600"
           >
             <FiSettings className="w-4 h-4 mr-2" />
             {t('subscription.manageSubscription')}
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        <PlanCard
          title={t('subscription.facility.basic.title')}
          price={t('subscription.facility.basic.price')}
          features={basicFeatures}
          type="basic"
          icon={FiCreditCard}
          isCurrent={currentSubscription === 'basic'}
          onUpgrade={handleUpgrade}
          colorClass="text-emerald-600"
          borderColorClass="ring-emerald-500"
          bgClass="bg-emerald-500"
          iconColorClass="bg-emerald-500"
        />

        <PlanCard
          title={t('subscription.facility.standard.title')}
          price={t('subscription.facility.standard.price')}
          features={standardFeatures}
          type="standard"
          icon={FiUsers}
          isCurrent={currentSubscription === 'standard'}
          onUpgrade={handleUpgrade}
          colorClass="text-blue-600"
          borderColorClass="ring-blue-500"
          bgClass="bg-blue-500"
          iconColorClass="bg-blue-500"
        />

        <PlanCard
          title={t('subscription.facility.premium.title')}
          price={t('subscription.facility.premium.price')}
          features={premiumFeatures}
          type="premium"
          icon={FiStar}
          isCurrent={currentSubscription === 'premium'}
          onUpgrade={handleUpgrade}
          colorClass="text-yellow-600"
          borderColorClass="ring-yellow-500"
          bgClass="bg-yellow-500"
          iconColorClass="bg-yellow-500"
        />
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
