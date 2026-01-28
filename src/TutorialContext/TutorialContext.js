import React, { createContext, useContext, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNotification } from '../../../contexts/NotificationContext';
import {
    TUTORIAL_IDS,
    getTutorialSteps,
    isProfileTutorial,
    getProfileTutorialForType
} from './config/tutorialSystem';
import tutorialCache from './utils/tutorialCache';
import i18n from '../../../i18n';

// Hooks
import { useTutorialState } from './hooks/useTutorialState';
import { useTutorialActions } from './hooks/useTutorialActions';
import { useTutorialStatus } from './hooks/useTutorialStatus';
import { useTutorialUI } from './hooks/useTutorialUI';
import { useSidebarAccess } from './hooks/useSidebarAccess';

// Sections
import { useProfileSection } from './sections/profileSection';
import { useDashboardSection } from './sections/dashboardSection';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../services/firebase';

// Pre-compute tutorial steps
const tutorialSteps = {};
Object.keys(TUTORIAL_IDS).forEach(key => {
    const id = TUTORIAL_IDS[key];
    tutorialSteps[id] = getTutorialSteps(id);
});

const TutorialContext = createContext(null);

export const TutorialProvider = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { showWarning, showError } = useNotification();

    // 1. Logic Hooks
    // Note: useTutorialState internally uses usageAuth, useDashboard, useSidebar
    const state = useTutorialState();

    // Enrich state with static config and external tools to pass to other hooks
    const stateWithConfig = {
        ...state,
        tutorialSteps,
        navigate,
        location,
        showWarning,
        showError
    };

    const actions = useTutorialActions(stateWithConfig);

    // 2. Section Hooks
    const profileSection = useProfileSection(stateWithConfig, actions);
    useDashboardSection(stateWithConfig, actions); // Only has effects

    const sidebarAccess = useSidebarAccess(stateWithConfig);
    const ui = useTutorialUI({ ...stateWithConfig, actions });

    // 3. Status Check (Effect)
    useTutorialStatus(stateWithConfig, actions);

    // 4. Remaining Action Wrappers (Glue Logic)

    // Start all tutorials from the beginning (profile)
    const startAllTutorials = useCallback(async () => {
        const firstTutorial = getProfileTutorialForType(state.onboardingType);
        await actions.startTutorial(firstTutorial);
    }, [actions, state.onboardingType]);

    // Skip First Time Modal
    const skipFirstTimeModal = useCallback(() => {
        if (state.isBusy) return;
        state.safelyUpdateTutorialState([
            [state.setShowFirstTimeModal, false]
        ], async () => {
            if (state.currentUser) {
                try {
                    await state.setTutorialComplete(true);
                } catch (error) {
                    console.error('Error updating tutorial status:', error);
                }
            }
        });
    }, [state]);

    // Skip Tutorial (Complete everything)
    const skipTutorial = useCallback(async () => {
        if (state.isBusy) return;

        const isInProfileTutorial = isProfileTutorial(state.activeTutorial);
        const isProfileTutorialComplete = state.completedTutorials?.[TUTORIAL_IDS.PROFILE_TABS] === true || state.completedTutorials?.[TUTORIAL_IDS.FACILITY_PROFILE_TABS] === true;

        if (isInProfileTutorial && !isProfileTutorialComplete) {
            // Simplified: Allow skipping at any time. The user can complete profile later.
            // Logic regarding first tab completion blocking skip has been removed.
        }

        state.resetProfileTabAccess();

        state.tutorialStoppedRef.current = true;
        state.lastRestoredStateRef.current = { tutorial: null, step: null };
        state.setStepData(null);
        state.setElementPosition(null);

        tutorialCache.clean();

        await state.safelyUpdateTutorialState([
            [state.setIsTutorialActive, false],
            [state.setShowFirstTimeModal, false],
            [state.setActiveTutorial, null],
            [state.setCurrentStep, 0]
        ], async () => {
            if (state.currentUser) {
                try {
                    const profileCollection = state.onboardingType === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
                    const profileDocRef = doc(db, profileCollection, state.currentUser.uid);
                    await state.setTutorialComplete(true);

                    await updateDoc(profileDocRef, {
                        [`tutorialProgress.${state.onboardingType}.completed`]: true,
                        [`tutorialProgress.${state.onboardingType}.activeTutorial`]: null,
                        tutorialPassed: true,
                        updatedAt: serverTimestamp()
                    });
                } catch (error) { }
            }
        });
    }, [state, actions]);

    // Navigate to Feature ("Show me")
    const navigateToFeature = useCallback(() => {
        let targetPath = null;
        const stepData = tutorialSteps[state.activeTutorial]?.[state.currentStep];

        if (stepData?.actionButton?.action?.startsWith('start_') && stepData?.actionButton?.action?.endsWith('_tutorial')) {
            actions.completeTutorial();
            return;
        }

        if (stepData?.actionButton?.action === 'next_step') {
            actions.nextStep();
            return;
        }

        if (stepData && stepData.actionButton && stepData.actionButton.path) {
            targetPath = stepData.actionButton.path;
        } else if (stepData && stepData.navigationPath) {
            targetPath = stepData.navigationPath;
        }

        if (targetPath) {
            if (location.pathname.includes('/profile') && targetPath.includes('/profile')) {
                const getTabName = (path) => path.split('?')[0].split('#')[0].split('/').filter(Boolean).pop();
                const currentTab = getTabName(location.pathname);
                const targetTabName = getTabName(targetPath);

                if (currentTab !== targetTabName && currentTab !== 'profile') {
                    const validate = state.validationRef.current['profile'];
                    if (validate && !validate(currentTab)) {
                        return;
                    }
                }
            }
            navigate(targetPath);
        }
    }, [state, actions, location.pathname, navigate]);

    // Helpers
    const startFacilityOnboarding = useCallback(async () => {
        state.setOnboardingType('facility');
        const firstTutorial = getProfileTutorialForType('facility');
        await actions.startTutorial(firstTutorial);
        const lang = i18n.language || 'fr';
        navigate(`/${lang}/onboarding?type=facility`);
    }, [state, actions, navigate]);

    const restartOnboarding = useCallback(async (type = 'professional') => {
        if (state.isBusy || !state.currentUser) return;
        if (state.isTutorialActive || state.showFirstTimeModal) {
            await actions.stopTutorial();
        }
        state.setOnboardingType(type);
        const lang = i18n.language || 'fr';
        navigate(`/${lang}/onboarding?type=${type}`);
    }, [state, actions, navigate]);

    // Reset Profile Tab Access
    const resetProfileTabAccess = useCallback(() => {
        state.setMaxAccessedProfileTab('personalDetails');
        tutorialCache.save.maxAccessedProfileTab('personalDetails');
    }, [state]);

    // Resume (No-op)
    const resumeTutorial = useCallback(() => { }, []);

    const value = {
        // State
        ...state,
        // Actions
        ...actions,
        startAllTutorials,
        skipFirstTimeModal,
        skipTutorial,
        navigateToFeature,
        startFacilityOnboarding,
        restartOnboarding,
        resumeTutorial,
        resetProfileTabAccess,
        // UI
        forceUpdateElementPosition: ui.forceUpdateElementPosition,
        // Sections / Access
        ...profileSection, // onTabCompleted, setAccessMode, checkProfileRoute
        ...sidebarAccess, // isSidebarItemAccessible
        // Steps
        tutorialSteps,
        // Other
        showWarning,
        showError
    };

    return (
        <TutorialContext.Provider value={value}>
            {children}
        </TutorialContext.Provider>
    );
};

export const useTutorial = () => {
    const context = useContext(TutorialContext);
    if (context === undefined) {
        throw new Error('useTutorial must be used within a TutorialProvider');
    }
    return context;
};

TutorialProvider.propTypes = {
    children: PropTypes.node.isRequired
};

export default TutorialContext;
