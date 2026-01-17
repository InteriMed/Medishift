import React, { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useTutorial } from '../contexts/TutorialContext';
import FirstTimeModal from './components/FirstTimeModal';
import { useDashboard } from '../contexts/DashboardContext';
import HighlightTooltip from './components/HighlightTooltip';


// Temporary empty styles object until Tailwind classes are implemented
const styles = {};

/**
 * Tutorial Component
 * Main container for all tutorial-related components
 * This component should be placed high in the component tree to ensure overlays work properly
 */
const Tutorial = () => {
  const location = useLocation();
  const {
    isTutorialActive,
    showFirstTimeModal,
    currentStep,
    activeTutorial,
    prevStep,
    nextStep,
    completeTutorial,
    isBusy,
    isPaused
  } = useTutorial();

  const { profileComplete, tutorialPassed } = useDashboard();
  const hasRenderedRef = React.useRef(false);
  const hasRendered = hasRenderedRef.current;

  // Helper function to check if user is in dashboard - Memoized to prevent infinite loops
  const isInDashboard = useMemo(() => {
    return location.pathname.includes('/dashboard');
  }, [location.pathname]);

  // Add effect to log component mounting and state updates - Fixed dependency array
  useEffect(() => {
    // console.log("Tutorial component mounted/updated with state:", { ... });

    // Set hasRendered to true after initial render
    if (!hasRenderedRef.current) {
      hasRenderedRef.current = true;
    }

    return () => {
      // console.log("Tutorial component unmounting");
    };
  }, [
    isTutorialActive,
    showFirstTimeModal,
    profileComplete,
    tutorialPassed,
    currentStep,
    activeTutorial,
    isBusy,
    isPaused,
    isInDashboard,
    hasRendered
  ]);

  // Reset tutorial state if component unmounts to prevent stale state on next render
  // Track state in refs for cleanup
  const isActiveRef = React.useRef(isTutorialActive);
  const showModalRef = React.useRef(showFirstTimeModal);

  useEffect(() => {
    isActiveRef.current = isTutorialActive;
    showModalRef.current = showFirstTimeModal;
  }, [isTutorialActive, showFirstTimeModal]);

  // Removed dangerous unmount cleanup to prevent state flickering


  // Determine whether to render the component at all
  // Allow rendering if tutorial is explicitly active (even if previously passed)
  // Removed profileComplete requirement - tutorial should show regardless of profile completion
  // Don't render if tutorial is paused (e.g., document upload popup is open)
  const shouldRender = hasRendered &&
    isInDashboard &&
    !isPaused &&
    (isTutorialActive || showFirstTimeModal) &&
    (!tutorialPassed || isTutorialActive || showFirstTimeModal);

  if (!shouldRender) {
    // console.log("Tutorial not rendering - conditions not met");
    return null;
  }

  // console.log("Tutorial rendering: active");

  // Apply inline styles based on modal state - ensure pointer events work correctly
  const containerStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    zIndex: 100000, // Must be higher than header (20000 when dropdown open) and all other elements
    pointerEvents: showFirstTimeModal ? 'auto' : 'none',
    overflow: 'hidden'
  };

  // Render the tutorial content
  // Only show ONE component at a time to prevent duplicates
  return (
    <div style={containerStyle} className={styles.tutorialContainer}>
      {showFirstTimeModal ? (
        <FirstTimeModal />
      ) : isTutorialActive ? (
        <HighlightTooltip
          tutorialStep={currentStep}
          tutorialFeature={activeTutorial}
          prevStep={prevStep}
          nextStep={nextStep}
          completeTutorial={completeTutorial}
        />
      ) : null}
    </div>
  );
};

export default Tutorial; 
