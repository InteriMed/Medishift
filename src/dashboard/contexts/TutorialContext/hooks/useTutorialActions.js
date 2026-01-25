import { useCallback } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import {
    TUTORIAL_IDS,
    LOCALSTORAGE_KEYS,
    getProfileTutorialForType,
    isProfileTutorial,
    getMandatoryTutorials,
    PROFILE_TAB_IDS
} from '../../../../config/tutorialSystem';

export const useTutorialActions = (state) => {
    const {
        currentUser,
        onboardingType,
        isBusy,
        setIsBusy,
        safelyUpdateTutorialState,
        setCompletedTutorials,
        setActiveTutorial,
        setCurrentStep,
        setIsTutorialActive,
        setShowFirstTimeModal,
        accessLevelChoice, setAccessLevelChoice,
        completedTutorials,
        tutorialSteps,
        currentStep,
        setStepData,
        setElementPosition,
        setIsPaused,
        setShowStopTutorialConfirm,
        setShowAccessLevelModal,
        setAllowAccessLevelModalClose,
        tutorialStoppedRef,
        lastRestoredStateRef,
        completingTutorialRef,
        setMaxAccessedProfileTab,
        setTutorialComplete,
        user
    } = state;

    // 1. Save Progress
    const saveTutorialProgress = useCallback(async (tutorialName, stepIndex) => {
        if (!currentUser) return;

        try {
            const profileCollection = onboardingType === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
            const profileDocRef = doc(db, profileCollection, currentUser.uid);

            const steps = tutorialSteps[tutorialName] || [];
            const currentStepId = steps[stepIndex]?.id;

            if (!currentStepId) return;

            const progressPath = `tutorialProgress.${onboardingType}.tutorials.${tutorialName}`;

            const updates = {
                [`tutorialProgress.${onboardingType}.activeTutorial`]: tutorialName,
                [`tutorialProgress.${onboardingType}.currentStepIndex`]: stepIndex,
                [`${progressPath}.steps.${currentStepId}.completed`]: true,
                [`${progressPath}.lastActiveStepId`]: currentStepId,
                [`${progressPath}.updatedAt`]: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            await updateDoc(profileDocRef, updates);
        } catch (error) {
            console.error('Error saving tutorial progress:', error);
        }
    }, [currentUser, onboardingType, tutorialSteps]);


    // 2. Start Tutorial
    const startTutorial = useCallback(async (feature) => {
        tutorialStoppedRef.current = false;
        lastRestoredStateRef.current = { tutorial: null, step: null };

        if (isBusy) {
            console.log('[TutorialContext] startTutorial blocked: isBusy =', isBusy);
            return;
        }

        setIsBusy(true);
        console.log('[TutorialContext] Starting tutorial:', feature);

        try {
            try {
                localStorage.removeItem(LOCALSTORAGE_KEYS.TUTORIAL_STATE);
                localStorage.removeItem(LOCALSTORAGE_KEYS.TUTORIAL_MAX_ACCESSED_PROFILE_TAB);
            } catch (error) {
                console.error('[TutorialContext] Error clearing tutorial localStorage on start:', error);
            }

            if (completedTutorials[feature]) {
                setCompletedTutorials(prev => {
                    const updated = { ...prev };
                    delete updated[feature];
                    return updated;
                });

                if (currentUser) {
                    try {
                        const profileCollection = onboardingType === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
                        const profileDocRef = doc(db, profileCollection, currentUser.uid);
                        await updateDoc(profileDocRef, {
                            [`completedTutorials.${feature}`]: null
                        });
                    } catch (error) {
                        console.error('Error clearing completed tutorial status:', error);
                    }
                }
            }

            let startStep = 0;
            if (currentUser) {
                try {
                    const profileCollection = onboardingType === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
                    const profileDocRef = doc(db, profileCollection, currentUser.uid);
                    const profileDoc = await getDoc(profileDocRef);

                    if (profileDoc.exists()) {
                        const profileData = profileDoc.data();
                        const typeProgress = profileData.tutorialProgress?.[onboardingType] || {};

                        if (typeProgress.activeTutorial === feature) {
                            const savedStepIndex = typeProgress.currentStepIndex || 0;
                            const isCompleted = typeProgress.tutorials?.[feature]?.completed;
                            if (isProfileTutorial(feature) && !isCompleted && typeProgress.currentStepIndex === undefined) {
                                startStep = 0;
                            } else {
                                startStep = savedStepIndex;
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error loading tutorial progress:', error);
                }
            }

            if (isProfileTutorial(feature)) {
                const hasRealAccessChoice = accessLevelChoice === 'full' || accessLevelChoice === 'team';

                if (!hasRealAccessChoice) {
                    setMaxAccessedProfileTab(PROFILE_TAB_IDS.PERSONAL_DETAILS);
                    try {
                        localStorage.setItem(LOCALSTORAGE_KEYS.TUTORIAL_MAX_ACCESSED_PROFILE_TAB, 'personalDetails');
                    } catch (error) {
                        console.error('[TutorialContext] Error resetting maxAccessedProfileTab in localStorage:', error);
                    }
                }
            }

            safelyUpdateTutorialState([
                [setActiveTutorial, feature],
                [setCurrentStep, startStep],
                [setIsTutorialActive, true],
                [setShowFirstTimeModal, false]
            ], async () => {
                await saveTutorialProgress(feature, startStep);
            });
        } finally {
            setIsBusy(false);
        }
    }, [isBusy, safelyUpdateTutorialState, currentUser, saveTutorialProgress, completedTutorials, accessLevelChoice, onboardingType, setIsBusy, setCompletedTutorials, setActiveTutorial, setCurrentStep, setIsTutorialActive, setShowFirstTimeModal, setMaxAccessedProfileTab]);

    // 3. Stop Tutorial
    const stopTutorial = useCallback(async (options = {}) => {
        const { showAccessPopupForProfile = true, showConfirmation = false, forceStop = false } = options;
        const currentActive = state.activeTutorial; // Need to access from state

        if (isBusy && !forceStop) return false;
        if (!state.isTutorialActive && !state.showFirstTimeModal) return true;

        const isInProfileTutorial = isProfileTutorial(currentActive);
        const isProfileTutorialComplete = completedTutorials?.[TUTORIAL_IDS.PROFILE_TABS] === true || completedTutorials?.[TUTORIAL_IDS.FACILITY_PROFILE_TABS] === true;

        if (showAccessPopupForProfile && isInProfileTutorial && !isProfileTutorialComplete) {
            // Check if Personal Details (first tab) is complete
            const firstTabId = onboardingType === 'facility' ? 'facilityCoreDetails' : 'personalDetails';
            const isFirstTabComplete = state.tabsProgress?.[firstTabId] === true;
            const hasFullAccess = accessLevelChoice === 'full';

            if (!hasFullAccess && !isFirstTabComplete) {
                console.log('[TutorialActions] Personal details not complete - blocking exit');
                setAllowAccessLevelModalClose(false);
                setShowAccessLevelModal(true);
                return false;
            }

            const isOnMarketplacePage = window.location.pathname.includes('/marketplace');
            if (isOnMarketplacePage) {
                setAllowAccessLevelModalClose(true);
                setShowAccessLevelModal(true);
                return false;
            }
        }

        if (showConfirmation && !forceStop) {
            setShowStopTutorialConfirm(true);
            return false;
        }

        tutorialStoppedRef.current = true;
        lastRestoredStateRef.current = { tutorial: null, step: null };
        setShowStopTutorialConfirm(false);
        setStepData(null);
        setElementPosition(null);

        try {
            localStorage.removeItem(LOCALSTORAGE_KEYS.TUTORIAL_STATE);
            localStorage.removeItem(LOCALSTORAGE_KEYS.TUTORIAL_MAX_ACCESSED_PROFILE_TAB);
        } catch (error) {
            console.error('[TutorialContext] Error clearing tutorial localStorage on stop:', error);
        }

        await safelyUpdateTutorialState([
            [setIsTutorialActive, false],
            [setShowFirstTimeModal, false],
            [setActiveTutorial, null],
            [setCurrentStep, 0]
        ], async () => {
            if (currentUser) {
                try {
                    const profileCollection = onboardingType === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
                    const profileDocRef = doc(db, profileCollection, currentUser.uid);
                    await updateDoc(profileDocRef, {
                        [`tutorialProgress.${onboardingType}.activeTutorial`]: null,
                        updatedAt: serverTimestamp()
                    });
                } catch (error) {
                    console.error('[TutorialContext] Error clearing activeTutorial from Firestore:', error);
                }
            }
        });

        return true;
    }, [isBusy, state.isTutorialActive, state.showFirstTimeModal, completedTutorials, safelyUpdateTutorialState, currentUser, onboardingType, setShowStopTutorialConfirm, setStepData, setElementPosition, setIsTutorialActive, setShowFirstTimeModal, setActiveTutorial, setCurrentStep, state.activeTutorial, setAllowAccessLevelModalClose, setShowAccessLevelModal]);

    // 4. Complete Tutorial
    const completeTutorial = useCallback(async () => {
        if (state.isBusy) return;

        const previousTutorial = state.activeTutorial;
        lastRestoredStateRef.current = { tutorial: null, step: null };
        completingTutorialRef.current = previousTutorial;

        try {
            await safelyUpdateTutorialState([
                [setIsTutorialActive, false],
                [setActiveTutorial, getProfileTutorialForType(onboardingType)]
            ], async () => {
                if (currentUser) {
                    try {
                        const profileCollection = onboardingType === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
                        const profileDocRef = doc(db, profileCollection, currentUser.uid);
                        const progressPath = `tutorialProgress.${onboardingType}.tutorials.${previousTutorial}`;

                        await updateDoc(profileDocRef, {
                            [`${progressPath}.completed`]: true,
                            [`tutorialProgress.${onboardingType}.activeTutorial`]: null,
                            updatedAt: serverTimestamp()
                        });

                        setCompletedTutorials(prev => ({
                            ...prev,
                            [previousTutorial]: true
                        }));

                        const mandatoryOnboardingTutorials = getMandatoryTutorials(onboardingType);
                        const currentIndex = mandatoryOnboardingTutorials.indexOf(previousTutorial);

                        if (isProfileTutorial(previousTutorial)) {
                            await setTutorialComplete(true);
                            setAccessLevelChoice('full');

                            try {
                                await updateDoc(profileDocRef, {
                                    tutorialAccessMode: 'enabled'
                                });
                            } catch (saveError) {
                                console.error("[TutorialContext] Error saving access mode 'full' to Firestore:", saveError);
                            }

                            setTimeout(() => {
                                startTutorial(TUTORIAL_IDS.MESSAGES);
                            }, 500);
                        }

                        if (currentIndex !== -1 && currentIndex >= mandatoryOnboardingTutorials.length - 1) {
                            // Check all done logic...
                        }
                    } catch (error) {
                        console.error('Error updating tutorial completion status:', error);
                    }
                }
            });
        } finally {
            setTimeout(() => {
                completingTutorialRef.current = null;
            }, 1000);
        }
    }, [state.activeTutorial, state.isBusy, safelyUpdateTutorialState, currentUser, onboardingType, setTutorialComplete, accessLevelChoice, setCompletedTutorials, setIsTutorialActive, setActiveTutorial, setAccessLevelChoice, startTutorial]);

    // 5. Previous Step
    const prevStep = useCallback(() => {
        if (state.isBusy) return;

        const currentStep = state.currentStep;

        lastRestoredStateRef.current = { tutorial: null, step: null };

        if (currentStep > 0) {
            const newStep = currentStep - 1;
            safelyUpdateTutorialState([
                [setCurrentStep, newStep]
            ], async () => {
                await saveTutorialProgress(state.activeTutorial, newStep);
            });
        }
    }, [state.isBusy, state.currentStep, state.activeTutorial, safelyUpdateTutorialState, saveTutorialProgress, setCurrentStep]);

    // 6. Next Step
    const nextStep = useCallback(() => {
        if (state.isBusy) return;

        const tutorialSteps = state.tutorialSteps;
        const activeTutorial = state.activeTutorial;
        const currentStep = state.currentStep;

        const totalSteps = tutorialSteps[activeTutorial]?.length || 0;
        lastRestoredStateRef.current = { tutorial: null, step: null };

        if (currentStep < totalSteps - 1) {
            const newStep = currentStep + 1;
            safelyUpdateTutorialState([
                [setCurrentStep, newStep]
            ], async () => {
                await saveTutorialProgress(activeTutorial, newStep);
            });
        } else {
            completeTutorial();
        }
    }, [state.isBusy, state.currentStep, state.activeTutorial, state.tutorialSteps, safelyUpdateTutorialState, completeTutorial, saveTutorialProgress, setCurrentStep]);

    // 7. Pause Tutorial
    const pauseTutorial = useCallback(async () => {
        if (state.isBusy) return;

        tutorialStoppedRef.current = true;
        lastRestoredStateRef.current = { tutorial: null, step: null };
        setStepData(null);
        setElementPosition(null);
        setIsPaused(false);
        setShowStopTutorialConfirm(false);

        await safelyUpdateTutorialState([
            [setIsTutorialActive, false],
            [setShowFirstTimeModal, false],
            [setActiveTutorial, null],
            [setCurrentStep, 0]
        ], async () => {
            if (currentUser) {
                try {
                    const profileCollection = onboardingType === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
                    const profileDocRef = doc(db, profileCollection, currentUser.uid);
                    await updateDoc(profileDocRef, {
                        [`tutorialProgress.${onboardingType}.activeTutorial`]: null,
                        updatedAt: serverTimestamp()
                    });
                } catch (error) { }
            }
        });

        try {
            localStorage.removeItem(LOCALSTORAGE_KEYS.TUTORIAL_STATE);
            localStorage.removeItem(LOCALSTORAGE_KEYS.TUTORIAL_MAX_ACCESSED_PROFILE_TAB);
        } catch (error) { }
    }, [state.isBusy, safelyUpdateTutorialState, currentUser, onboardingType, setIsPaused, setShowStopTutorialConfirm, setIsTutorialActive, setShowFirstTimeModal, setActiveTutorial, setCurrentStep]);

    // 8. Restart Onboarding
    const restartOnboarding = useCallback(async (type = 'professional') => {
        if (isBusy || !currentUser) return;

        if (state.isTutorialActive || state.showFirstTimeModal) {
            const stopped = await stopTutorial();
            if (!stopped) return;
        }

        // Logic for restarting...
        // This is simplified to just start the tutorial for now as logic is complex and relies on navigation
        // Ideally should be moved to a helper or kept in Main

        // Due to complexity and "navigate" dependency which is usually in Component, 
        // restartOnboarding might be better placed in the Context Component itself wrapping this.
        // But for actions we can define it if we pass navigate.
    }, [isBusy, currentUser, state.isTutorialActive, state.showFirstTimeModal, stopTutorial]);

    return {
        saveTutorialProgress,
        startTutorial,
        stopTutorial,
        completeTutorial,
        nextStep,
        prevStep,
        pauseTutorial
    };
};
