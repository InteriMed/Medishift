import React from 'react';
import PropTypes from 'prop-types';
import { FiHelpCircle, FiBell, FiChevronDown } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import Dialog from '../../../components/Dialog/Dialog';
import Button from '../../../components/BoxedInputFields/Button';
import { useDashboard } from '../../contexts/DashboardContext';
import { WORKSPACE_TYPES } from '../../../utils/sessionAuth';

const StopTutorialConfirmModal = ({
    isOpen,
    onClose,
    onConfirm
}) => {
    const { t } = useTranslation(['dashboard', 'common']);
    const { selectedWorkspace, user } = useDashboard();

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    const getWorkspaceColor = () => {
        if (selectedWorkspace?.type === WORKSPACE_TYPES.ADMIN) {
            return '#dc2626';
        }
        if (selectedWorkspace?.type === 'team' || user?.role === 'facility' || user?.role === 'company') {
            return 'var(--color-logo-2, #29517b)';
        }
        return 'var(--color-logo-1, #70a4cf)';
    };

    const workspaceColor = getWorkspaceColor();

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={t('dashboard.tutorial.stopTitle', 'Pause Tutorial?')}
            messageType="warning"
            size="small"
            centerTitle={false}
            actions={
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '0.75rem' }}>
                    <Button variant="secondary" onClick={onClose} style={{ minWidth: '120px' }}>
                        {t('dashboard.tutorial.keepGoing', 'Keep Going')}
                    </Button>
                    <Button 
                        variant="warning" 
                        onClick={handleConfirm} 
                        style={{ minWidth: '120px' }}
                    >
                        {t('dashboard.tutorial.pauseNow', 'Pause Tutorial')}
                    </Button>
                </div>
            }
        >
            <div className="relative w-full overflow-hidden rounded-xl mb-6">
                <div 
                    className="flex items-center justify-between px-6 py-4 mx-auto relative z-10"
                    style={{ 
                        backgroundColor: workspaceColor,
                        width: '100%',
                        maxWidth: '320px',
                        borderRadius: '12px',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                        margin: '0 auto'
                    }}
                >
                    {/* Notification Button (Left) */}
                    <div className="relative rounded-lg p-2 bg-white/10 text-white flex items-center justify-center opacity-60">
                        <FiBell size={20} />
                        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 border-2 border-white" />
                    </div>

                    {/* Main Help Button (Center) */}
                    <div className="flex items-center gap-3">
                        <div 
                            className="flex items-center justify-center rounded-lg bg-white/20 border border-white/30 transition-all"
                            style={{ 
                                width: '36px', 
                                height: '36px',
                                animation: 'tutorialButtonPulse 2s ease-in-out infinite'
                            }}
                        >
                            <FiHelpCircle className="text-white" size={20} />
                        </div>
                        <div className="flex flex-col items-start">
                            <span className="text-white/70" style={{ fontSize: '10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {t('dashboard.tutorial.clickHere', 'Click here')}
                            </span>
                            <span className="text-white font-semibold text-xs">
                                {t('dashboard.tutorial.toContinue', 'to continue later')}
                            </span>
                        </div>
                    </div>

                    {/* Language Button (Right) */}
                    <div className="flex items-center gap-1.5 rounded-lg p-1.5 bg-white/10 text-white opacity-60">
                        <span className="text-xs font-semibold uppercase">EN</span>
                        <FiChevronDown size={14} />
                    </div>
                </div>
            </div>

            <p className="text-slate-600" style={{ fontSize: 'var(--font-size-medium)', lineHeight: 1.6 }}>
                {t('dashboard.tutorial.stopDescription', 'You can continue the tutorial anytime by clicking the help button in the header.')}
            </p>

            <style>{`
                @keyframes tutorialButtonPulse {
                    0%, 100% {
                        box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4);
                        transform: scale(1);
                    }
                    50% {
                        box-shadow: 0 0 0 8px rgba(255, 255, 255, 0);
                        transform: scale(1.05);
                    }
                }
            `}</style>
        </Dialog>
    );
};

StopTutorialConfirmModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired
};

export default StopTutorialConfirmModal;
