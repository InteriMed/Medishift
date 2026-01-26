import React, { useMemo, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiCreditCard, FiStar, FiCheck, FiKey, FiUserX } from 'react-icons/fi';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useAuth } from '../../../../../contexts/AuthContext';
import { useNotification } from '../../../../../contexts/NotificationContext';

import AccountDeletion from '../../components/AccountDeletion';
import Button from '../../../../../components/BoxedInputFields/Button';
import InputFieldHideUnhide from '../../../../../components/BoxedInputFields/InputFieldHideUnhide';

import useAutoSave from '../../../../hooks/useAutoSave';

const GOLDEN_COLOR = '#FFD700';

const styles = {
  sectionContainer: "flex flex-col gap-6 p-0 w-full max-w-[1400px] mx-auto",
  sectionsWrapper: "account-sections-wrapper w-full max-w-[1400px] mx-auto",
  leftColumn: "flex flex-col gap-6 flex-1",
  rightColumn: "flex flex-col gap-6 flex-1",
  sectionCard: "bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow w-full relative overflow-visible",
  cardHeader: "flex items-center gap-3 mb-4 pb-3 border-b border-border/40",
  cardIconWrapper: "p-2.5 rounded-xl bg-primary/10 flex-shrink-0",
  cardIconStyle: { color: 'var(--primary-color)' },
  cardTitle: "flex-1 min-w-0",
  cardTitleH3: "m-0 text-sm font-semibold truncate",
  cardTitleH3Style: { color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  cardDescription: "text-xs mt-1.5",
  cardDescriptionStyle: { color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  grid: "grid grid-cols-1 gap-6 overflow-visible"
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

  const handlePasswordChange = useCallback((field, value) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
    setPasswordErrors(prev => ({ ...prev, [field]: '' }));
  }, []);

  const validatePassword = useCallback(() => {
    const newErrors = {};
    if (!passwordData.currentPassword) {
      newErrors.currentPassword = t('validation.currentPasswordRequired');
    }
    if (!passwordData.newPassword) {
      newErrors.newPassword = t('validation.newPasswordRequired');
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = t('validation.passwordMinLength');
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = t('validation.passwordsDoNotMatch');
    }
    setPasswordErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [passwordData, t]);

  const handleChangePassword = useCallback(async () => {
    if (!validatePassword()) return;

    setIsChangingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        passwordData.currentPassword
      );
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, passwordData.newPassword);
      showNotification(t('account.passwordChanged'), 'success');
      setShowPasswordChange(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      if (error.code === 'auth/wrong-password') {
        setPasswordErrors({ currentPassword: t('validation.incorrectPassword') });
      } else {
        showNotification(t('account.passwordChangeFailed'), 'error');
      }
    } finally {
      setIsChangingPassword(false);
    }
  }, [passwordData, currentUser, validatePassword, showNotification, t]);

  useAutoSave({
    formData,
    config,
    activeTab: 'account',
    onInputChange,
    onSave,
    getNestedValue,
    validateCurrentTabData,
  });

  return (
    <div className={styles.sectionContainer} style={{ position: 'relative' }}>
      <style>{`
        .account-sections-wrapper {
          container-type: inline-size;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        @container (max-width: 700px) {
          .account-sections-wrapper {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <div className={styles.sectionsWrapper}>
          <div className={styles.leftColumn}>
            <div className={styles.sectionCard} style={{ position: 'relative', zIndex: 10 }}>
              <div className={styles.grid}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardIconWrapper}>
                    <FiCreditCard className="w-4 h-4" style={styles.cardIconStyle} />
                  </div>
                  <div className={styles.cardTitle}>
                    <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>
                      {t('account.subscription', 'Subscription')}
                    </h3>
                    <p className={styles.cardDescription} style={styles.cardDescriptionStyle}>
                      {t('account.subscriptionDescription', 'Manage your subscription plan')}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  {!isPremium && (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-semibold mb-2">{t('subscription.classic', 'Classic Plan')}</h4>
                          <ul className="text-sm space-y-1">
                            {classicFeatures.map((feature, idx) => (
                              <li key={idx} className="flex items-center gap-2">
                                <FiCheck className="w-4 h-4 text-primary" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 border-2 border-primary rounded-lg bg-primary/5">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{t('subscription.premium', 'Premium Plan')}</h4>
                            <FiStar className="w-4 h-4" style={{ color: GOLDEN_COLOR }} />
                          </div>
                          <ul className="text-sm space-y-1">
                            {premiumFeatures.map((feature, idx) => (
                              <li key={idx} className="flex items-center gap-2">
                                <FiCheck className="w-4 h-4 text-primary" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <Button
                          onClick={handleUpgradeToPremium}
                          disabled={isUpgrading}
                          className="ml-4"
                        >
                          {isUpgrading ? t('common.loading', 'Loading...') : t('subscription.upgrade', 'Upgrade')}
                        </Button>
                      </div>
                    </div>
                  )}

                  {isPremium && (
                    <div className="p-4 border-2 border-primary rounded-lg bg-primary/5">
                      <div className="flex items-center gap-2 mb-2">
                        <FiStar className="w-5 h-5" style={{ color: GOLDEN_COLOR }} />
                        <h4 className="font-semibold">{t('subscription.premiumActive', 'Premium Plan Active')}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t('subscription.premiumActiveDescription', 'You are currently on the Premium plan with all features enabled.')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {!isGoogleUser && (
              <div className={styles.sectionCard}>
                <div className={styles.grid}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardIconWrapper}>
                      <FiKey className="w-4 h-4" style={styles.cardIconStyle} />
                    </div>
                    <div className={styles.cardTitle}>
                      <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>
                        {t('account.password', 'Password')}
                      </h3>
                      <p className={styles.cardDescription} style={styles.cardDescriptionStyle}>
                        {t('account.passwordDescription', 'Change your account password')}
                      </p>
                    </div>
                  </div>

                  {!showPasswordChange ? (
                    <Button onClick={() => setShowPasswordChange(true)}>
                      {t('account.changePassword', 'Change Password')}
                    </Button>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <InputFieldHideUnhide
                        label={t('account.currentPassword', 'Current Password')}
                        value={passwordData.currentPassword}
                        onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                        error={passwordErrors.currentPassword}
                        required
                      />
                      <InputFieldHideUnhide
                        label={t('account.newPassword', 'New Password')}
                        value={passwordData.newPassword}
                        onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                        error={passwordErrors.newPassword}
                        required
                      />
                      <InputFieldHideUnhide
                        label={t('account.confirmPassword', 'Confirm Password')}
                        value={passwordData.confirmPassword}
                        onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                        error={passwordErrors.confirmPassword}
                        required
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={handleChangePassword}
                          disabled={isChangingPassword}
                        >
                          {isChangingPassword ? t('common.loading', 'Loading...') : t('account.savePassword', 'Save Password')}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowPasswordChange(false);
                            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                            setPasswordErrors({});
                          }}
                        >
                          {t('common.cancel', 'Cancel')}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className={styles.rightColumn}>
            <div className={styles.sectionCard}>
              <div className={styles.grid}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardIconWrapper}>
                    <FiUserX className="w-4 h-4" style={styles.cardIconStyle} />
                  </div>
                  <div className={styles.cardTitle}>
                    <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>
                      {t('account.deleteAccount', 'Delete Account')}
                    </h3>
                    <p className={styles.cardDescription} style={styles.cardDescriptionStyle}>
                      {t('account.deleteAccountDescription', 'Permanently delete your professional account')}
                    </p>
                  </div>
                </div>
                <AccountDeletion />
              </div>
            </div>
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
  getNestedValue: PropTypes.func.isRequired,
  validateCurrentTabData: PropTypes.func
};

export default Account;

