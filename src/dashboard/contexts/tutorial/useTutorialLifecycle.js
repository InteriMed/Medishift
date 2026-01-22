import { useEffect, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { WORKSPACE_TYPES } from '../../../utils/sessionAuth';
import { ACTIONS } from './tutorialReducer';

const isPlatformAdmin = (userProfile) => {
    if (!userProfile) return false;
    if (userProfile.roles && Array.isArray(userProfile.roles)) {
        const adminRoles = ['admin', 'super_admin', 'ops_manager', 'finance', 'recruiter', 'support'];
        return userProfile.roles.some(role => adminRoles.includes(role));
    }
    return userProfile.role === 'admin';
};

export const useTutorialLifecycle = ({
    dispatch,
    currentUser,
    userProfile,
    selectedWorkspace,
    tutorialPassed,
    profileComplete,
    isInDashboard,
    fetchTutorialData,
    loadLocalState,
    clearActiveTutorial,
    isTutorialActive,
    activeTutorial,
    currentStep,
    completedTutorials,
    showFirstTimeModal,
    isBusy,
    startTutorialRef,
    getOnboardingProgress,
    getTutorialProgress
}) => {
    const lastRestoredStateRef = useRef({ tutorial: null, step: null });
    const completingTutorialRef = useRef(null);

    // Initial check and restoration logic
    useEffect(() => {
        const checkTutorialStatus = async () => {
            if (isBusy) return;

            if (!currentUser) {
                dispatch({ type: ACTIONS.SET_READY, payload: true });
                return;
            }

            if (isPlatformAdmin(userProfile)) {
                dispatch({ type: ACTIONS.SET_FIRST_TIME_MODAL, payload: false });
                dispatch({ type: ACTIONS.SET_READY, payload: true });
                return;
            }

            if (tutorialPassed && !isTutorialActive && !showFirstTimeModal) {
                dispatch({ type: ACTIONS.SET_READY, payload: true });
                return;
            }

            if (isTutorialActive || !isInDashboard) {
                dispatch({ type: ACTIONS.SET_READY, payload: true });
                return;
            }

            try {
                const userDocRef = doc(db, 'users', currentUser.uid);
                const userDoc = await getDoc(userDocRef);
                
                if (!userDoc.exists()) {
                    if (isInDashboard && !showFirstTimeModal) {
                        dispatch({ type: ACTIONS.SET_ONBOARDING_TYPE, payload: 'professional' });
                        dispatch({ type: ACTIONS.SET_FIRST_TIME_MODAL, payload: true });
                        if (isTutorialActive) dispatch({ type: ACTIONS.COMPLETE_TUTORIAL });
                    }
                    return;
                }

                const userData = userDoc.data();
                const onboardingProgress = userData.onboardingProgress || {};
                
                let onboardingCompleted = false;
                let onboardingType = 'professional';

                if (selectedWorkspace?.type === WORKSPACE_TYPES.TEAM && selectedWorkspace?.facilityId) {
                    onboardingType = 'facility';
                    const facilityProgress = onboardingProgress.facility || {};
                    onboardingCompleted = facilityProgress.completed === true;
                } else {
                    onboardingType = 'professional';
                    const professionalProgress = onboardingProgress.professional || {};
                    onboardingCompleted = professionalProgress.completed === true || 
                                         userData.onboardingCompleted === true || 
                                         userData.GLN_certified === true;
                }

                if (!onboardingCompleted) {
                    if (isInDashboard && !showFirstTimeModal) {
                        dispatch({ type: ACTIONS.SET_ONBOARDING_TYPE, payload: onboardingType });
                        dispatch({ type: ACTIONS.SET_FIRST_TIME_MODAL, payload: true });
                        if (isTutorialActive) dispatch({ type: ACTIONS.COMPLETE_TUTORIAL });
                    }
                    return;
                }

                if (onboardingCompleted) {
                    const storedState = loadLocalState();
                    if (storedState?.tutorialDismissed === true) {
                        if (isTutorialActive) dispatch({ type: ACTIONS.COMPLETE_TUTORIAL });
                        dispatch({ type: ACTIONS.SET_FIRST_TIME_MODAL, payload: false });
                        dispatch({ type: ACTIONS.SET_READY, payload: true });
                        return;
                    }

                    if (storedState?.isPaused === true && storedState?.activeTutorial) {
                        dispatch({
                            type: ACTIONS.START_TUTORIAL,
                            payload: {
                                feature: storedState.activeTutorial,
                                step: storedState.currentStep || 0,
                                mode: storedState.tutorialMode || 'onboarding'
                            }
                        });
                        dispatch({ type: ACTIONS.SET_PAUSED, payload: true });
                        dispatch({ type: ACTIONS.SET_READY, payload: true });
                        return;
                    }
                }

                if (isInDashboard && !tutorialPassed) {
                    if (onboardingCompleted) {
                        dispatch({ type: ACTIONS.SET_FIRST_TIME_MODAL, payload: false });
                    }
                }

            } catch (error) {
                console.error('[TutorialLifecycle] Error checking status:', error);
            } finally {
                dispatch({ type: ACTIONS.SET_READY, payload: true });
            }
        };

        checkTutorialStatus();
    }, [
        currentUser, userProfile, tutorialPassed, isInDashboard, selectedWorkspace,
        showFirstTimeModal, isTutorialActive, isBusy, dispatch,
        loadLocalState, completedTutorials
    ]);

    return {
        completingTutorialRef,
        lastRestoredStateRef
    };
};

export default useTutorialLifecycle;
