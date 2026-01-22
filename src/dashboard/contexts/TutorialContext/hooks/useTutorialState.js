import { useState, useEffect, useRef } from 'react';
import { WORKSPACE_TYPES } from '../../../../utils/sessionAuth';
import { createSafeStateUpdater } from '../utils/tutorialHelpers';

/**
 * Core tutorial state management
 * Manages all tutorial-related state variables
 */
export const useTutorialState = (selectedWorkspace) => {
    // Busy flag to prevent concurrent updates
    const [isBusy, setIsBusy] = useState(false);

    // Tutorial state variables
    const [completedTutorials, setCompletedTutorials] = useState({});
    const [showFirstTimeModal, setShowFirstTimeModal] = useState(false);
    const [showTutorialSelectionModal, setShowTutorialSelectionModal] = useState(false);
    const [showAccessLevelModal, setShowAccessLevelModal] = useState(false);
    const [allowAccessLevelModalClose, setAllowAccessLevelModalClose] = useState(false);

    // Refs for preventing infinite loops
    const syncTimestampRef = useRef({});
    const [isTutorialActive, setIsTutorialActive] = useState(false);
    const [activeTutorial, setActiveTutorial] = useState('dashboard');
    const [currentStep, setCurrentStep] = useState(0);
    const [stepData, setStepData] = useState(null);
    const [elementPosition, setElementPosition] = useState(null);
    const [isPaused, setIsPaused] = useState(false);
    const [isWaitingForSave, setIsWaitingForSave] = useState(false);
    const [isReady, setIsReady] = useState(false);

    // Access mode: 'full' (complete all profile tabs) or 'team' (quick team access)
    const [accessMode, setAccessModeState] = useState(null);

    // Dual onboarding type: 'professional' or 'facility'
    const [onboardingType, setOnboardingType] = useState('professional');

    // MAX ACCESSED TAB FOR PROFILE TUTORIAL
    const [maxAccessedProfileTab, setMaxAccessedProfileTab] = useState('personalDetails');

    // Auto-detect onboardingType based on selectedWorkspace
    useEffect(() => {
        if (selectedWorkspace) {
            const newType = selectedWorkspace.type === WORKSPACE_TYPES.TEAM ? 'facility' : 'professional';
            if (newType !== onboardingType) {
                console.log(`[useTutorialState] Auto-detecting onboardingType: ${newType} (workspace: ${selectedWorkspace.type})`);
                setOnboardingType(newType);
            }
        }
    }, [selectedWorkspace, onboardingType]);

    // Create safe state updater
    const safelyUpdateTutorialState = createSafeStateUpdater(setIsBusy);

    // Refs for lifecycle management
    const completingTutorialRef = useRef(null);
    const lastRestoredStateRef = useRef({ tutorial: null, step: null });
    const startTutorialRef = useRef(null);

    return {
        // State
        isBusy,
        completedTutorials,
        showFirstTimeModal,
        showTutorialSelectionModal,
        showAccessLevelModal,
        allowAccessLevelModalClose,
        isTutorialActive,
        activeTutorial,
        currentStep,
        stepData,
        elementPosition,
        isPaused,
        isWaitingForSave,
        isReady,
        accessMode,
        onboardingType,
        maxAccessedProfileTab,

        // Setters
        setIsBusy,
        setCompletedTutorials,
        setShowFirstTimeModal,
        setShowTutorialSelectionModal,
        setShowAccessLevelModal,
        setAllowAccessLevelModalClose,
        setIsTutorialActive,
        setActiveTutorial,
        setCurrentStep,
        setStepData,
        setElementPosition,
        setIsPaused,
        setIsWaitingForSave,
        setIsReady,
        setAccessModeState,
        setOnboardingType,
        setMaxAccessedProfileTab,

        // Refs
        syncTimestampRef,
        completingTutorialRef,
        lastRestoredStateRef,
        startTutorialRef,

        // Helpers
        safelyUpdateTutorialState
    };
};
