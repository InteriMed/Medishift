import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Dialog from '../../../../components/Dialog/Dialog';
import { FiUsers, FiBriefcase, FiCalendar, FiTrendingUp } from 'react-icons/fi';
import { useDashboard } from '../../../contexts/DashboardContext';

const FacilityAccessLevelPopup = ({ isOpen, onClose, allowClose = false }) => {
    const { t, i18n } = useTranslation('dashboardProfile');
    const navigate = useNavigate();
    const { user } = useDashboard();

    const handleCompleteProfile = () => {
        onClose();
    };

    const handleLearnMore = () => {
        const lang = i18n.language || 'fr';
        window.open(`/${lang}/facilities`, '_blank');
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={t('facilityAccessChoice.title', 'Choose Your Facility Access')}
            size="large"
            closeOnEscape={allowClose}
            closeOnBackdropClick={allowClose}
            showCloseButton={allowClose}
        >
            <div className="space-y-6">
                <p className="text-muted-foreground text-center">
                    {t(
                        'facilityAccessChoice.message',
                        'Select the access tier that best fits your facility needs'
                    )}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border-2 border-border rounded-xl p-6 hover:border-primary/50 transition-colors flex flex-col">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-lg bg-blue-500/10 text-blue-600">
                                    <FiUsers size={24} />
                                </div>
                                <h3 className="text-lg font-semibold">
                                    {t('facilityAccessChoice.freeTier', 'Free Tier')}
                                </h3>
                            </div>
                            <span className="text-xs font-semibold text-blue-600 bg-blue-500/10 px-3 py-1 rounded-full uppercase">
                                {t('facilityAccessChoice.free', 'Free')}
                            </span>
                        </div>
                        <ul className="space-y-2 text-sm text-muted-foreground list-none pl-0 flex-1">
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 mt-1">•</span>
                                <span>{t('facilityAccessChoice.freeTier.benefit1', 'Free access to candidates')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 mt-1">•</span>
                                <span>{t('facilityAccessChoice.freeTier.benefit2', 'Create job offers')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 mt-1">•</span>
                                <span>{t('facilityAccessChoice.freeTier.benefit3', 'Basic candidate management')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 mt-1">•</span>
                                <span>{t('facilityAccessChoice.freeTier.benefit4', 'Standard fees for short-term positions')}</span>
                            </li>
                        </ul>
                    </div>

                    <div 
                        className="border-2 rounded-xl p-6 transition-colors flex flex-col"
                        style={{
                            borderColor: 'var(--premium-gold-light)',
                            background: 'linear-gradient(135deg, rgba(248, 176, 19, 0.05) 0%, rgba(255, 196, 21, 0.02) 100%)'
                        }}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div 
                                    className="p-3 rounded-lg"
                                    style={{
                                        backgroundColor: 'var(--premium-gold-bg)',
                                        color: 'var(--premium-gold)'
                                    }}
                                >
                                    <FiBriefcase size={24} />
                                </div>
                                <h3 className="text-lg font-semibold">
                                    {t('facilityAccessChoice.premiumTier', 'Premium Tier')}
                                </h3>
                            </div>
                            <span 
                                className="text-xs font-semibold px-3 py-1 rounded-full uppercase"
                                style={{
                                    color: 'var(--premium-gold)',
                                    backgroundColor: 'var(--premium-gold-bg)'
                                }}
                            >
                                {t('facilityAccessChoice.premium', 'Premium')}
                            </span>
                        </div>
                        <ul className="space-y-2 text-sm text-muted-foreground list-none pl-0 flex-1">
                            <li className="flex items-start gap-2">
                                <span style={{ color: 'var(--premium-gold)' }} className="mt-1">•</span>
                                <span>{t('facilityAccessChoice.premiumTier.benefit1', 'Full HR system with team management')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span style={{ color: 'var(--premium-gold)' }} className="mt-1">•</span>
                                <span>{t('facilityAccessChoice.premiumTier.benefit2', 'Automated scheduling for your team')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span style={{ color: 'var(--premium-gold)' }} className="mt-1">•</span>
                                <span>{t('facilityAccessChoice.premiumTier.benefit3', 'Advanced schedule management')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span style={{ color: 'var(--premium-gold)' }} className="mt-1">•</span>
                                <span>{t('facilityAccessChoice.premiumTier.benefit4', 'Reduced fees for short-term positions')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span style={{ color: 'var(--premium-gold)' }} className="mt-1">•</span>
                                <span>{t('facilityAccessChoice.premiumTier.benefit5', 'Priority support')}</span>
                            </li>
                        </ul>
                        <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--premium-gold-light)' }}>
                            <button
                                onClick={handleLearnMore}
                                className="w-full px-4 py-2 rounded-lg font-semibold transition-colors"
                                style={{
                                    border: '2px solid var(--premium-gold)',
                                    color: 'var(--premium-gold)',
                                    backgroundColor: 'transparent'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--premium-gold)';
                                    e.currentTarget.style.color = 'white';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = 'var(--premium-gold)';
                                }}
                            >
                                {t('facilityAccessChoice.learnMore', 'Learn More')}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-muted/30 border border-border rounded-lg p-4">
                    <p className="text-sm text-muted-foreground text-center mb-2">
                        {t('facilityAccessChoice.profileRequirement', 'Complete your facility profile to access either tier')}
                    </p>
                    <p className="text-xs text-muted-foreground text-center">
                        {t('facilityAccessChoice.mandatoryFields', 'All fields in Facility Details, Legal, Billing, and Settings (including Opening Hours) must be completed')}
                    </p>
                </div>

                <div className="flex justify-center">
                    <button
                        onClick={handleCompleteProfile}
                        className="px-6 py-3 rounded-lg border-2 border-primary bg-transparent hover:bg-primary text-primary hover:text-white font-semibold transition-colors"
                    >
                        {t('facilityAccessChoice.completeMyProfile', 'Complete My Profile')}
                    </button>
                </div>
            </div>
        </Dialog>
    );
};

FacilityAccessLevelPopup.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    allowClose: PropTypes.bool
};

export default FacilityAccessLevelPopup;

