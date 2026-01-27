import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useDashboard } from '../../DashboardContext';
import { useSidebar } from '../../SidebarContext';
import { TUTORIAL_IDS } from '../config/tutorialSystem';
import { DEFAULT_SIDEBAR_WIDTH } from '../constants';
import tutorialCache from '../utils/tutorialCache';

export const useTutorialState = () => {
    const { currentUser } = useAuth();
    const {
        profileComplete,
        tutorialPassed,
        setTutorialComplete,
        user,
        isLoading: isDashboardLoading,
        selectedWorkspace
    } = useDashboard();
    const { isMainSidebarCollapsed, setIsMainSidebarCollapsed } = useSidebar();

    // Calculate sidebar width
    const sidebarWidth = isMainSidebarCollapsed
        ? DEFAULT_SIDEBAR_WIDTH.COLLAPSED
        : DEFAULT_SIDEBAR_WIDTH.EXPANDED;

    // 1. Core State
    const [isBusy, setIsBusy] = useState(false);
    const [completedTutorials, setCompletedTutorials] = useState({});
    const [showFirstTimeModal, setShowFirstTimeModal] = useState(false);
    const [showTutorialSelectionModal, setShowTutorialSelectionModal] = useState(false);
    const [showStopTutorialConfirm, setShowStopTutorialConfirm] = useState(false);

    // 2. Profile Specific State
    const [showAccessLevelModal, setShowAccessLevelModal] = useState(false);
    const [allowAccessLevelModalClose, setAllowAccessLevelModalClose] = useState(false);
    const [accessLevelChoice, setAccessLevelChoice] = useState(null);
    const [maxAccessedProfileTab, setMaxAccessedProfileTab] = useState(() => {
        return tutorialCache.get.maxAccessedProfileTab();
    });

    // 3. Navigation/Step State
    const [isTutorialActive, setIsTutorialActive] = useState(false);
    const [activeTutorial, setActiveTutorial] = useState(TUTORIAL_IDS.PROFILE_TABS);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepData, setStepData] = useState(null);
    const [elementPosition, setElementPosition] = useState(null);
    const [isPaused, setIsPaused] = useState(false);
    const [isWaitingForSave, setIsWaitingForSave] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [tabsProgress, setTabsProgress] = useState({});

    // 4. Onboarding Type State
    const [onboardingType, setOnboardingType] = useState('professional');

    // 5. Refs
    const syncTimestampRef = useRef({});
    const lastWorkspaceIdRef = useRef(null);
    const updateElementPositionRef = useRef(null);
    const completingTutorialRef = useRef(null);
    const lastRestoredStateRef = useRef({ tutorial: null, step: null });
    const tutorialStoppedRef = useRef(false);
    const lastPathnameRef = useRef('');
    const validationRef = useRef({});

    // 6. Helpers

    // Safely update state without race conditions
    const safelyUpdateTutorialState = useCallback(async (updates = [], callback = null) => {
        setIsBusy(true);
        const timeoutId = setTimeout(() => setIsBusy(false), 10000);

        try {
            for (const [setter, value] of updates) {
                setter(value);
            }
            await new Promise(resolve => setTimeout(resolve, 50));
            if (typeof callback === 'function') {
                await callback();
            }
            clearTimeout(timeoutId);
            setIsBusy(false);
        } catch (error) {
            clearTimeout(timeoutId);
            setIsBusy(false);
            throw error;
        }
    }, []);

    useEffect(() => {
        tutorialCache.save.maxAccessedProfileTab(maxAccessedProfileTab);
    }, [maxAccessedProfileTab]);

    return {
        // State
        isBusy, setIsBusy,
        completedTutorials, setCompletedTutorials,
        showFirstTimeModal, setShowFirstTimeModal,
        showTutorialSelectionModal, setShowTutorialSelectionModal,
        showStopTutorialConfirm, setShowStopTutorialConfirm,
        showAccessLevelModal, setShowAccessLevelModal,
        allowAccessLevelModalClose, setAllowAccessLevelModalClose,
        accessLevelChoice, setAccessLevelChoice,
        maxAccessedProfileTab, setMaxAccessedProfileTab,
        isTutorialActive, setIsTutorialActive,
        activeTutorial, setActiveTutorial,
        currentStep, setCurrentStep,
        stepData, setStepData,
        elementPosition, setElementPosition,
        isPaused, setIsPaused,
        isWaitingForSave, setIsWaitingForSave, setWaitingForSave: setIsWaitingForSave,
        isReady, setIsReady,
        onboardingType, setOnboardingType,
        tabsProgress, setTabsProgress,

        // Refs
        syncTimestampRef,
        lastWorkspaceIdRef,
        updateElementPositionRef,
        completingTutorialRef,
        lastRestoredStateRef,
        tutorialStoppedRef,
        lastPathnameRef,
        validationRef,

        // Contexts
        currentUser,
        user,
        profileComplete,
        tutorialPassed,
        setTutorialComplete,
        isDashboardLoading,
        selectedWorkspace,
        isMainSidebarCollapsed,
        setIsMainSidebarCollapsed,
        sidebarWidth,

        // Methods
        safelyUpdateTutorialState
    };
};
