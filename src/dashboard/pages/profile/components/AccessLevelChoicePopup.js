import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import Dialog from '../../../../components/Dialog/Dialog';
import { FiUsers, FiBriefcase } from 'react-icons/fi';
import { useTutorial } from '../../../contexts/TutorialContext';
import { useDashboard } from '../../../contexts/DashboardContext';
import { TUTORIAL_IDS, getProfileTutorialForType, ONBOARDING_TYPES } from '../../../../config/tutorialSystem';
import { WORKSPACE_TYPES } from '../../../../utils/sessionAuth';

const AccessLevelChoicePopup = ({ isOpen, onClose, onContinueOnboarding, onSelectTeamAccess, glnVerified = false, allowClose = true }) => {
    const { t, i18n } = useTranslation('dashboardProfile');
    const navigate = useNavigate();
    const location = useLocation();
    const { isTutorialActive, startTutorial, setAccessLevelChoice, resetProfileTabAccess, setMaxAccessedProfileTab, stopTutorial } = useTutorial();
    const { user, selectedWorkspace } = useDashboard();

    const handleContinueOnboarding = async () => {
        const isOnProfilePage = location.pathname.includes('/profile');
        const isOnProfileSubTab = isOnProfilePage && location.pathname.split('/profile/')[1];
        const shouldPreserveTabProgress = isTutorialActive && isOnProfileSubTab;

        if (!shouldPreserveTabProgress) {
            resetProfileTabAccess();
            setMaxAccessedProfileTab('personalDetails');
        }
        
        if (!isOnProfilePage) {
            const workspaceId = selectedWorkspace?.id || 'personal';
            navigate(`/dashboard/${workspaceId}/profile/personalDetails`);
        }
        
        // Start tutorial if not active
        if (!isTutorialActive && startTutorial) {
            const onboardingType = selectedWorkspace?.type === WORKSPACE_TYPES.TEAM ? ONBOARDING_TYPES.FACILITY : ONBOARDING_TYPES.PROFESSIONAL;
            const tutorialName = getProfileTutorialForType(onboardingType);
            startTutorial(tutorialName);
        }
        
        if (onContinueOnboarding) {
            onContinueOnboarding();
        }
        
        onClose();
    };

    const handleSelectTeamAccess = async () => {
        // ALWAYS stop tutorial and set isTutorialActive = false
        // Await to ensure tutorial is fully stopped before proceeding
        if (stopTutorial) {
            await stopTutorial({ forceStop: true, showAccessPopupForProfile: false });
        }
        
        if (resetProfileTabAccess) {
            resetProfileTabAccess();
        }
        
        if (onSelectTeamAccess) {
            await onSelectTeamAccess();
        }
        
        onClose();
    };

    const handleBackToOnboarding = () => {
        const lang = i18n.language || 'fr';
        const onboardingType = user?.role === 'facility' || user?.role === 'company' ? 'facility' : 'professional';
        navigate(`/${lang}/onboarding?type=${onboardingType}&restart=true`);
        onClose();
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={t('accessLevelChoice.title', 'Choose Your Access Level')}
            size="large"
            closeOnEscape={allowClose}
            closeOnBackdropClick={allowClose}
            showCloseButton={allowClose}
        >
            <div className="space-y-6">
                <p className="text-muted-foreground text-center">
                    {t(
                        'accessLevelChoice.message',
                        'How would you like to use MediShift?'
                    )}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div 
                        onClick={handleSelectTeamAccess}
                        className="group border-2 border-border rounded-xl p-6 hover:border-blue-600 transition-colors flex flex-col cursor-pointer"
                    >
                        <div className="mb-4">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-3 rounded-lg bg-blue-500/10 text-blue-600">
                                    <FiUsers size={24} />
                                </div>
                                <h3 className="text-lg font-semibold">
                                    {t('accessLevelChoice.teamAccess', 'Team Access')}
                                </h3>
                            </div>
                            <span className="text-xs font-semibold text-blue-600 bg-blue-500/10 px-3 py-1 rounded-full uppercase">
                                {t('accessLevelChoice.quickStart', 'Quick Start')}
                            </span>
                        </div>
                        <ul className="space-y-2 text-sm text-muted-foreground list-none pl-0 flex-1">
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 mt-1">•</span>
                                <span>{t('accessLevelChoice.teamAccess.benefit1', 'Join teams and collaborate immediately')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 mt-1">•</span>
                                <span>{t('accessLevelChoice.teamAccess.benefit2', 'Access calendar, messages, and team features')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 mt-1">•</span>
                                <span>{t('accessLevelChoice.teamAccess.benefit3', 'Perfect for team members and employees')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-blue-600 mt-1">•</span>
                                <span>{t('accessLevelChoice.teamAccess.benefit4', 'Complete your profile later if needed')}</span>
                            </li>
                        </ul>
                        <div className="mt-4 pt-4 border-t border-border">
                            <div className="w-full px-4 py-2 rounded-lg border-2 border-blue-600 bg-transparent group-hover:bg-blue-600 text-blue-600 group-hover:text-white font-semibold transition-colors text-center">
                                {t('accessLevelChoice.selectTeamAccess', 'Select Team Access')}
                            </div>
                        </div>
                    </div>

                    <div 
                        onClick={glnVerified ? handleContinueOnboarding : handleBackToOnboarding}
                        className={`group border-2 border-border rounded-xl p-6 transition-colors flex flex-col ${glnVerified ? 'hover:border-green-600 cursor-pointer' : 'opacity-60 cursor-pointer'}`}
                    >
                        <div className="mb-4">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-3 rounded-lg bg-green-500/10 text-green-600">
                                    <FiBriefcase size={24} />
                                </div>
                                <h3 className="text-lg font-semibold">
                                    {t('accessLevelChoice.fullAccess', 'Full Access')}
                                </h3>
                            </div>
                            <span className="text-xs font-semibold text-green-600 bg-green-500/10 px-3 py-1 rounded-full uppercase">
                                {t('accessLevelChoice.completeProfile', 'Complete Profile')}
                            </span>
                        </div>
                        <ul className="space-y-2 text-sm text-muted-foreground list-none pl-0 flex-1">
                            <li className="flex items-start gap-2">
                                <span className="text-green-600 mt-1">•</span>
                                <span>{t('accessLevelChoice.fullAccess.benefit1', 'Work independently and take on replacements')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-600 mt-1">•</span>
                                <span>{t('accessLevelChoice.fullAccess.benefit2', 'Access all platform features')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-600 mt-1">•</span>
                                <span>{t('accessLevelChoice.fullAccess.benefit3', 'Required for independent professionals')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-600 mt-1">•</span>
                                <span>{t('accessLevelChoice.fullAccess.benefit4', 'Complete your full profile now')}</span>
                            </li>
                        </ul>
                        <div className="mt-4 pt-4 border-t border-border">
                            {!glnVerified ? (
                                <div>
                                    <p className="text-red-600 text-sm font-medium mb-3 text-center">
                                        {t('accessLevelChoice.glnRequired', 'GLN verification required for Full Access')}
                                    </p>
                                    <div className="w-full px-4 py-2 rounded-lg border-2 border-red-600 bg-transparent text-red-600 group-hover:bg-red-600 group-hover:text-white font-semibold transition-colors text-center">
                                        {t('accessLevelChoice.backToOnboarding', 'Back to Onboarding')}
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full px-4 py-2 rounded-lg border-2 border-green-600 bg-transparent text-green-600 group-hover:bg-green-600 group-hover:text-white font-semibold transition-colors text-center">
                                    {t('accessLevelChoice.continueProfile', 'Continue Profile')}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Dialog>
    );
};

AccessLevelChoicePopup.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onContinueOnboarding: PropTypes.func.isRequired,
    onSelectTeamAccess: PropTypes.func,
    glnVerified: PropTypes.bool,
    allowClose: PropTypes.bool
};

export default AccessLevelChoicePopup;

