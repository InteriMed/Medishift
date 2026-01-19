import React, { useEffect, useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useLocation } from 'react-router-dom';
import Button from '../../../components/BoxedInputFields/Button';
import SidebarHighlighter from './SidebarHighlighter';
import { tutorialSteps } from '../tutorialSteps';
import { useTutorial } from '../../contexts/TutorialContext';
import { useDashboard } from '../../contexts/DashboardContext';
import { FiX } from 'react-icons/fi';

const HighlightTooltip = ({
  tutorialStep,
  tutorialFeature,
  prevStep,
  nextStep,
  completeTutorial
}) => {
  const location = useLocation();
  const {
    skipTutorial,
    elementPosition,
    pauseTutorial,
    isWaitingForSave,
    setWaitingForSave,
    completedTutorials
  } = useTutorial();
  const { userProfile } = useDashboard();
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
  const [isVisible, setIsVisible] = useState(true);

  const currentStepData =
    tutorialSteps[featureKey] && tutorialSteps[featureKey][stepIndex]
      ? tutorialSteps[featureKey][stepIndex]
      : null;

  const isOnCorrectPage = useMemo(() => {
    if (!currentStepData) return true;

    const requiredPath = currentStepData.navigationPath || currentStepData.requiredPage;
    if (!requiredPath) return true;

    // Normalize both paths to remove language prefixes for comparison
    const normalizeForComparison = (path) => {
      // Remove language prefix (e.g., /en/, /fr/, /de/, /it/)
      return path.replace(/^\/(en|fr|de|it)\//, '/');
    };

    const currentPath = location.pathname;
    const normalizedCurrentPath = normalizeForComparison(currentPath);
    const normalizedRequiredPath = normalizeForComparison(requiredPath);

    if (normalizedRequiredPath === normalizedCurrentPath) {
      return true;
    }

    if (normalizedCurrentPath.startsWith(normalizedRequiredPath + '/')) {
      return true;
    }

    if (normalizedRequiredPath === '/dashboard/overview') {
      if (normalizedCurrentPath === '/dashboard' || normalizedCurrentPath === '/dashboard/' || normalizedCurrentPath.startsWith('/dashboard/overview')) {
        return true;
      }
    }

    if (normalizedRequiredPath.includes('/dashboard/profile') && normalizedCurrentPath.includes('/dashboard/profile')) {
      const requiredTab = currentStepData.requiredTab || currentStepData.highlightTab;
      if (requiredTab) {
        const currentTab = normalizedCurrentPath.split('/').pop();
        if (currentTab === requiredTab || normalizedCurrentPath.endsWith(`/${requiredTab}`)) {
          return true;
        }
        if (normalizedCurrentPath === '/dashboard/profile' && requiredTab === 'personalDetails') {
          return true;
        }
      } else {
        return true;
      }
    }

    console.log('[HighlightTooltip] Page mismatch:', {
      currentPath: normalizedCurrentPath,
      requiredPath: normalizedRequiredPath,
      stepIndex,
      featureKey,
      requiredTab: currentStepData.requiredTab || currentStepData.highlightTab
    });
    return false;
  }, [currentStepData, location.pathname, stepIndex, featureKey]);

  // Determine if this step requires a user interaction based on dialog text
  // Only hide Next button if step has a target element to click (sidebar item, tab, etc.)
  // If there's no target element, always show the Next button
  // Check explicit requiresInteraction property first, then fall back to checking for target elements
  const requiresInteraction = currentStepData?.requiresInteraction !== undefined
    ? currentStepData.requiresInteraction
    : !!(
      currentStepData &&
      (currentStepData.targetSelector ||
        currentStepData.highlightSidebarItem ||
        currentStepData.highlightTab ||
        currentStepData.actionButton)
    );

  // Calculate if this is the last step
  const isLastStep = tutorialFeature && tutorialSteps[tutorialFeature]
    ? (tutorialStep || 0) >= tutorialSteps[tutorialFeature].length - 1
    : false;

  // Debug logging
  useEffect(() => {
    console.log('[HighlightTooltip] Step data:', {
      stepIndex,
      featureKey,
      currentStepData,
      requiresInteraction,
      isLastStep
    });
  }, [stepIndex, featureKey, currentStepData, requiresInteraction, isLastStep]);

  // Get the correct tooltip content based on the current step and feature
  useEffect(() => {
    const step = stepIndex;
    const feature = featureKey;

    try {
      // Check if we're on mobile
      const isMobile = window.innerWidth < 768;

      // Get the step data from tutorialSteps
      if (tutorialSteps[feature] && tutorialSteps[feature][step]) {
        const stepData = tutorialSteps[feature][step];

        // Calculate tooltip position - prefer dynamic positioning based on element position
        let position = { ...stepData.tooltipPosition };

        // If we have element position (from SidebarHighlighter), use it for dynamic positioning,
        // BUT only if a specific position hasn't been assigned in the step data.
        // The user wants manual positions to always take precedence.
        if (elementPosition && !stepData.tooltipPosition) {
          const viewportWidth = window.innerWidth;
          const tooltipWidth = isMobile ? Math.min(420, viewportWidth * 0.9) : 420;
          const spacing = 20;
          const bottomPadding = 20; // Padding from bottom on mobile

          if (isMobile) {
            // On mobile, always position at bottom, centered, above sidebar
            position = {
              bottom: `${bottomPadding}px`,
              left: '50%',
              transform: 'translateX(-50%)',
              top: 'auto',
              right: 'auto'
            };
          } else {
            // Desktop: position relative to element
            if (stepData.targetArea === 'sidebar' || stepData.highlightSidebarItem) {
              // Desktop: position to the right of the element
              position = {
                top: `${elementPosition.top + elementPosition.height / 2}px`,
                left: `${elementPosition.left + elementPosition.width + spacing}px`,
                transform: 'translateY(-50%)'
              };
            } else if (stepData.highlightTab) {
              // Desktop: try right first, fallback to below
              const rightPosition = elementPosition.left + elementPosition.width + spacing;
              const wouldFitRight = rightPosition + tooltipWidth <= viewportWidth - 10;

              if (wouldFitRight) {
                position = {
                  top: `${elementPosition.top + elementPosition.height / 2}px`,
                  left: `${rightPosition}px`,
                  transform: 'translateY(-50%)'
                };
              } else {
                const bottomPosition = elementPosition.top + elementPosition.height + spacing;
                const centerLeft = elementPosition.left + (elementPosition.width / 2);
                position = {
                  top: `${bottomPosition}px`,
                  left: `${Math.max(10, Math.min(centerLeft - tooltipWidth / 2, viewportWidth - tooltipWidth - 10))}px`,
                  transform: 'none'
                };
              }
            } else {
              // Other elements on desktop
              position = {
                top: `${elementPosition.top + elementPosition.height / 2}px`,
                left: `${elementPosition.left + elementPosition.width + spacing}px`,
                transform: 'translateY(-50%)'
              };
            }
          }
        } else {
          // Fallback to original positioning logic for non-sidebar elements
          if (isMobile) {
            const bottomPadding = 20;

            // On mobile, always position at bottom, centered
            position = {
              bottom: `${bottomPadding}px`,
              left: '50%',
              transform: 'translateX(-50%)',
              top: 'auto',
              right: 'auto'
            };
          }
        }

        // Get role-specific content if available
        let description = stepData.content || `This is part of the ${feature} tutorial.`;
        if (stepData.contentByRole) {
          const userRole = userProfile?.role || 'default';
          description = stepData.contentByRole[userRole] || stepData.contentByRole.default || description;
        }

        setTooltipContent({
          title: stepData.title || `Step ${step + 1}`,
          description: description,
          position: position
        });
      } else {
        // Fallback content if the step data is not found
        console.warn(`Tutorial step data not found for feature: ${feature}, step: ${step}`);
        setTooltipContent({
          title: `${feature ? feature.charAt(0).toUpperCase() + feature.slice(1) : 'Tutorial'} - Step ${step + 1}`,
          description: `This is where you can explore the ${feature || 'dashboard'} features.`,
          position: {
            top: '200px',
            left: '50%',
            transform: 'translateX(-50%)'
          }
        });
      }
    } catch (error) {
      console.error('Error getting tooltip content:', error);
      // Fallback content in case of error
      setTooltipContent({
        title: 'Tutorial',
        description: 'Follow the instructions to continue.',
        position: {
          top: '200px',
          left: '50%',
          transform: 'translateX(-50%)'
        }
      });
    }
  }, [tutorialStep, tutorialFeature, elementPosition, userProfile?.role, stepIndex, featureKey]);

  // Memoize event handlers to prevent unnecessary re-renders
  const handleTooltipClick = useCallback((e) => {
    console.log("Tooltip clicked");
    e.stopPropagation();
  }, []);

  const handlePrevClick = useCallback((e) => {
    // Prevent multiple rapid clicks
    if (isProcessingClick) return;

    console.log("Previous button clicked");
    e.stopPropagation();
    e.preventDefault();

    setIsProcessingClick(true);
    setTimeout(() => {
      prevStep();
      setIsProcessingClick(false);
    }, 10);
  }, [prevStep, isProcessingClick]);

  const handleNextClick = useCallback((e) => {
    // Prevent multiple rapid clicks
    if (isProcessingClick) return;

    console.log("Next/Finish button clicked");
    e.stopPropagation();
    e.preventDefault();

    setIsProcessingClick(true);
    setTimeout(() => {
      if (isLastStep) {
        completeTutorial();
      } else {
        nextStep();
      }
      setIsProcessingClick(false);
    }, 10);
  }, [isLastStep, nextStep, completeTutorial, isProcessingClick]);

  // Track previous step/feature to prevent unnecessary resets
  const prevStepRef = React.useRef({ step: tutorialStep, feature: tutorialFeature });

  // Reset visibility when step changes
  useEffect(() => {
    const hasStepChanged = prevStepRef.current.step !== tutorialStep ||
      prevStepRef.current.feature !== tutorialFeature;

    // Only reset to visible if step/feature actually changed AND we are NOT waiting for save
    if (hasStepChanged && !isWaitingForSave) {
      console.log('[HighlightTooltip] Step/feature changed, resetting visibility to true');
      setIsVisible(true);
      prevStepRef.current = { step: tutorialStep, feature: tutorialFeature };
    } else if (hasStepChanged) {
      console.log('[HighlightTooltip] Step/feature changed but waiting for save, not resetting visibility');
      prevStepRef.current = { step: tutorialStep, feature: tutorialFeature };
    }
  }, [tutorialStep, tutorialFeature, isWaitingForSave]);

  const handleCustomButtonClick = useCallback((action, e) => {
    if (isProcessingClick) return;

    console.log(`Custom button clicked: ${action}`);
    e.stopPropagation();
    e.preventDefault();

    setIsProcessingClick(true);

    // Handle "I understood" action - hide tooltip but keep tutorial active for manual form filling
    if (action === 'pause_and_fill') {
      console.log('[HighlightTooltip] Hiding tooltip for manual form filling');

      // Set waiting for save state in context
      setWaitingForSave(true);

      // Hide the tooltip, but keep the highlighter (overlay) active
      setIsVisible(false);

      setIsProcessingClick(false);
      return;
    }

    // Set waiting for save state in context
    setWaitingForSave(true);

    // Handle upload action - just trigger the click, don't pause/hide
    if (action === 'upload') {
      // ... existing upload logic if needed, or if upload implies pausing:
      // For now, let's assume 'upload' button might need similar handling or just works.
      // But based on previous code, it was pausing.
      // If we want to keep it simple, we can leave the generic "pause" logic for other buttons
      // OR assume only pause_and_fill is used here.
    }

    // For other actions, fallback to original behavior (pausing) if needed, 
    // or just hiding tooltip. 
    // If the action is NOT pause_and_fill, we might want to preserve existing behavior 
    // or unify it. Given the requirement is specific to Step 1:

    if (action !== 'pause_and_fill') {
      // Default behavior for other custom buttons (if any)
      pauseTutorial();
    }

    // Handle upload action - trigger upload button click
    if (action === 'upload') {
      const uploadButton = document.querySelector('[data-tutorial="profile-upload-button"]');
      if (uploadButton) {
        setTimeout(() => {
          uploadButton.click();
        }, 150);
      }
    }

    // Use setTimeout to ensure state update is processed
    setTimeout(() => {
      setIsProcessingClick(false);
    }, 0);
  }, [isProcessingClick, pauseTutorial, setWaitingForSave]);


  return (
    <>
      {/* Always render the sidebar highlighter to handle highlighting */}
      <SidebarHighlighter />

      {/* Tooltip display - only show if on correct page */}
      {isVisible && !isWaitingForSave && isOnCorrectPage && (
        <div
          style={{
            ...tooltipContent.position,
            position: 'fixed',
            zIndex: 11000,
            pointerEvents: 'auto',
            maxWidth: window.innerWidth < 768 ? 'calc(100vw - 20px)' : '420px',
            width: window.innerWidth < 768 ? 'calc(100vw - 20px)' : 'auto',
            backgroundColor: 'var(--background-div-color, #ffffff)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: 'var(--shadow-elevated)',
            border: '1px solid rgba(15, 23, 42, 0.15)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)',
            // Ensure tooltip stays within viewport on mobile
            maxHeight: window.innerWidth < 768 ? 'calc(100vh - 40px)' : 'auto',
            overflowY: 'auto',
            animation: 'slideInFadeIn 0.4s var(--ease-out-back) both',
            willChange: 'transform, opacity'
          }}
          onClick={handleTooltipClick}
        >
          <style>{`
            @keyframes slideInFadeIn {
              from {
                opacity: 0;
                transform: translateY(-10px) scale(0.95);
              }
              to {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }
            @media (max-width: 768px) {
              [data-tooltip-buttons] {
                gap: 0 !important;
                overflow: hidden;
                min-width: 0;
                width: 100%;
              }
              [data-tooltip-buttons] .button {
                flex: 0 1 auto !important;
                width: auto !important;
                min-width: 0 !important;
                max-width: 48% !important;
                padding: 6px 8px !important;
                font-size: 11px !important;
                white-space: nowrap !important;
                overflow: hidden;
                text-overflow: ellipsis;
                box-sizing: border-box;
              }
              [data-tooltip-buttons] .button svg {
                display: none !important;
              }
            }
          `}</style>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
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
                paddingLeft: '12px',
                fontSize: '18px',
                fontWeight: '700',
                color: 'var(--color-logo-2)'
              }}>{tooltipContent.title}</h3>
            </div>
            {/* Close button - hidden on profile if profile section is not complete */}
            {(completedTutorials?.profileTabs || !location.pathname.includes('/profile')) && (
              <button
                onClick={skipTutorial}
                disabled={isProcessingClick}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Close tutorial"
                style={{
                  marginLeft: '10px',
                  flexShrink: 0,
                  transform: 'scale(1)',
                  transition: 'all 0.2s var(--ease-smooth)'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1) rotate(0deg)'; }}
              >
                <FiX className="w-5 h-5" />
              </button>
            )}
          </div>
          <p style={{
            lineHeight: '1.6',
            color: 'var(--text-color, #333)',
            marginBottom: '20px'
          }}>{tooltipContent.description}</p>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              pointerEvents: 'auto',
              zIndex: 3600
            }}
          >
            <div
              data-tooltip-buttons
              style={{
                display: 'flex',
                marginTop: '24px',
                justifyContent: 'flex-end',
                flexWrap: 'nowrap',
                gap: '0'
              }}
            >
              {currentStepData?.customButtons ? (
                <>
                  {currentStepData.customButtons.map((button, index) => (
                    <Button
                      key={index}
                      variant={button.variant || 'primary'}
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
              ) : (
                <>
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

                  {/* Show actionButton if it exists (e.g., "Continue to Calendar") */}
                  {currentStepData.actionButton ? (
                    <Button
                      variant="primary"
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
                  ) : !requiresInteraction && (
                    <Button
                      variant="primary"
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
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
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
