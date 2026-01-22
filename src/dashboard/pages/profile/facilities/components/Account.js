import React, { useMemo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiCreditCard, FiStar, FiCheck, FiZap, FiKey, FiUserX } from 'react-icons/fi';
import { auth } from '../../../../../services/firebase';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useAuth } from '../../../../../contexts/AuthContext';
import { useNotification } from '../../../../../contexts/NotificationContext';

import AccountDeletion from '../../components/AccountDeletion';
import Button from '../../../../../components/BoxedInputFields/Button';
import InputFieldHideUnhide from '../../../../../components/BoxedInputFields/InputFieldHideUnhide';

import useAutoSave from '../../../../hooks/useAutoSave';

const GOLDEN_COLOR = '#FFD700';

const styles = {
  sectionContainer: "flex flex-col gap-6 p-1 w-full max-w-[1400px] mx-auto",
  headerCard: "bg-card rounded-2xl border border-border/50 px-6 py-4 shadow-lg backdrop-blur-sm w-full max-w-[1400px] mx-auto flex items-center",
  sectionTitle: "text-2xl font-semibold mb-0",
  sectionTitleStyle: { fontSize: '18px', color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  sectionSubtitle: "text-sm font-medium",
  sectionSubtitleStyle: { color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  sectionsWrapper: "grid grid-cols-1 gap-4 w-full max-w-[1400px] mx-auto",
  sectionCard: "bg-card rounded-2xl border border-border/50 p-5 shadow-lg backdrop-blur-sm w-full",
  cardHeader: "flex items-center gap-3 mb-4 pb-3 border-b border-border/40",
  cardIconWrapper: "p-2 rounded-lg bg-primary/10 flex-shrink-0",
  cardIconStyle: { color: 'var(--primary-color)' },
  cardTitle: "flex-1 min-w-0",
  cardTitleH3: "m-0 text-sm font-semibold truncate",
  cardTitleH3Style: { color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  cardDescription: "text-xs mt-1",
  cardDescriptionStyle: { color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  subscriptionWrapper: "bg-card rounded-xl border border-border/50 p-4 shadow-md w-full max-w-[1400px] mx-auto",
  subscriptionOptions: "grid grid-cols-1 md:grid-cols-2 gap-3",
  subscriptionOption: "rounded-lg p-3 cursor-pointer transition-all duration-200",
  subscriptionHeader: "flex items-center gap-2 mb-2",
  subscriptionPrice: "text-lg font-bold",
  subscriptionPeriod: "text-xs",
  subscriptionPeriodStyle: { color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  subscriptionFeatures: "space-y-1",
  subscriptionFeatureItem: "flex items-center gap-1.5 text-xs",
  subscriptionBadge: "px-2 py-0.5 rounded-full text-xs font-semibold"
};

const Account = ({
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
  const { t } = useTranslation(['dashboardProfile', 'dropdowns', 'common', 'validation']);
  const { currentUser } = useAuth();
  const { showNotification } = useNotification();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const currentSubscription = useMemo(() => {
    const subscription = formData?.platformSubscriptionPlan ||
      formData?.subscriptionTier ||
      formData?.subscription?.tier ||
      'classic';
    return subscription === 'premium' ? 'premium' : 'classic';
  }, [formData]);

  const isPremium = currentSubscription === 'premium';

  const isGoogleUser = useMemo(() => {
    return currentUser?.providerData?.some(provider => provider.providerId === 'google.com') || false;
  }, [currentUser]);

  const handleUpgradeToPremium = useCallback(async () => {
    setIsUpgrading(true);
    try {
      onInputChange('platformSubscriptionPlan', 'premium');
      if (onSave) {
        await onSave();
      }
      showNotification(t('subscription.upgraded'), 'success');
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      showNotification(t('subscription.upgradeFailed'), 'error');
    } finally {
      setIsUpgrading(false);
    }
  }, [onInputChange, onSave, showNotification, t]);

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

  const validatePasswordChange = useCallback(() => {
    const newErrors = {};
    
    if (!passwordData.currentPassword) {
      newErrors.currentPassword = t('validation.required');
    }
    
    if (!passwordData.newPassword) {
      newErrors.newPassword = t('validation.required');
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = t('validation.passwordTooShort');
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = t('validation.passwordsDoNotMatch');
    }
    
    setPasswordErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [passwordData, t]);

  const handlePasswordChange = useCallback(async () => {
    if (!validatePasswordChange()) {
      return;
    }

    setIsChangingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        passwordData.currentPassword
      );
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, passwordData.newPassword);
      
      showNotification(t('accountBasics.passwordUpdated'), 'success');
      setShowPasswordChange(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordErrors({});
    } catch (error) {
      console.error('Error changing password:', error);
      if (error.code === 'auth/wrong-password') {
        setPasswordErrors({ currentPassword: t('accountBasics.errors.wrongPassword') });
      } else {
        showNotification(t('accountBasics.errors.passwordChangeFailed'), 'error');
      }
    } finally {
      setIsChangingPassword(false);
    }
  }, [validatePasswordChange, passwordData, showNotification, t]);

  useAutoSave({
    formData,
    config,
    activeTab: 'account',
    onInputChange,
    onSave,
    getNestedValue,
    validateCurrentTabData,
    onTabCompleted,
    isTutorialActive
  });

  return (
    <div className={styles.sectionContainer}>
      <div className={styles.headerCard}>
        <div className="flex flex-col gap-1 flex-1">
          <h2 className={styles.sectionTitle} style={styles.sectionTitleStyle}>{t('account.title')}</h2>
          <p className={styles.sectionSubtitle} style={styles.sectionSubtitleStyle}>{t('account.subtitle')}</p>
        </div>
      </div>

      <div className={styles.subscriptionWrapper}>
        <div className={styles.subscriptionOptions}>
          <div 
            className={styles.subscriptionOption}
            style={{ 
              border: !isPremium ? '2px solid #22c55e' : '1px solid var(--border-color)',
              backgroundColor: !isPremium ? 'rgba(34, 197, 94, 0.05)' : 'transparent'
            }}
          >
            <div className={styles.subscriptionHeader}>
              <div 
                className="p-1.5 rounded-md flex-shrink-0"
                style={{ 
                  backgroundColor: !isPremium ? 'rgba(34, 197, 94, 0.1)' : 'var(--muted)'
                }}
              >
                <FiCreditCard className="w-4 h-4" style={{ color: !isPremium ? '#22c55e' : 'var(--text-light-color)' }} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold m-0" style={{ color: 'var(--text-color)' }}>{t('subscription.classic.title')}</h3>
              </div>
              {!isPremium && (
                <span className={styles.subscriptionBadge} style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
                  <FiCheck className="w-3 h-3 inline mr-1" />
                  {t('subscription.currentPlan')}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1 mb-2">
              <span className={styles.subscriptionPrice}>{t('subscription.classic.price')}</span>
              <span className={styles.subscriptionPeriod} style={styles.subscriptionPeriodStyle}>{t('subscription.perMonth')}</span>
            </div>
            <div className={styles.subscriptionFeatures}>
              {classicFeatures.map((feature, index) => (
                <div key={index} className={styles.subscriptionFeatureItem}>
                  <FiCheck className="w-3 h-3 flex-shrink-0" style={{ color: !isPremium ? '#22c55e' : 'var(--text-light-color)' }} />
                  <span style={{ color: 'var(--text-color)' }}>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div 
            onClick={!isPremium && !isUpgrading ? handleUpgradeToPremium : undefined}
            className={styles.subscriptionOption}
            style={{ 
              border: `2px solid ${GOLDEN_COLOR}`,
              backgroundColor: isPremium ? `${GOLDEN_COLOR}10` : `${GOLDEN_COLOR}08`,
              cursor: !isPremium ? 'pointer' : 'default',
              boxShadow: `0 0 8px ${GOLDEN_COLOR}25`
            }}
          >
            <div className={styles.subscriptionHeader}>
              <div 
                className="p-1.5 rounded-md flex-shrink-0"
                style={{ 
                  backgroundColor: GOLDEN_COLOR,
                  border: `1px solid ${GOLDEN_COLOR}`
                }}
              >
                <FiStar className="w-4 h-4" style={{ color: 'white' }} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold m-0" style={{ color: GOLDEN_COLOR }}>{t('subscription.premium.title')}</h3>
              </div>
              {isPremium ? (
                <span className={styles.subscriptionBadge} style={{ backgroundColor: GOLDEN_COLOR, color: 'white' }}>
                  <FiStar className="w-3 h-3 inline mr-1" />
                  {t('subscription.currentPlan')}
                </span>
              ) : (
                <span className={styles.subscriptionBadge} style={{ backgroundColor: GOLDEN_COLOR, color: 'white' }}>
                  <FiZap className="w-3 h-3 inline mr-1" />
                  {isUpgrading ? t('subscription.upgrading') : t('subscription.upgrade')}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1 mb-2">
              <span className={styles.subscriptionPrice} style={{ color: GOLDEN_COLOR }}>{t('subscription.premium.price')}</span>
              <span className={styles.subscriptionPeriod} style={styles.subscriptionPeriodStyle}>{t('subscription.perMonth')}</span>
            </div>
            <div className={styles.subscriptionFeatures}>
              {premiumFeatures.map((feature, index) => (
                <div key={index} className={styles.subscriptionFeatureItem}>
                  <FiZap className="w-3 h-3 flex-shrink-0" style={{ color: GOLDEN_COLOR }} />
                  <span style={{ color: 'var(--text-color)' }}>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.sectionsWrapper}>
        <div className={styles.sectionCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIconWrapper}>
              <FiKey className="w-4 h-4" style={styles.cardIconStyle} />
            </div>
            <div className={styles.cardTitle}>
              <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{t('account.passwordManagement')}</h3>
              <p className={styles.cardDescription} style={styles.cardDescriptionStyle}>
                {t('account.passwordManagementDescription')}
              </p>
            </div>
          </div>

          {isGoogleUser ? (
            <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
              <p className="text-sm" style={{ color: 'var(--text-color)' }}>
                {t('accountBasics.googleAuthMessage')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {!showPasswordChange ? (
                <Button
                  type="button"
                  onClick={() => setShowPasswordChange(true)}
                  variant="secondary"
                >
                  <FiKey className="w-4 h-4 mr-2" />
                  {t('accountBasics.changePassword')}
                </Button>
              ) : (
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border/50">
                  <InputFieldHideUnhide
                    label={t('accountBasics.currentPassword')}
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={(e) => {
                      setPasswordData({ ...passwordData, currentPassword: e.target.value });
                      if (passwordErrors.currentPassword) setPasswordErrors(prev => ({ ...prev, currentPassword: null }));
                    }}
                    error={passwordErrors.currentPassword}
                    type="password"
                    showErrors={true}
                  />
                  <InputFieldHideUnhide
                    label={t('accountBasics.newPassword')}
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={(e) => {
                      setPasswordData({ ...passwordData, newPassword: e.target.value });
                      if (passwordErrors.newPassword) setPasswordErrors(prev => ({ ...prev, newPassword: null }));
                    }}
                    error={passwordErrors.newPassword}
                    type="password"
                    showErrors={true}
                  />
                  <InputFieldHideUnhide
                    label={t('accountBasics.confirmPassword')}
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={(e) => {
                      setPasswordData({ ...passwordData, confirmPassword: e.target.value });
                      if (passwordErrors.confirmPassword) setPasswordErrors(prev => ({ ...prev, confirmPassword: null }));
                    }}
                    error={passwordErrors.confirmPassword}
                    type="password"
                    showErrors={true}
                  />
                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      onClick={handlePasswordChange}
                      disabled={isChangingPassword}
                    >
                      {isChangingPassword ? t('common.saving') : t('accountBasics.updatePassword')}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setShowPasswordChange(false);
                        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                        setPasswordErrors({});
                      }}
                      disabled={isChangingPassword}
                    >
                      {t('common.cancel')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.sectionCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIconWrapper} style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
              <FiUserX className="w-4 h-4" style={{ color: 'var(--red-3)' }} />
            </div>
            <div className={styles.cardTitle}>
              <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{t('settings.accountManagement.title')}</h3>
              <p className={styles.cardDescription} style={styles.cardDescriptionStyle}>
                {t('settings.accountManagement.description')}
              </p>
            </div>
          </div>
          <AccountDeletion />
        </div>
      </div>
    </div>
  );
};

export default Account;

