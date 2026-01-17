import React from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { FiPlay, FiTarget } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import styles from './TutorialSelectionModal.module.css';

/**
 * TutorialSelectionModal Component
 * 
 * Modal that appears when user clicks "Start Tutorial" button in header.
 * Offers choice between starting all tutorials or just the current page tutorial.
 */
const TutorialSelectionModal = ({
    isOpen,
    onClose,
    onStartAll,
    onStartCurrent,
    currentPageName
}) => {
    const { t } = useTranslation(['dashboard', 'common']);

    if (!isOpen) return null;

    // Format page name for display
    const formatPageName = (pageName) => {
        // Capitalize first letter and handle special cases
        const nameMap = {
            'dashboard': t('dashboard.navigation.overview', 'Dashboard'),
            'messages': t('dashboard.navigation.messages', 'Messages'),
            'contracts': t('dashboard.navigation.contracts', 'Contracts'),
            'calendar': t('dashboard.navigation.calendar', 'Calendar'),
            'profile': t('dashboard.navigation.profile', 'Profile'),
            'marketplace': t('dashboard.navigation.marketplace', 'Marketplace'),
            'payroll': t('dashboard.navigation.payroll', 'Payroll'),
            'organization': t('dashboard.navigation.organization', 'Organization'),
            'settings': t('dashboard.navigation.settings', 'Settings'),
            'profileTabs': t('dashboard.navigation.profile', 'Profile')
        };

        return nameMap[pageName] || pageName.charAt(0).toUpperCase() + pageName.slice(1);
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleStartAll = () => {
        onStartAll();
        onClose();
    };

    const handleStartCurrent = () => {
        onStartCurrent();
        onClose();
    };

    return createPortal(
        <div className={styles.overlay} onClick={handleOverlayClick}>
            <div className={styles.modal} role="dialog" aria-labelledby="tutorial-modal-title" aria-modal="true">
                <div className={styles.header}>
                    <h2 id="tutorial-modal-title" className={styles.title}>
                        {t('dashboard.tutorial.selectionTitle', 'Choose Tutorial Mode')}
                    </h2>
                    <p className={styles.subtitle}>
                        {t('dashboard.tutorial.selectionSubtitle', 'Select how you would like to explore the platform')}
                    </p>
                </div>

                <div className={styles.currentPageInfo}>
                    <p className={styles.currentPageLabel}>
                        {t('dashboard.tutorial.currentPage', 'Current Page')}
                    </p>
                    <p className={styles.currentPageName}>
                        {formatPageName(currentPageName)}
                    </p>
                </div>

                <div className={styles.options}>
                    <button
                        className={styles.optionButton}
                        onClick={handleStartCurrent}
                        aria-label={t('dashboard.tutorial.currentPageOnly', 'Start tutorial for current page only')}
                    >
                        <div className={styles.optionIcon}>
                            <FiTarget />
                        </div>
                        <div className={styles.optionContent}>
                            <h3 className={styles.optionTitle}>
                                {t('dashboard.tutorial.currentPageOnlyTitle', 'Current Page Only')}
                            </h3>
                            <p className={styles.optionDescription}>
                                {t('dashboard.tutorial.currentPageOnlyDesc', 'Learn about the features on this page')}
                            </p>
                        </div>
                    </button>

                    <button
                        className={styles.optionButton}
                        onClick={handleStartAll}
                        aria-label={t('dashboard.tutorial.allPages', 'Start complete tutorial from the beginning')}
                    >
                        <div className={styles.optionIcon}>
                            <FiPlay />
                        </div>
                        <div className={styles.optionContent}>
                            <h3 className={styles.optionTitle}>
                                {t('dashboard.tutorial.allPagesTitle', 'Complete Tutorial')}
                            </h3>
                            <p className={styles.optionDescription}>
                                {t('dashboard.tutorial.allPagesDesc', 'Start from the beginning and explore all features')}
                            </p>
                        </div>
                    </button>
                </div>

                <div className={styles.footer}>
                    <button
                        className={styles.cancelButton}
                        onClick={onClose}
                        aria-label={t('common.cancel', 'Cancel')}
                    >
                        {t('common.cancel', 'Cancel')}
                    </button>
                </div>
            </div>
        </div>,
        document.body
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
