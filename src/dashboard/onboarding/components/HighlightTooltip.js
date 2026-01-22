import React, { useEffect, useLayoutEffect, useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../../../components/BoxedInputFields/Button';
import SidebarHighlighter from './SidebarHighlighter';
import { tutorialSteps } from '../../tutorial/tutorialSteps';
import { useTutorial } from '../../contexts/TutorialContext';
import { useDashboard } from '../../contexts/DashboardContext';
import { FiX, FiBookOpen } from 'react-icons/fi';
import Dialog from '../../../components/Dialog/Dialog';

/**
 * ReplicatedElement Component
 * Replicates a DOM element within the tooltip for visual reference
 */
const ReplicatedElement = ({ selector, onReady }) => {
  const [clonedHtml, setClonedHtml] = useState(null);
  const [bgColor, setBgColor] = useState('transparent');

  useEffect(() => {
    if (!selector) {
      if (onReady) onReady(true);
      setClonedHtml(null);
      return;
    }

    // Reset readiness
    if (onReady) onReady(false);

    // Slight delay to ensure the target is rendered and styles are applied
    const timer = setTimeout(() => {
      const element = document.querySelector(selector);
      if (element) {
        // Detect background color
        let currentElement = element;
        let color = 'transparent';

        while (currentElement && (color === 'transparent' || color === 'rgba(0, 0, 0, 0)' || color === 'initial' || color === '')) {
          const style = window.getComputedStyle(currentElement);
          color = style.backgroundColor;
          currentElement = currentElement.parentElement;
        }

        // If still transparent, fallback to white or a sensible default
        if (color === 'transparent' || color === 'rgba(0, 0, 0, 0)') {
          color = '#ffffff';
        }

        setBgColor(color);

        const clone = element.cloneNode(true);

        // Cleanup clone: remove interactive attributes and IDs to avoid conflicts
        clone.removeAttribute('id');
        clone.removeAttribute('data-tutorial');
        const interactiveElements = clone.querySelectorAll('button, a, [id], [data-tutorial]');
        interactiveElements.forEach(el => {
          el.removeAttribute('id');
          el.removeAttribute('data-tutorial');
          if (el.tagName === 'BUTTON' || el.tagName === 'A') {
            el.setAttribute('tabindex', '-1');
            el.style.pointerEvents = 'none';
          }
        });

        setClonedHtml(clone.outerHTML);
        if (onReady) onReady(true);
      } else {
        if (onReady) onReady(true);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [selector]);

  if (!clonedHtml) return null;

  return (
    <div
      className="relative mb-4 mt-2 overflow-hidden rounded-xl border border-slate-100/50 p-8 flex justify-center items-center group shadow-inner"
      style={{ backgroundColor: bgColor }}
    >
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-30" />

      {/* Container with fading mask */}
      <div
        className="pointer-events-none w-full flex justify-center items-center transition-all duration-500"
        style={{
          maskImage: 'radial-gradient(circle at center, black 40%, transparent 95%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 40%, transparent 95%)',
        }}
        dangerouslySetInnerHTML={{ __html: clonedHtml }}
      />

      {/* Classical Mouse Cursor Animation */}
      <div className="absolute pointer-events-none z-10 animate-tutorial-mouse" style={{ top: '50%', left: '50%' }}>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-xl"
        >
          <path
            d="M5.5 3.21V20.8L10.3 15.65H18.5L5.5 3.21Z"
            fill="white"
            stroke="black"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes tutorial-mouse-move {
          0% { transform: translate(60px, 60px) scale(1); opacity: 0; }
          15% { opacity: 1; }
          45% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(0, 0) scale(0.85); }
          55% { transform: translate(0, 0) scale(1); }
          85% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(-10px, -10px) scale(1); opacity: 0; }
        }
        .animate-tutorial-mouse {
          animation: tutorial-mouse-move 3s ease-in-out infinite;
        }
      `}} />

      {/* Subtle overlay to reinforce the "screenshot" feel */}
      <div className="absolute inset-0 ring-1 ring-inset ring-slate-900/10 rounded-xl pointer-events-none" />
    </div>
  );
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
  const [isReplicationReady, setIsReplicationReady] = useState(false);

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
  // This ensures tooltips show automatically on reload without requiring user interaction
  useEffect(() => {
    if (currentStepData) {
      // IMMEDIATELY mark that we've shown for this step - do this first
      hasShownForStepRef.current = true;
      intendedVisibilityRef.current = true;

      // Hide if AccessLevelModal is showing
      if (showAccessLevelModal) {
        console.log('[HighlightTooltip] AccessLevelModal showing, hiding tooltip');
        setIsVisible(false);
      } else if (!isWaitingForSave) {
        // Force visibility to true when step data is available and not waiting
        console.log('[HighlightTooltip] Step data available and not waiting, forcing visibility to true');
        setIsVisible(true);
      } else {
        console.log('[HighlightTooltip] Step data available but waiting for save, keeping visibility false');
        // Don't set intendedVisibilityRef to false here - we want to show it when waiting clears
        setIsVisible(false);
      }
    } else if (tutorialFeature && tutorialStep !== undefined) {
      // Only hide if we have valid tutorial props but no step data exists
      // AND we haven't shown the tooltip for this step yet (prevents closing during re-renders)
      const stepsExist = tutorialSteps[tutorialFeature] && tutorialSteps[tutorialFeature].length > 0;
      if (stepsExist && tutorialStep >= 0 && tutorialStep < tutorialSteps[tutorialFeature].length) {
        // Step should exist but doesn't - might be loading, keep visibility if we've already shown it
        if (hasShownForStepRef.current) {
          console.log('[HighlightTooltip] Step data temporarily unavailable but already shown, keeping visibility');
          // CRITICAL: Keep intended visibility true and don't change isVisible
          intendedVisibilityRef.current = true;
          // Don't change isVisible - keep it as is
        } else {
          console.log('[HighlightTooltip] Step data temporarily unavailable, waiting for step data');
        }
      } else {
        // Step doesn't exist in the tutorial - safe to hide
        console.log('[HighlightTooltip] No step data available for valid tutorial props');
        hasShownForStepRef.current = false;
        intendedVisibilityRef.current = false;
        setIsVisible(false);
      }
    }
    // If tutorialFeature or tutorialStep are undefined, don't change visibility (might be loading)
  }, [currentStepData, isWaitingForSave, showAccessLevelModal, tutorialFeature, tutorialStep]);

  // Additional effect to ensure visibility is set correctly on mount
  // This handles the case where step data loads after component mount
  useEffect(() => {
    // Small delay to ensure all context values are loaded
    const timer = setTimeout(() => {
      if (currentStepData && !isWaitingForSave && !showAccessLevelModal && !isVisible) {
        console.log('[HighlightTooltip] Mount check: Step data available, showing tooltip');
        setIsVisible(true);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []); // Run once on mount

  const normalizeForComparison = useCallback((path) => {
    return path.replace(/^\/(en|fr|de|it)\//, '/');
  }, []);

  const isOnCorrectPage = useMemo(() => {
    if (!currentStepData) return true;

    const requiredPath = currentStepData.navigationPath || currentStepData.requiredPage;
    if (!requiredPath) return true;

    const currentPath = location.pathname;
    const normalizedCurrentPath = normalizeForComparison(currentPath);
    const normalizedRequiredPath = normalizeForComparison(requiredPath);

    if (normalizedRequiredPath === normalizedCurrentPath) {
      return true;
    } else if (normalizedCurrentPath.startsWith(normalizedRequiredPath + '/')) {
      return true;
    } else if (normalizedRequiredPath === '/dashboard/overview') {
      if (normalizedCurrentPath === '/dashboard' ||
          normalizedCurrentPath === '/dashboard/' ||
          normalizedCurrentPath.startsWith('/dashboard/overview')) {
        return true;
      }
    } else if (normalizedRequiredPath.includes('/dashboard/profile') && normalizedCurrentPath.includes('/dashboard/profile')) {
      const requiredTab = currentStepData.requiredTab || currentStepData.highlightTab;
      if (currentStepData.highlightTab) {
        return true;
      } else if (requiredTab) {
        const currentTab = normalizedCurrentPath.split('/').pop();
        if (currentTab === requiredTab || normalizedCurrentPath.endsWith(`/${requiredTab}`)) {
          return true;
        } else if (normalizedCurrentPath === '/dashboard/profile' && requiredTab === 'personalDetails') {
          return true;
        }
      } else {
        return true;
      }
    }

    return false;
  }, [currentStepData, location.pathname, normalizeForComparison]);

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
      isLastStep,
      isVisible,
      hasStepData: !!currentStepData
    });
  }, [stepIndex, featureKey, currentStepData, requiresInteraction, isLastStep, isVisible]);

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
      const requiredPath = currentStepData?.navigationPath || currentStepData?.requiredPage;
      const shouldNavigate = requiredPath && !isOnCorrectPage;

      // If user is not on the correct page and step has a navigationPath/requiredPage, navigate first
      if (shouldNavigate) {
        const targetPath = requiredPath;
        console.log(`[HighlightTooltip] User not on correct page, navigating to: ${targetPath}`);

        // Logic to block profile navigation if current tab is not valid
        if (location.pathname.includes('/profile') && targetPath.includes('/profile')) {
          const getTabName = (path) => path.split('?')[0].split('#')[0].split('/').filter(Boolean).pop();
          const currentTab = getTabName(location.pathname);
          const targetTabName = getTabName(targetPath);

          if (currentTab !== targetTabName && currentTab !== 'profile') {
            const validate = validationRef.current['profile'];
            if (validate && !validate(currentTab)) {
              console.warn(`[HighlightTooltip] Navigation blocked: Tab ${currentTab} is incomplete.`);
              showWarning?.(tutorialSteps.common?.completePreviousSteps || 'Please complete the required fields before continuing.');
              setIsProcessingClick(false);
              return;
            }
          }
        }

        // Navigate to the target path
        navigate(targetPath);

        // After navigation, proceed to next step
        setTimeout(() => {
          if (isLastStep) {
            completeTutorial();
          } else {
            nextStep();
          }
          setIsProcessingClick(false);
        }, 100);
        return;
      }

      // If actionButton has a path, navigate to it first
      if (currentStepData?.actionButton?.path) {
        const targetPath = currentStepData.actionButton.path;
        console.log(`[HighlightTooltip] Navigating to: ${targetPath}`);

        // Logic to block profile navigation if current tab is not valid
        if (location.pathname.includes('/profile') && targetPath.includes('/profile')) {
          const getTabName = (path) => path.split('?')[0].split('#')[0].split('/').filter(Boolean).pop();
          const currentTab = getTabName(location.pathname);
          const targetTabName = getTabName(targetPath);

          if (currentTab !== targetTabName && currentTab !== 'profile') {
            const validate = validationRef.current['profile'];
            if (validate && !validate(currentTab)) {
              console.warn(`[HighlightTooltip] Navigation blocked: Tab ${currentTab} is incomplete.`);
              showWarning?.(tutorialSteps.common?.completePreviousSteps || 'Please complete the required fields before continuing.');
              setIsProcessingClick(false);
              return;
            }
          }
        }

        // Navigate to the target path
        navigate(targetPath);

        // After navigation, proceed to next step
        setTimeout(() => {
          if (isLastStep) {
            completeTutorial();
          } else {
            nextStep();
          }
          setIsProcessingClick(false);
        }, 100);
        return;
      }

      // Logic to block Next if current tab is not valid
      // This specifically prevents tutorial from skipping mandatory fields
      if (location.pathname.includes('/profile')) {
        const getTabName = (path) => path.split('?')[0].split('#')[0].split('/').filter(Boolean).pop();
        const currentTab = getTabName(location.pathname);
        const validate = validationRef.current['profile'];

        if (validate && currentTab !== 'profile' && !validate(currentTab)) {
          console.warn(`[HighlightTooltip] Navigation blocked: Tab ${currentTab} is incomplete.`);
          showWarning?.(tutorialSteps.common?.completePreviousSteps || 'Please complete the required fields before continuing.');
          setIsProcessingClick(false);
          return;
        }
      }

      if (isLastStep) {
        completeTutorial();
      } else {
        nextStep();
      }
      setIsProcessingClick(false);
    }, 10);
  }, [isLastStep, nextStep, completeTutorial, isProcessingClick, currentStepData, navigate, location.pathname, showWarning, isOnCorrectPage]);

  // Track previous step/feature to prevent unnecessary resets
  const prevStepRef = React.useRef({ step: tutorialStep, feature: tutorialFeature });

  // Always reset visibility when step changes - tooltips should always display for current step
  useEffect(() => {
    const hasStepChanged = prevStepRef.current.step !== tutorialStep ||
      prevStepRef.current.feature !== tutorialFeature;

    if (hasStepChanged) {
      console.log('[HighlightTooltip] Step/feature changed, resetting visibility');
      // Reset the refs when step changes
      hasShownForStepRef.current = false;
      // Always show on step change unless explicitly waiting for save
      if (!isWaitingForSave) {
        intendedVisibilityRef.current = true;
        setIsVisible(true);
      } else {
        intendedVisibilityRef.current = false;
      }
      prevStepRef.current = { step: tutorialStep, feature: tutorialFeature };
    }
  }, [tutorialStep, tutorialFeature, isWaitingForSave]);

  // Critical: Show tooltip when waiting state clears AND step data is available
  // This handles the reload case where isWaitingForSave might be false but tooltip wasn't shown
  useEffect(() => {
    if (currentStepData && !isWaitingForSave) {
      // Only update if currently not visible (to avoid unnecessary updates)
      if (!isVisible) {
        console.log('[HighlightTooltip] Waiting state cleared and step data available, showing tooltip');
        setIsVisible(true);
      }
    }
  }, [isWaitingForSave, currentStepData, isVisible]);

  const handleCustomButtonClick = useCallback((action, e) => {
    if (isProcessingClick) return;

    console.log(`Custom button clicked: ${action}`);
    e.stopPropagation();
    e.preventDefault();

    setIsProcessingClick(true);

    // Handle access mode selection actions
    if (action === 'set_access_team') {
      console.log('[HighlightTooltip] Team Access selected');
      setAccessMode?.('team');
      setIsProcessingClick(false);
      return;
    }

    if (action === 'set_access_full') {
      console.log('[HighlightTooltip] Full Access selected');
      setAccessMode?.('full');
      setIsProcessingClick(false);
      return;
    }

    // Handle "I understood" action - hide tooltip temporarily but allow it to show again
    if (action === 'pause_and_fill') {
      console.log('[HighlightTooltip] Hiding tooltip for manual form filling');

      // Set waiting for save state in context
      setWaitingForSave(true);

      // Hide the tooltip temporarily, but it will show again when step changes or when waiting state clears
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


  // CRITICAL: Use useLayoutEffect to set visibility synchronously before paint
  // This ensures tooltip shows immediately on reload without delay
  useLayoutEffect(() => {
    if (currentStepData && !isWaitingForSave) {
      // Only set to true if currently false - avoid unnecessary updates
      if (!isVisible) {
        console.log('[HighlightTooltip] Layout effect: Step data available, forcing visibility to true immediately');
        setIsVisible(true);
      }
    }
    // Don't set to false in layout effect - let the regular effect handle that
    // This prevents the tooltip from closing during re-renders
  }, [currentStepData, isWaitingForSave, isVisible]);

  // Use ref-based visibility to prevent closing during re-renders
  // CRITICAL: Once shown, keep it open unless explicitly waiting for save
  const dialogIsOpen = React.useMemo(() => {
    // PRIORITY 0: Wait for replication to be ready if there's a replicateSelector
    if (currentStepData?.replicateSelector && !isReplicationReady) {
      console.log('[HighlightTooltip] Waiting for replication to be ready');
      return false;
    }

    // PRIORITY 1: If we've already shown for this step and not waiting, ALWAYS keep it open
    // This is the most important check - prevents closing during re-renders
    if (hasShownForStepRef.current && !isWaitingForSave) {
      console.log('[HighlightTooltip] Keeping dialog open - already shown for this step', {
        hasShown: hasShownForStepRef.current,
        intended: intendedVisibilityRef.current,
        waiting: isWaitingForSave,
        hasStepData: !!currentStepData,
        isReplicationReady
      });
      return true;
    }

    // PRIORITY 2: If we have step data and not waiting, show it
    if (currentStepData && !isWaitingForSave) {
      intendedVisibilityRef.current = true;
      hasShownForStepRef.current = true;
      return true;
    }

    // PRIORITY 3: If waiting for save, don't show
    if (isWaitingForSave) {
      return false;
    }

    // PRIORITY 4: If no step data and we haven't shown yet, don't show
    if (!currentStepData && !hasShownForStepRef.current) {
      return false;
    }

    // Default: use intended visibility
    return intendedVisibilityRef.current;
  }, [currentStepData, isWaitingForSave, isReplicationReady]);
  useEffect(() => {
    console.log('[HighlightTooltip] Dialog visibility state:', {
      isVisible,
      hasStepData: !!currentStepData,
      dialogIsOpen,
      stepIndex,
      featureKey,
      tooltipTitle: tooltipContent.title,
      tooltipPosition: tooltipContent.position,
      isWaitingForSave
    });

    if (dialogIsOpen && currentStepData) {
      console.log('[HighlightTooltip] ✅ Tooltip should be visible!', {
        title: tooltipContent.title,
        position: tooltipContent.position,
        stepId: currentStepData.id
      });
    } else {
      console.log('[HighlightTooltip] ❌ Tooltip NOT visible:', {
        isVisible,
        hasStepData: !!currentStepData,
        isWaitingForSave,
        reason: !isVisible ? 'isVisible is false' : !currentStepData ? 'no step data' : isWaitingForSave ? 'waiting for save' : 'unknown'
      });
    }
  }, [isVisible, currentStepData, dialogIsOpen, stepIndex, featureKey, tooltipContent, isWaitingForSave]);

  return (
    <>
      {/* Always render the sidebar highlighter to handle highlighting */}
      <SidebarHighlighter />

      <Dialog
        isOpen={dialogIsOpen}
        onClose={() => {
          if (resetProfileTabAccess) resetProfileTabAccess();
          skipTutorial();
        }}
        title={tooltipContent.title}
        titleIcon={<FiBookOpen size={20} />}
        blurred_background={false}
        position={tooltipContent.position}
        size="small"
        closeOnEscape={true}
        closeOnBackdropClick={false}
        messageType="info"
        showCloseButton={activeTutorial === 'profileTabs' && currentStep >= 2 ? true : (completedTutorials?.profileTabs || !location.pathname.includes('/profile'))}
        actions={
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              justifyContent: 'flex-end',
              flexWrap: 'nowrap',
              gap: '0.75rem',
              width: '100%'
            }}
          >
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
            {(() => {
              const requiredPath = currentStepData?.navigationPath || currentStepData?.requiredPage;
              const shouldShowShowMeButton = requiredPath && !isOnCorrectPage;

              if (shouldShowShowMeButton) {
                return (
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
                );
              }

              if (currentStepData?.actionButton) {
                return (
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
                );
              }

              if (!requiresInteraction) {
                return (
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
                );
              }

              return null;
            })()}
          </div>
        }
      >
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
