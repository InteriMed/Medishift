import React from 'react';
import { useTutorial } from '../../contexts/TutorialContext';
import Button from '../../../components/BoxedInputFields/Button';

/**
 * AccessPopup - Displays access level confirmation with tutorial tooltip styling.
 * Shows when a user completes a profile section that unlocks new access levels.
 */
const AccessPopup = () => {
    const {
        showAccessPopup,
        accessPopupData,
        handleContinueFilling,
        handleSkipForNow
    } = useTutorial();

    if (!showAccessPopup || !accessPopupData) return null;

    return (
        <>
            {/* Backdrop overlay */}
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                    zIndex: 9400,
                }}
            />

            {/* Popup card - matches HighlightTooltip styling */}
            <div
                style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 9500,
                    pointerEvents: 'auto',
                    maxWidth: window.innerWidth < 768 ? 'calc(100vw - 40px)' : '480px',
                    width: window.innerWidth < 768 ? 'calc(100vw - 40px)' : 'auto',
                    minWidth: '360px',
                    backgroundColor: 'var(--background-div-color, #ffffff)',
                    borderRadius: '16px',
                    padding: '28px',
                    boxShadow: 'var(--shadow-elevated)',
                    border: '1px solid rgba(15, 23, 42, 0.15)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)',
                    maxHeight: 'calc(100vh - 80px)',
                    overflowY: 'auto',
                    animation: 'accessPopupSlideIn 0.4s var(--ease-out-back) both',
                    willChange: 'transform, opacity'
                }}
            >
                <style>{`
          @keyframes accessPopupSlideIn {
            from {
              opacity: 0;
              transform: translate(-50%, -50%) translateY(-20px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translate(-50%, -50%) translateY(0) scale(1);
            }
          }
        `}</style>

                {/* Header with accent bar */}
                <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <div
                            style={{
                                position: 'absolute',
                                left: '-4px',
                                top: '0',
                                bottom: '0',
                                width: '4px',
                                background: 'var(--color-logo-2)',
                                borderRadius: '4px'
                            }}
                        />
                        <h3 style={{
                            paddingLeft: '16px',
                            fontSize: '20px',
                            fontWeight: '700',
                            color: 'var(--color-logo-2)',
                            margin: 0
                        }}>
                            {accessPopupData.title}
                        </h3>
                    </div>
                </div>

                {/* Message content */}
                <p style={{
                    lineHeight: '1.7',
                    color: 'var(--text-color, #333)',
                    marginBottom: '24px',
                    fontSize: '15px',
                    paddingLeft: '16px'
                }}>
                    {accessPopupData.message}
                </p>

                {/* Action buttons */}
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'flex-end',
                    paddingTop: '8px'
                }}>
                    <Button
                        variant="secondary"
                        onClick={handleSkipForNow}
                    >
                        {accessPopupData.skipLabel || 'Skip for Now'}
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleContinueFilling}
                    >
                        {accessPopupData.continueLabel || 'Continue'}
                    </Button>
                </div>
            </div>
        </>
    );
};

export default AccessPopup;
