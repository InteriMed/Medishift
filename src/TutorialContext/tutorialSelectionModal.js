import React from 'react';
import PropTypes from 'prop-types';
import { FiPlay, FiTarget } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import modal from '../components/modals/modal';
import Button from '../../../components/boxedInputFields/Button';

const TutorialSelectionModal = ({
    isOpen,
    onClose,
    onStartAll,
    onStartCurrent,
    currentPageName
}) => {
    const { t } = useTranslation(['dashboard', 'common']);

    const formatPageName = (pageName) => {
        const nameMap = {
            'dashboard': t('dashboard.navigation.overview', 'Dashboard'),
            'messages': t('dashboard.navigation.messages', 'Messages'),
            'contracts': t('dashboard.navigation.contracts', 'Contracts'),
            'calendar': t('dashboard.navigation.calendar', 'Calendar'),
            'marketplace': t('dashboard.navigation.marketplace', 'Marketplace'),
            'payroll': t('dashboard.navigation.payroll', 'Payroll'),
            'organization': t('dashboard.navigation.organization', 'Organization'),
            'settings': t('dashboard.navigation.settings', 'Settings'),
            'profileTabs': t('dashboard.navigation.profile', 'Profile'),
            'facilityProfileTabs': t('dashboard.navigation.profile', 'Profile')
        };
        return nameMap[pageName] || pageName.charAt(0).toUpperCase() + pageName.slice(1);
    };

    const handleStartAll = () => {
        onStartAll();
        onClose();
    };

    const handleStartCurrent = () => {
        onStartCurrent();
        onClose();
    };

    return (
        <modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('dashboard.tutorial.selectionTitle', 'Choose Tutorial Mode')}
            messageType="info"
            size="small"
            actions={
                <Button variant="secondary" onClick={onClose}>
                    {t('common.cancel', 'Cancel')}
                </Button>
            }
        >
            <p className="text-slate-500 text-sm mb-6">
                {t('dashboard.tutorial.selectionSubtitle', 'Select how you would like to explore the platform')}
            </p>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 mb-1">
                    {t('dashboard.tutorial.currentPage', 'Current Page')}
                </p>
                <p className="text-base font-semibold text-slate-900">
                    {formatPageName(currentPageName)}
                </p>
            </div>

            <div className="flex flex-col gap-3">
                <button
                    onClick={handleStartCurrent}
                    className="group flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left"
                >
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                        <FiTarget size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-slate-900 mb-0.5">
                            {t('dashboard.tutorial.currentPageOnlyTitle', 'Current Page Only')}
                        </h3>
                        <p className="text-xs text-slate-500">
                            {t('dashboard.tutorial.currentPageOnlyDesc', 'Learn about the features on this page')}
                        </p>
                    </div>
                </button>

                <button
                    onClick={handleStartAll}
                    className="group flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-green-300 hover:bg-green-50/50 transition-all text-left"
                >
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-green-100 text-green-600 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                        <FiPlay size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-slate-900 mb-0.5">
                            {t('dashboard.tutorial.allPagesTitle', 'Complete Tutorial')}
                        </h3>
                        <p className="text-xs text-slate-500">
                            {t('dashboard.tutorial.allPagesDesc', 'Start from the beginning and explore all features')}
                        </p>
                    </div>
                </button>
            </div>
        </modal>
    );
};

TutorialSelectionModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onStartAll: PropTypes.func.isRequired,
    onStartCurrent: PropTypes.func.isRequired,
    currentPageName: PropTypes.string.isRequired
};

export default TutorialSelectionModal;
