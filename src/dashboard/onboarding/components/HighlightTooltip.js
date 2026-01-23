import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiBookOpen, FiHelpCircle, FiBell, FiChevronDown } from 'react-icons/fi';
import { useTutorial } from '../../contexts/TutorialContext';
import { useDashboard } from '../../contexts/DashboardContext';
import { isLastStep as checkIsLastStep, TUTORIAL_IDS, TUTORIAL_STEP_DEFINITIONS as tutorialSteps } from '../../../config/tutorialSystem';
import Dialog from '../../../components/Dialog/Dialog';
import Button from '../../../components/BoxedInputFields/Button';
import SidebarHighlighter from './SidebarHighlighter';
import { useTranslation } from 'react-i18next';
import { WORKSPACE_TYPES } from '../../../utils/sessionAuth';

const ReplicatedElement = ({ selector, onReady }) => {
  const [element, setElement] = useState(null);

  useEffect(() => {
    if (!selector) {
      onReady(true);
      return;
    }

    const findElement = () => {
      const el = document.querySelector(selector);
      if (el) {
        setElement(el.cloneNode(true));
        onReady(true);
      } else {
        setTimeout(findElement, 100);
      }
    };

    findElement();
  }, [selector, onReady]);

  if (!element) return null;

  return (
    <div 
      className="replicated-element-container"
      ref={(node) => {
        if (node && element) {
          node.innerHTML = '';
          node.appendChild(element);
        }
      }}
    />
  );
};

const VisualPreview = ({ type, data, workspaceColor }) => {
  const { t } = useTranslation(['tutorial', 'common']);

  if (type === 'header_help') {
    return (
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
      </div>
    );
  }

  return null;
};

const HighlightTooltip = ({
  tutorialStep,
  tutorialFeature,
  prevStep,
  nextStep,
  completeTutorial
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation(['tutorial', 'common']);
  const {
    skipTutorial,
    elementPosition,
    pauseTutorial,
    isWaitingForSave,
    setWaitingForSave,
    completedTutorials,
    validationRef,
    showWarning,
    setAccessMode,
    activeTutorial,
    currentStep,
    navigateToFeature,
    resetProfileTabAccess,
    showAccessLevelModal
  } = useTutorial();
  const { userProfile, selectedWorkspace, user } = useDashboard();
  const stepIndex = tutorialStep || 0;
  const featureKey = tutorialFeature || 'dashboard';
  const [tooltipContent, setTooltipContent] = useState({
    title: 'Tutorial',
    description: 'Welcome to the tutorial.',
    position: {
      top: '200px',
      left: '300px'
    }
  });
  const [isProcessingClick, setIsProcessingClick] = useState(false);
  const [isReplicationReady, setIsReplicationReady] = useState(false);

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

  const currentStepData =
    tutorialSteps[featureKey] && tutorialSteps[featureKey][stepIndex]
      ? tutorialSteps[featureKey][stepIndex]
      : null;

  // Initialize visibility to true by default - will be controlled by effects
  // This ensures tooltips show immediately on reload
  const [isVisible, setIsVisible] = useState(true);

  // Reset replication readiness when step changes
  useEffect(() => {
    setIsReplicationReady(false);
  }, [stepIndex, featureKey]);

  // Track if we've successfully shown the tooltip for this step
  // This prevents the tooltip from closing during re-renders when currentStepData is temporarily null
  const hasShownForStepRef = React.useRef(false);

  // Track the intended visibility state - only set to false when we explicitly want to hide
  // This prevents the Dialog from closing during re-renders
  const intendedVisibilityRef = React.useRef(true);

  // CRITICAL: Always show tooltip when step data becomes available (unless explicitly waiting for save)
  useEffect(() => {
    if (currentStepData && !isWaitingForSave && intendedVisibilityRef.current) {
      setIsVisible(true);
      hasShownForStepRef.current = true;
    } else if (isWaitingForSave) {
      setIsVisible(false);
    }
  }, [currentStepData, isWaitingForSave]);

  // Update tooltip content when step data changes
  useEffect(() => {
    if (currentStepData) {
      const title = currentStepData.title || t(`tutorials.${featureKey}.steps.${currentStepData.id}.title`, 'Tutorial');
      const description = currentStepData.content || t(`tutorials.${featureKey}.steps.${currentStepData.id}.content`, '');
      
      // Calculate position based on element position or fixed position
      let position = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
      
      if (elementPosition) {
        const { top, left, width, height } = elementPosition;
        const padding = 20;
        
        // Default to right of element
        position = {
          top: `${top + height / 2}px`,
          left: `${left + width + padding}px`,
          transform: 'translateY(-50%)'
        };

        // Adjust based on tooltipPosition override if provided
        if (currentStepData.tooltipPosition) {
          position = { ...position, ...currentStepData.tooltipPosition };
        }
      } else if (currentStepData.tooltipPosition) {
        position = currentStepData.tooltipPosition;
      }

      setTooltipContent({
        title,
        description,
        position
      });
    }
  }, [currentStepData, elementPosition, featureKey, t]);

  const handleNextClick = async () => {
    if (isProcessingClick) return;
    setIsProcessingClick(true);
    try {
      await nextStep();
    } finally {
      setIsProcessingClick(false);
    }
  };

  const handlePrevClick = async () => {
    if (isProcessingClick) return;
    setIsProcessingClick(true);
    try {
      await prevStep();
    } finally {
      setIsProcessingClick(false);
    }
  };

  const handleCustomButtonClick = async (action, e) => {
    if (e) e.stopPropagation();
    if (isProcessingClick) return;
    setIsProcessingClick(true);
    
    try {
      if (action === 'pause_and_fill') {
        setWaitingForSave(true);
        setIsVisible(false);
        intendedVisibilityRef.current = false;
      } else if (action === 'start_messages_tutorial') {
        await completeTutorial();
        // startTutorial is handled by TutorialContext chaining
      }
    } finally {
      setIsProcessingClick(false);
    }
  };

  const isLastStep = checkIsLastStep(featureKey, stepIndex);
  const requiresInteraction = currentStepData?.requiresInteraction || false;
  const isOnCorrectPage = currentStepData?.navigationPath ? location.pathname.includes(currentStepData.navigationPath) : true;

  // Final visibility check for the Dialog
  const dialogIsOpen = isVisible && !!currentStepData && !isWaitingForSave;

  return (
    <>
      {/* Always render the sidebar highlighter to handle highlighting */}
      <SidebarHighlighter />

      <Dialog
        isOpen={dialogIsOpen}
        onClose={() => {
          setIsVisible(false);
        }}
        title={tooltipContent.title}
        blurred_background={false}
        position={tooltipContent.position}
        size="small"
        closeOnEscape={true}
        closeOnBackdropClick={false}
        messageType="info"
        showCloseButton={true}
        actions={
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'nowrap',
              gap: '0.75rem',
              width: '100%'
            }}
          >
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {(tutorialStep || 0) > 0 && (
                <Button
                  variant="secondary"
                  onClick={handlePrevClick}
                  disabled={isProcessingClick}
                  style={{
                    flexShrink: 0,
                    width: 'auto',
                    minWidth: 'fit-content',
                    maxWidth: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Previous
                </Button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {(() => {
                const requiredPath = currentStepData?.navigationPath || currentStepData?.requiredPage;
                const shouldShowShowMeButton = requiredPath && !isOnCorrectPage;

                if (shouldShowShowMeButton) {
                  return (
                    <Button
                      variant="info"
                      onClick={handleNextClick}
                      disabled={isProcessingClick}
                      style={{
                        flexShrink: 0,
                        width: 'auto',
                        minWidth: 'fit-content',
                        maxWidth: 'none',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Show me
                    </Button>
                  );
                }

                if (currentStepData?.customButtons) {
                  return (
                    <>
                      {currentStepData.customButtons.map((button, index) => (
                        <Button
                          key={index}
                          variant="info"
                          onClick={(e) => handleCustomButtonClick(button.action, e)}
                          disabled={isProcessingClick}
                          style={{
                            flexShrink: 0,
                            width: 'auto',
                            minWidth: 'fit-content',
                            maxWidth: 'none',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {button.text}
                        </Button>
                      ))}
                    </>
                  );
                }

                if (currentStepData?.actionButton) {
                  return (
                    <Button
                      variant="info"
                      onClick={handleNextClick}
                      disabled={isProcessingClick}
                      style={{
                        flexShrink: 0,
                        width: 'auto',
                        minWidth: 'fit-content',
                        maxWidth: 'none',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {currentStepData.actionButton.text || 'Continue'}
                    </Button>
                  );
                }

                if (!requiresInteraction) {
                  return (
                    <Button
                      variant="info"
                      onClick={handleNextClick}
                      disabled={isProcessingClick}
                      style={{
                        flexShrink: 0,
                        width: 'auto',
                        minWidth: 'fit-content',
                        maxWidth: 'none',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {isLastStep ? 'Finish' : 'Next'}
                    </Button>
                  );
                }

                return null;
              })()}
            </div>
          </div>
        }
      >
        {currentStepData?.visualPreview && (
          <VisualPreview 
            type={currentStepData.visualPreview.type} 
            data={currentStepData.visualPreview} 
            workspaceColor={workspaceColor}
          />
        )}
        <ReplicatedElement selector={currentStepData?.replicateSelector} onReady={setIsReplicationReady} />
        <p style={{
          lineHeight: '1.6',
          color: 'var(--text-color, #333)',
          margin: 0
        }}>{tooltipContent.description}</p>
      </Dialog>
    </>
  );
};

HighlightTooltip.propTypes = {
  tutorialStep: PropTypes.number,
  tutorialFeature: PropTypes.string,
  prevStep: PropTypes.func.isRequired,
  nextStep: PropTypes.func.isRequired,
  completeTutorial: PropTypes.func.isRequired
};

export default HighlightTooltip;
