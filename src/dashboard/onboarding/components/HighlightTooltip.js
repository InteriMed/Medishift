import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FiBookOpen, FiHelpCircle, FiBell, FiChevronDown,
  FiMessageSquare, FiFileText, FiCalendar, FiBriefcase,
  FiDollarSign, FiUsers, FiSettings, FiUser, FiZap, FiCreditCard
} from 'react-icons/fi';
import { useTutorial } from '../../contexts/TutorialContext';
import { useDashboard } from '../../contexts/DashboardContext';
import {
  isLastStep as checkIsLastStep,
  TUTORIAL_IDS,
  TUTORIAL_STEP_DEFINITIONS as tutorialSteps,
  isOnCorrectPage as isPageMatch,
  getPathForTutorial
} from '../../../config/tutorialSystem';
import { buildDashboardUrl, getWorkspaceIdForUrl } from '../../utils/pathUtils';
import Dialog from '../../../components/Dialog/Dialog';
import Button from '../../../components/BoxedInputFields/Button';
import SidebarHighlighter from './SidebarHighlighter';
import { useTranslation } from 'react-i18next';
import { WORKSPACE_TYPES } from '../../../utils/sessionAuth';

const ICON_MAP = {
  'message-square': FiMessageSquare,
  'file-text': FiFileText,
  'calendar': FiCalendar,
  'briefcase': FiBriefcase,
  'dollar-sign': FiDollarSign,
  'credit-card': FiCreditCard,
  'users': FiUsers,
  'settings': FiSettings,
  'user': FiUser,
  'zap': FiZap
};

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

const UnifiedPreviewContainer = ({ children, bgColor, iconColor, text }) => (
  <div className="relative w-full p-1 rounded-xl mb-6 flex justify-center">
    <div
      className="flex items-center gap-3 px-3 py-2 relative z-10"
      style={{
        backgroundColor: bgColor || 'white',
        width: '100%',
        maxWidth: '240px',
        borderRadius: '8px',
        border: '1px solid var(--border, #e2e8f0)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}
    >
      {children}
    </div>
  </div>
);

const GenericUIElement = ({ icon: Icon, text, iconColor, textColor }) => (
  <>
    {Icon && (
      <div
        className="flex items-center justify-center rounded-md transition-colors shrink-0"
        style={{
          width: '32px',
          height: '32px',
          backgroundColor: iconColor ? `${iconColor}15` : 'transparent',
        }}
      >
        <Icon style={{ color: iconColor || 'var(--muted-foreground, #64748b)' }} size={18} />
      </div>
    )}
    <span
      className="font-medium text-sm truncate"
      style={{ color: textColor || 'var(--foreground, #1e293b)' }}
    >
      {text}
    </span>
  </>
);

const VisualPreview = ({ type, data, workspaceColor }) => {
  const { t } = useTranslation(['tutorial', 'common', 'dashboard', 'tabs']);

  if (type === 'header_help') {
    return (
      <div className="relative w-full p-1 rounded-xl mb-6">
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
                {t('dashboard:dashboard.tutorial.clickHere', 'Click here')}
              </span>
              <span className="text-white font-semibold text-xs">
                {t('dashboard:dashboard.tutorial.toContinue', 'to continue later')}
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

  if (type === 'sidebar_item') {
    const Icon = ICON_MAP[data.icon] || FiBookOpen;

    const fallback = data.textKey ? data.textKey.split('.').pop() : 'Menu Item';
    const capitalizedFallback = fallback.charAt(0).toUpperCase() + fallback.slice(1);
    let translationKey = data.textKey;
    if (data.textKey?.startsWith('dashboard.')) {
      translationKey = `dashboard:${data.textKey}`;
    }
    const displayText = t(translationKey, capitalizedFallback);

    return (
      <UnifiedPreviewContainer bgColor="white">
        <GenericUIElement
          icon={Icon}
          text={displayText}
          iconColor="var(--grey-3)"
          textColor="var(--grey-3)"
        />
      </UnifiedPreviewContainer>
    );
  }

  if (type === 'autofill_button') {
    return (
      <div className="relative w-full p-1 rounded-xl mb-6 flex justify-center">
        <div
          className="group flex items-center justify-center gap-2 px-4 relative z-10 transition-all"
          style={{
            backgroundColor: 'rgba(255, 215, 83, 0.3)',
            border: '2px solid rgb(255, 215, 83)',
            width: '100%',
            maxWidth: '240px',
            borderRadius: '12px',
            height: 'var(--boxed-inputfield-height, 40px)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            animation: 'tutorialButtonPulse 2s ease-in-out infinite'
          }}
        >
          <FiZap
            style={{ color: 'hsl(var(--muted-foreground) / 0.7)' }}
            size={16}
            className="transition-colors"
          />
          <span
            className="font-medium text-sm truncate transition-colors"
            style={{ color: 'hsl(var(--muted-foreground) / 0.7)' }}
          >
            {t('common:buttons.autoFill', 'Auto Fill')}
          </span>
        </div>
        <style>{`
          @keyframes tutorialButtonPulse {
            0%, 100% {
              box-shadow: 0 0 0 0 rgba(255, 215, 83, 0.8);
            }
            50% {
              box-shadow: 0 0 0 10px rgb(255, 215, 83, 0);
            }
          }
        `}</style>
      </div>
    );
  }

  if (type === 'profile_tab') {
    const Icon = ICON_MAP[data.icon] || FiUser;
    const displayText = t(`tabs:${data.tabId}`, data.tabId);

    return (
      <UnifiedPreviewContainer>
        <GenericUIElement
          icon={Icon}
          text={displayText}
          iconColor="var(--muted-foreground, #64748b)"
          textColor="var(--muted-foreground, #64748b)"
        />
      </UnifiedPreviewContainer>
    );
  }

  return null;
};

const LOG_PREFIX = '[TutorialTooltip]';

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
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)'
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

  useEffect(() => {
    console.log(LOG_PREFIX, 'Mount', {
      featureKey,
      stepIndex,
      currentPath: location.pathname,
      activeTutorial,
      currentStep,
      stepId: currentStepData?.id
    });
    return () => {
      console.log(LOG_PREFIX, 'Unmount');
    };
  }, []);


  useEffect(() => {
    console.log(LOG_PREFIX, 'Step changed', {
      featureKey,
      stepIndex,
      stepId: currentStepData?.id,
      navigationPath: currentStepData?.navigationPath,
      highlightTab: currentStepData?.highlightTab,
      requiresInteraction: currentStepData?.requiresInteraction,
      currentPath: location.pathname
    });
  }, [stepIndex, featureKey, currentStepData?.id]);

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

  // Track previous path to detect page changes and re-evaluate content
  const previousPathRef = React.useRef(location.pathname);
  useEffect(() => {
    if (previousPathRef.current !== location.pathname) {
      // Page changed - reset hasShown to re-evaluate content (navigation vs actual step content)
      hasShownForStepRef.current = false;
      previousPathRef.current = location.pathname;
    }
  }, [location.pathname]);

  // Track previous step to detect changes
  const previousStepIdRef = React.useRef(null);

  // SIMPLE: Show tooltip only when position is ready, hide otherwise
  useEffect(() => {
    const currentStepId = currentStepData?.id;
    const stepChanged = previousStepIdRef.current !== null && previousStepIdRef.current !== currentStepId;

    if (stepChanged) {
      console.log(LOG_PREFIX, 'Step changed - resetting state', {
        previousStep: previousStepIdRef.current,
        newStep: currentStepId
      });
      setIsVisible(false);
      intendedVisibilityRef.current = true;
      hasShownForStepRef.current = false;
    }

    previousStepIdRef.current = currentStepId;

    const shouldShow = currentStepData && !isWaitingForSave && intendedVisibilityRef.current && currentStepData.showTooltip !== false;

    if (shouldShow) {
      if (!hasShownForStepRef.current) {
        console.log(LOG_PREFIX, 'Visibility → true (position ready)', { stepId: currentStepData.id });

        const title = currentStepData.title || t(`tutorials.${featureKey}.steps.${currentStepData.id}.title`, 'Tutorial');
        const description = currentStepData.content || t(`tutorials.${featureKey}.steps.${currentStepData.id}.content`, '');

        setTooltipContent(prev => ({
          title,
          description,
          position: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
        }));

        setIsVisible(true);
        hasShownForStepRef.current = true;
      }

    } else if (isWaitingForSave && isVisible) {
      console.log(LOG_PREFIX, 'Visibility → false (waiting for save)');
      setIsVisible(false);
    }
  }, [currentStepData, isWaitingForSave, elementPosition, featureKey, t, isVisible, location.pathname]);

  // Position is now set once when showing - no updates while visible to prevent movement

  const handleNextClick = async () => {
    console.log(LOG_PREFIX, 'Click: Next', { stepIndex, stepId: currentStepData?.id, currentPath: location.pathname });
    if (isProcessingClick) return;
    setIsProcessingClick(true);

    // Hide tooltip immediately when Next is clicked
    setIsVisible(false);

    try {
      const targetPath = currentStepData?.navigationPath || currentStepData?.requiredPage;
      const fullPath = buildFullPath(targetPath);

      if (fullPath && fullPath !== location.pathname && !isOnCorrectPage) {
        console.log(LOG_PREFIX, 'Navigating to correct page before advancing step', fullPath);
        navigate(fullPath);
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Check if next step requires navigation and perform it immediately
      // ONLY if the current step does not require interaction (i.e. manual user action)
      // This prevents "I understood" from auto-navigating when we want the user to click the tab manually
      const nextStepIndex = stepIndex + 1;
      const nextStepData = tutorialSteps[featureKey] && tutorialSteps[featureKey][nextStepIndex]
        ? tutorialSteps[featureKey][nextStepIndex]
        : null;

      // If next step requires interaction (like clicking a tab), DO NOT auto-navigate
      // If current step is "I understood" (settings-tab), we want to advance step but NOT navigate page
      if (nextStepData && !nextStepData.requiresInteraction) {
        const nextPath = nextStepData.navigationPath || nextStepData.requiredPage;
        if (nextPath) {
          const fullNextPath = buildFullPath(nextPath);
          // Only navigate if we are not already on the path (ignoring query params/hashes if needed, but strict for now)
          if (fullNextPath && fullNextPath !== location.pathname) {
            console.log(LOG_PREFIX, 'Pre-navigating to next step page', fullNextPath);
            navigate(fullNextPath);
            // No wait needed here, we want to start navigation while step updates
          }
        }
      }

      await nextStep();
      console.log(LOG_PREFIX, 'Next step completed');
    } catch (error) {
      console.error(LOG_PREFIX, 'Next step error', error);
    } finally {
      setIsProcessingClick(false);
    }
  };

  const handlePrevClick = async () => {
    console.log(LOG_PREFIX, 'Click: Previous', { stepIndex, stepId: currentStepData?.id, currentPath: location.pathname });
    if (isProcessingClick) return;
    setIsProcessingClick(true);

    // Hide tooltip immediately when Previous is clicked
    setIsVisible(false);

    try {
      await prevStep();
      console.log(LOG_PREFIX, 'Prev step completed');
    } catch (error) {
      console.error(LOG_PREFIX, 'Prev step error', error);
    } finally {
      setIsProcessingClick(false);
    }
  };

  const handleCustomButtonClick = async (action, e) => {
    console.log(LOG_PREFIX, 'Click: Custom button', { action, stepId: currentStepData?.id, currentPath: location.pathname });
    if (e) e.stopPropagation();
    if (isProcessingClick) return;
    setIsProcessingClick(true);

    try {
      if (action === 'pause_and_fill') {
        console.log(LOG_PREFIX, 'Action: Pause and fill');
        setWaitingForSave(true);
        setIsVisible(false);
        intendedVisibilityRef.current = false;
      } else if (action === 'start_messages_tutorial') {
        console.log(LOG_PREFIX, 'Action: Start messages tutorial');
        await completeTutorial();
      }
    } catch (error) {
      console.error(LOG_PREFIX, 'Custom button error', error);
    } finally {
      setIsProcessingClick(false);
    }
  };

  const buildFullPath = (targetPath) => {
    if (!targetPath) return null;

    const pathParts = location.pathname.split('/').filter(Boolean);
    const lang = ['en', 'fr', 'de', 'it'].includes(pathParts[0]) ? pathParts[0] : null;
    
    const workspaceId = selectedWorkspace ? getWorkspaceIdForUrl(selectedWorkspace) : 'personal';
    const dashboardPath = buildDashboardUrl(targetPath, workspaceId);
    
    let fullPath = '';
    if (lang) fullPath += `/${lang}`;
    fullPath += dashboardPath;

    return fullPath;
  };

  const isLastStep = checkIsLastStep(featureKey, stepIndex);
  const requiresInteraction = currentStepData?.requiresInteraction || false;

  const checkIsOnCorrectPage = () => {
    // If we have a navigation path for the step, use it
    if (currentStepData?.navigationPath || currentStepData?.requiredPage) {
      const targetPath = currentStepData.navigationPath || currentStepData.requiredPage;
      return isPageMatch(location.pathname, targetPath);
    }

    // Otherwise fall back to the default path for this tutorial
    const defaultTutorialPath = getPathForTutorial(featureKey);
    return isPageMatch(location.pathname, defaultTutorialPath);
  };

  const isOnCorrectPage = checkIsOnCorrectPage();

  const dialogIsOpen = isVisible && isOnCorrectPage && !!currentStepData && !isWaitingForSave && currentStepData.showTooltip !== false;

  useEffect(() => {
    const fullPath = buildFullPath(currentStepData?.navigationPath);
    console.log(LOG_PREFIX, 'State', {
      dialogIsOpen,
      isVisible,
      isWaitingForSave,
      isOnCorrectPage,
      requiresInteraction,
      isLastStep,
      stepId: currentStepData?.id,
      currentPath: location.pathname,
      navigationPath: currentStepData?.navigationPath,
      computedFullPath: fullPath
    });
  }, [dialogIsOpen, isVisible, isWaitingForSave, isOnCorrectPage, currentStepData?.id, location.pathname]);

  return (
    <>
      {/* Always render the sidebar highlighter to handle highlighting */}
      <SidebarHighlighter />

      <Dialog
        isOpen={dialogIsOpen}
        onClose={() => {
          console.log(LOG_PREFIX, 'Dialog closed by user');
          setIsVisible(false);
        }}
        title={tooltipContent.title}
        blurred_background={false}
        position={tooltipContent.position}
        size="small"
        closeOnEscape={true}
        closeOnBackdropClick={false}
        messageType={currentStepData?.messageType || 'info'}
        showCloseButton={true}
        actions={
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex justify-between flex-nowrap gap-3 w-full pointer-events-auto"
          >
            <div className="flex gap-3">
              {(tutorialStep || 0) > 0 && !currentStepData?.hidePrevious && (
                <Button
                  variant="secondary"
                  onClick={handlePrevClick}
                  disabled={isProcessingClick}
                  className="shrink-0 w-auto min-w-fit max-w-none whitespace-nowrap"
                >
                  {t('tutorial:buttons.previous', 'Previous')}
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              {(() => {
                if (currentStepData?.customButtons) {
                  return (
                    <>
                      {currentStepData.customButtons.map((button, index) => (
                        <Button
                          key={index}
                          variant="primary"
                          onClick={(e) => handleCustomButtonClick(button.action, e)}
                          disabled={isProcessingClick}
                          className="shrink-0 w-auto min-w-fit max-w-none whitespace-nowrap"
                        >
                          {button.text || t(`tutorial:${button.textKey}`, button.textKey?.split('.').pop() || 'Continue')}
                        </Button>
                      ))}
                    </>
                  );
                }

                if (currentStepData?.actionButton) {
                  return (
                    <Button
                      variant="primary"
                      onClick={handleNextClick}
                      disabled={isProcessingClick}
                      className="shrink-0 w-auto min-w-fit max-w-none whitespace-nowrap"
                    >
                      {currentStepData.actionButton.text || t(`tutorial:${currentStepData.actionButton.textKey}`, currentStepData.actionButton.textKey?.split('.').pop() || 'Continue')}
                    </Button>
                  );
                }

                if (!requiresInteraction) {
                  return (
                    <Button
                      variant="primary"
                      onClick={handleNextClick}
                      disabled={isProcessingClick}
                      className="shrink-0 w-auto min-w-fit max-w-none whitespace-nowrap"
                    >
                      {isLastStep ? t('tutorial:buttons.finish', 'Finish') : t('tutorial:buttons.next', 'Next')}
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
        <p className="leading-relaxed text-slate-700 m-0">{tooltipContent.description}</p>
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
