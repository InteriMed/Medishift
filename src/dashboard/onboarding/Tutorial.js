import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTutorial } from '../contexts/TutorialContext';
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
  const [hasRendered, setHasRendered] = useState(false);

  // Helper function to check if user is in dashboard - Memoized to prevent infinite loops
  const isInDashboard = useMemo(() => {
    return location.pathname.includes('/dashboard');
  }, [location.pathname]);

  // Add effect to log component mounting and state updates - Fixed dependency array
  useEffect(() => {
    // console.log("Tutorial component mounted/updated with state:", { ... });

    // Set hasRendered to true after initial render
    setHasRendered(true);

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
  // Don't render if tutorial is paused (e.g., document upload popup is open)
  const shouldRender = hasRendered &&
    isInDashboard &&
    !isPaused &&
    isTutorialActive;

  if (!shouldRender) {
    return null;
  }

  // Apply inline styles - tutorials always use pointer-events: none for the container
  // so that clicks pass through to the element being highlighted
  const containerStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    zIndex: 100000,
    pointerEvents: 'none',
    overflow: 'hidden'
  };

  // Render the tutorial content
  return (
    <div style={containerStyle} className={styles.tutorialContainer}>
      {isTutorialActive && (
        <HighlightTooltip
          tutorialStep={currentStep}
          tutorialFeature={activeTutorial}
          prevStep={prevStep}
          nextStep={nextStep}
          completeTutorial={completeTutorial}
        />
      )}
    </div>
  );
};

export default Tutorial;
