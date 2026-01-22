import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTutorial } from '../contexts/TutorialContext';
import { useDashboard } from '../contexts/DashboardContext';
import HighlightTooltip from '../onboarding/components/HighlightTooltip';
import AccessLevelChoicePopup from '../pages/profile/components/AccessLevelChoicePopup';
import { useTranslation } from 'react-i18next';


// Temporary empty styles object until Tailwind classes are implemented
const styles = {};

/**
 * Tutorial Component
 * Main container for all tutorial-related components
 * This component should be placed high in the component tree to ensure overlays work properly
 */
const Tutorial = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const {
    isTutorialActive,
    showFirstTimeModal,
    showAccessLevelModal,
    currentStep,
    activeTutorial,
    prevStep,
    nextStep,
    completeTutorial,
    isBusy,
    isPaused,
    setShowAccessLevelModal,
    setAccessMode,
    allowAccessLevelModalClose,
    tutorialSteps
  } = useTutorial();

  const { profileComplete, tutorialPassed, user } = useDashboard();
  
  const glnVerified = user?.GLN_certified === true || user?.GLN_certified === 'ADMIN_OVERRIDE';
  const [hasRendered, setHasRendered] = useState(false);

  // Debug: log when modal state changes
  useEffect(() => {
    console.log('[Tutorial] showAccessLevelModal changed:', showAccessLevelModal);
    console.log('[Tutorial] allowAccessLevelModalClose:', allowAccessLevelModalClose);
  }, [showAccessLevelModal, allowAccessLevelModalClose]);

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


  // Determine whether to render the tutorial highlighting/tooltip
  // Allow rendering if tutorial is explicitly active (even if previously passed)
  // Don't render if tutorial is paused (e.g., document upload popup is open)
  const shouldRenderTutorial = hasRendered &&
    isInDashboard &&
    !isPaused &&
    isTutorialActive;

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

  // ALWAYS render AccessLevelChoicePopup (even when tutorial is not active)
  // because it can be triggered from sidebar/profile independently
  return (
    <>
      {shouldRenderTutorial && (
        <div style={containerStyle} className={styles.tutorialContainer}>
          {isTutorialActive && !showAccessLevelModal && (
            <HighlightTooltip
              tutorialStep={currentStep}
              tutorialFeature={activeTutorial}
              prevStep={prevStep}
              nextStep={nextStep}
              completeTutorial={completeTutorial}
            />
          )}
        </div>
      )}
      <AccessLevelChoicePopup
        isOpen={showAccessLevelModal}
        onClose={() => {
          console.log('[Tutorial] AccessLevelChoicePopup onClose called');
          setShowAccessLevelModal(false);
        }}
        onSelectTeamAccess={() => {
          console.log('[Tutorial] onSelectTeamAccess called');
          setAccessMode('team');
        }}
        onContinueOnboarding={() => {
          console.log('[Tutorial] onContinueOnboarding called - Full Access selected (staying in team mode until profile completed)');
          // Don't change access mode or navigate automatically
          // User will click on the tab themselves
          // Access mode will change to 'full' only after profile completion
        }}
        glnVerified={glnVerified}
        allowClose={allowAccessLevelModalClose !== undefined ? allowAccessLevelModalClose : false}
      />
    </>
  );
};

export default Tutorial;
