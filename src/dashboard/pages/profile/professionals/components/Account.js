import React, { useMemo, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiCreditCard, FiStar, FiCheck, FiZap, FiKey, FiUserX, FiInfo, FiSettings } from 'react-icons/fi';
import { auth } from '../../../../../services/firebase';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useAuth } from '../../../../../contexts/AuthContext';
import { useNotification } from '../../../../../contexts/NotificationContext';

import AccountDeletion from '../../components/AccountDeletion';
import InputFieldHideUnhide from '../../../../../components/BoxedInputFields/InputFieldHideUnhide';
import Button from '../../../../../components/BoxedInputFields/Button';

import useAutoSave from '../../../../hooks/useAutoSave';

const styles = {
  sectionContainer: "flex flex-col gap-6 p-1 w-full max-w-[1400px] mx-auto",
  headerCard: "bg-card rounded-2xl border border-border/50 px-6 py-4 shadow-lg backdrop-blur-sm w-full max-w-[1400px] mx-auto flex items-center",
  sectionTitle: "text-2xl font-semibold mb-0",
  sectionTitleStyle: { fontSize: '18px', color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  sectionSubtitle: "text-sm font-medium",
  sectionSubtitleStyle: { color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  sectionsWrapper: "grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-[1400px] mx-auto",
  sectionCard: "bg-card rounded-2xl border border-border/50 p-5 shadow-lg backdrop-blur-sm w-full",
  cardHeader: "flex items-center gap-3 mb-4 pb-3 border-b border-border/40",
  cardIconWrapper: "p-2 rounded-lg bg-primary/10 flex-shrink-0",
  cardIconStyle: { color: 'var(--primary-color)' },
  cardTitle: "flex-1 min-w-0",
  cardTitleH3: "m-0 text-sm font-semibold truncate",
  cardTitleH3Style: { color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  cardDescription: "text-xs mt-1",
  cardDescriptionStyle: { color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  currentPlanCard: "rounded-xl border p-6 shadow-md w-full max-w-[1400px] mx-auto",
  currentPlanContent: "flex items-start justify-between gap-6",
  currentPlanInfo: "flex-1",
  currentPlanTitle: "flex items-center gap-3 mb-4",
  planFeatures: "grid grid-cols-1 md:grid-cols-2 gap-2",
  featureItem: "flex items-center gap-2 text-xs",
  upgradeActions: "flex flex-col items-end gap-2"
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
  const { t, i18n } = useTranslation(['dashboardProfile', 'dropdowns', 'common', 'validation']);
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
      // Error upgrading subscription
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
      // Error changing password
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
                <h3 className="text-base font-semibold m-0" style={{ color: isPremium ? 'var(--premium-gold)' : 'var(--text-color)' }}>
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
                    <FiZap className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--premium-gold)' }} />
                  ) : (
                    <FiCheck className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-color)' }} />
                  )}
                  <span style={{ color: 'var(--text-color)' }}>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.upgradeActions}>
            <div className="text-right mb-2">
              <div className="text-xl font-bold" style={{ color: isPremium ? 'var(--premium-gold)' : 'var(--text-color)' }}>
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
                  fontSize: '13px',
                  minWidth: '160px',
                  height: '38px'
                }}
              >
                <FiZap className="w-4 h-4 mr-2" />
                {isUpgrading ? t('subscription.upgrading') : t('subscription.upgrade')}
              </Button>
            )}

            <Button
              type="button"
              variant="secondary"
              style={{ 
                fontSize: '13px',
                minWidth: '160px',
                height: '38px',
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
            <div className="flex items-center gap-4 p-4 rounded-xl border" style={{ backgroundColor: 'rgba(66, 133, 244, 0.05)', borderColor: 'rgba(66, 133, 244, 0.2)' }}>
               <div className="p-2 bg-white rounded-full shadow-sm flex-shrink-0">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.11c-.22-.66-.35-1.36-.35-2.11s.13-1.45.35-2.11V7.05H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.95l3.66-2.84z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.51 6.16-4.51z" fill="#EA4335" />
                  </svg>
               </div>
               <div>
                  <h4 className="text-sm font-semibold m-0" style={{ color: 'var(--text-color)' }}>
                    Signed in with Google
                  </h4>
                  <p className="text-xs m-0 mt-1" style={{ color: 'var(--text-light-color)' }}>
                    {t('accountBasics.googleAuthMessage')}
                  </p>
               </div>
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

        <div className={styles.sectionCard} style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIconWrapper} style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
              <FiUserX className="w-4 h-4" style={{ color: '#ef4444' }} />
            </div>
            <div className={styles.cardTitle}>
              <h3 className={styles.cardTitleH3} style={{ ...styles.cardTitleH3Style, color: '#ef4444' }}>
                {t('settings.accountDeletion.title')}
              </h3>
              <p className={styles.cardDescription} style={styles.cardDescriptionStyle}>
                {t('settings.accountDeletion.description')}
              </p>
            </div>
          </div>
          <div className="p-3 rounded-xl mb-4" style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <div className="flex items-start gap-3">
              <FiInfo className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
              <p className="text-xs m-0 leading-relaxed" style={{ color: 'var(--text-color)' }}>
                {t('settings.accountDeletion.deleteWarningPermanent')}
              </p>
            </div>
          </div>
          <AccountDeletion />
        </div>
      </div>
    </div>
  );
};

Account.propTypes = {
  formData: PropTypes.object.isRequired,
  config: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  isSubmitting: PropTypes.bool.isRequired,
  onInputChange: PropTypes.func.isRequired,
  onSaveAndContinue: PropTypes.func.isRequired,
  onSave: PropTypes.func,
  onCancel: PropTypes.func.isRequired,
  getNestedValue: PropTypes.func.isRequired
};

export default Account;

