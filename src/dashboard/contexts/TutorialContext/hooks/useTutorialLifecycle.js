import { useEffect, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { FIRESTORE_COLLECTIONS } from '../../../../config/keysDatabase';
import { WORKSPACE_TYPES } from '../../../../utils/sessionAuth';
import { ACTIONS } from '../utils/tutorialReducer';
import { getProfileCollection } from '../utils/tutorialHelpers';

const isPlatformAdmin = (userProfile) => {
    if (!userProfile) return false;
    return !!(userProfile.adminData && userProfile.adminData.isActive !== false);
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
                const onboardingType = selectedWorkspace?.type === WORKSPACE_TYPES.FACILITY && selectedWorkspace?.facilityId
                    ? 'facility'
                    : 'professional';

                const profileCollection = getProfileCollection(onboardingType);
                const profileDocRef = doc(db, profileCollection, currentUser.uid);
                const profileDoc = await getDoc(profileDocRef);

                if (!profileDoc.exists()) {
                    if (isInDashboard && !showFirstTimeModal) {
                        dispatch({ type: ACTIONS.SET_ONBOARDING_TYPE, payload: onboardingType });
                        dispatch({ type: ACTIONS.SET_FIRST_TIME_MODAL, payload: true });
                        if (isTutorialActive) dispatch({ type: ACTIONS.COMPLETE_TUTORIAL });
                    }
                    return;
                }

                const profileData = profileDoc.data();
                const tutorialAccessMode = profileData.tutorialAccessMode || 'loading';

                if (tutorialAccessMode === 'loading') {
                    if (isInDashboard && !showFirstTimeModal) {
                        dispatch({ type: ACTIONS.SET_ONBOARDING_TYPE, payload: onboardingType });
                        dispatch({ type: ACTIONS.SET_FIRST_TIME_MODAL, payload: true });
                        if (isTutorialActive) dispatch({ type: ACTIONS.COMPLETE_TUTORIAL });
                    }
                    return;
                }

                if (tutorialAccessMode === 'enabled' || tutorialAccessMode === 'disabled') {
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
                    if (tutorialAccessMode === 'enabled' || tutorialAccessMode === 'disabled') {
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
