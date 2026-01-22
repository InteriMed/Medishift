import { useEffect, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { WORKSPACE_TYPES } from '../../../../utils/sessionAuth';
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
                let profileExists = false;
                let onboardingType = 'professional';

                if (selectedWorkspace?.type === WORKSPACE_TYPES.TEAM && selectedWorkspace?.facilityId) {
                    const facilityDocRef = doc(db, 'facilityProfiles', selectedWorkspace.facilityId);
                    const facilityDoc = await getDoc(facilityDocRef);
                    profileExists = facilityDoc.exists();
                    onboardingType = 'facility';
                } else {
                    const professionalDocRef = doc(db, 'professionalProfiles', currentUser.uid);
                    const professionalDoc = await getDoc(professionalDocRef);
                    profileExists = professionalDoc.exists();
                    onboardingType = 'professional';
                }

                if (!profileExists) {
                    if (isInDashboard && !showFirstTimeModal) {
                        dispatch({ type: ACTIONS.SET_ONBOARDING_TYPE, payload: onboardingType });
                        dispatch({ type: ACTIONS.SET_FIRST_TIME_MODAL, payload: true });
                        if (isTutorialActive) dispatch({ type: ACTIONS.COMPLETE_TUTORIAL });
                    }
                    return;
                }

                if (profileExists) {
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
                    if (profileExists) {
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

