import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTutorial } from '../contexts/TutorialContext';
import { useDashboard } from '../contexts/DashboardContext';
import HighlightTooltip from '../onboarding/components/HighlightTooltip';
import AccessLevelChoicePopup from '../pages/profile/components/AccessLevelChoicePopup';
import StopTutorialConfirmModal from '../components/modals/StopTutorialConfirmModal';
import TutorialSelectionModal from '../components/modals/TutorialSelectionModal';
import { useTranslation } from 'react-i18next';
import { TUTORIAL_IDS } from '../contexts/TutorialContext/config/tutorialSystem';


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
  const [searchParams, setSearchParams] = useSearchParams();
  const { i18n } = useTranslation();
  const {
    isTutorialActive,
    showFirstTimeModal,
    showAccessLevelModal,
    showStopTutorialConfirm,
    showTutorialSelectionModal,
    setShowTutorialSelectionModal,
    currentStep,
    activeTutorial,
    prevStep,
    nextStep,
    completeTutorial,
    stopTutorial,
    startAllTutorials,
    startTutorial,
    isBusy,
    isPaused,
    setShowAccessLevelModal,
    setShowStopTutorialConfirm,
    setAccessMode,
    accessLevelChoice,
    allowAccessLevelModalClose,
    resetProfileTabAccess,
    tutorialSteps
  } = useTutorial();

  const { profileComplete, tutorialPassed, user } = useDashboard();

  const glnVerified = user?.GLN_certified === true || user?.GLN_certified === 'ADMIN_OVERRIDE';
  const [hasRendered, setHasRendered] = useState(false);

  // Helper function to check if user is in dashboard - Memoized to prevent infinite loops
  const isInDashboard = useMemo(() => {
    return location.pathname.includes('/dashboard');
  }, [location.pathname]);

  // Add effect to log component mounting and state updates - Fixed dependency array
  useEffect(() => {

    // Set hasRendered to true after initial render
    setHasRendered(true);

    return () => {
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

  useEffect(() => {
    const modalParam = searchParams.get('modal');
    
    if (modalParam === 'accessLevel' && !showAccessLevelModal) {
      setShowAccessLevelModal(true);
    } else if (modalParam === 'tutorialSelection' && !showTutorialSelectionModal) {
      setShowTutorialSelectionModal(true);
    } else if (modalParam === 'stopTutorial' && !showStopTutorialConfirm) {
      setShowStopTutorialConfirm(true);
    }
  }, [searchParams, showAccessLevelModal, showTutorialSelectionModal, showStopTutorialConfirm, setShowAccessLevelModal, setShowTutorialSelectionModal, setShowStopTutorialConfirm]);

  const handleCloseAccessLevelModal = () => {
    setShowAccessLevelModal(false);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('modal');
    setSearchParams(newParams, { replace: true });
  };

  const handleCloseTutorialSelectionModal = () => {
    setShowTutorialSelectionModal(false);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('modal');
    setSearchParams(newParams, { replace: true });
  };

  const handleCloseStopTutorialConfirm = () => {
    setShowStopTutorialConfirm(false);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('modal');
    setSearchParams(newParams, { replace: true });
  };

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
  const shouldShowTeamCloseTooltip = isTutorialActive && accessLevelChoice === 'team';
  const displayTutorialFeature = shouldShowTeamCloseTooltip ? TUTORIAL_IDS.DASHBOARD : activeTutorial;
  const displayTutorialStep = shouldShowTeamCloseTooltip ? 0 : currentStep;
  const displayPrevStep = shouldShowTeamCloseTooltip ? async () => {} : prevStep;
  const displayNextStep = shouldShowTeamCloseTooltip ? async () => { await stopTutorial({ forceStop: true, showAccessPopupForProfile: false }); } : nextStep;
  const displayCompleteTutorial = shouldShowTeamCloseTooltip ? async () => { await stopTutorial({ forceStop: true, showAccessPopupForProfile: false }); } : completeTutorial;

  const getCurrentPageName = () => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/profile')) return 'profileTabs';
    if (path.includes('/messages')) return 'messages';
    if (path.includes('/contracts')) return 'contracts';
    if (path.includes('/calendar')) return 'calendar';
    if (path.includes('/marketplace')) return 'marketplace';
    if (path.includes('/payroll')) return 'payroll';
    if (path.includes('/organization')) return 'organization';
    if (path.includes('/settings')) return 'settings';
    return 'dashboard';
  };

  const getTutorialForCurrentPage = () => {
    const pageName = getCurrentPageName();
    const tutorialMap = {
      'profileTabs': TUTORIAL_IDS.PROFILE_TABS,
      'messages': TUTORIAL_IDS.MESSAGES,
      'contracts': TUTORIAL_IDS.CONTRACTS,
      'calendar': TUTORIAL_IDS.CALENDAR,
      'marketplace': TUTORIAL_IDS.MARKETPLACE,
      'payroll': TUTORIAL_IDS.PAYROLL,
      'organization': TUTORIAL_IDS.ORGANIZATION,
      'dashboard': TUTORIAL_IDS.DASHBOARD
    };
    return tutorialMap[pageName] || TUTORIAL_IDS.DASHBOARD;
  };

  const handleStartCurrentTutorial = async () => {
    const tutorialId = getTutorialForCurrentPage();
    await startTutorial(tutorialId);
  };

  return (
    <>
      {shouldRenderTutorial && (
        <div style={containerStyle} className={styles.tutorialContainer}>
          {isTutorialActive && !showAccessLevelModal && (
            <HighlightTooltip
              tutorialStep={displayTutorialStep}
              tutorialFeature={displayTutorialFeature}
              prevStep={displayPrevStep}
              nextStep={displayNextStep}
              completeTutorial={displayCompleteTutorial}
            />
          )}
        </div>
      )}
      <AccessLevelChoicePopup
        isOpen={showAccessLevelModal}
        onClose={handleCloseAccessLevelModal}
        onSelectTeamAccess={() => {
          setAccessMode('team');
        }}
        onContinueOnboarding={() => {
          setAccessMode('full');
        }}
        glnVerified={glnVerified}
        allowClose={allowAccessLevelModalClose !== undefined ? allowAccessLevelModalClose : false}
      />
      <StopTutorialConfirmModal
        isOpen={showStopTutorialConfirm}
        onClose={handleCloseStopTutorialConfirm}
        onConfirm={() => {
          stopTutorial({ forceStop: true, showAccessPopupForProfile: true });
        }}
      />
      <TutorialSelectionModal
        isOpen={showTutorialSelectionModal}
        onClose={handleCloseTutorialSelectionModal}
        onStartAll={startAllTutorials}
        onStartCurrent={handleStartCurrentTutorial}
        currentPageName={getCurrentPageName()}
      />
    </>
  );
};

export default Tutorial;
